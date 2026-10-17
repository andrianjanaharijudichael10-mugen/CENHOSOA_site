"""Schémas Pydantic pour la gestion des lits d'urgence."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import StatutLit


class CreationCategorieLitSchema(BaseModel):
    nom: str = Field(min_length=1, max_length=100)

    @field_validator("nom")
    @classmethod
    def nom_non_vide(cls, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("Le nom de la catégorie est obligatoire.")
        return valeur


class CategorieLitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cle: str
    nom: str


class CreationLitSchema(BaseModel):
    """Utilisé par le SuperAdmin pour ajouter un lit à une catégorie."""
    numero: str = Field(min_length=1, max_length=20)
    categorie: str = Field(min_length=1, max_length=50)


class ModificationLitSchema(BaseModel):
    """Utilisé par le SuperAdmin pour corriger un lit (numéro, catégorie, mise hors service...)."""
    numero: str | None = Field(default=None, min_length=1, max_length=20)
    categorie: str | None = Field(default=None, min_length=1, max_length=50)


class OccuperLitSchema(BaseModel):
    """Utilisé par le Major de Garde pour admettre un patient dans un lit libre."""
    nom_patient: str = Field(min_length=1, max_length=100)
    prenoms_patient: str = Field(min_length=1, max_length=150)
    motif_admission: str = Field(min_length=1, max_length=2000)
    motif_infectieux: str | None = Field(default=None, max_length=255)
    facturation_vip_validee: bool = False
    patient_id: uuid.UUID | None = Field(
        default=None, description="Optionnel : à renseigner si le patient a déjà un compte."
    )

    @field_validator("nom_patient", "prenoms_patient", "motif_admission")
    @classmethod
    def valeur_non_vide(cls, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("Ce champ est obligatoire.")
        return valeur


class AdmissionVitaleSchema(BaseModel):
    """Admission rapide en déchoquage, identité à compléter après stabilisation."""
    motif_admission: str | None = None


class ReservationTransfertSchema(BaseModel):
    lit_destination_id: uuid.UUID
    motif_transfert: str = Field(min_length=1, max_length=2000)
    motif_infectieux: str | None = Field(default=None, max_length=255)
    facturation_vip_validee: bool = False

    @field_validator("motif_transfert")
    @classmethod
    def motif_non_vide(cls, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("Le motif du transfert est obligatoire.")
        return valeur


class ClotureLitSchema(BaseModel):
    type_fin: Literal["sortie", "transfert_service"] = "sortie"
    motif: str | None = Field(default=None, max_length=2000)
    service_destination_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def service_requis_pour_transfert(self):
        if self.motif is not None:
            self.motif = self.motif.strip() or None
        if self.type_fin == "transfert_service" and self.service_destination_id is None:
            raise ValueError("Le service de destination est obligatoire pour un transfert.")
        if self.type_fin == "transfert_service" and not self.motif:
            raise ValueError("Le motif du transfert vers un service est obligatoire.")
        if self.type_fin == "sortie" and self.service_destination_id is not None:
            raise ValueError("Un service de destination ne peut être fourni que pour un transfert.")
        return self


class ConfirmationTransfertSchema(BaseModel):
    lit_source_id: uuid.UUID


class CompleterIdentiteLitSchema(BaseModel):
    nom_patient: str = Field(min_length=1, max_length=100)
    prenoms_patient: str = Field(min_length=1, max_length=150)
    patient_id: uuid.UUID | None = None


class LitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    numero: str
    categorie: str
    statut: StatutLit
    nom_patient_actuel: str | None
    prenoms_patient_actuel: str | None
    patient_id: uuid.UUID | None
    motif_admission: str | None
    date_occupation: datetime | None
    date_liberation: datetime | None
    date_debut_nettoyage: datetime | None
    date_reservation: datetime | None
    lit_source_reservation_id: uuid.UUID | None
    motif_infectieux: str | None
    urgence_vitale: bool
    facturation_vip_validee: bool


class ResumeOccupationSchema(BaseModel):
    """Vue d'ensemble du taux d'occupation, par catégorie."""
    categorie: str
    nom: str
    total: int
    libres: int
    occupes: int
    reserves: int = 0
    en_nettoyage: int = 0


class HistoriqueLitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    episode_id: uuid.UUID
    type_evenement: str
    nom_patient: str
    prenoms_patient: str
    lit_source_numero: str | None
    lit_source_categorie: str | None
    lit_destination_numero: str | None
    lit_destination_categorie: str | None
    service_destination_nom: str | None
    motif: str | None
    duree_occupation_secondes: int | None
    date_evenement: datetime
    acteur_identifiant: str


class PageHistoriqueLitOut(BaseModel):
    items: list["PatientHistoriqueOut"]
    total_patients: int
    limit: int
    offset: int


class PatientHistoriqueOut(BaseModel):
    patient_historique_id: uuid.UUID
    nom_patient: str
    prenoms_patient: str
    total_episodes: int
    derniere_urgence: datetime


class DetailPatientHistoriqueOut(BaseModel):
    patient_historique_id: uuid.UUID
    nom_patient: str
    prenoms_patient: str
    total_episodes: int
    items: list[HistoriqueLitOut]