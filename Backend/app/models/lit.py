"""Lits du centre, répartis dans des catégories configurables.
Une réservation est permise uniquement pendant la préparation d'un transfert
immédiat ; les admissions directes passent à 'occupe'."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import StatutLit


class Lit(Base):
    __tablename__ = "lits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    numero: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    categorie: Mapped[str] = mapped_column(
        String(50), ForeignKey("categories_lits.cle"), nullable=False
    )
    statut: Mapped[StatutLit] = mapped_column(
        Enum(StatutLit, name="statut_lit"), default=StatutLit.LIBRE, nullable=False
    )

    # Patient actuellement admis (texte libre, car un patient peut arriver en
    # urgence sans compte préexistant). patient_id est optionnel, renseigné
    # seulement si le patient est déjà identifié dans le système.
    nom_patient_actuel: Mapped[str | None] = mapped_column(String(100), nullable=True)
    prenoms_patient_actuel: Mapped[str | None] = mapped_column(String(150), nullable=True)
    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="SET NULL"), nullable=True
    )
    motif_admission: Mapped[str | None] = mapped_column(Text, nullable=True)
    episode_id_actuel: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    motif_transfert_reservation: Mapped[str | None] = mapped_column(Text, nullable=True)

    date_occupation: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_liberation: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_debut_nettoyage: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_reservation: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lit_source_reservation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lits.id", ondelete="SET NULL"), nullable=True
    )
    mission_reservation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses_ambulance.id", ondelete="SET NULL"), nullable=True
    )
    motif_infectieux: Mapped[str | None] = mapped_column(String(255), nullable=True)
    urgence_vitale: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    facturation_vip_validee: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    date_modification: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    patient = relationship("Patient")