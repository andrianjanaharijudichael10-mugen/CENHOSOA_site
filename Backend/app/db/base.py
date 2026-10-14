"""Base déclarative SQLAlchemy dont héritent tous les modèles."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass