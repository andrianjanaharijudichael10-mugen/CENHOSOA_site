"""Schémas des consultations et dossiers médicaux."""
import uuid
from datetime import date, datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator, model_validator


class MedicamentPrescritSchema(BaseModel):
    nom: str = Field(min_length=1, max_length=300)
    indication: Literal[
        "Traitement de fond de la migraine",
        "Traitement de la crise migraineuse",
        "Traitement des douleurs neuropathiques",
        "Autre",
    ] | None = None
    forme: Literal["comprime", "solution_buvable", "gelule", "autre"] | None = None
    matin: int | float | None = Field(default=None, ge=0)
    midi: int | float | None = Field(default=None, ge=0)
    soir: int | float | None = Field(default=None, ge=0)
    posologie: str | None = Field(default=None, max_length=2000)
    duree_jours: int | None = Field(default=None, ge=1, le=3650)

    @field_validator("nom")
    @classmethod
    def nom_non_vide(cls, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("Le nom du médicament ne peut pas être vide.")
        return valeur

    @field_validator("posologie")
    @classmethod
    def posologie_normalisee(cls, valeur: str | None) -> str | None:
        if valeur is None:
            return None
        return valeur.strip() or None

    @field_validator("matin", "midi", "soir", mode="before")
    @classmethod
    def dose_vide_vers_none(cls, valeur: object) -> object:
        if isinstance(valeur, str) and not valeur.strip():
            return None
        if isinstance(valeur, str):
            return valeur.strip()
        return valeur

    @model_validator(mode="after")
    def doses_avec_unites_adaptees_a_la_forme(self):
        for moment in ("matin", "midi", "soir"):
            valeur = getattr(self, moment)
            if valeur is None:
                continue
            if self.forme in {"comprime", "gelule"}:
                if not float(valeur).is_integer():
                    raise ValueError("Les comprimés et gélules doivent être prescrits en unités entières.")
                setattr(self, moment, int(valeur))
            elif self.forme == "solution_buvable":
                setattr(self, moment, float(valeur))
        return self

class CreationConsultationSchema(BaseModel):
    remarques: str = Field(min_length=1, max_length=10000)
    medicaments_prescrits: list[MedicamentPrescritSchema] = Field(default_factory=list, max_length=50)
    controle_supplementaire: str | None = Field(default=None, max_length=10000)
    medicaments: str | None = Field(default=None, max_length=10000)
    quantite_matin: str | None = Field(default=None, max_length=500)
    quantite_midi: str | None = Field(default=None, max_length=500)
    quantite_soir: str | None = Field(default=None, max_length=500)
    ordonnance: str | None = Field(default=None, max_length=10000)
    prochain_rendez_vous: datetime | None = None

    @field_validator(
        "remarques",
        "controle_supplementaire",
        "medicaments",
        "quantite_matin",
        "quantite_midi",
        "quantite_soir",
        "ordonnance",
    )
    @classmethod
    def texte_non_vide(cls, valeur: str | None, info: ValidationInfo) -> str | None:
        if valeur is None:
            return None
        valeur = valeur.strip()
        if not valeur and info.field_name == "remarques":
            raise ValueError("Le texte ne peut pas être vide.")
        return valeur or None

    @field_validator("prochain_rendez_vous")
    @classmethod
    def prochain_rendez_vous_futur(cls, valeur: datetime | None) -> datetime | None:
        if valeur is None:
            return None
        if valeur.tzinfo is None or valeur.utcoffset() is None:
            raise ValueError("La date du prochain rendez-vous doit inclure un fuseau horaire.")
        if valeur <= datetime.now(timezone.utc):
            raise ValueError("La date du prochain rendez-vous doit être dans le futur.")
        return valeur


class ConsultationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    rendez_vous_id: uuid.UUID
    remarques: str
    medicaments_prescrits: list[MedicamentPrescritSchema] | None
    controle_supplementaire: str | None
    medicaments: str | None
    quantite_matin: str | None
    quantite_midi: str | None
    quantite_soir: str | None
    ordonnance: str | None
    date_creation: datetime


class DossierMedicalOut(BaseModel):
    patient_id: uuid.UUID
    patient_nom: str
    patient_prenoms: str
    patient_date_naissance: date | None
    patient_lieu_naissance: str | None
    patient_adresse: str | None
    patient_a_photo: bool
    consultations: list[ConsultationOut]


class RendezVousDossierOut(BaseModel):
    id: uuid.UUID
    service_nom: str
    date_souhaitee: datetime
    date_confirmee: datetime | None
    numero_file: int | None
    motif: str
    statut: str
    commentaire: str | None
    consultation: ConsultationOut | None


class DossierPatientCompletOut(BaseModel):
    patient_id: uuid.UUID
    patient_nom: str
    patient_prenoms: str
    patient_telephone: str
    patient_date_naissance: date | None
    patient_lieu_naissance: str | None
    patient_adresse: str | None
    patient_a_photo: bool
    rendez_vous: list[RendezVousDossierOut]
