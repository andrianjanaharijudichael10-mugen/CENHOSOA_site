"""Coordonnées publiques du centre et flotte téléphonique, sans lien aux comptes."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InfosCentre(Base):
    """Ligne unique (id=1) contenant les informations globales du centre."""
    __tablename__ = "infos_centre"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    email_centre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date_modification: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    telephones: Mapped[list["TelephoneCentre"]] = relationship(
        "TelephoneCentre", back_populates="infos_centre", cascade="all, delete-orphan",
        order_by="TelephoneCentre.ordre",
    )


class TelephoneCentre(Base):
    """Une ligne téléphonique de la flotte globale du centre (ex: Standard, Accueil, Urgences)."""
    __tablename__ = "telephones_centre"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    infos_centre_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("infos_centre.id", ondelete="CASCADE"), nullable=False
    )
    numero: Mapped[str] = mapped_column(String(30), nullable=False)
    libelle: Mapped[str] = mapped_column(String(100), nullable=False)
    ordre: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    infos_centre: Mapped["InfosCentre"] = relationship("InfosCentre", back_populates="telephones")