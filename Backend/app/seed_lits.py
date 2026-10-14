"""Script à exécuter une seule fois pour créer les 20 lits d'urgence réels
du centre (1 VIP, 2 salle septique, 2 déchocage, 10 urgence, 5 triage).

Usage : python -m app.seed_lits
Le script est idempotent : relancer sans risque, les lits déjà présents
(même numéro) sont ignorés.
"""
from app.db.session import SessionLocale
from app.models.enums import CategorieLit
from app.models.lit import Lit

LITS_A_CREER = (
    [("VIP-01", CategorieLit.VIP)]
    + [(f"SEP-{i:02d}", CategorieLit.SALLE_SEPTIQUE) for i in range(1, 3)]
    + [(f"DECH-{i:02d}", CategorieLit.DECHOCAGE) for i in range(1, 3)]
    + [(f"URG-{i:02d}", CategorieLit.URGENCE) for i in range(1, 11)]
    + [(f"TRI-{i:02d}", CategorieLit.TRIAGE) for i in range(1, 6)]
)


def executer_seed() -> None:
    db = SessionLocale()
    try:
        crees = 0
        for numero, categorie in LITS_A_CREER:
            if db.query(Lit).filter(Lit.numero == numero).first() is not None:
                continue
            db.add(Lit(numero=numero, categorie=categorie))
            crees += 1
        db.commit()
        print(f"{crees} lit(s) créé(s) sur {len(LITS_A_CREER)} attendus (le reste existait déjà).")
    finally:
        db.close()


if __name__ == "__main__":
    executer_seed()