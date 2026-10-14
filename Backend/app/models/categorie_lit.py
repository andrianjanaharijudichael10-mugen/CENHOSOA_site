"""Catégories configurables des lits."""
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CategorieLitInventaire(Base):
    __tablename__ = "categories_lits"

    cle: Mapped[str] = mapped_column(String(50), primary_key=True)
    nom: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
