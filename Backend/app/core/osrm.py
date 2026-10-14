"""Géocodage et calcul des distances routières via OpenStreetMap et OSRM."""
from dataclasses import dataclass
from functools import lru_cache
import json
from pathlib import Path

import httpx

from app.core.config import parametres

DELAI_REQUETE_SECONDES = 10.0
ZONE_LATITUDE_MIN = -19.17
ZONE_LATITUDE_MAX = -18.63
ZONE_LONGITUDE_MIN = 47.24
ZONE_LONGITUDE_MAX = 47.81
ZONE_VIEWBOX = (
    f"{ZONE_LONGITUDE_MIN},{ZONE_LATITUDE_MAX},"
    f"{ZONE_LONGITUDE_MAX},{ZONE_LATITUDE_MIN}"
)


class DestinationIntrouvable(ValueError):
    """Aucune adresse correspondante n'a été trouvée."""


class ServiceItineraireIndisponible(RuntimeError):
    """Le géocodeur ou le moteur OSRM n'a pas répondu correctement."""


@dataclass(frozen=True)
class EtapeItineraire:
    instruction: str
    distance_m: int


@dataclass(frozen=True)
class Itineraire:
    distance_km: float
    duree_estimee_minutes: int
    etapes: tuple[EtapeItineraire, ...]
    latitude_destination: float
    longitude_destination: float


@dataclass(frozen=True)
class ItineraireMission:
    aller: Itineraire
    retour: Itineraire

    @property
    def distance_km(self) -> float:
        return self.aller.distance_km + self.retour.distance_km

    @property
    def duree_estimee_minutes(self) -> int:
        return self.aller.duree_estimee_minutes + self.retour.duree_estimee_minutes


@lru_cache(maxsize=1)
def lister_lieux_tana() -> tuple[dict, ...]:
    chemin_catalogue = Path(__file__).resolve().parent.parent / "data" / "lieux_tana.json"
    try:
        with chemin_catalogue.open(encoding="utf-8") as fichier:
            catalogue = json.load(fichier)
        lieux = catalogue["lieux"]
        for lieu in lieux:
            latitude = float(lieu["latitude"])
            longitude = float(lieu["longitude"])
            if not _dans_zone_antananarivo(latitude, longitude):
                raise ValueError(f"Coordonnées hors zone pour {lieu.get('id', 'lieu inconnu')}")
        return tuple(lieux)
    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as erreur:
        raise ServiceItineraireIndisponible("Le catalogue des lieux d'Antananarivo est invalide.") from erreur


def _dans_zone_antananarivo(latitude: float, longitude: float) -> bool:
    return (
        ZONE_LATITUDE_MIN <= latitude <= ZONE_LATITUDE_MAX
        and ZONE_LONGITUDE_MIN <= longitude <= ZONE_LONGITUDE_MAX
    )


def _geocoder(adresse: str) -> tuple[float, float]:
    try:
        reponse = httpx.get(
            f"{parametres.NOMINATIM_BASE_URL.rstrip('/')}/search",
            params={
                "q": adresse,
                "format": "jsonv2",
                "limit": 1,
                "countrycodes": "mg",
                "viewbox": ZONE_VIEWBOX,
                "bounded": 1,
            },
            headers={"User-Agent": parametres.GEOCODER_USER_AGENT},
            timeout=DELAI_REQUETE_SECONDES,
        )
        reponse.raise_for_status()
        resultats = reponse.json()
    except (httpx.HTTPError, ValueError) as erreur:
        raise ServiceItineraireIndisponible("Le service de géocodage est indisponible.") from erreur

    if not resultats:
        raise DestinationIntrouvable(
            f"Adresse introuvable dans Antananarivo et ses environs : {adresse}"
        )

    try:
        latitude = float(resultats[0]["lat"])
        longitude = float(resultats[0]["lon"])
    except (KeyError, TypeError, ValueError) as erreur:
        raise ServiceItineraireIndisponible("Le géocodeur a retourné des coordonnées invalides.") from erreur

    if not _dans_zone_antananarivo(latitude, longitude):
        raise DestinationIntrouvable(
            f"Adresse hors de la zone autorisée autour d'Antananarivo : {adresse}"
        )
    return latitude, longitude


@lru_cache(maxsize=1)
def _geocoder_origine() -> tuple[float, float]:
    latitude = parametres.OSRM_ORIGIN_LATITUDE
    longitude = parametres.OSRM_ORIGIN_LONGITUDE
    if latitude is not None and longitude is not None:
        if not _dans_zone_antananarivo(latitude, longitude):
            raise ServiceItineraireIndisponible(
                "Les coordonnées d'origine CENHOSOA sont hors de la zone d'Antananarivo."
            )
        return latitude, longitude
    if latitude is not None or longitude is not None:
        raise ServiceItineraireIndisponible(
            "Configurez les deux coordonnées OSRM_ORIGIN_LATITUDE et OSRM_ORIGIN_LONGITUDE."
        )

    try:
        return _geocoder(parametres.OSRM_ORIGIN_ADDRESS)
    except DestinationIntrouvable as erreur:
        raise ServiceItineraireIndisponible(
            "L'origine CENHOSOA n'a pas été trouvée. Configurez ses coordonnées exactes "
            "dans OSRM_ORIGIN_LATITUDE et OSRM_ORIGIN_LONGITUDE."
        ) from erreur


def _instruction_etape(etape: dict) -> str:
    manoeuvre = etape.get("maneuver", {})
    type_manoeuvre = manoeuvre.get("type", "continue")
    direction = manoeuvre.get("modifier", "")
    nom_route = etape.get("name")

    directions = {
        "sharp left": "fortement à gauche",
        "left": "à gauche",
        "slight left": "légèrement à gauche",
        "straight": "tout droit",
        "slight right": "légèrement à droite",
        "right": "à droite",
        "sharp right": "fortement à droite",
        "uturn": "faire demi-tour",
    }
    actions = {
        "depart": "Départ",
        "turn": "Tourner",
        "new name": "Continuer",
        "continue": "Continuer",
        "merge": "S'insérer",
        "fork": "Prendre la bifurcation",
        "roundabout": "Au rond-point",
        "rotary": "Au rond-point",
        "exit roundabout": "Sortir du rond-point",
        "end of road": "En fin de route, tourner",
        "arrive": "Arrivée à destination",
    }

    instruction = actions.get(type_manoeuvre, "Continuer")
    if type_manoeuvre == "roundabout" and manoeuvre.get("exit"):
        instruction = f"Au rond-point, prendre la sortie {manoeuvre['exit']}"
    elif direction and type_manoeuvre not in {"depart", "arrive", "new name", "continue"}:
        instruction = f"{instruction} {directions.get(direction, direction)}"
    if nom_route:
        instruction = f"{instruction} sur {nom_route}"
    return instruction


def calculer_itineraire(destination: str) -> Itineraire:
    destination_lat, destination_lon = _geocoder(destination)
    return calculer_itineraire_coordonnees(destination_lat, destination_lon)


def calculer_itineraires(destination: str) -> tuple[Itineraire, ...]:
    destination_lat, destination_lon = _geocoder(destination)
    return calculer_itineraires_coordonnees(destination_lat, destination_lon)


def calculer_itineraires_mission(adresse_patient: str) -> tuple[ItineraireMission, ...]:
    latitude_patient, longitude_patient = _geocoder(adresse_patient)
    return calculer_itineraires_mission_coordonnees(latitude_patient, longitude_patient)


def calculer_itineraires_mission_coordonnees(
    latitude_patient: float,
    longitude_patient: float,
) -> tuple[ItineraireMission, ...]:
    if not _dans_zone_antananarivo(latitude_patient, longitude_patient):
        raise DestinationIntrouvable("L'adresse du patient est hors de la zone d'Antananarivo.")
    latitude_centre, longitude_centre = _geocoder_origine()
    routes_aller = _calculer_itineraires_entre_coordonnees(
        latitude_centre,
        longitude_centre,
        latitude_patient,
        longitude_patient,
        demander_alternatives=True,
    )
    route_retour = _calculer_itineraires_entre_coordonnees(
        latitude_patient,
        longitude_patient,
        latitude_centre,
        longitude_centre,
        demander_alternatives=False,
    )[0]
    return tuple(ItineraireMission(aller=aller, retour=route_retour) for aller in routes_aller)


def _calculer_itineraires_coordonnees(
    latitude: float,
    longitude: float,
    demander_alternatives: bool,
) -> tuple[Itineraire, ...]:
    if not _dans_zone_antananarivo(latitude, longitude):
        raise DestinationIntrouvable("Les coordonnées sont hors de la zone d'Antananarivo.")

    origine_lat, origine_lon = _geocoder_origine()
    return _calculer_itineraires_entre_coordonnees(
        origine_lat,
        origine_lon,
        latitude,
        longitude,
        demander_alternatives,
    )


def _calculer_itineraires_entre_coordonnees(
    latitude_origine: float,
    longitude_origine: float,
    latitude_destination: float,
    longitude_destination: float,
    demander_alternatives: bool,
) -> tuple[Itineraire, ...]:
    if not _dans_zone_antananarivo(latitude_origine, longitude_origine) or not _dans_zone_antananarivo(
        latitude_destination, longitude_destination
    ):
        raise DestinationIntrouvable("Les coordonnées du trajet sont hors de la zone d'Antananarivo.")

    coordonnees = (
        f"{longitude_origine},{latitude_origine};"
        f"{longitude_destination},{latitude_destination}"
    )
    try:
        reponse = httpx.get(
            f"{parametres.OSRM_BASE_URL.rstrip('/')}/route/v1/driving/{coordonnees}",
            params={
                "overview": "false",
                "alternatives": "true" if demander_alternatives else "false",
                "steps": "true",
            },
            timeout=DELAI_REQUETE_SECONDES,
        )
        reponse.raise_for_status()
        donnees = reponse.json()
        routes = donnees.get("routes", [])
        if donnees.get("code") != "Ok" or not routes:
            raise DestinationIntrouvable("Aucun itinéraire routier n'a été trouvé vers cette adresse.")
        itineraires = tuple(
            Itineraire(
                distance_km=float(route["distance"]) / 1000,
                duree_estimee_minutes=round(float(route["duration"]) / 60),
                etapes=tuple(
                    EtapeItineraire(
                        instruction=_instruction_etape(etape),
                        distance_m=round(float(etape.get("distance", 0))),
                    )
                    for trajet in route.get("legs", [])
                    for etape in trajet.get("steps", [])
                ),
                latitude_destination=latitude_destination,
                longitude_destination=longitude_destination,
            )
            for route in routes
        )
    except DestinationIntrouvable:
        raise
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as erreur:
        raise ServiceItineraireIndisponible(
            "Le service OSRM est indisponible ou a retourné un itinéraire invalide."
        ) from erreur

    return itineraires


def calculer_itineraires_coordonnees(latitude: float, longitude: float) -> tuple[Itineraire, ...]:
    return _calculer_itineraires_coordonnees(latitude, longitude, demander_alternatives=True)


def calculer_itineraire_coordonnees(latitude: float, longitude: float) -> Itineraire:
    return _calculer_itineraires_coordonnees(
        latitude,
        longitude,
        demander_alternatives=False,
    )[0]