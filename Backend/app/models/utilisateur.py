"""Modèle central d'authentification, commun à tous les types de comptes."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import RoleUtilisateur


class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    identifiant: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    mot_de_passe_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[RoleUtilisateur] = mapped_column(
        Enum(RoleUtilisateur, name="role_utilisateur"), nullable=False
    )
    est_actif: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    derniere_connexion: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relations 1-1 vers les profils métier (un seul des deux est rempli
    # selon le rôle du compte)
    patient = relationship(
        "Patient", back_populates="utilisateur", uselist=False, cascade="all, delete-orphan"
    )
    personnel = relationship(
        "Personnel", back_populates="utilisateur", uselist=False, cascade="all, delete-orphan"
    )