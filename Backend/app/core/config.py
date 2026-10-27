"""
Configuration centrale de l'application, chargée depuis les variables
d'environnement (fichier .env en développement).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict

class Parametres(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    SUPERADMIN_IDENTIFIANT: str = "admin-cenhosoa"
    SUPERADMIN_PASSWORD: str | None = None

    ORIGINES_AUTORISEES: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ]

    OSRM_BASE_URL: str = "https://router.project-osrm.org"
    NOMINATIM_BASE_URL: str = "https://nominatim.openstreetmap.org"
    OSRM_ORIGIN_ADDRESS: str = "CENHOSOA, Soavinandriana, Antananarivo, Madagascar"
    OSRM_ORIGIN_LATITUDE: float | None = None
    OSRM_ORIGIN_LONGITUDE: float | None = None
    GEOCODER_USER_AGENT: str = "CENHOSOA-Ambulances/1.0"

parametres = Parametres()