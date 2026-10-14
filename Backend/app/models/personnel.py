"""Profil métier d'un membre du personnel, lié en 1-1 à un compte Utilisateur."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Personnel(Base):
    __tablename__ = "personnels"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    utilisateur_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"),
        unique=True, nullable=False,
    )
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    prenoms: Mapped[str] = mapped_column(String(150), nullable=False)
    matricule: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    # Ex: "Urgences", "Neurologie" pour un médecin, "Service Ambulancier" pour un régulateur...
    service: Mapped[str | None] = mapped_column(String(100), nullable=True)
    telephone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    utilisateur = relationship("Utilisateur", back_populates="personnel")