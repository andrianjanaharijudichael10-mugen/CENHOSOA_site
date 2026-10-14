import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.lits import (
    _cle_categorie,
    creer_categorie_lit,
    creer_lit,
    routeur,
)
from app.models.categorie_lit import CategorieLitInventaire
from app.models.enums import RoleUtilisateur
from app.models.lit import Lit
from app.models.utilisateur import Utilisateur
from app.schemas.lit import CreationCategorieLitSchema, CreationLitSchema


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
def test_superadmin_ne_peut_pas_modifier_occupation_lits(chemin):
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

    with pytest.raises(HTTPException) as erreur:
        verifier_role(superadmin)

    assert erreur.value.status_code == 403


@pytest.mark.parametrize("chemin", ROUTES_ACTIONS_OCCUPATION)
def test_major_de_garde_peut_effectuer_les_actions_sur_les_lits(chemin):
    route = next(route for route in routeur.routes if route.path == chemin)
    verifier_role = next(
        dependance.call
        for dependance in route.dependant.dependencies
        if dependance.call.__name__ == "verificateur"
    )
    major_de_garde = Utilisateur(
        identifiant="major",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.MAJOR_DE_GARDE,
    )

    assert verifier_role(major_de_garde) is major_de_garde


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
