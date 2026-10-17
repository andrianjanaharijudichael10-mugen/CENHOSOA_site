"""Énumérations partagées entre modèles et schémas."""
import enum


class RoleUtilisateur(str, enum.Enum):
    """Rôle global au niveau du compte (contrôle d'accès)."""
    PATIENT = "patient"
    SECRETAIRE = "secretaire"
    REGULATEUR_AMBULANCE = "regulateur_ambulance"
    MEDECIN = "medecin"
    MAJOR = "major"
    MAJOR_DE_GARDE = "major_de_garde"
    CHEF_DIVISION_AUTO = "chef_division_auto"
    CHEF_SIM = "chef_sim"
    SUPERADMIN = "superadmin"


# Rôles considérés comme "personnel" (créés uniquement par un SuperAdmin,
# par opposition au patient qui s'inscrit lui-même)
ROLES_PERSONNEL = {
    RoleUtilisateur.SECRETAIRE,
    RoleUtilisateur.REGULATEUR_AMBULANCE,
    RoleUtilisateur.MEDECIN,
    RoleUtilisateur.MAJOR,
    RoleUtilisateur.MAJOR_DE_GARDE,
    RoleUtilisateur.CHEF_DIVISION_AUTO,
    RoleUtilisateur.CHEF_SIM,
}


ROLES_GESTION_URGENCES = {
    RoleUtilisateur.MAJOR,
    RoleUtilisateur.MAJOR_DE_GARDE,
    RoleUtilisateur.REGULATEUR_AMBULANCE,
    RoleUtilisateur.CHEF_DIVISION_AUTO,
    RoleUtilisateur.CHEF_SIM,
}


ROLES_REGULATION_AMBULANCE = {
    RoleUtilisateur.MAJOR,
    RoleUtilisateur.CHEF_DIVISION_AUTO,
    RoleUtilisateur.CHEF_SIM,
}


ROLES_ACCES_AMBULANCES = ROLES_GESTION_URGENCES | {
    RoleUtilisateur.SUPERADMIN,
}


class TypeAmbulance(str, enum.Enum):
    PRINCIPALE = "principale"
    SECONDAIRE = "secondaire"


class StatutAmbulance(str, enum.Enum):
    DISPONIBLE = "disponible"
    NON_DISPONIBLE = "non_disponible"


class StatutMissionAmbulance(str, enum.Enum):
    EN_ATTENTE_CONFIRMATION = "en_attente_confirmation"
    ASSIGNE = "assigne"
    SUR_LES_LIEUX = "sur_les_lieux"
    EN_TRANSPORT = "en_transport"
    ARRIVE_URGENCES = "arrive_urgences"
    EN_BIONETTOYAGE = "en_bionettoyage"
    EN_COURS = "en_cours"
    TERMINEE = "terminee"
    ANNULEE = "annulee"


class CategorieLit(str, enum.Enum):
    """Clés des catégories standard auxquelles s'appliquent des règles dédiées."""
    VIP = "vip"
    SALLE_SEPTIQUE = "salle_septique"
    DECHOCAGE = "dechocage"
    URGENCE = "urgence"
    TRIAGE = "triage"


class StatutLit(str, enum.Enum):
    """Cycle de vie d'un lit ; la réservation est uniquement transitoire pour un transfert immédiat."""
    LIBRE = "libre"
    RESERVE = "reserve"
    OCCUPE = "occupe"
    NETTOYAGE = "nettoyage"