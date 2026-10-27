import uuid
from datetime import datetime, timedelta, timezone
from importlib import import_module

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import_module("app.models")
from app.api.v1.endpoints.lits import (
    confirmer_transfert_lit,
    consulter_historique_lits,
    consulter_parcours_patient,
    liberer_lit,
    occuper_lit,
    reserver_lit_pour_transfert,
)
from app.db.base import Base
from app.models.enums import RoleUtilisateur, StatutLit
from app.models.historique_lit import HistoriqueLit
from app.models.lit import Lit
from app.models.service import Service
from app.models.utilisateur import Utilisateur
from app.schemas.lit import (
    ClotureLitSchema,
    ConfirmationTransfertSchema,
    OccuperLitSchema,
    ReservationTransfertSchema,
)


@pytest.fixture
def db():
    moteur = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(moteur)
    try:
        with Session(moteur) as session:
            yield session
    finally:
        moteur.dispose()


def test_parcours_complet_est_journalise_et_historique_limite_aux_episodes_clotures(db):
    acteur = Utilisateur(
        identifiant="major-test",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.MAJOR_DE_GARDE,
    )
    lit_urgence = Lit(numero="URG-01", categorie="urgence", statut=StatutLit.LIBRE)
    lit_dechocage = Lit(numero="DECH-01", categorie="dechocage", statut=StatutLit.LIBRE)
    lit_patient_suivant = Lit(numero="URG-02", categorie="urgence", statut=StatutLit.LIBRE)
    service = Service(nom="Cardiologie", est_actif=True)
    db.add_all([acteur, lit_urgence, lit_dechocage, lit_patient_suivant, service])
    db.commit()

    occuper_lit(
        lit_urgence.id,
        OccuperLitSchema(
            nom_patient="Rabe",
            prenoms_patient="Jean",
            motif_admission="Surveillance après malaise",
        ),
        db,
        acteur,
    )
    admission = (
        db.query(HistoriqueLit)
        .filter(HistoriqueLit.type_evenement == "admission")
        .one()
    )
    episode_id = admission.episode_id

    reserver_lit_pour_transfert(
        lit_urgence.id,
        ReservationTransfertSchema(
            lit_destination_id=lit_dechocage.id,
            motif_transfert="Aggravation de l’état clinique",
        ),
        db,
    )
    lit_urgence.date_occupation = datetime.now(timezone.utc) - timedelta(hours=1)
    db.commit()
    confirmer_transfert_lit(
        lit_dechocage.id,
        ConfirmationTransfertSchema(lit_source_id=lit_urgence.id),
        db,
        acteur,
    )

    transfert = (
        db.query(HistoriqueLit)
        .filter(HistoriqueLit.type_evenement == "transfert_interne")
        .one()
    )
    assert transfert.episode_id == episode_id
    assert transfert.lit_source_numero == "URG-01"
    assert transfert.lit_destination_numero == "DECH-01"
    assert transfert.motif == "Aggravation de l’état clinique"
    assert transfert.duree_occupation_secondes >= 3600

    liberation = ClotureLitSchema(
        type_fin="transfert_service",
        motif="Prise en charge spécialisée",
        service_destination_id=service.id,
    )
    liberer_lit(lit_dechocage.id, liberation, db, acteur)

    occuper_lit(
        lit_patient_suivant.id,
        OccuperLitSchema(
            nom_patient="Rasoanaivo",
            prenoms_patient="Marie",
            motif_admission="Épisode encore en cours",
        ),
        db,
        acteur,
    )
    occuper_lit(
        lit_urgence.id,
        OccuperLitSchema(
            nom_patient="Rabe",
            prenoms_patient="Jean",
            motif_admission="Nouvel épisode",
        ),
        db,
        acteur,
    )
    liberer_lit(lit_urgence.id, db=db, utilisateur=acteur)

    resultat = consulter_historique_lits(limit=100, offset=0, db=db)
    assert resultat.total_patients == 1
    patient = resultat.items[0]
    assert patient.prenoms_patient == "Jean"
    assert patient.nom_patient == "Rabe"
    assert patient.total_episodes == 2
    parcours = consulter_parcours_patient(patient.patient_historique_id, db=db)
    assert parcours.total_episodes == 2
    assert {item.episode_id for item in parcours.items} >= {episode_id}
    assert [item.type_evenement for item in parcours.items[:2]] == [
        "admission",
        "sortie",
    ]
    assert [item.type_evenement for item in parcours.items[2:5]] == [
        "admission",
        "transfert_interne",
        "transfert_service",
    ]
    transfert_service = next(
        item for item in parcours.items if item.type_evenement == "transfert_service"
    )
    assert transfert_service.service_destination_nom == "Cardiologie"
    assert transfert_service.motif == "Prise en charge spécialisée"
    assert transfert_service.duree_occupation_secondes is not None
