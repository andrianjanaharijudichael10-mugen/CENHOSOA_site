"""Notes médicales et ordonnances associées à une consultation."""
import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Consultation(Base):
    __tablename__ = "consultations"
    __table_args__ = (
        UniqueConstraint("rendez_vous_id", name="uq_consultation_rendez_vous"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rendez_vous_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rendez_vous.id", ondelete="CASCADE"), nullable=False
    )
    medecin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("personnels.id", ondelete="RESTRICT"), nullable=False
    )
    remarques: Mapped[str] = mapped_column(Text, nullable=False)
    medicaments_prescrits: Mapped[list[dict[str, object | None]] | None] = mapped_column(JSON, nullable=True)
    controle_supplementaire: Mapped[str | None] = mapped_column(Text, nullable=True)
    medicaments: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantite_matin: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantite_midi: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantite_soir: Mapped[str | None] = mapped_column(Text, nullable=True)
    ordonnance: Mapped[str | None] = mapped_column(Text, nullable=True)
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    patient = relationship("Patient", back_populates="consultations")
    rendez_vous = relationship("RendezVous", back_populates="consultation")
    medecin = relationship("Personnel")
