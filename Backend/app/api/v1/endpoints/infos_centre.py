"""Routes pour les informations globales du centre : email + flotte téléphonique."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.api.deps import exiger_roles
from app.db.session import obtenir_db
from app.models.enums import RoleUtilisateur
from app.models.infos_centre import InfosCentre, TelephoneCentre
from app.schemas.infos_centre import InfosCentreModifierSchema, InfosCentreOut

routeur = APIRouter(prefix="/informations-centre", tags=["Informations du centre"])


def _obtenir_ou_creer(db: Session) -> InfosCentre:
    infos = (
        db.query(InfosCentre)
        .options(selectinload(InfosCentre.telephones))
        .filter(InfosCentre.id == 1)
        .first()
    )
    if infos is None:
        infos = InfosCentre(id=1)
        db.add(infos)
        db.commit()
        db.refresh(infos)
    return infos


@routeur.get("", response_model=InfosCentreOut)
def obtenir_infos_centre(db: Session = Depends(obtenir_db)):
    """Email et flotte téléphonique globale du centre. Accessible sans authentification."""
    return _obtenir_ou_creer(db)


@routeur.put(
    "",
    response_model=InfosCentreOut,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def modifier_infos_centre(donnees: InfosCentreModifierSchema, db: Session = Depends(obtenir_db)):
    """Remplace l'email et la liste complète des téléphones du centre (réservé au SuperAdmin)."""
    infos = _obtenir_ou_creer(db)
    infos.email_centre = donnees.email_centre

    infos.telephones.clear()
    for tel in donnees.telephones:
        infos.telephones.append(
            TelephoneCentre(numero=tel.numero, libelle=tel.libelle, ordre=tel.ordre)
        )

    db.commit()
    db.refresh(infos)
    return infos