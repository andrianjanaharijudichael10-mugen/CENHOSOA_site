"""Synchronise les quartiers OSM d'Antananarivo dans le catalogue JSON.

Depuis Backend : python -m scripts.synchroniser_lieux_tana
"""
import json
import re
import unicodedata
from pathlib import Path

import httpx

from app.core.osrm import (
    ZONE_LATITUDE_MAX,
    ZONE_LATITUDE_MIN,
    ZONE_LONGITUDE_MAX,
    ZONE_LONGITUDE_MIN,
)

URL_OVERPASS = "https://overpass-api.de/api/interpreter"
CHEMIN_CATALOGUE = Path(__file__).resolve().parents[1] / "app" / "data" / "lieux_tana.json"
ORIGINE_LATITUDE = -18.8980556
ORIGINE_LONGITUDE = 47.5430556


def normaliser(texte: str) -> str:
    decomposed = unicodedata.normalize("NFKD", texte)
    sans_accents = "".join(caractere for caractere in decomposed if not unicodedata.combining(caractere))
    return " ".join(sans_accents.casefold().split())


def creer_id(nom: str, osm_id: int) -> str:
    decomposed = unicodedata.normalize("NFKD", nom)
    ascii_nom = decomposed.encode("ascii", "ignore").decode("ascii").casefold()
    identifiant = re.sub(r"[^a-z0-9]+", "-", ascii_nom).strip("-") or "lieu"
    return f"{identifiant}-{osm_id}"


def distance_carre_approximative(latitude: float, longitude: float) -> float:
    return (latitude - ORIGINE_LATITUDE) ** 2 + (longitude - ORIGINE_LONGITUDE) ** 2


def telecharger_lieux() -> list[dict]:
    boite = (
        f"{ZONE_LATITUDE_MIN},{ZONE_LONGITUDE_MIN},"
        f"{ZONE_LATITUDE_MAX},{ZONE_LONGITUDE_MAX}"
    )
    requete = (
        "[out:json][timeout:60];"
        f"(node[\"place\"~\"^(suburb|neighbourhood|quarter)$\"]({boite}););"
        "out body;"
    )
    reponse = httpx.get(
        URL_OVERPASS,
        params={"data": requete},
        headers={"User-Agent": "CENHOSOA-Ambulances/1.0"},
        timeout=90.0,
    )
    reponse.raise_for_status()
    elements = reponse.json().get("elements", [])

    meilleurs_par_nom = {}
    for element in elements:
        tags = element.get("tags", {})
        nom = tags.get("name")
        latitude = element.get("lat")
        longitude = element.get("lon")
        if not nom or latitude is None or longitude is None:
            continue

        cle = normaliser(nom)
        lieu = {
            "id": creer_id(nom, element["id"]),
            "nom": nom,
            "aliases": [f"{nom}, Antananarivo", f"{nom}, Antananarivo, Madagascar"],
            "latitude": float(latitude),
            "longitude": float(longitude),
            "osm_type": "node",
            "osm_id": element["id"],
            "place_type": tags.get("place"),
        }
        precedent = meilleurs_par_nom.get(cle)
        if precedent is None or distance_carre_approximative(
            lieu["latitude"], lieu["longitude"]
        ) < distance_carre_approximative(
            precedent["latitude"], precedent["longitude"]
        ):
            meilleurs_par_nom[cle] = lieu

    return list(meilleurs_par_nom.values())


def synchroniser() -> None:
    with CHEMIN_CATALOGUE.open(encoding="utf-8") as fichier:
        catalogue = json.load(fichier)

    lieux_existants = catalogue.get("lieux", [])
    noms_existants = {normaliser(lieu["nom"]) for lieu in lieux_existants}
    lieux_osm = telecharger_lieux()
    nouveaux_lieux = [
        lieu for lieu in lieux_osm
        if normaliser(lieu["nom"]) not in noms_existants
    ]

    catalogue["source"] = "© OpenStreetMap contributors, ODbL 1.0"
    catalogue["lieux"] = sorted(
        [*lieux_existants, *nouveaux_lieux],
        key=lambda lieu: normaliser(lieu["nom"]),
    )
    with CHEMIN_CATALOGUE.open("w", encoding="utf-8") as fichier:
        json.dump(catalogue, fichier, ensure_ascii=False, indent=2)
        fichier.write("\n")

    print(
        f"{len(nouveaux_lieux)} lieu(x) ajouté(s); "
        f"{len(catalogue['lieux'])} lieu(x) au catalogue."
    )


if __name__ == "__main__":
    synchroniser()
