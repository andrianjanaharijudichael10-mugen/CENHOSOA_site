"""Profil métier d'un patient, lié en 1-1 à un compte Utilisateur."""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    utilisateur_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"),
        unique=True, nullable=True,
    )
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    prenoms: Mapped[str] = mapped_column(String(150), nullable=False)
    telephone: Mapped[str] = mapped_column(String(20), nullable=False)
    date_naissance: Mapped[date | None] = mapped_column(Date, nullable=True)
    lieu_naissance: Mapped[str | None] = mapped_column(String(150), nullable=True)
    adresse: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_profil: Mapped[str | None] = mapped_column(String(80), nullable=True)
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    utilisateur = relationship("Utilisateur", back_populates="patient")