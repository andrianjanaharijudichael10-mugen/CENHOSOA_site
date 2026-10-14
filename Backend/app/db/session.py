"""Création du moteur SQLAlchemy et de la fabrique de sessions."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import parametres

moteur = create_engine(parametres.DATABASE_URL, pool_pre_ping=True)
SessionLocale = sessionmaker(autocommit=False, autoflush=False, bind=moteur)


def obtenir_db() -> Generator[Session, None, None]:
    """Dépendance FastAPI fournissant une session DB par requête."""
    db = SessionLocale()
    try:
        yield db
    finally:
        db.close()