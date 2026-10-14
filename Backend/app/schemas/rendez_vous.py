"""Schémas d'entrée et de sortie des rendez-vous."""
import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

StatutRendezVous = Literal[
    "en_attente", "confirme", "refuse", "annule", "arrive", "termine", "absent"
]
StatutsFinaux = {"refuse", "annule", "termine", "absent"}


class CreationRendezVousSchema(BaseModel):
    service_id: uuid.UUID
    date_souhaitee: datetime
    motif: str = Field(min_length=1, max_length=2000)

    @field_validator("date_souhaitee")
    @classmethod
    def date_souhaitee_dans_le_futur(cls, valeur: datetime) -> datetime:
        if valeur.tzinfo is None or valeur.utcoffset() is None:
            raise ValueError("La date souhaitée doit inclure un fuseau horaire.")
        if valeur <= datetime.now(timezone.utc):
            raise ValueError("La date souhaitée doit être dans le futur.")
        return valeur

    @field_validator("motif")
    @classmethod
    def motif_non_vide(cls, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("Le motif ne peut pas être vide.")
        return valeur


class CreationCreneauSchema(BaseModel):
    service_id: uuid.UUID
    date_heure: datetime
    date_fin: datetime
    patient_id: uuid.UUID | None = None
    motif: str | None = Field(default=None, max_length=2000)

    @field_validator("date_heure")
    @classmethod
    def date_heure_futur_avec_fuseau(cls, valeur: datetime) -> datetime:
        if valeur.tzinfo is None or valeur.utcoffset() is None:
            raise ValueError("La date du créneau doit inclure un fuseau horaire.")
        if valeur <= datetime.now(timezone.utc):
            raise ValueError("La date du créneau doit être dans le futur.")
        return valeur

    @field_validator("date_fin")
    @classmethod
    def date_fin_avec_fuseau(cls, valeur: datetime) -> datetime:
        if valeur.tzinfo is None or valeur.utcoffset() is None:
            raise ValueError("L'heure de fermeture doit inclure un fuseau horaire.")
        return valeur

    @field_validator("motif")
    @classmethod
    def motif_non_vide(cls, valeur: str | None) -> str | None:
        if valeur is None:
            return None
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("Le motif ne peut pas être vide.")
        return valeur

    @model_validator(mode="after")
    def motif_requis_si_patient(self):
        if self.patient_id is not None and self.motif is None:
            raise ValueError("Le motif est obligatoire pour ajouter un patient au créneau.")
        if self.date_fin <= self.date_heure:
            raise ValueError("L'heure de fermeture doit être après l'heure de début.")
        return self


class ModificationCreneauSchema(BaseModel):
    est_ouvert: bool | None = None
    date_heure: datetime | None = None
    date_fin: datetime | None = None

    @field_validator("date_heure")
    @classmethod
    def date_heure_futur_avec_fuseau(cls, valeur: datetime | None) -> datetime | None:
        if valeur is not None:
            if valeur.tzinfo is None or valeur.utcoffset() is None:
                raise ValueError("La date du créneau doit inclure un fuseau horaire.")
            if valeur <= datetime.now(timezone.utc):
                raise ValueError("La date du créneau doit être dans le futur.")
        return valeur

    @field_validator("date_fin")
    @classmethod
    def date_fin_avec_fuseau(cls, valeur: datetime | None) -> datetime | None:
        if valeur is not None and (valeur.tzinfo is None or valeur.utcoffset() is None):
            raise ValueError("L'heure de fermeture doit inclure un fuseau horaire.")
        return valeur

    @model_validator(mode="after")
    def verifier_modification(self):
        if (self.date_heure is None) != (self.date_fin is None):
            raise ValueError("Les heures de début et de fin doivent être modifiées ensemble.")
        if self.date_heure is not None and self.date_fin <= self.date_heure:
            raise ValueError("L'heure de fermeture doit être après l'heure de début.")
        if self.est_ouvert is None and self.date_heure is None:
            raise ValueError("Aucune modification de créneau n'a été fournie.")
        return self


class ReservationCreneauSchema(BaseModel):
    motif: str = Field(min_length=1, max_length=2000)

    @field_validator("motif")
    @classmethod
    def motif_non_vide(cls, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("Le motif ne peut pas être vide.")
        return valeur


class AffectationPatientCreneauSchema(ReservationCreneauSchema):
    patient_id: uuid.UUID


class CreneauOut(BaseModel):
    id: uuid.UUID
    service_id: uuid.UUID
    service_nom: str
    date_heure: datetime
    date_fin: datetime
    est_ouvert: bool
    nombre_patients: int


class PatientCreneauOut(BaseModel):
    id: uuid.UUID
    nom: str
    prenoms: str
    telephone: str


class ModificationRendezVousSchema(BaseModel):
    statut: StatutRendezVous
    date_confirmee: datetime | None = None
    commentaire: str | None = Field(default=None, max_length=2000)

    @field_validator("date_confirmee")
    @classmethod
    def date_confirmee_avec_fuseau(cls, valeur: datetime | None) -> datetime | None:
        if valeur is not None and (valeur.tzinfo is None or valeur.utcoffset() is None):
            raise ValueError("La date confirmée doit inclure un fuseau horaire.")
        return valeur

    @field_validator("commentaire")
    @classmethod
    def commentaire_non_vide(cls, valeur: str | None) -> str | None:
        if valeur is None:
            return None
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("Le commentaire ne peut pas être vide.")
        return valeur

    @model_validator(mode="after")
    def date_requise_pour_confirmation(self):
        if self.statut == "confirme" and self.date_confirmee is None:
            raise ValueError("Une date confirmée est obligatoire pour confirmer le rendez-vous.")
        return self


class RendezVousOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    patient_nom: str
    patient_prenoms: str
    patient_telephone: str
    service_id: uuid.UUID | None
    service_nom: str
    creneau_id: uuid.UUID | None
    numero_file: int | None
    date_souhaitee: datetime
    date_confirmee: datetime | None
    date_confirmee_vue: datetime | None
    motif: str
    statut: StatutRendezVous
    commentaire: str | None
    date_creation: datetime
    date_modification: datetime


class StatistiqueRendezVousMoisOut(BaseModel):
    annee: int
    mois: int
    total: int


class StatistiquesRendezVousOut(BaseModel):
    total: int
    statuts: dict[str, int]
    mensuel: list[StatistiqueRendezVousMoisOut]
