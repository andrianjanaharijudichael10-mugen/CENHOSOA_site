"""Schémas Pydantic liés à l'authentification."""
from datetime import date

from pydantic import BaseModel, Field, field_validator


class InscriptionPatientSchema(BaseModel):
    """Données requises pour qu'un patient crée son compte."""
    mot_de_passe: str = Field(min_length=8, max_length=128)
    nom: str = Field(min_length=1, max_length=100)
    prenoms: str = Field(min_length=1, max_length=150)
    telephone: str = Field(min_length=10, max_length=20)
    date_naissance: date | None = None
    adresse: str | None = Field(default=None, max_length=255)

    @field_validator("mot_de_passe")
    @classmethod
    def _mot_de_passe_suffisamment_fort(cls, valeur: str) -> str:
        if not any(c.isdigit() for c in valeur):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre.")
        if not any(c.isalpha() for c in valeur):
            raise ValueError("Le mot de passe doit contenir au moins une lettre.")
        return valeur

    @field_validator("telephone")
    @classmethod
    def _telephone_malagasy(cls, valeur: str) -> str:
        tel = valeur.replace(" ", "").replace("-", "")
        if not tel.startswith("+261"):
            raise ValueError("Le numéro doit être Malagasy et commencer par +261.")
        rest = tel[4:]
        if not rest.isdigit() or len(rest) < 6 or len(rest) > 9:
            raise ValueError("Numéro Malagasy invalide après l'indicatif +261.")
        return tel


class ConnexionSchema(BaseModel):
    """Connexion par téléphone patient ou matricule personnel, plus mot de passe."""
    identifiant: str = Field(min_length=1, max_length=100)
    mot_de_passe: str = Field(min_length=1, max_length=128)

    @field_validator("identifiant")
    @classmethod
    def identifiant_non_vide(cls, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("L'identifiant est obligatoire.")
        return valeur


class ModificationMotDePasseSchema(BaseModel):
    mot_de_passe_actuel: str
    nouveau_mot_de_passe: str = Field(min_length=8, max_length=128)

    @field_validator("nouveau_mot_de_passe")
    @classmethod
    def nouveau_mot_de_passe_suffisamment_fort(cls, valeur: str) -> str:
        if not any(caractere.isdigit() for caractere in valeur):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre.")
        if not any(caractere.isalpha() for caractere in valeur):
            raise ValueError("Le mot de passe doit contenir au moins une lettre.")
        return valeur


class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RafraichirTokenSchema(BaseModel):
    refresh_token: str