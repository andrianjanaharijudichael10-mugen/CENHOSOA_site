"""Schémas des actualités affichées sur la page d'accueil."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ActualiteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    texte: str
    details: str | None
    photo_url: str | None
    date_creation: datetime


class ActualiteCreationSchema(BaseModel):
    texte: str = Field(min_length=1, max_length=250)
    details: str = Field(min_length=1, max_length=5000)
