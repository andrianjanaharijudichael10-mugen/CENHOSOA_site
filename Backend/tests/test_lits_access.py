import uuid

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.v1.endpoints.lits import (
    _cle_categorie,
    completer_identite_lit,
    creer_categorie_lit,
    creer_lit,
    routeur,
)
from app.api.v1.endpoints.ambulances import routeur as routeur_ambulances
from app.models.ambulance import MissionAmbulance
from app.models.categorie_lit import CategorieLitInventaire
from app.models.enums import ROLES_GESTION_URGENCES, RoleUtilisateur, StatutLit
from app.models.lit import Lit
from app.models.utilisateur import Utilisateur
from app.schemas.lit import (
    ClotureLitSchema,
    CompleterIdentiteLitSchema,
    CreationCategorieLitSchema,
    CreationLitSchema,
    OccuperLitSchema,
)


ROUTES_ACTIONS_OCCUPATION = (
    "/lits/{lit_id}/occuper",
    "/lits/{lit_id}/urgence-vitale",
    "/lits/{lit_id}/identite",
    "/lits/{lit_source_id}/reserver-transfert",
    "/lits/{lit_destination_id}/confirmer-transfert",
    "/lits/{lit_destination_id}/annuler-reservation",
    "/lits/{lit_id}/liberer",
)


@pytest.mark.parametrize("chemin", ROUTES_ACTIONS_OCCUPATION)
def test_superadmin_peut_modifier_occupation_lits(chemin):
    route = next(route for route in routeur.routes if route.path == chemin)
    verifier_role = next(
        dependance.call
        for dependance in route.dependant.dependencies
        if dependance.call.__name__ == "verificateur"
    )
    superadmin = Utilisateur(
        identifiant="admin",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
    )

    assert verifier_role(superadmin) is superadmin


@pytest.mark.parametrize(
    "chemin",
    (
        "/lits/historique",
        "/lits/historique/patients/{patient_historique_id}",
    ),
)
def test_seul_le_superadmin_peut_consulter_l_historique_des_lits(chemin):
    route = next(route for route in routeur.routes if route.path == chemin)
    verifier_role = next(
        dependance.call
        for dependance in route.dependant.dependencies
        if dependance.call.__name__ == "verificateur"
    )
    superadmin = Utilisateur(
        identifiant="admin",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
    )
    major = Utilisateur(
        identifiant="major",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.MAJOR_DE_GARDE,
    )

    assert verifier_role(superadmin) is superadmin
    with pytest.raises(HTTPException) as erreur:
        verifier_role(major)
    assert erreur.value.status_code == 403


def test_motifs_d_attribution_et_de_transfert_sont_obligatoires():
    with pytest.raises(ValidationError):
        OccuperLitSchema(nom_patient="Nom", prenoms_patient="Prénom")
    with pytest.raises(ValidationError):
        OccuperLitSchema(
            nom_patient="Nom",
            prenoms_patient="Prénom",
            motif_admission="   ",
        )
    with pytest.raises(ValidationError):
        ClotureLitSchema(
            type_fin="transfert_service",
            motif="  ",
            service_destination_id=uuid.uuid4(),
        )


def test_completer_identite_du_lit_met_a_jour_la_mission_ambulance_associee():
    lit_id = uuid.uuid4()
    patient_id = uuid.uuid4()
    lit = Lit(
        id=lit_id,
        numero="URG-01",
        categorie="urgence",
        statut=StatutLit.OCCUPE,
        nom_patient_actuel="non renseigné",
        prenoms_patient_actuel="Patient",
        patient_id=None,
        urgence_vitale=False,
        episode_id_actuel=None,
    )
    mission = type(
        "Mission",
        (),
        {
            "lit_id": lit_id,
            "patient_id": None,
            "nom_patient": "non renseigné",
            "prenoms_patient": "Patient",
        },
    )()

    class RequeteFictive:
        def __init__(self, resultat):
            self.resultat = resultat

        def filter(self, *args):
            return self

        def order_by(self, *args):
            return self

        def with_for_update(self):
            return self

        def one_or_none(self):
            return self.resultat

        def first(self):
            return self.resultat

    class SessionFictive:
        def query(self, modele):
            resultat = lit if modele is Lit else mission if modele is MissionAmbulance else None
            return RequeteFictive(resultat)

        def commit(self):
            pass

        def refresh(self, objet):
            pass

    resultat = completer_identite_lit(
        lit_id,
        CompleterIdentiteLitSchema(
            nom_patient="Rabe",
            prenoms_patient="Jean",
            patient_id=patient_id,
        ),
        SessionFictive(),
    )

    assert resultat is lit
    assert lit.nom_patient_actuel == mission.nom_patient == "Rabe"
    assert lit.prenoms_patient_actuel == mission.prenoms_patient == "Jean"
    assert lit.patient_id == mission.patient_id == patient_id


@pytest.mark.parametrize("chemin", ROUTES_ACTIONS_OCCUPATION)
@pytest.mark.parametrize("role", sorted(ROLES_GESTION_URGENCES, key=lambda role: role.value))
def test_roles_operationnels_peuvent_effectuer_les_actions_sur_les_lits(chemin, role):
    route = next(route for route in routeur.routes if route.path == chemin)
    verifier_role = next(
        dependance.call
        for dependance in route.dependant.dependencies
        if dependance.call.__name__ == "verificateur"
    )
    utilisateur = Utilisateur(
        identifiant=role.value,
        mot_de_passe_hash="hash",
        role=role,
    )

    assert verifier_role(utilisateur) is utilisateur


@pytest.mark.parametrize("role", sorted(ROLES_GESTION_URGENCES, key=lambda role: role.value))
def test_roles_operationnels_peuvent_acceder_aux_ambulances(role):
    route = next(
        route for route in routeur_ambulances.routes
        if route.path == "/ambulances" and "GET" in route.methods
    )
    verifier_role = next(
        dependance.call
        for dependance in route.dependant.dependencies
        if dependance.call.__name__ == "verificateur"
    )
    utilisateur = Utilisateur(
        identifiant=role.value,
        mot_de_passe_hash="hash",
        role=role,
    )

    assert verifier_role(utilisateur) is utilisateur


def test_cle_categorie_est_stable_et_sans_accents():
    assert _cle_categorie("Soins continus") == "soins_continus"
    assert _cle_categorie("Déchoquage") == "dechoquage"


def test_seul_le_superadmin_peut_creer_une_categorie():
    route = next(
        route
        for route in routeur.routes
        if route.path == "/lits/categories" and "POST" in route.methods
    )
    verifier_role = next(
        dependance.call
        for dependance in route.dependant.dependencies
        if dependance.call.__name__ == "verificateur"
    )
    superadmin = Utilisateur(
        identifiant="admin",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
    )
    major_de_garde = Utilisateur(
        identifiant="major",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.MAJOR_DE_GARDE,
    )

    assert verifier_role(superadmin) is superadmin
    with pytest.raises(HTTPException) as erreur:
        verifier_role(major_de_garde)
    assert erreur.value.status_code == 403


def test_superadmin_peut_ajouter_un_lit_a_une_categorie_sans_plafond():
    categorie = CategorieLitInventaire(cle="salle_septique", nom="Salle septique")

    class RequeteFictive:
        def filter(self, *conditions):
            return self

        def first(self):
            return None

    class SessionFictive:
        ajoute = None

        def query(self, modele):
            assert modele is Lit
            return RequeteFictive()

        def get(self, modele, cle):
            assert modele is CategorieLitInventaire
            assert cle == categorie.cle
            return categorie

        def add(self, objet):
            self.ajoute = objet

        def commit(self):
            pass

        def refresh(self, objet):
            pass

    db = SessionFictive()
    resultat = creer_lit(
        CreationLitSchema(numero="SEP-03", categorie="salle_septique"),
        db,
    )

    assert resultat.categorie == "salle_septique"
    assert resultat.numero == "SEP-03"
    assert db.ajoute is resultat


def test_superadmin_peut_creer_une_categorie_personnalisee_et_son_premier_lit():
    class RequeteFictive:
        def filter(self, *conditions):
            return self

        def first(self):
            return None

    class SessionFictive:
        categories = {}
        lit = None

        def query(self, modele):
            assert modele in (CategorieLitInventaire, Lit)
            return RequeteFictive()

        def get(self, modele, cle):
            assert modele is CategorieLitInventaire
            return self.categories.get(cle)

        def add(self, objet):
            if isinstance(objet, CategorieLitInventaire):
                self.categories[objet.cle] = objet
            else:
                self.lit = objet

        def commit(self):
            pass

        def refresh(self, objet):
            pass

    db = SessionFictive()
    categorie = creer_categorie_lit(
        CreationCategorieLitSchema(nom="Soins continus"),
        db,
    )
    lit = creer_lit(
        CreationLitSchema(numero="SC-01", categorie=categorie.cle),
        db,
    )

    assert categorie.cle == "soins_continus"
    assert categorie.nom == "Soins continus"
    assert lit.categorie == categorie.cle
    assert db.lit is lit
