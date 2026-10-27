"""Flotte d'ambulances et missions de régulation."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import StatutAmbulance, StatutMissionAmbulance, TypeAmbulance


class Ambulance(Base):
    __tablename__ = "ambulances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    numero: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    est_principale: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    statut: Mapped[StatutAmbulance] = mapped_column(
        Enum(StatutAmbulance, name="statut_ambulance"),
        default=StatutAmbulance.DISPONIBLE,
        nullable=False,
    )
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    missions = relationship("MissionAmbulance", back_populates="ambulance")

    @property
    def code(self) -> str:
        return self.numero

    @code.setter
    def code(self, value: str) -> None:
        self.numero = value

    @property
    def nom(self) -> str:
        return self.numero

    @nom.setter
    def nom(self, value: str) -> None:
        self.numero = value

    @property
    def type(self) -> TypeAmbulance:
        return TypeAmbulance.PRINCIPALE if self.est_principale else TypeAmbulance.SECONDAIRE

    @type.setter
    def type(self, value: TypeAmbulance | str) -> None:
        if isinstance(value, TypeAmbulance):
            self.est_principale = value == TypeAmbulance.PRINCIPALE
            return
        self.est_principale = str(value).lower() == TypeAmbulance.PRINCIPALE.value


class MissionAmbulance(Base):
    __tablename__ = "courses_ambulance"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ambulance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ambulances.id", ondelete="RESTRICT"), nullable=True
    )
    lit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lits.id", ondelete="SET NULL"), nullable=True
    )
    nom_patient: Mapped[str] = mapped_column(String(100), nullable=False)
    prenoms_patient: Mapped[str] = mapped_column(String(150), nullable=False)
    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="SET NULL"), nullable=True
    )
    adresse_destination: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude_destination: Mapped[float] = mapped_column(Float, nullable=False)
    longitude_destination: Mapped[float] = mapped_column(Float, nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    itineraire_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    adresse_patient: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    distance_aller_km: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    duree_aller_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    distance_retour_km: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    duree_retour_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    urgence_vitale: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    patient_infectieux: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    motif_infectieux: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telephone_contact: Mapped[str | None] = mapped_column(String(20), nullable=True)
    jeton_suivi_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    tarif_base: Mapped[int] = mapped_column(Integer, nullable=False)
    frais_retard: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    montant_total: Mapped[int] = mapped_column(Integer, nullable=False)
    statut: Mapped[str] = mapped_column(String(30), nullable=False, default="EN_ROUTE")
    heure_depart: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    heure_arrivee_sur_lieux: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    heure_transport: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    heure_arrivee_urgences: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    heure_bionettoyage: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    heure_prise_en_charge: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    heure_fin: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    minutes_sur_place: Mapped[int | None] = mapped_column(Integer, nullable=True)
    minutes_retard: Mapped[int | None] = mapped_column(Integer, nullable=True)
    lit_secondaire_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lits.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(nullable=True)
    message_refus: Mapped[str | None] = mapped_column(nullable=True)

    ambulance = relationship("Ambulance", back_populates="missions")
    lit = relationship("Lit", foreign_keys=[lit_id])
    lit_secondaire = relationship("Lit", foreign_keys=[lit_secondaire_id])

    @property
    def patient(self) -> str:
        return " ".join(part for part in [self.prenoms_patient, self.nom_patient] if part).strip()

    @patient.setter
    def patient(self, value: str) -> None:
        parts = value.strip().split(maxsplit=1)
        if len(parts) == 1:
            self.prenoms_patient = parts[0]
            self.nom_patient = ""
        else:
            self.prenoms_patient = parts[0]
            self.nom_patient = parts[1]

    @property
    def destination(self) -> str:
        return self.adresse_destination or ""

    @destination.setter
    def destination(self, value: str) -> None:
        self.adresse_destination = value

    @property
    def heure_arrivee(self) -> datetime | None:
        return self.heure_arrivee_sur_lieux

    @heure_arrivee.setter
    def heure_arrivee(self, value: datetime | None) -> None:
        self.heure_arrivee_sur_lieux = value

    @property
    def heure_retour(self) -> datetime | None:
        return self.heure_fin

    @heure_retour.setter
    def heure_retour(self, value: datetime | None) -> None:
        self.heure_fin = value

    @property
    def cout_base(self) -> int:
        return self.tarif_base

    @cout_base.setter
    def cout_base(self, value: int) -> None:
        self.tarif_base = value

    @property
    def cout_total(self) -> int:
        return self.montant_total

    @cout_total.setter
    def cout_total(self, value: int) -> None:
        self.montant_total = value

    @property
    def date_creation(self) -> datetime:
        return self.heure_depart

    @date_creation.setter
    def date_creation(self, value: datetime) -> None:
        self.heure_depart = value