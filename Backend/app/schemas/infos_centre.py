"""Schémas Pydantic pour les informations globales du centre."""
from pydantic import BaseModel, EmailStr, Field


class TelephoneCentreSchema(BaseModel):
    numero: str = Field(min_length=1, max_length=30)
    libelle: str = Field(min_length=1, max_length=100)
    ordre: int = 0


class InfosCentreOut(BaseModel):
    email_centre: EmailStr | None
    telephones: list[TelephoneCentreSchema]


class InfosCentreModifierSchema(BaseModel):
    """Remplace entièrement l'email et la liste des téléphones du centre."""
    email_centre: EmailStr | None = None
    telephones: list[TelephoneCentreSchema] = Field(default_factory=list)