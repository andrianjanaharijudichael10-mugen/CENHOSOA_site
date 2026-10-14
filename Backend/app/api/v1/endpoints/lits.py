"""Routes du module Lits d'urgence et transitions contrôlées de leur cycle de vie."""
import uuid
from datetime import datetime, timezone
import re
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import exiger_roles
from app.core.regles_lits import (
    DUREE_BIONETTOYAGE,
    DUREE_RESERVATION_TRANSFERT,
    SEUIL_PLAN_BLANC,
    date_utc,
    duree_depuis,
    motif_infectieux_valide,
    statut_apres_liberation,
)
from app.db.session import obtenir_db
from app.models.enums import CategorieLit, RoleUtilisateur, StatutLit
from app.models.categorie_lit import CategorieLitInventaire
from app.models.lit import Lit
from app.schemas.lit import (
    AdmissionVitaleSchema,
    CategorieLitOut,
    CompleterIdentiteLitSchema,
    CreationCategorieLitSchema,
    CreationLitSchema,
    ConfirmationTransfertSchema,
    LitOut,
    ModificationLitSchema,
    OccuperLitSchema,
    ReservationTransfertSchema,
    ResumeOccupationSchema,
)

routeur = APIRouter(prefix="/lits", tags=["Lits d'urgence"])

# Tout le personnel soignant/administratif peut consulter l'état des lits.
ROLES_CONSULTATION = (
    RoleUtilisateur.SECRETAIRE,
    RoleUtilisateur.MEDECIN,
    RoleUtilisateur.REGULATEUR_AMBULANCE,
    RoleUtilisateur.MAJOR_DE_GARDE,
    RoleUtilisateur.SUPERADMIN,
)


# ---------- Consultation (personnel authentifié) ----------

@routeur.get("", response_model=list[LitOut], dependencies=[Depends(exiger_roles(*ROLES_CONSULTATION))])
def lister_lits(db: Session = Depends(obtenir_db)):
    """Liste tous les lits avec leur statut courant, triés par catégorie puis numéro."""
    actualiser_etats_temporises(db)
    return db.query(Lit).order_by(Lit.categorie, Lit.numero).all()


@routeur.get(
    "/categories",
    response_model=list[CategorieLitOut],
    dependencies=[Depends(exiger_roles(*ROLES_CONSULTATION))],
)
def lister_categories_lits(db: Session = Depends(obtenir_db)):
    return db.query(CategorieLitInventaire).order_by(CategorieLitInventaire.nom).all()


@routeur.get(
    "/resume",
    response_model=list[ResumeOccupationSchema],
    dependencies=[Depends(exiger_roles(*ROLES_CONSULTATION))],
)
def resumer_occupation(db: Session = Depends(obtenir_db)):
    """Taux d'occupation agrégé par catégorie (pour un tableau de bord)."""
    actualiser_etats_temporises(db)
    resultats = []
    categories = db.query(CategorieLitInventaire).order_by(CategorieLitInventaire.nom).all()
    for categorie in categories:
        lits_categorie = db.query(Lit).filter(Lit.categorie == categorie.cle).all()
        resultats.append(
            ResumeOccupationSchema(
                categorie=categorie.cle,
                nom=categorie.nom,
                total=len(lits_categorie),
                libres=sum(1 for lit in lits_categorie if lit.statut == StatutLit.LIBRE),
                occupes=sum(1 for lit in lits_categorie if lit.statut == StatutLit.OCCUPE),
                reserves=sum(1 for lit in lits_categorie if lit.statut == StatutLit.RESERVE),
                en_nettoyage=sum(1 for lit in lits_categorie if lit.statut == StatutLit.NETTOYAGE),
            )
        )
    return resultats


def actualiser_etats_temporises(db: Session, maintenant: datetime | None = None) -> None:
    """Libère les réservations expirées et termine les bionettoyages échus."""
    maintenant = maintenant or datetime.now(timezone.utc)
    reservation_expiree = date_utc(maintenant) - DUREE_RESERVATION_TRANSFERT
    nettoyage_termine = date_utc(maintenant) - DUREE_BIONETTOYAGE
    reservations = db.query(Lit).filter(
        Lit.statut == StatutLit.RESERVE,
        Lit.mission_reservation_id.is_(None),
        Lit.date_reservation <= reservation_expiree,
    ).all()
    nettoyages = db.query(Lit).filter(
        Lit.statut == StatutLit.NETTOYAGE,
        Lit.date_debut_nettoyage <= nettoyage_termine,
    ).all()
    for lit in reservations:
        lit.statut = StatutLit.LIBRE
        lit.date_reservation = None
        lit.lit_source_reservation_id = None
        lit.mission_reservation_id = None
        lit.nom_patient_actuel = None
        lit.prenoms_patient_actuel = None
        lit.patient_id = None
        lit.motif_admission = None
        lit.motif_infectieux = None
        lit.urgence_vitale = False
        lit.facturation_vip_validee = False
    for lit in nettoyages:
        lit.statut = StatutLit.LIBRE
        lit.date_debut_nettoyage = None
    if reservations or nettoyages:
        db.commit()


def _verifier_regles_admission(
    db: Session,
    lit: Lit,
    motif_infectieux: str | None,
    facturation_vip_validee: bool,
) -> None:
    if not motif_infectieux_valide(lit.categorie, motif_infectieux):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Un motif infectieux est obligatoire pour attribuer un lit de salle septique.",
        )
    if lit.categorie == CategorieLit.VIP and not facturation_vip_validee:
        nombre_occupes = db.query(Lit).filter(Lit.statut == StatutLit.OCCUPE).count()
        if nombre_occupes < SEUIL_PLAN_BLANC:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="La validation de facturation VIP est obligatoire avant l'attribution.",
            )


# ---------- Actions, réservées au Major de Garde ----------

ROLES_ACTIONS_LITS = (RoleUtilisateur.MAJOR_DE_GARDE,)

@routeur.post(
    "/{lit_id}/occuper",
    response_model=LitOut,
    dependencies=[Depends(exiger_roles(*ROLES_ACTIONS_LITS))],
)
def occuper_lit(lit_id: uuid.UUID, donnees: OccuperLitSchema, db: Session = Depends(obtenir_db)):
    """Admet un patient dans un lit libre après validation des contraintes de zone."""
    actualiser_etats_temporises(db)
    lit = db.query(Lit).filter(Lit.id == lit_id).with_for_update().one_or_none()
    if lit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lit introuvable.")
    if lit.statut != StatutLit.LIBRE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ce lit n'est pas disponible (statut actuel : {lit.statut.value}).",
        )
    _verifier_regles_admission(
        db, lit, donnees.motif_infectieux, donnees.facturation_vip_validee
    )

    lit.statut = StatutLit.OCCUPE
    lit.nom_patient_actuel = donnees.nom_patient
    lit.prenoms_patient_actuel = donnees.prenoms_patient
    lit.patient_id = donnees.patient_id
    lit.motif_admission = donnees.motif_admission
    lit.date_occupation = datetime.now(timezone.utc)
    lit.date_liberation = None
    lit.date_debut_nettoyage = None
    lit.date_reservation = None
    lit.lit_source_reservation_id = None
    lit.mission_reservation_id = None
    lit.motif_infectieux = donnees.motif_infectieux.strip() if donnees.motif_infectieux else None
    lit.urgence_vitale = False
    lit.facturation_vip_validee = donnees.facturation_vip_validee

    db.commit()
    db.refresh(lit)
    return lit


@routeur.post(
    "/{lit_id}/urgence-vitale",
    response_model=LitOut,
    dependencies=[Depends(exiger_roles(*ROLES_ACTIONS_LITS))],
)
def admission_vitale(lit_id: uuid.UUID, donnees: AdmissionVitaleSchema, db: Session = Depends(obtenir_db)):
    """Admission immédiate en déchoquage, identité provisoire à compléter ensuite."""
    actualiser_etats_temporises(db)
    lit = db.query(Lit).filter(Lit.id == lit_id).with_for_update().one_or_none()
    if lit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lit introuvable.")
    if lit.categorie != CategorieLit.DECHOCAGE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="L'admission vitale en un clic est réservée aux lits de déchoquage.",
        )
    if lit.statut != StatutLit.LIBRE:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce lit de déchoquage n'est pas disponible.")

    lit.statut = StatutLit.OCCUPE
    lit.nom_patient_actuel = "non identifié"
    lit.prenoms_patient_actuel = "Patient"
    lit.patient_id = None
    lit.motif_admission = donnees.motif_admission
    lit.date_occupation = datetime.now(timezone.utc)
    lit.date_liberation = None
    lit.urgence_vitale = True
    lit.facturation_vip_validee = False
    db.commit()
    db.refresh(lit)
    return lit


@routeur.patch(
    "/{lit_id}/identite",
    response_model=LitOut,
    dependencies=[Depends(exiger_roles(*ROLES_ACTIONS_LITS))],
)
def completer_identite_lit(
    lit_id: uuid.UUID,
    donnees: CompleterIdentiteLitSchema,
    db: Session = Depends(obtenir_db),
):
    lit = db.query(Lit).filter(Lit.id == lit_id).with_for_update().one_or_none()
    if lit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lit introuvable.")
    if lit.statut != StatutLit.OCCUPE or not lit.urgence_vitale:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Seule une admission vitale avec identité provisoire peut être complétée.",
        )
    lit.nom_patient_actuel = donnees.nom_patient.strip()
    lit.prenoms_patient_actuel = donnees.prenoms_patient.strip()
    lit.patient_id = donnees.patient_id
    lit.urgence_vitale = False
    db.commit()
    db.refresh(lit)
    return lit


@routeur.post(
    "/{lit_source_id}/reserver-transfert",
    response_model=LitOut,
    dependencies=[Depends(exiger_roles(*ROLES_ACTIONS_LITS))],
)
def reserver_lit_pour_transfert(
    lit_source_id: uuid.UUID,
    donnees: ReservationTransfertSchema,
    db: Session = Depends(obtenir_db),
):
    """Réserve temporairement une destination uniquement pour un transfert immédiat."""
    actualiser_etats_temporises(db)
    ids = sorted([lit_source_id, donnees.lit_destination_id], key=str)
    lits = db.query(Lit).filter(Lit.id.in_(ids)).order_by(Lit.id).with_for_update().all()
    par_id = {lit.id: lit for lit in lits}
    source = par_id.get(lit_source_id)
    destination = par_id.get(donnees.lit_destination_id)
    if source is None or destination is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lit source ou destination introuvable.")
    if source.id == destination.id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="La destination doit être un autre lit.")
    if source.statut != StatutLit.OCCUPE:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Le lit source n'est plus occupé.")
    if destination.statut != StatutLit.LIBRE:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Le lit de destination n'est plus disponible.")
    if source.categorie == destination.categorie:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choisissez une autre zone pour le transfert.")
    _verifier_regles_admission(
        db, destination, donnees.motif_infectieux, donnees.facturation_vip_validee
    )

    destination.statut = StatutLit.RESERVE
    destination.date_reservation = datetime.now(timezone.utc)
    destination.lit_source_reservation_id = source.id
    destination.mission_reservation_id = None
    destination.nom_patient_actuel = source.nom_patient_actuel
    destination.prenoms_patient_actuel = source.prenoms_patient_actuel
    destination.patient_id = source.patient_id
    destination.motif_admission = source.motif_admission
    destination.motif_infectieux = donnees.motif_infectieux.strip() if donnees.motif_infectieux else None
    destination.urgence_vitale = source.urgence_vitale
    destination.facturation_vip_validee = donnees.facturation_vip_validee
    db.commit()
    db.refresh(destination)
    return destination


@routeur.post(
    "/{lit_destination_id}/confirmer-transfert",
    response_model=LitOut,
    dependencies=[Depends(exiger_roles(*ROLES_ACTIONS_LITS))],
)
def confirmer_transfert_lit(
    lit_destination_id: uuid.UUID,
    donnees: ConfirmationTransfertSchema,
    db: Session = Depends(obtenir_db),
):
    """Finalise le transfert et déclenche, si besoin, le bionettoyage du lit source."""
    actualiser_etats_temporises(db)
    ids = sorted([lit_destination_id, donnees.lit_source_id], key=str)
    lits = db.query(Lit).filter(Lit.id.in_(ids)).order_by(Lit.id).with_for_update().all()
    par_id = {lit.id: lit for lit in lits}
    destination = par_id.get(lit_destination_id)
    source = par_id.get(donnees.lit_source_id)
    if source is None or destination is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lit source ou destination introuvable.")
    if (
        destination.statut != StatutLit.RESERVE
        or destination.lit_source_reservation_id != source.id
        or duree_depuis(destination.date_reservation) > DUREE_RESERVATION_TRANSFERT
        or source.statut != StatutLit.OCCUPE
    ):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La réservation de transfert a expiré ou n'est plus valide.")

    maintenant = datetime.now(timezone.utc)
    source.statut = statut_apres_liberation(source.categorie)
    source.date_liberation = maintenant
    source.date_debut_nettoyage = maintenant if source.statut == StatutLit.NETTOYAGE else None
    source.date_occupation = None
    source.date_reservation = None
    source.lit_source_reservation_id = None
    source.nom_patient_actuel = None
    source.prenoms_patient_actuel = None
    source.patient_id = None
    source.motif_admission = None
    source.motif_infectieux = None
    source.urgence_vitale = False
    source.facturation_vip_validee = False

    destination.statut = StatutLit.OCCUPE
    destination.date_occupation = maintenant
    destination.date_liberation = None
    destination.date_debut_nettoyage = None
    destination.date_reservation = None
    destination.lit_source_reservation_id = None
    destination.mission_reservation_id = None
    db.commit()
    db.refresh(destination)
    return destination


@routeur.post(
    "/{lit_destination_id}/annuler-reservation",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_roles(*ROLES_ACTIONS_LITS))],
)
def annuler_reservation_transfert(
    lit_destination_id: uuid.UUID,
    donnees: ConfirmationTransfertSchema,
    db: Session = Depends(obtenir_db),
):
    lit = db.query(Lit).filter(Lit.id == lit_destination_id).with_for_update().one_or_none()
    if lit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lit de destination introuvable.")
    if lit.statut != StatutLit.RESERVE or lit.lit_source_reservation_id != donnees.lit_source_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette réservation n'est plus active.")
    lit.statut = StatutLit.LIBRE
    lit.date_reservation = None
    lit.lit_source_reservation_id = None
    lit.mission_reservation_id = None
    lit.nom_patient_actuel = None
    lit.prenoms_patient_actuel = None
    lit.patient_id = None
    lit.motif_admission = None
    lit.motif_infectieux = None
    lit.urgence_vitale = False
    lit.facturation_vip_validee = False
    db.commit()


@routeur.post(
    "/{lit_id}/liberer",
    response_model=LitOut,
    dependencies=[Depends(exiger_roles(*ROLES_ACTIONS_LITS))],
)
def liberer_lit(lit_id: uuid.UUID, db: Session = Depends(obtenir_db)):
    """Libère un lit ; une sortie septique impose un bionettoyage terminal de 2 heures."""
    actualiser_etats_temporises(db)
    lit = db.query(Lit).filter(Lit.id == lit_id).with_for_update().one_or_none()
    if lit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lit introuvable.")
    if lit.statut != StatutLit.OCCUPE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ce lit n'est pas occupé (statut actuel : {lit.statut.value}).",
        )
    maintenant = datetime.now(timezone.utc)
    lit.statut = statut_apres_liberation(lit.categorie)
    lit.nom_patient_actuel = None
    lit.prenoms_patient_actuel = None
    lit.patient_id = None
    lit.motif_admission = None
    lit.date_liberation = maintenant
    lit.date_debut_nettoyage = maintenant if lit.statut == StatutLit.NETTOYAGE else None
    lit.date_occupation = None
    lit.date_reservation = None
    lit.lit_source_reservation_id = None
    lit.motif_infectieux = None
    lit.urgence_vitale = False
    lit.facturation_vip_validee = False

    db.commit()
    db.refresh(lit)
    return lit


# ---------- Gestion de l'inventaire, réservée au SuperAdmin ----------

@routeur.post(
    "",
    response_model=LitOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def creer_lit(donnees: CreationLitSchema, db: Session = Depends(obtenir_db)):
    if db.query(Lit).filter(Lit.numero == donnees.numero).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce numéro de lit existe déjà.")
    if db.get(CategorieLitInventaire, donnees.categorie) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catégorie de lit introuvable.")

    nouveau_lit = Lit(numero=donnees.numero, categorie=donnees.categorie)
    db.add(nouveau_lit)
    db.commit()
    db.refresh(nouveau_lit)
    return nouveau_lit


def _cle_categorie(nom: str) -> str:
    sans_accents = unicodedata.normalize("NFKD", nom)
    ascii_nom = sans_accents.encode("ascii", "ignore").decode("ascii").lower()
    cle = re.sub(r"[^a-z0-9]+", "_", ascii_nom).strip("_")
    return cle[:50].rstrip("_")


@routeur.post(
    "/categories",
    response_model=CategorieLitOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def creer_categorie_lit(
    donnees: CreationCategorieLitSchema,
    db: Session = Depends(obtenir_db),
):
    nom = donnees.nom.strip()
    cle = _cle_categorie(nom)
    if not cle:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le nom doit contenir au moins une lettre ou un chiffre.",
        )
    if db.get(CategorieLitInventaire, cle) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette catégorie existe déjà.")
    if db.query(CategorieLitInventaire).filter(CategorieLitInventaire.nom.ilike(nom)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette catégorie existe déjà.")

    categorie = CategorieLitInventaire(cle=cle, nom=nom)
    db.add(categorie)
    db.commit()
    db.refresh(categorie)
    return categorie


@routeur.put(
    "/{lit_id}",
    response_model=LitOut,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def modifier_lit(lit_id: uuid.UUID, donnees: ModificationLitSchema, db: Session = Depends(obtenir_db)):
    """Corrige un lit (numéro, catégorie) ou force son statut manuellement si besoin."""
    lit = db.get(Lit, lit_id)
    if lit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lit introuvable.")

    donnees_modifiees = donnees.model_dump(exclude_unset=True)
    if "numero" in donnees_modifiees:
        conflit = db.query(Lit).filter(Lit.numero == donnees_modifiees["numero"], Lit.id != lit_id).first()
        if conflit:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce numéro de lit existe déjà.")

    if "categorie" in donnees_modifiees and donnees_modifiees["categorie"] != lit.categorie:
        if lit.statut != StatutLit.LIBRE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La catégorie d'un lit occupé, réservé ou en nettoyage ne peut pas être modifiée.",
            )
        if db.get(CategorieLitInventaire, donnees_modifiees["categorie"]) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catégorie de lit introuvable.")

    for champ, valeur in donnees_modifiees.items():
        setattr(lit, champ, valeur)

    db.commit()
    db.refresh(lit)
    return lit


@routeur.delete(
    "/{lit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def supprimer_lit(lit_id: uuid.UUID, db: Session = Depends(obtenir_db)):
    lit = db.get(Lit, lit_id)
    if lit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lit introuvable.")
    if lit.statut != StatutLit.LIBRE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Seuls les lits libres peuvent être supprimés.",
        )
    db.delete(lit)
    db.commit()