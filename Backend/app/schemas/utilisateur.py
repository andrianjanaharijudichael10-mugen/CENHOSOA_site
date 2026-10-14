"""Schémas Pydantic pour la sortie des utilisateurs et la création du personnel."""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import RoleUtilisateur


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    nom: str
    prenoms: str
    telephone: str
    date_naissance: date | None
    lieu_naissance: str | None
    adresse: str | None


class ModificationProfilPatientSchema(BaseModel):
    nom: str = Field(min_length=1, max_length=100)
    prenoms: str = Field(min_length=1, max_length=150)
    date_naissance: date | None = None
    lieu_naissance: str | None = Field(default=None, max_length=150)
    adresse: str | None = Field(default=None, max_length=255)

    @field_validator("nom", "prenoms")
    @classmethod
    def nom_non_vide(cls, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("Ce champ ne peut pas être vide.")
        return valeur

    @field_validator("lieu_naissance", "adresse")
    @classmethod
    def texte_normalise(cls, valeur: str | None) -> str | None:
        if valeur is None:
            return None
        return valeur.strip() or None

    @field_validator("date_naissance")
    @classmethod
    def date_naissance_non_future(cls, valeur: date | None) -> date | None:
        if valeur is not None and valeur > date.today():
            raise ValueError("La date de naissance ne peut pas être dans le futur.")
        return valeur


class PersonnelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    nom: str
    prenoms: str
    matricule: str
    service: str | None
    telephone: str | None


class UtilisateurOut(BaseModel):
    """Représentation publique d'un compte, renvoyée après connexion ou sur /moi."""
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    identifiant: str
    role: RoleUtilisateur
    est_actif: bool
    date_creation: datetime
    derniere_connexion: datetime | None = None
    patient: PatientOut | None = None
    personnel: PersonnelOut | None = None


class CreationPersonnelSchema(BaseModel):
    """Utilisé par un SuperAdmin pour créer un compte du personnel ou un autre SuperAdmin."""
    mot_de_passe: str = Field(min_length=8, max_length=128)
    role: RoleUtilisateur
    nom: str = Field(min_length=1, max_length=100)
    prenoms: str = Field(min_length=1, max_length=150)
    matricule: str = Field(min_length=1, max_length=50)
    service: str | None = Field(default=None, max_length=100)
    telephone: str | None = Field(default=None, max_length=20)

    @field_validator("matricule")
    @classmethod
    def matricule_non_vide(cls, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("Le matricule est obligatoire.")
        return valeur


class ModificationStatutUtilisateurSchema(BaseModel):
    est_actif: bool


class ReinitialisationMotDePassePersonnelSchema(BaseModel):
    nouveau_mot_de_passe: str = Field(min_length=8, max_length=128)

    @field_validator("nouveau_mot_de_passe")
    @classmethod
    def nouveau_mot_de_passe_suffisamment_fort(cls, valeur: str) -> str:
        if not any(caractere.isdigit() for caractere in valeur):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre.")
        if not any(caractere.isalpha() for caractere in valeur):
            raise ValueError("Le mot de passe doit contenir au moins une lettre.")
        return valeur