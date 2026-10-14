from datetime import datetime, timedelta, timezone

from app.core.regles_lits import (
    DUREE_BIONETTOYAGE,
    DUREE_RESERVATION_TRANSFERT,
    DUREE_TRIAGE_MAX,
    DUREE_URGENCE_MAX,
    SEUIL_ALERTE_TRIAGE,
    SEUIL_PLAN_BLANC,
    date_utc,
    duree_depuis,
    motif_infectieux_valide,
    statut_apres_liberation,
)
from app.models.enums import CategorieLit, StatutLit


def test_delais_du_cycle_de_vie_des_lits():
    assert DUREE_TRIAGE_MAX == timedelta(minutes=30)
    assert SEUIL_ALERTE_TRIAGE == timedelta(minutes=45)
    assert DUREE_URGENCE_MAX == timedelta(hours=12)
    assert DUREE_BIONETTOYAGE == timedelta(hours=2)
    assert DUREE_RESERVATION_TRANSFERT == timedelta(minutes=5)
    assert SEUIL_PLAN_BLANC == 19


def test_conversion_utc_et_calcul_de_duree_acceptent_les_dates_naives():
    debut = datetime(2026, 1, 1, 10, 0)
    fin = datetime(2026, 1, 1, 10, 45, tzinfo=timezone.utc)

    assert date_utc(debut) == debut.replace(tzinfo=timezone.utc)
    assert duree_depuis(debut, fin) == timedelta(minutes=45)
    assert duree_depuis(None, fin) == timedelta(0)


def test_sortie_de_salle_septique_demarre_un_nettoyage_terminal():
    assert statut_apres_liberation(CategorieLit.SALLE_SEPTIQUE) == StatutLit.NETTOYAGE
    assert statut_apres_liberation(CategorieLit.URGENCE) == StatutLit.LIBRE


def test_motif_infectieux_est_obligatoire_uniquement_en_zone_septique():
    assert not motif_infectieux_valide(CategorieLit.SALLE_SEPTIQUE, None)
    assert not motif_infectieux_valide(CategorieLit.SALLE_SEPTIQUE, "  ")
    assert motif_infectieux_valide(CategorieLit.SALLE_SEPTIQUE, "BMR")
    assert motif_infectieux_valide(CategorieLit.URGENCE, None)


def test_une_categorie_personnalisee_ne_recoit_pas_les_regles_speciales():
    assert statut_apres_liberation("soins_continus") == StatutLit.LIBRE
    assert motif_infectieux_valide("soins_continus", None)
