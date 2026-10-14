"""Schémas d'entrée et de sortie des ambulances et missions."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import StatutAmbulance, StatutMissionAmbulance, TypeAmbulance


class AmbulanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    nom: str
    type: TypeAmbulance
    statut: StatutAmbulance


class CreationAmbulanceSchema(BaseModel):
    numero: str = Field(min_length=1, max_length=20)
    est_principale: bool = False

    @field_validator("numero")
    @classmethod
    def normaliser_numero(cls, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("Le numéro de l'ambulance est requis.")
        return valeur


class CoordonneesDestinationSchema(BaseModel):
    latitude_destination: float | None = Field(default=None, ge=-90, le=90)
    longitude_destination: float | None = Field(default=None, ge=-180, le=180)

    @model_validator(mode="after")
    def valider_paire_coordonnees(self):
        if (self.latitude_destination is None) != (self.longitude_destination is None):
            raise ValueError("La latitude et la longitude doivent être fournies ensemble.")
        return self


class LieuTanaOut(BaseModel):
    id: str
    nom: str
    aliases: list[str]
    latitude: float
    longitude: float


class SimulationTrajetSchema(CoordonneesDestinationSchema):
    destination: str = Field(min_length=1, max_length=255)


class SimulationTrajetOut(BaseModel):
    distance_km: float
    duree_estimee_minutes: int
    distance_aller_km: float
    duree_aller_minutes: int
    distance_retour_km: float
    duree_retour_minutes: int
    etapes: list["EtapeItineraireOut"]
    cout_base: int
    itineraires: list["OptionItineraireOut"]


class EtapeItineraireOut(BaseModel):
    instruction: str
    distance_m: int


class OptionItineraireOut(BaseModel):
    index: int
    distance_km: float
    duree_estimee_minutes: int
    distance_aller_km: float
    duree_aller_minutes: int
    distance_retour_km: float
    duree_retour_minutes: int
    etapes: list[EtapeItineraireOut]
    cout_base: int


class DonneesMissionAmbulanceSchema(CoordonneesDestinationSchema):
    patient: str = Field(min_length=1, max_length=150)
    destination: str = Field(min_length=1, max_length=255)
    distance_km: float = Field(gt=0)
    itineraire_index: int = Field(default=0, ge=0, le=2)
    urgence_vitale: bool = False
    patient_infectieux: bool = False
    motif_infectieux: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def valider_motif_infectieux(self):
        if self.patient_infectieux and not (self.motif_infectieux and self.motif_infectieux.strip()):
            raise ValueError("Le motif infectieux est obligatoire pour réserver une salle septique.")
        return self


class CreationMissionAmbulanceSchema(DonneesMissionAmbulanceSchema):
    ambulance_id: uuid.UUID


class CreationDemandeAmbulanceInviteSchema(DonneesMissionAmbulanceSchema):
    telephone_contact: str = Field(min_length=8, max_length=20)

    @field_validator("telephone_contact")
    @classmethod
    def valider_telephone_contact(cls, valeur: str) -> str:
        telephone = valeur.strip()
        chiffres = "".join(caractere for caractere in telephone if caractere.isdigit())
        if len(chiffres) < 9 or len(chiffres) > 15:
            raise ValueError("Saisissez un numéro de téléphone valide.")
        return telephone


class DemandeAmbulanceUrgenteSchema(CoordonneesDestinationSchema):
    destination: str = Field(min_length=1, max_length=255)
    urgence_vitale: bool = False
    patient_infectieux: bool = False
    motif_infectieux: str | None = Field(default=None, max_length=255)

    @field_validator("destination")
    @classmethod
    def valider_destination_urgente(cls, valeur: str) -> str:
        destination = valeur.strip()
        if not destination:
            raise ValueError("L'adresse de prise en charge est obligatoire.")
        return destination

class PriseEnChargeAmbulanceSchema(BaseModel):
    minutes_sur_place: int = Field(ge=0, le=1440)


class RetourCentreAmbulanceSchema(BaseModel):
    minutes_sur_place: int = Field(ge=0, le=1440)
    lit_id: uuid.UUID | None = None


class TransitionMissionSchema(BaseModel):
    statut: StatutMissionAmbulance
    lit_id: uuid.UUID | None = None


class LitUrgenceDisponibleOut(BaseModel):
    id: uuid.UUID
    numero: str
    categorie: str


class MissionAmbulanceOut(BaseModel):
    id: uuid.UUID
    ambulance_id: uuid.UUID | None
    ambulance_code: str | None
    ambulance_nom: str | None
    type_ambulance: TypeAmbulance | None
    lit_id: uuid.UUID | None
    lit_numero: str | None
    lit_categorie: str | None
    lit_secondaire_id: uuid.UUID | None
    lit_secondaire_numero: str | None
    lit_secondaire_categorie: str | None
    patient_id: uuid.UUID | None
    telephone_contact: str | None
    informations_medicales: str | None
    patient: str
    destination: str
    distance_km: float
    cout_base: int
    statut: StatutMissionAmbulance
    adresse_patient: str
    distance_aller_km: float
    duree_aller_minutes: int
    distance_retour_km: float
    duree_retour_minutes: int
    urgence_vitale: bool
    patient_infectieux: bool
    motif_infectieux: str | None
    heure_depart: datetime
    heure_arrivee: datetime | None
    heure_transport: datetime | None
    heure_arrivee_urgences: datetime | None
    heure_limite_dechargement: datetime | None
    heure_bionettoyage: datetime | None
    heure_fin_bionettoyage: datetime | None
    heure_prise_en_charge: datetime | None
    heure_retour: datetime | None
    minutes_sur_place: int | None
    minutes_retard: int | None
    frais_retard: int
    cout_total: int


class ConfirmationDemandeAmbulanceSchema(BaseModel):
    ambulance_id: uuid.UUID


class CompleterDemandeAmbulanceSchema(BaseModel):
    patient: str | None = Field(default=None, min_length=1, max_length=150)
    telephone_contact: str | None = Field(default=None, min_length=8, max_length=20)
    informations_medicales: str | None = Field(default=None, min_length=1, max_length=2000)

    @field_validator("patient", "telephone_contact", "informations_medicales")
    @classmethod
    def nettoyer_champ_complementaire(cls, valeur: str | None) -> str | None:
        if valeur is None:
            return None
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("Les informations saisies ne peuvent pas être vides.")
        return valeur

    @field_validator("telephone_contact")
    @classmethod
    def valider_telephone_complementaire(cls, valeur: str | None) -> str | None:
        if valeur is None:
            return None
        chiffres = "".join(caractere for caractere in valeur if caractere.isdigit())
        if len(chiffres) < 9 or len(chiffres) > 15:
            raise ValueError("Saisissez un numéro de téléphone valide.")
        return valeur

    @model_validator(mode="after")
    def verifier_complement_non_vide(self):
        if not any((
            self.patient is not None,
            self.telephone_contact is not None,
            self.informations_medicales is not None,
        )):
            raise ValueError("Renseignez au moins une information à compléter.")
        return self


class RattacherDemandeAmbulanceSchema(BaseModel):
    patient_id: uuid.UUID
    identite_verifiee: bool

    @field_validator("identite_verifiee")
    @classmethod
    def exiger_verification_identite(cls, valeur: bool) -> bool:
        if not valeur:
            raise ValueError("L'identité du patient doit être vérifiée avant le rattachement.")
        return valeur


class PatientRattachementAmbulanceOut(BaseModel):
    id: uuid.UUID
    nom: str
    prenoms: str


class DemandeAmbulanceInviteOut(BaseModel):
    mission: MissionAmbulanceOut
    jeton_suivi: str