"""Schémas Pydantic pour la gestion des services hospitaliers."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ServiceBaseSchema(BaseModel):
    nom: str = Field(min_length=1, max_length=100)
    description: str | None = None
    responsable: str | None = Field(default=None, max_length=150)
    photo_responsable_url: str | None = Field(default=None, max_length=500)
    horaires: str | None = Field(default=None, max_length=255)
    localisation: str | None = Field(default=None, max_length=150)
    telephone: str | None = Field(default=None, max_length=20)


class CreationServiceSchema(ServiceBaseSchema):
    pass


class ModificationServiceSchema(BaseModel):
    """Tous les champs sont optionnels pour permettre une mise à jour partielle."""
    nom: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    responsable: str | None = Field(default=None, max_length=150)
    photo_responsable_url: str | None = Field(default=None, max_length=500)
    horaires: str | None = Field(default=None, max_length=255)
    localisation: str | None = Field(default=None, max_length=150)
    telephone: str | None = Field(default=None, max_length=20)
    est_actif: bool | None = None


class ServiceOut(ServiceBaseSchema):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    est_actif: bool
    date_creation: datetime
    date_modification: datetime