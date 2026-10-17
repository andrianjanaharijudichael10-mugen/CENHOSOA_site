"""Événements immuables du parcours des patients dans les lits d'urgence."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HistoriqueLit(Base):
    __tablename__ = "historique_lits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    episode_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    patient_historique_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    type_evenement: Mapped[str] = mapped_column(String(30), nullable=False)
    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="SET NULL"), nullable=True
    )
    nom_patient: Mapped[str] = mapped_column(String(100), nullable=False)
    prenoms_patient: Mapped[str] = mapped_column(String(150), nullable=False)
    lit_source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lits.id", ondelete="SET NULL"), nullable=True
    )
    lit_source_numero: Mapped[str | None] = mapped_column(String(20), nullable=True)
    lit_source_categorie: Mapped[str | None] = mapped_column(String(50), nullable=True)
    lit_destination_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lits.id", ondelete="SET NULL"), nullable=True
    )
    lit_destination_numero: Mapped[str | None] = mapped_column(String(20), nullable=True)
    lit_destination_categorie: Mapped[str | None] = mapped_column(String(50), nullable=True)
    service_destination_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id", ondelete="SET NULL"), nullable=True
    )
    service_destination_nom: Mapped[str | None] = mapped_column(String(100), nullable=True)
    motif: Mapped[str | None] = mapped_column(Text, nullable=True)
    duree_occupation_secondes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    date_evenement: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    acteur_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="SET NULL"), nullable=True
    )
    acteur_identifiant: Mapped[str] = mapped_column(String(100), nullable=False)
