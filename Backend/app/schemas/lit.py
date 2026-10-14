"""Schémas Pydantic pour la gestion des lits d'urgence."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

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
    motif_admission: str | None = None
    motif_infectieux: str | None = Field(default=None, max_length=255)
    facturation_vip_validee: bool = False
    patient_id: uuid.UUID | None = Field(
        default=None, description="Optionnel : à renseigner si le patient a déjà un compte."
    )


class AdmissionVitaleSchema(BaseModel):
    """Admission rapide en déchoquage, identité à compléter après stabilisation."""
    motif_admission: str | None = None


class ReservationTransfertSchema(BaseModel):
    lit_destination_id: uuid.UUID
    motif_infectieux: str | None = Field(default=None, max_length=255)
    facturation_vip_validee: bool = False


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