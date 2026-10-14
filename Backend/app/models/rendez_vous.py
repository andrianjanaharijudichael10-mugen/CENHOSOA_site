"""Demandes de rendez-vous et consultations des patients."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CreneauMedecin(Base):
    __tablename__ = "creneaux_medecin"
    __table_args__ = (
        Index("uq_creneau_service_date_heure", "service_id", "date_heure", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date_heure: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    date_fin: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    est_ouvert: Mapped[bool] = mapped_column(default=True, nullable=False, index=True)
    dernier_numero_file: Mapped[int] = mapped_column(default=0, server_default="0", nullable=False)
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    service = relationship("Service")
    rendez_vous = relationship("RendezVous", back_populates="creneau")


class RendezVous(Base):
    __tablename__ = "rendez_vous"
    __table_args__ = (
        Index(
            "uq_rendez_vous_patient_service",
            "patient_id",
            "service_id",
            unique=True,
            postgresql_where=text("statut IN ('en_attente', 'confirme')"),
        ),
        Index(
            "uq_rendez_vous_creneau_numero_file",
            "creneau_id",
            "numero_file",
            unique=True,
            postgresql_where=text("creneau_id IS NOT NULL AND numero_file IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    service_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id", ondelete="SET NULL"), nullable=True, index=True
    )
    creneau_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("creneaux_medecin.id", ondelete="SET NULL"), nullable=True, index=True
    )
    numero_file: Mapped[int | None] = mapped_column(nullable=True)
    service_nom: Mapped[str] = mapped_column(String(100), nullable=False)
    date_souhaitee: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    date_confirmee: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_confirmee_vue: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    motif: Mapped[str] = mapped_column(Text, nullable=False)
    statut: Mapped[str] = mapped_column(String(20), nullable=False, default="en_attente", index=True)
    commentaire: Mapped[str | None] = mapped_column(Text, nullable=True)
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    date_modification: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    patient = relationship("Patient")
    service = relationship("Service")
    creneau = relationship("CreneauMedecin", back_populates="rendez_vous")
    consultation = relationship("Consultation", back_populates="rendez_vous", uselist=False)
