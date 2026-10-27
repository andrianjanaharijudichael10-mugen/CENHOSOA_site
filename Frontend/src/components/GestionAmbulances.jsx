import { useEffect, useMemo, useState } from 'react';
import {
  Ambulance, ArrowRight, CheckCircle2, MapPin, Navigation, ShieldCheck,
  TimerReset, UserRound, LogOut, AlertCircle, Clock, RefreshCw, Siren, X,
  Search, Eye, Printer,
} from 'lucide-react';
import {
  confirmerDemandeAmbulance,
  creerMissionAmbulance,
  refuserDemandeAmbulance,
  listerAmbulances, listerDemandesAmbulanceEnAttente, listerLieuxTana, listerLitsUrgenceDisponibles, listerMissionsAmbulances,
  simulerTrajetAmbulance, transitionnerMissionAmbulance,
  obtenirTokenStocke,
} from '../services/api';
import logoCenhosoa from '../assets/logo/logo.jpeg';
import { StylesEspace, BandeauPage, BTN_CLAIR, BTN_VERRE } from './StylesEspace';
import { ecouterDonneesModifiees } from '../services/tempsReel';
import FenetreFormulaire from './FenetreFormulaire';

const DELAI_DECHARGEMENT_MINUTES = 30;
const DELAI_BIONETTOYAGE_MINUTES = 45;
const LIBELLES_ETAPES = {
  assigne: 'Assigné',
  sur_les_lieux: 'Sur les lieux',
  en_transport: 'En transport',
  arrive_urgences: 'Arrivé aux Urgences',
  en_bionettoyage: 'En bionettoyage',
  terminee: 'Terminée',
  annulee: 'Annulée',
  en_cours: 'En cours',
};
const ETAPES_MISSION = ['assigne', 'sur_les_lieux', 'en_transport', 'arrive_urgences', 'en_bionettoyage'];

function formaterAriary(montant) {
  return `${new Intl.NumberFormat('fr-FR').format(montant)} Ar`;
}

function formaterHeure(date) {
  return date ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(date)) : '—';
}

function formaterDateMission(date) {
  if (!date || !Number.isFinite(new Date(date).getTime())) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(date));
}

function dateLocaleCle(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formaterMoisMission(mois) {
  const numeroMois = Number(mois);
  return new Intl.DateTimeFormat('fr-FR', { month: 'long' })
    .format(new Date(2000, numeroMois - 1, 1));
}

function imprimerZone(classeImpression) {
  const corps = document.body;
  const selecteurZone = classeImpression === 'impression-detail-active'
    ? '.zone-impression-detail'
    : '.zone-impression-historique';
  const zone = document.querySelector(selecteurZone);
  if (!zone) return;
  const copieImpression = zone.cloneNode(true);
  copieImpression.classList.add('copie-impression');
  corps.append(copieImpression);
  const terminerImpression = () => {
    corps.classList.remove(classeImpression);
    copieImpression.remove();
    window.removeEventListener('afterprint', terminerImpression);
  };
  corps.classList.add(classeImpression);
  window.addEventListener('afterprint', terminerImpression, { once: true });
  window.print();
}

function formaterDureeItineraire(minutes) {
  const heures = Math.floor(minutes / 60);
  const minutesRestantes = minutes % 60;
  return heures ? `${heures} h ${minutesRestantes} min` : `${minutesRestantes} min`;
}

function dureeRestante(dateDepart, dureeMinutes, maintenant) {
  if (!dateDepart) return dureeMinutes * 60;
  const depart = new Date(dateDepart).getTime();
  return Number.isFinite(depart)
    ? Math.max(0, dureeMinutes * 60 - Math.floor((maintenant - depart) / 1000))
    : dureeMinutes * 60;
}

function formaterCompte(minutesRestantesSecondes) {
  const heures = Math.floor(minutesRestantesSecondes / 3600);
  const minutes = Math.floor((minutesRestantesSecondes % 3600) / 60);
  const secondes = minutesRestantesSecondes % 60;
  return `${String(heures).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secondes).padStart(2, '0')}`;
}

function normaliserTexteLieu(texte) {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('fr');
}

function trouverLieuTana(destination, lieux) {
  const saisie = normaliserTexteLieu(destination);
  return lieux.find((lieu) => [lieu.nom, ...lieu.aliases].some((alias) => {
    const valeur = normaliserTexteLieu(alias);
    return saisie === valeur || saisie.startsWith(`${valeur},`);
  }));
}

function normaliserMission(mission) {
  return {
    id: mission.id,
    ambulanceId: mission.ambulance_id,
    ambulanceCode: mission.ambulance_code,
    ambulanceNom: mission.ambulance_nom,
    typeAmbulance: mission.type_ambulance,
    litNumero: mission.lit_numero,
    litId: mission.lit_id,
    litCategorie: mission.lit_categorie,
    litSecondaireNumero: mission.lit_secondaire_numero,
    litSecondaireCategorie: mission.lit_secondaire_categorie,
    litSecondaireId: mission.lit_secondaire_id,
    patient: mission.patient,
    patientId: mission.patient_id,
    telephoneContact: mission.telephone_contact,
    informationsMedicales: mission.informations_medicales,
    destination: mission.destination,
    adressePatient: mission.adresse_patient || mission.destination,
    distance: mission.distance_km,
    distanceAller: mission.distance_aller_km,
    dureeAller: mission.duree_aller_minutes,
    distanceRetour: mission.distance_retour_km,
    dureeRetour: mission.duree_retour_minutes,
    urgenceVitale: mission.urgence_vitale,
    patientInfectieux: mission.patient_infectieux,
    motifInfectieux: mission.motif_infectieux,
    statut: mission.statut,
    coutBase: mission.cout_base,
    heureDepart: mission.heure_depart,
    heureArrivee: mission.heure_arrivee,
    heureTransport: mission.heure_transport,
    heureArriveeUrgences: mission.heure_arrivee_urgences,
    heureLimiteDechargement: mission.heure_limite_dechargement,
    heureBionettoyage: mission.heure_bionettoyage,
    heureFinBionettoyage: mission.heure_fin_bionettoyage,
    heurePriseEnCharge: mission.heure_prise_en_charge,
    heureRetour: mission.heure_retour,
    minutesRetard: mission.minutes_retard,
    fraisRetard: mission.frais_retard,
    coutTotal: mission.cout_total,
    messageRefus: mission.message_refus,
    terminee: ['terminee', 'annulee'].includes(mission.statut),
  };
}

function DetailHistoriqueMission({ mission, fixerMissionDetail }) {
  useEffect(() => {
    const debordementPrecedent = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const fermerAvecEchap = (evenement) => {
      if (evenement.key === 'Escape') fixerMissionDetail(null);
    };
    window.addEventListener('keydown', fermerAvecEchap);
    return () => {
      document.body.style.overflow = debordementPrecedent;
      window.removeEventListener('keydown', fermerAvecEchap);
    };
  }, [fixerMissionDetail]);

  const afficherHeure = (libelle, heure) => (
    <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1F7A8C]">{libelle}</dt>
      <dd className="text-sm leading-relaxed text-[#43515A]">
        {heure ? `${formaterDateMission(heure)} · ${formaterHeure(heure)}` : 'Non renseignée'}
      </dd>
    </div>
  );

  return (
    <div
      className="mobile-scroll-overlay fixed inset-0 z-[120] flex justify-center bg-[#081B29]/80 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(evenement) => {
        if (evenement.target === evenement.currentTarget) fixerMissionDetail(null);
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-detail-mission"
        className="zone-impression-detail modal-scrollbar grid h-[92dvh] max-h-[92dvh] w-full max-w-5xl grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden overscroll-contain bg-[#F7F6F2] shadow-[0_32px_100px_rgba(0,0,0,0.35)] md:grid-cols-[0.8fr_1.2fr] md:grid-rows-1"
      >
        <div className="relative flex min-h-48 flex-col justify-between overflow-hidden bg-[#0A2233] p-6 text-white sm:min-h-64 sm:p-9 md:min-h-0">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#1F7A8C]/30 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center border border-white/20 bg-white/10 text-[#7FD1CB]">
              <Ambulance size={24} />
            </div>
            <button
              type="button"
              onClick={() => fixerMissionDetail(null)}
              aria-label="Fermer les détails de la mission"
              className="non-imprimable flex h-11 w-11 items-center justify-center border border-white/25 text-white/80 transition-colors hover:border-white hover:bg-white hover:text-[#0A2233] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FD1CB]"
            >
              <X size={18} />
            </button>
          </div>
          <div className="relative mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7FD1CB]">
              Historique des missions · {formaterDateMission(mission.heureDepart)}
            </p>
            <h2 id="titre-detail-mission" className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
              {mission.patient}
            </h2>
            <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-white/70">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[#7FD1CB]" />
              {mission.destination}
            </p>
          </div>
          <p className="relative mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            CENHOSOA <span className="mx-2 text-[#7FD1CB]">/</span> Transport sanitaire
          </p>
        </div>

        <div className="modal-scrollbar relative min-h-0 overflow-y-auto overscroll-contain px-6 pb-8 pt-7 sm:px-9 sm:pb-10 sm:pt-9">
          <div className="entete-impression mb-6 hidden items-center gap-5">
            <img src={logoCenhosoa} alt="Logo CENHOSOA" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">Centre Hospitalier de Soavinandriana</p>
              <h2 className="text-xl font-bold">Fiche détaillée de mission</h2>
              <h1 className="nom-patient-impression mt-1 break-words text-2xl font-extrabold leading-tight">{mission.patient}</h1>
              <p className="mt-1 text-xs">Mission du {formaterDateMission(mission.heureDepart)}</p>
            </div>
          </div>
          <div className="mb-6 flex items-start justify-between gap-3 pr-10">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1F7A8C]">Détail de la mission</p>
              <div className="mt-4 h-px w-12 bg-[#7FD1CB]" />
            </div>
            <button
              type="button"
              onClick={() => imprimerZone('impression-detail-active')}
              className="non-imprimable inline-flex min-h-9 shrink-0 items-center gap-2 border border-[#0A2233]/15 px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#0A2233] transition-colors hover:border-[#1F7A8C] hover:bg-[#1F7A8C] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C]"
            >
              <Printer size={15} />
              <span>Imprimer</span>
            </button>
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="bg-[#0A2233] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
              {LIBELLES_ETAPES[mission.statut] || mission.statut}
            </span>
            {mission.urgenceVitale && <span className="bg-red-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-800">Urgence vitale</span>}
            {mission.patientInfectieux && <span className="bg-amber-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-900">Patient infectieux</span>}
          </div>
          <dl className="divide-y divide-[#0A2233]/10 border-y border-[#0A2233]/10">
            <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1F7A8C]">Ambulance</dt>
              <dd className="text-sm leading-relaxed text-[#43515A]">{mission.ambulanceNom || 'Non renseignée'}{mission.ambulanceCode ? ` · ${mission.ambulanceCode}` : ''}</dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1F7A8C]">Distance totale</dt>
              <dd className="text-sm leading-relaxed text-[#43515A]">{mission.distance} km · aller {mission.distanceAller} km · retour {mission.distanceRetour} km</dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1F7A8C]">Lit attribué</dt>
              <dd className="text-sm leading-relaxed text-[#43515A]">{mission.litNumero || 'Aucun lit attribué'}{mission.litSecondaireNumero ? ` · ${mission.litSecondaireNumero}` : ''}</dd>
            </div>
            {mission.telephoneContact && (
              <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1F7A8C]">Contact</dt>
                <dd className="text-sm leading-relaxed text-[#43515A]">{mission.telephoneContact}</dd>
              </div>
            )}
            {afficherHeure('Départ', mission.heureDepart)}
            {afficherHeure('Arrivée au centre', mission.heureRetour)}
            <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1F7A8C]">Retard communiqué par le chauffeur</dt>
              <dd className="text-sm leading-relaxed text-[#43515A]">
                {mission.minutesRetard !== null ? `${mission.minutesRetard} min` : 'Non renseigné'}
              </dd>
            </div>
            {mission.motifInfectieux && (
              <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1F7A8C]">Motif infectieux</dt>
                <dd className="text-sm leading-relaxed text-[#43515A]">{mission.motifInfectieux}</dd>
              </div>
            )}
            {mission.informationsMedicales && (
              <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1F7A8C]">Informations médicales</dt>
                <dd className="whitespace-pre-wrap text-sm leading-relaxed text-[#43515A]">{mission.informationsMedicales}</dd>
              </div>
            )}
          </dl>
          <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-[#0A2233]/10 pt-4 text-sm">
            <span className="text-[#43515A]">Tarif de base : {formaterAriary(mission.coutBase)}</span>
            <span className="text-[#43515A]">Frais de retard : {formaterAriary(mission.fraisRetard)}</span>
            <strong className="text-[#0A2233]">Total : {formaterAriary(mission.coutTotal)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function GestionAmbulances({ profil, onDeconnexion, embedded = false }) {
  const [ambulances, fixerAmbulances] = useState([]);
  const [missions, fixerMissions] = useState([]);
  const [demandeAConfirmer, fixerDemandeAConfirmer] = useState(null);
  const [demandeMasqueeId, fixerDemandeMasqueeId] = useState('');
  const [lieuxTana, fixerLieuxTana] = useState([]);
  const [litsUrgenceDisponibles, fixerLitsUrgenceDisponibles] = useState([]);
  const [patient, fixerPatient] = useState('');
  const [destination, fixerDestination] = useState('');
  const [urgenceVitale, fixerUrgenceVitale] = useState(false);
  const [patientInfectieux, fixerPatientInfectieux] = useState(false);
  const [motifInfectieux, fixerMotifInfectieux] = useState('');
  const [latitudeDestination, fixerLatitudeDestination] = useState('');
  const [longitudeDestination, fixerLongitudeDestination] = useState('');
  const [ambulanceSelectionnee, fixerAmbulanceSelectionnee] = useState('');
  const [itineraireSimule, fixerItineraireSimule] = useState(null);
  const [itineraireIndex, fixerItineraireIndex] = useState(0);
  const [erreur, fixerErreur] = useState('');
  const [chargement, fixerChargement] = useState(true);
  const [simulationEnCours, fixerSimulationEnCours] = useState(false);
  const [rechargement, fixerRechargement] = useState(0);
  const [litsChoisis, fixerLitsChoisis] = useState({});
  const [retardsDeclares, fixerRetardsDeclares] = useState({});
  const [transitionEnCours, setTransitionEnCours] = useState('');
  const [confirmationEnCours, fixerConfirmationEnCours] = useState(false);
  const [refusEnCours, fixerRefusEnCours] = useState(false);
  const [motifRefus, fixerMotifRefus] = useState(null);
  const [ambulanceConfirmation, fixerAmbulanceConfirmation] = useState('');
  const [creationMissionOuverte, fixerCreationMissionOuverte] = useState(false);
  const [maintenant, fixerMaintenant] = useState(0);
  const [rechercheHistorique, fixerRechercheHistorique] = useState('');
  const [moisHistorique, fixerMoisHistorique] = useState('');
  const [anneeHistorique, fixerAnneeHistorique] = useState('');
  const [jourHistorique, fixerJourHistorique] = useState('');
  const [historiqueDuJour, fixerHistoriqueDuJour] = useState(true);
  const [missionDetail, fixerMissionDetail] = useState(null);

  const token = obtenirTokenStocke();
  const nomUtilisateur = [profil?.personnel?.prenoms, profil?.personnel?.nom].filter(Boolean).join(' ') || 'Personnel de régulation';
  const itineraires = itineraireSimule?.itineraires ?? [];
  const itineraireChoisi = itineraires.find((itineraire) => itineraire.index === itineraireIndex) ?? null;
  const distance = itineraireChoisi?.distance_km ?? null;
  const coutBase = itineraireChoisi?.cout_base ?? null;

  useEffect(() => {
    let estActif = true;
    const chargerDonnees = async () => {
      try {
        const [flotte, donneesMissions, litsDisponibles, lieuxDisponibles] = await Promise.all([
          listerAmbulances(token),
          listerMissionsAmbulances(token),
          listerLitsUrgenceDisponibles(token),
          listerLieuxTana(token),
        ]);
        if (!estActif) return;
        fixerAmbulances(flotte);
        fixerMissions(donneesMissions.map(normaliserMission));
        fixerLitsUrgenceDisponibles(litsDisponibles);
        fixerLieuxTana(lieuxDisponibles);
        fixerAmbulanceSelectionnee((selectionPrecedente) => {
          if (flotte.some((ambulance) => ambulance.id === selectionPrecedente && ambulance.statut === 'disponible')) {
            return selectionPrecedente;
          }
          return flotte.find((ambulance) => ambulance.type === 'principale' && ambulance.statut === 'disponible')?.id
            || flotte.find((ambulance) => ambulance.statut === 'disponible')?.id
            || '';
        });
        fixerErreur('');
      } catch (err) {
        if (estActif) fixerErreur(err.message || 'Impossible de charger les ambulances.');
      } finally {
        if (estActif) fixerChargement(false);
      }
    };

    chargerDonnees();
    const actualisation = window.setInterval(chargerDonnees, 30000);
    return () => {
      estActif = false;
      window.clearInterval(actualisation);
    };
  }, [token, rechargement]);

  useEffect(() => ecouterDonneesModifiees(['ambulances', 'lits'], () => {
    fixerRechargement((precedent) => precedent + 1);
  }), []);

  useEffect(() => {
    let estActif = true;
    const verifierDemandes = async () => {
      try {
        const demandes = await listerDemandesAmbulanceEnAttente(token);
        if (!estActif) return;
        fixerDemandeAConfirmer((demandeActuelle) => (
          demandes.find((demande) => demande.id === demandeActuelle?.id)
          || demandes.find((demande) => demande.id !== demandeMasqueeId)
          || null
        ));
      } catch (err) {
        if (estActif) fixerErreur(err.message || 'Impossible de vérifier les demandes en attente.');
      }
    };
    void verifierDemandes();
    const actualisation = window.setInterval(verifierDemandes, 30000);
    return () => {
      estActif = false;
      window.clearInterval(actualisation);
    };
  }, [demandeMasqueeId, token, rechargement]);

  useEffect(() => {
    const demarrage = window.setTimeout(() => fixerMaintenant(Date.now()), 0);
    const minuterie = window.setInterval(() => fixerMaintenant(Date.now()), 1000);
    return () => {
      window.clearTimeout(demarrage);
      window.clearInterval(minuterie);
    };
  }, []);

  const missionsActives = useMemo(() => missions.filter((mission) => (
    !mission.terminee && mission.statut !== 'en_attente_confirmation'
  )), [missions]);
  const missionsTerminees = useMemo(() => missions
    .filter((mission) => mission.terminee)
    .sort((missionA, missionB) => {
      const dateA = new Date(missionA.heureDepart).getTime();
      const dateB = new Date(missionB.heureDepart).getTime();
      return (Number.isFinite(dateB) ? dateB : 0) - (Number.isFinite(dateA) ? dateA : 0);
    }), [missions]);
  const anneesDisponibles = useMemo(() => {
    const anneeActuelle = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => anneeActuelle + index);
  }, []);
  const dateAujourdhui = new Date(maintenant);
  const dateAujourdhuiCle = dateLocaleCle(dateAujourdhui);
  const dateAujourdhuiTexte = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(dateAujourdhui);
  const anneeDateHistorique = historiqueDuJour
    ? dateAujourdhui.getFullYear()
    : Number(anneeHistorique || dateAujourdhui.getFullYear());
  const moisDateHistorique = historiqueDuJour
    ? dateAujourdhui.getMonth() + 1
    : Number(moisHistorique || 0);
  const nombreJoursMoisHistorique = moisDateHistorique
    ? new Date(anneeDateHistorique, moisDateHistorique, 0).getDate()
    : 31;
  const selectionnerDateHistorique = (partie, valeur) => {
    let annee = historiqueDuJour ? '' : anneeHistorique;
    let mois = historiqueDuJour ? '' : moisHistorique;
    let jour = historiqueDuJour ? '' : jourHistorique;
    if (partie === 'annee') annee = valeur;
    if (partie === 'mois') mois = valeur;
    if (partie === 'jour') jour = valeur;

    if (jour && mois) {
      const dernierJour = new Date(Number(annee || dateAujourdhui.getFullYear()), Number(mois), 0).getDate();
      jour = String(Math.min(Number(jour), dernierJour));
    }

    fixerAnneeHistorique(annee);
    fixerMoisHistorique(mois);
    fixerJourHistorique(jour);
    fixerHistoriqueDuJour(false);
  };
  const afficherHistoriqueAujourdhui = () => {
    fixerAnneeHistorique('');
    fixerMoisHistorique('');
    fixerJourHistorique('');
    fixerHistoriqueDuJour(true);
  };
  const afficherToutHistorique = () => {
    fixerAnneeHistorique('');
    fixerMoisHistorique('');
    fixerJourHistorique('');
    fixerHistoriqueDuJour(false);
  };
  const rechercheNormaliseeHistorique = normaliserTexteLieu(rechercheHistorique);
  const resumeDateHistorique = [
    jourHistorique,
    moisHistorique ? formaterMoisMission(moisHistorique) : '',
    anneeHistorique,
  ].filter(Boolean).join(' ');
  const missionsHistoriqueFiltrees = missionsTerminees.filter((mission) => {
    const dateMission = new Date(mission.heureDepart);
    if (historiqueDuJour && dateLocaleCle(dateMission) !== dateAujourdhuiCle) return false;
    if (!historiqueDuJour && anneeHistorique && dateMission.getFullYear() !== Number(anneeHistorique)) return false;
    if (!historiqueDuJour && moisHistorique && dateMission.getMonth() + 1 !== Number(moisHistorique)) return false;
    if (!historiqueDuJour && jourHistorique && dateMission.getDate() !== Number(jourHistorique)) return false;
    if (!rechercheNormaliseeHistorique) return true;
    return [
      mission.patient,
      mission.destination,
      mission.ambulanceNom,
      mission.ambulanceCode,
      mission.litNumero,
      mission.telephoneContact,
      formaterDateMission(mission.heureDepart),
    ].filter(Boolean).some((valeur) => normaliserTexteLieu(String(valeur)).includes(rechercheNormaliseeHistorique));
  });
  const ambulanceChoisie = ambulances.find((ambulance) => ambulance.id === ambulanceSelectionnee);
  const litsRequisDemande = demandeAConfirmer
    ? [
      ...(demandeAConfirmer.urgence_vitale ? ['dechocage'] : []),
      ...(demandeAConfirmer.patient_infectieux ? ['salle_septique'] : []),
      ...(!demandeAConfirmer.urgence_vitale && !demandeAConfirmer.patient_infectieux ? ['urgence'] : []),
    ]
    : [];
  const litsManquantsDemande = chargement
    ? []
    : litsRequisDemande.filter(
      (categorie) => !litsUrgenceDisponibles.some((lit) => lit.categorie === categorie),
    );
  const ambulanceManquanteDemande = !chargement
    && !ambulances.some((ambulance) => ambulance.statut === 'disponible');
  const ressourcesManquantesDemande = [
    ...(litsManquantsDemande.length ? ['lit_indisponible'] : []),
    ...(ambulanceManquanteDemande ? ['ambulance_indisponible'] : []),
  ];
  const motifsRefusDisponibles = demandeAConfirmer
    ? [
      {
        valeur: 'lit_indisponible',
        libelle: `Manque de lit disponible (${litsManquantsDemande.length
          ? litsManquantsDemande.map((categorie) => ({
            dechocage: 'déchoquage',
            salle_septique: 'salle septique',
            urgence: "d'urgence",
          })[categorie]).join(' et ')
          : litsRequisDemande.map((categorie) => ({
            dechocage: 'déchoquage',
            salle_septique: 'salle septique',
            urgence: "d'urgence",
          })[categorie]).join(' et ')})`,
      },
      { valeur: 'ambulance_indisponible', libelle: "Manque d'ambulance disponible" },
    ]
    : [];
  const motifsRefusSelectionnes = ressourcesManquantesDemande.length
    ? ressourcesManquantesDemande
    : motifRefus && motifRefus.missionId === demandeAConfirmer?.id
      ? motifRefus.valeurs
      : [];

  const simulerTrajet = async () => {
    if (!destination.trim()) {
      fixerErreur('Saisissez une destination avant de simuler le trajet.');
      return;
    }
    const latitudeRenseignee = latitudeDestination.trim() !== '';
    const longitudeRenseignee = longitudeDestination.trim() !== '';
    if (latitudeRenseignee !== longitudeRenseignee) {
      fixerErreur('Saisissez à la fois la latitude et la longitude, ou laissez les deux champs vides.');
      return;
    }

    let pointDestination;
    if (latitudeRenseignee && longitudeRenseignee) {
      const latitude = Number(latitudeDestination);
      const longitude = Number(longitudeDestination);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        fixerErreur('Les coordonnées GPS doivent être des nombres décimaux valides.');
        return;
      }
      if (latitude < -19.17 || latitude > -18.63 || longitude < 47.24 || longitude > 47.81) {
        fixerErreur('Les coordonnées doivent se trouver à Antananarivo ou dans ses environs.');
        return;
      }
      pointDestination = { latitude, longitude };
    } else {
      pointDestination = trouverLieuTana(destination, lieuxTana) || null;
    }

    fixerItineraireSimule(null);
    fixerItineraireIndex(0);
    fixerSimulationEnCours(true);
    fixerErreur('');
    try {
      const simulation = await simulerTrajetAmbulance(token, destination.trim(), pointDestination);
      fixerItineraireSimule(simulation);
      fixerItineraireIndex(simulation.itineraires[0]?.index ?? 0);
    } catch (err) {
      fixerErreur(err.message || 'Impossible de simuler le trajet.');
    } finally {
      fixerSimulationEnCours(false);
    }
  };

  const lancerMission = async (evenement) => {
    evenement.preventDefault();
    const ambulance = ambulances.find((element) => element.id === ambulanceSelectionnee);

    if (!patient.trim() || !destination.trim() || !itineraireChoisi || distance === null || coutBase === null) {
      fixerErreur('Renseignez le patient, la destination et simulez le trajet.');
      return;
    }
    if (!ambulance || ambulance.statut !== 'disponible') {
      fixerErreur('Cette ambulance n’est pas disponible.');
      return;
    }
    const litsDechocageLibres = litsUrgenceDisponibles.filter((lit) => lit.categorie === 'dechocage');
    const litsSeptiquesLibres = litsUrgenceDisponibles.filter((lit) => lit.categorie === 'salle_septique');
    const litsUrgenceLibres = litsUrgenceDisponibles.filter((lit) => lit.categorie === 'urgence');
    if (urgenceVitale && !litsDechocageLibres.length) {
      fixerErreur('Capacité de Déchocage Saturée à Soavinandriana - Admission Impossible.');
      return;
    }
    if (patientInfectieux && !litsSeptiquesLibres.length) {
      fixerErreur('Aucun lit de salle septique libre : la mission infectieuse ne peut pas être validée.');
      return;
    }
    if (!urgenceVitale && !patientInfectieux && !litsUrgenceLibres.length) {
      fixerErreur('Aucun lit d’urgence libre pour sécuriser cette mission.');
      return;
    }
    if (patientInfectieux && !motifInfectieux.trim()) {
      fixerErreur('Le motif infectieux est obligatoire pour cette mission.');
      return;
    }
    fixerErreur('');
    try {
      const pointDestination = latitudeDestination.trim() && longitudeDestination.trim()
        ? { latitude: Number(latitudeDestination), longitude: Number(longitudeDestination) }
        : trouverLieuTana(destination, lieuxTana);
      await creerMissionAmbulance(token, {
        ambulance_id: ambulance.id,
        patient: patient.trim(),
        destination: destination.trim(),
        distance_km: distance,
        itineraire_index: itineraireIndex,
        urgence_vitale: urgenceVitale,
        patient_infectieux: patientInfectieux,
        motif_infectieux: patientInfectieux ? motifInfectieux.trim() : null,
        ...(pointDestination && {
          latitude_destination: pointDestination.latitude,
          longitude_destination: pointDestination.longitude,
        }),
      });
    } catch (err) {
      fixerErreur(err.message || 'Impossible de lancer la mission.');
      return;
    }

    const prochaineAmbulance = ambulances.find((element) => (
      element.id !== ambulance.id
      && element.statut === 'disponible'
    ));
    fixerPatient('');
    fixerDestination('');
    fixerUrgenceVitale(false);
    fixerPatientInfectieux(false);
    fixerMotifInfectieux('');
    fixerItineraireSimule(null);
    fixerItineraireIndex(0);
    fixerAmbulanceSelectionnee(prochaineAmbulance?.id || '');
    fixerRechargement((precedent) => precedent + 1);
    fixerCreationMissionOuverte(false);
  };

  const avancerMission = async (mission, statutSuivant, litId = null, minutesRetard = null) => {
    setTransitionEnCours(`${mission.id}:${statutSuivant}`);
    fixerErreur('');
    try {
      await transitionnerMissionAmbulance(token, mission.id, statutSuivant, litId, minutesRetard);
      fixerLitsChoisis((precedents) => {
        const suivants = { ...precedents };
        delete suivants[mission.id];
        return suivants;
      });
      fixerRetardsDeclares((precedents) => {
        const suivants = { ...precedents };
        delete suivants[mission.id];
        return suivants;
      });
      fixerRechargement((precedent) => precedent + 1);
    } catch (err) {
      fixerErreur(err.message || 'La transition de mission a échoué.');
    } finally {
      setTransitionEnCours('');
    }
  };

  const confirmerDemandeEnAttente = async (evenement) => {
    evenement.preventDefault();
    if (ressourcesManquantesDemande.length) {
      fixerErreur('Cette demande ne peut pas être confirmée : une ambulance ou un lit requis est indisponible. Vous pouvez la refuser.');
      return;
    }
    const ambulanceSelectionneePourConfirmation = ambulanceConfirmation
      || ambulances.find((ambulance) => ambulance.statut === 'disponible')?.id;
    if (!demandeAConfirmer || !ambulanceSelectionneePourConfirmation) {
      fixerErreur('Sélectionnez une ambulance disponible avant de confirmer.');
      return;
    }
    fixerConfirmationEnCours(true);
    fixerErreur('');
    try {
      await confirmerDemandeAmbulance(token, demandeAConfirmer.id, ambulanceSelectionneePourConfirmation);
      fixerDemandeAConfirmer(null);
      fixerDemandeMasqueeId('');
      fixerAmbulanceConfirmation('');
      fixerRechargement((precedent) => precedent + 1);
    } catch (err) {
      fixerErreur(err.message || 'Impossible de confirmer cette demande.');
      if (err.status === 409) fixerRechargement((precedent) => precedent + 1);
    } finally {
      fixerConfirmationEnCours(false);
    }
  };

  const refuserDemandeEnAttente = async () => {
    const motifs = motifsRefusSelectionnes.filter((motif) => motifsRefusDisponibles.some((option) => option.valeur === motif));
    if (!demandeAConfirmer || !motifs.length) return;
    fixerRefusEnCours(true);
    fixerErreur('');
    try {
      await refuserDemandeAmbulance(token, demandeAConfirmer.id, motifs);
      fixerDemandeAConfirmer(null);
      fixerDemandeMasqueeId('');
      fixerMotifRefus(null);
      fixerRechargement((precedent) => precedent + 1);
    } catch (err) {
      fixerErreur(err.message || "Impossible d'envoyer le message de refus au patient.");
      if (err.status === 409) fixerRechargement((precedent) => precedent + 1);
    } finally {
      fixerRefusEnCours(false);
    }
  };

  return (
    <div className={embedded ? 'espace font-body text-[#1E2333]' : 'espace min-h-screen bg-[#F4F2EE] font-body text-[#1E2333]'}>
      <style>{`
        @page { margin: 0; }
        @page fiche-mission { size: A4 portrait; margin: 0; }
        .zone-impression-detail { page: fiche-mission; }
        @media print {
          body.impression-historique-active > *:not(.copie-impression),
          body.impression-detail-active > *:not(.copie-impression) {
            display: none !important;
          }
          body.impression-historique-active > .copie-impression,
          body.impression-detail-active > .copie-impression {
            display: block !important;
          }
          body.impression-historique-active *,
          body.impression-detail-active * { visibility: hidden !important; }
          body.impression-historique-active .zone-impression-historique,
          body.impression-historique-active .zone-impression-historique *,
          body.impression-detail-active .zone-impression-detail,
          body.impression-detail-active .zone-impression-detail * { visibility: visible !important; }
          body.impression-historique-active .zone-impression-historique,
          body.impression-detail-active .zone-impression-detail {
            position: absolute !important;
            inset: 12mm auto auto 12mm !important;
            width: calc(100% - 24mm) !important;
            max-width: none !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
            border: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          body.impression-historique-active .zone-impression-historique {
            display: block !important;
            animation: none !important;
            transform: none !important;
          }
          body.impression-historique-active .zone-impression-historique,
          body.impression-historique-active .zone-impression-historique * {
            color: #111 !important;
            font-family: Arial, sans-serif !important;
            letter-spacing: normal !important;
            text-shadow: none !important;
          }
          body.impression-historique-active .zone-impression-historique article {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 5mm 0 !important;
            border: 0 !important;
            border-bottom: 1px solid #bbb !important;
            border-radius: 0 !important;
            animation: none !important;
            transform: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
            box-shadow: none !important;
          }
          body.impression-historique-active .zone-impression-historique article > div,
          body.impression-historique-active .zone-impression-historique article dl,
          body.impression-historique-active .zone-impression-historique article dl > div {
            display: block !important;
            margin-top: 2mm !important;
          }
          body.impression-historique-active .zone-impression-historique article dt {
            display: inline !important;
            margin-right: 2mm !important;
            font-weight: 700 !important;
          }
          body.impression-historique-active .zone-impression-historique article dd {
            display: inline !important;
            margin: 0 4mm 0 0 !important;
          }
          body.impression-historique-active .zone-impression-historique article p,
          body.impression-historique-active .zone-impression-historique article span,
          body.impression-historique-active .zone-impression-historique article dd {
            font-size: 9pt !important;
            line-height: 1.35 !important;
          }
          body.impression-historique-active .zone-impression-historique article h3 {
            font-size: 12pt !important;
            break-after: avoid;
            page-break-after: avoid;
          }
          body.impression-historique-active .zone-impression-historique .entete-impression {
            margin-bottom: 6mm !important;
            padding-bottom: 4mm !important;
            border-bottom: 2px solid #0A2233 !important;
          }
          body.impression-historique-active .entete-impression img {
            width: 22mm !important;
            height: 22mm !important;
            object-fit: contain !important;
          }
          body.impression-detail-active .entete-impression img {
            width: 22mm !important;
            height: 22mm !important;
            object-fit: contain !important;
          }
          body.impression-historique-active .zone-impression-historique .entete-impression h2 {
            margin: 0 !important;
            font-size: 18pt !important;
            line-height: 1.2 !important;
          }
          body.impression-historique-active .zone-impression-historique .entete-impression p {
            margin-top: 2mm !important;
            font-size: 9pt !important;
          }
          body.impression-detail-active .zone-impression-detail { display: block !important; }
          body.impression-detail-active .zone-impression-detail > div:first-child { display: none !important; }
          body.impression-detail-active .zone-impression-detail {
            box-sizing: border-box !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: auto !important;
            bottom: auto !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            padding: 10mm 12mm !important;
            break-before: avoid-page !important;
            break-after: avoid-page !important;
            break-inside: avoid-page !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          body.impression-detail-active .zone-impression-detail > div:last-child {
            box-sizing: border-box !important;
            min-height: 0 !important;
            max-height: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
            color: #111 !important;
            padding: 0 !important;
            font-family: Arial, sans-serif !important;
            letter-spacing: normal !important;
            font-size: 8pt !important;
            line-height: 1.2 !important;
          }
          body.impression-detail-active .zone-impression-detail .entete-impression {
            display: flex !important;
            align-items: center !important;
            gap: 5mm !important;
            margin-bottom: 3mm !important;
            padding-bottom: 3mm !important;
            border-bottom: 2px solid #0A2233 !important;
          }
          body.impression-detail-active .zone-impression-detail .entete-impression h2 {
            margin: 0 !important;
            font-size: 11pt !important;
            line-height: 1.1 !important;
          }
          body.impression-detail-active .zone-impression-detail .entete-impression .nom-patient-impression {
            margin: 1mm 0 !important;
            color: #0A2233 !important;
            font-size: 22pt !important;
            font-weight: 800 !important;
            line-height: 1.1 !important;
          }
          body.impression-detail-active .zone-impression-detail .entete-impression p {
            margin: 0 !important;
            font-size: 8pt !important;
          }
          body.impression-detail-active .zone-impression-detail > div:last-child > .mb-6 {
            margin-bottom: 2mm !important;
          }
          body.impression-detail-active .zone-impression-detail dl > div {
            display: grid !important;
            grid-template-columns: 48mm 1fr !important;
            gap: 1mm !important;
            padding: 1.5mm 0 !important;
            border-bottom: 1px solid #bbb !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          body.impression-detail-active .zone-impression-detail dt,
          body.impression-detail-active .zone-impression-detail dd {
            color: #111 !important;
            font-size: 8pt !important;
            line-height: 1.2 !important;
          }
          body.impression-detail-active .zone-impression-detail dt {
            font-weight: 700 !important;
          }
          body.impression-detail-active .zone-impression-detail,
          body.impression-detail-active .zone-impression-detail * { color: #111 !important; }
          body.impression-detail-active .zone-impression-detail .entete-impression { color: #111 !important; }
          body.impression-detail-active .zone-impression-detail > div:last-child > .mt-6 {
            margin-top: 3mm !important;
            padding-top: 2mm !important;
            font-size: 8pt !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          body.impression-historique-active .non-imprimable,
          body.impression-detail-active .non-imprimable { display: none !important; }
          body.impression-historique-active .entete-impression { display: flex !important; }
        }
      `}</style>
      <StylesEspace />
      {demandeAConfirmer && (
        <div className="mobile-scroll-overlay fixed inset-0 z-[100] flex justify-center bg-[#0A2233]/70 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="titre-demande-a-confirmer" className="mobile-scroll-dialog my-auto w-full max-w-xl overflow-y-auto overscroll-contain rounded-3xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 bg-gradient-to-r from-red-700 to-red-600 px-6 py-5 text-white">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Siren className="h-6 w-6" /></span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/75">Nouvelle demande · à traiter</p>
                  <h2 id="titre-demande-a-confirmer" className="mt-1 text-xl font-bold">Confirmation du régulateur requise</h2>
                </div>
              </div>
              <button type="button" onClick={() => { fixerDemandeMasqueeId(demandeAConfirmer.id); fixerDemandeAConfirmer(null); }} aria-label="Fermer la notification" className="rounded-xl p-2 text-white/80 hover:bg-white/15 hover:text-white"><X className="h-5 w-5" /></button>
            </header>
            <form onSubmit={confirmerDemandeEnAttente} className="space-y-5 p-6">
              <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-[#0A2233]">{demandeAConfirmer.patient || 'Patient non renseigné'}</p>
                  {demandeAConfirmer.urgence_vitale && <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold uppercase text-red-800">Urgence vitale</span>}
                  {demandeAConfirmer.patient_infectieux && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-800">Infectieux</span>}
                </div>
                <p className="mt-3 flex items-start gap-2 text-sm text-slate-700"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1F7A8C]" />{demandeAConfirmer.destination}</p>
                {demandeAConfirmer.telephone_contact && <p className="mt-2 text-xs text-slate-600">Contact : {demandeAConfirmer.telephone_contact}</p>}
                {demandeAConfirmer.motif_infectieux && <p className="mt-2 text-xs text-slate-600">Information médicale : {demandeAConfirmer.motif_infectieux}</p>}
                <p className="mt-3 text-xs font-semibold text-slate-500">Reçue à {formaterHeure(demandeAConfirmer.heure_depart)} · {demandeAConfirmer.distance_km.toFixed(2)} km estimés</p>
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                Ambulance à assigner
                <select required value={ambulanceConfirmation || ambulances.find((ambulance) => ambulance.statut === 'disponible')?.id || ''} onChange={(event) => fixerAmbulanceConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#1F7A8C]">
                  <option value="" disabled>Aucune ambulance disponible</option>
                  {ambulances.filter((ambulance) => ambulance.statut === 'disponible').map((ambulance) => <option key={ambulance.id} value={ambulance.id}>{ambulance.nom} · {ambulance.type}</option>)}
                </select>
              </label>
              {ressourcesManquantesDemande.length > 0 && (
                <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  Demande non confirmable : {[
                    ...(litsManquantsDemande.length
                      ? [`manque de lit disponible (${litsManquantsDemande.map((categorie) => ({
                        dechocage: 'déchoquage',
                        salle_septique: 'salle septique',
                        urgence: "d'urgence",
                      })[categorie]).join(' et ')})`]
                      : []),
                    ...(ambulanceManquanteDemande ? ["manque d'ambulance disponible"] : []),
                  ].join(' et ')}. Refusez la demande ou attendez le rétablissement des disponibilités.
                </div>
              )}
              {motifsRefusDisponibles.length > 0 && (
                <fieldset className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <legend className="px-1 text-sm font-bold text-amber-950">Refuser la demande et informer le patient</legend>
                  <p className="text-xs leading-relaxed text-amber-900">Les ressources indisponibles sont cochées automatiquement. Le message sera affiché dans le suivi du patient.</p>
                  {motifsRefusDisponibles.map((option) => (
                    <label key={option.valeur} className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        name="motif-refus-demande"
                        value={option.valeur}
                        checked={motifsRefusSelectionnes.includes(option.valeur)}
                        disabled={ressourcesManquantesDemande.includes(option.valeur)}
                        onChange={(event) => fixerMotifRefus((precedent) => {
                          const valeursPrecedentes = precedent?.missionId === demandeAConfirmer.id
                            ? precedent.valeurs
                            : [];
                          const valeurs = event.target.checked
                            ? [...valeursPrecedentes, option.valeur]
                            : valeursPrecedentes.filter((valeur) => valeur !== option.valeur);
                          return { missionId: demandeAConfirmer.id, valeurs };
                        })}
                        className="mt-0.5 accent-amber-700"
                      />
                      <span>{option.libelle}</span>
                    </label>
                  ))}
                </fieldset>
              )}
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={refuserDemandeEnAttente}
                  disabled={refusEnCours || !motifsRefusSelectionnes.length}
                  className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {refusEnCours ? 'Enregistrement du refus…' : 'Refuser et informer le patient'}
                </button>
                <button type="submit" disabled={confirmationEnCours || ressourcesManquantesDemande.length > 0 || !ambulances.some((ambulance) => ambulance.statut === 'disponible')} className="inline-flex items-center gap-2 rounded-xl bg-[#0A2233] px-5 py-3 text-sm font-bold text-white hover:bg-[#0F3D52] disabled:cursor-not-allowed disabled:opacity-50">
                  {confirmationEnCours ? 'Confirmation…' : 'Confirmer et assigner'} <CheckCircle2 className="h-4 w-4" />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {!embedded && <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A2233] text-white shadow-lg shadow-[#0A2233]/20">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="group flex min-w-0 items-center space-x-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-white p-1.5 shadow-md shadow-black/20 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2 sm:h-14 sm:w-14">
              <img src={logoCenhosoa} alt="Logo Centre Hospitalier de Soavinandriana" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <span className="block text-xl font-display font-light tracking-tight text-white">CENHOSOA</span>
              <h1 className="block truncate text-[10px] font-mono font-semibold uppercase tracking-widest text-[#7FD1CB] sm:text-[11px]">Gestion des ambulances · Régulation</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-3 border-r border-white/15 pr-4 sm:flex">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#7FD1CB]">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-display font-bold leading-tight text-white">{nomUtilisateur}</p>
                <p className="text-[11px] font-medium capitalize text-[#7FD1CB]">{profil?.role?.replaceAll('_', ' ') || 'Personnel de régulation'}</p>
              </div>
            </div>
            <button type="button" onClick={onDeconnexion} title="Se déconnecter" aria-label="Se déconnecter" className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-600 px-3 text-white transition-all duration-200 hover:bg-red-700">
              <LogOut className="h-5 w-5" />
              <span className="hidden text-xs font-semibold sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>}

      <main className={embedded ? 'space-y-5' : 'mx-auto max-w-[1440px] space-y-7 px-4 py-7 sm:px-7 lg:px-10 lg:py-9'}>
        {erreur && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p>{erreur}</p>
          </div>
        )}

        <BandeauPage
          etiquette="Centre de régulation · Ambulances"
          titre="Coordonner les départs,"
          accent="suivre chaque mission."
          sousTitre="Consultez la disponibilité de la flotte, planifiez un trajet et suivez les retours au centre."
          actions={<>
            <button
              type="button"
              onClick={() => {
                fixerChargement(true);
                fixerRechargement((precedent) => precedent + 1);
              }}
              disabled={chargement}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm text-white transition hover:-translate-y-0.5 hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw size={16} className={chargement ? 'animate-spin' : ''} /> Actualiser
            </button>
            <a href="#nouvelle-mission" className={BTN_CLAIR}><Ambulance size={17} /> Nouvelle mission</a>
            <a href="#missions" className={BTN_VERRE}><Clock size={17} /> Missions en cours</a>
          </>}
        />

        <section aria-labelledby="titre-flotte">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#5B7480]">Disponibilité en direct</p><h2 id="titre-flotte" className="mt-1 text-xl font-bold">{chargement ? 'Chargement de la flotte…' : `Flotte · ${ambulances.length} véhicules`}</h2></div>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Disponible</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-red-500" />En mission</span></div>
          </div>
          {ambulances.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {ambulances.map((ambulance) => {
              const disponible = ambulance.statut === 'disponible';
              return (
                <article key={ambulance.id} className={`border-l-4 ${disponible ? 'border-l-emerald-500' : 'border-l-red-500'} apparition group rounded-2xl border bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1F7A8C]/10 ${disponible ? 'border-black/[0.06]' : 'border-red-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${disponible ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}><Ambulance size={20} /></div><div><h3 className="text-sm font-bold">{ambulance.nom}</h3><p className="mt-0.5 text-xs text-slate-500">{ambulance.code}</p></div></div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${disponible ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}><i className={`h-2 w-2 rounded-full ${disponible ? 'bg-emerald-500' : 'animate-pulse bg-red-500'}`} />{disponible ? 'Disponible' : 'En mission'}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs text-slate-500">Type</span>{ambulance.type === 'principale' ? <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF1F1] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0F3D52]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1F7A8C]" />Principale</span> : <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">Secondaire</span>}</div>
                </article>
              );
            })}
          </div> : (
            <div className="rounded-2xl border border-dashed border-[#D5DEE0] bg-white px-5 py-8 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF1F1] text-[#1F7A8C]"><Ambulance size={21} /></div>
              <p className="mt-3 text-sm font-semibold text-[#0A2233]">{chargement ? 'Chargement de la flotte…' : 'Aucun véhicule enregistré'}</p>
              {!chargement && <p className="mt-1 text-xs text-slate-500">Les ambulances apparaîtront ici lorsqu’elles seront ajoutées.</p>}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.5fr)]">
          <section className="apparition rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#5B7480]">Départ</p><h2 className="mt-1 text-lg font-bold">Nouvelle mission</h2></div><MapPin className="mt-1 text-[#1F7A8C]" size={20} /></div>
            <button type="button" onClick={() => { fixerErreur(''); fixerCreationMissionOuverte(true); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#1F7A8C] px-5 text-sm font-bold text-white transition hover:bg-[#186575]"><Ambulance size={17} /> Créer une mission</button>
          </section>
          {creationMissionOuverte && <FenetreFormulaire titre="Créer une mission d’ambulance" description="Renseignez les informations du patient, l’itinéraire et l’ambulance à affecter." erreur={erreur} onFermer={() => fixerCreationMissionOuverte(false)} largeur="max-w-4xl">
            <form onSubmit={lancerMission} className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Nom du patient
                <input required maxLength={120} value={patient} onChange={(event) => fixerPatient(event.target.value)} placeholder="Nom et prénom" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Adresse de prise en charge du patient
                <input required maxLength={160} list="lieux-tana" value={destination} onChange={(event) => { fixerDestination(event.target.value); fixerItineraireSimule(null); fixerItineraireIndex(0); }} placeholder="Adresse ou établissement à Antananarivo" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10" />
                <datalist id="lieux-tana">{lieuxTana.flatMap((lieu) => [lieu.nom, ...lieu.aliases].map((alias) => <option key={`${lieu.id}-${alias}`} value={alias} />))}</datalist>
              </label>
              <fieldset className="rounded-xl border border-[#E3E8E8] p-3">
                <legend className="px-1 text-xs font-semibold text-slate-600">Coordonnées GPS (facultatif)</legend>
                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-600">Latitude
                    <input type="number" min="-19.17" max="-18.63" step="any" inputMode="decimal" value={latitudeDestination} onChange={(event) => { fixerLatitudeDestination(event.target.value); fixerItineraireSimule(null); fixerItineraireIndex(0); }} placeholder="-18.9156496" className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10" />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">Longitude
                    <input type="number" min="47.24" max="47.81" step="any" inputMode="decimal" value={longitudeDestination} onChange={(event) => { fixerLongitudeDestination(event.target.value); fixerItineraireSimule(null); fixerItineraireIndex(0); }} placeholder="47.520382" className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10" />
                  </label>
                </div>
              </fieldset>
              <label className="block text-sm font-semibold text-slate-700">Affecter une ambulance
                <select value={ambulanceSelectionnee} onChange={(event) => fixerAmbulanceSelectionnee(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10">
                  <option value="" disabled>Aucune ambulance disponible</option>
                  {ambulances.map((ambulance) => {
                    const estInaccessible = ambulance.statut !== 'disponible';
                    return <option key={ambulance.id} value={ambulance.id} disabled={estInaccessible}>{ambulance.nom} · {ambulance.statut === 'disponible' ? 'Disponible' : 'En mission'}</option>;
                  })}
                </select>
              </label>

              <fieldset className="space-y-3 rounded-2xl border border-[#D5DEE0] bg-white p-4">
                <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-600">Qualification clinique</legend>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 p-3 text-sm">
                  <input type="checkbox" checked={urgenceVitale} onChange={(event) => fixerUrgenceVitale(event.target.checked)} className="mt-1 accent-red-600" />
                  <span><strong className="block text-red-950">Urgence vitale · SMUR</strong><span className="mt-0.5 block text-xs text-red-800">Réserve un lit de déchoquage ; la création est refusée si la capacité est saturée.</span></span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-sm">
                  <input type="checkbox" checked={patientInfectieux} onChange={(event) => fixerPatientInfectieux(event.target.checked)} className="mt-1 accent-amber-600" />
                  <span><strong className="block text-amber-950">Patient infectieux · Salle septique</strong><span className="mt-0.5 block text-xs text-amber-800">Une place septique sera réservée, y compris si l’urgence vitale est également cochée.</span></span>
                </label>
                {patientInfectieux && <label className="block text-xs font-semibold text-slate-700">Motif infectieux obligatoire
                  <input required maxLength={255} value={motifInfectieux} onChange={(event) => fixerMotifInfectieux(event.target.value)} placeholder="Ex. BMR, COVID-19…" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10" />
                </label>}
              </fieldset>

              <div className="rounded-xl border border-[#E3E8E8] bg-[#F7F6F3] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Navigation size={16} className="text-[#1F7A8C]" />Itinéraire aller-retour OSRM</div><button type="button" onClick={simulerTrajet} disabled={!destination.trim() || simulationEnCours} className="h-9 rounded-lg border border-[#D5DEE0] bg-white px-3 text-xs font-bold text-[#0F3D52] transition hover:bg-[#EAF1F1] disabled:cursor-not-allowed disabled:opacity-50">{simulationEnCours ? 'Calcul en cours…' : 'Calculer les deux trajets'}</button></div>
                {distance === null ? <p className="mt-2 text-xs text-slate-500">OSRM estime base → patient puis patient → CENHOSOA. Estimation théorique, sans télémétrie GPS ni prise en compte du trafic en temps réel.</p> : <><label className="mt-3 block border-t border-[#e2e9ed] pt-3 text-xs font-semibold text-slate-600">Choisir l’itinéraire aller
                  <select value={itineraireIndex} onChange={(event) => fixerItineraireIndex(Number(event.target.value))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10">
                    {itineraires.map((itineraire) => <option key={itineraire.index} value={itineraire.index}>Trajet {itineraire.index + 1}{itineraire.index === 0 ? ' · recommandé' : ''} — {itineraire.distance_km.toFixed(2)} km · {formaterDureeItineraire(itineraire.duree_estimee_minutes)}</option>)}
                  </select>
                  </label><div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#e2e9ed] pt-3 sm:grid-cols-4"><div><p className="text-xs text-slate-500">Aller · base → patient</p><p className="mt-0.5 text-sm font-bold text-[#0A2233]">{itineraireChoisi.distance_aller_km.toFixed(2)} km</p><p className="text-xs text-slate-600">{formaterDureeItineraire(itineraireChoisi.duree_aller_minutes)}</p></div><div><p className="text-xs text-slate-500">Retour · patient → CENHOSOA</p><p className="mt-0.5 text-sm font-bold text-[#0A2233]">{itineraireChoisi.distance_retour_km.toFixed(2)} km</p><p className="text-xs text-slate-600">{formaterDureeItineraire(itineraireChoisi.duree_retour_minutes)}</p></div><div><p className="text-xs text-slate-500">Distance totale</p><p className="mt-0.5 text-sm font-bold text-[#0A2233]">{distance.toFixed(2)} km</p></div><div className="sm:text-right"><p className="text-xs text-slate-500">ETA total · tarif</p><p className="mt-0.5 text-sm font-bold text-[#0A2233]">{formaterDureeItineraire(itineraireChoisi.duree_estimee_minutes)}</p><p className="text-xs text-[#1F7A8C]">{formaterAriary(coutBase)}</p></div></div>{Boolean(itineraireChoisi?.etapes?.length) && <details className="mt-3 border-t border-[#e2e9ed] pt-2"><summary className="cursor-pointer select-none text-xs font-semibold text-[#0F3D52]">Détails des deux trajets · {itineraireChoisi.etapes.length} étapes</summary><ol className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pl-5 text-xs text-slate-600">{itineraireChoisi.etapes.map((etape, index) => <li key={`${index}-${etape.instruction}`} className="list-decimal pl-1"><span>{etape.instruction}</span><span className="ml-2 whitespace-nowrap text-slate-400">{etape.distance_m >= 1000 ? `${(etape.distance_m / 1000).toFixed(1)} km` : `${etape.distance_m} m`}</span></li>)}</ol></details>}</>}
              </div>

              <button type="submit" disabled={chargement || simulationEnCours || !distance || !patient.trim() || !destination.trim() || (patientInfectieux && !motifInfectieux.trim()) || !ambulanceChoisie || ambulanceChoisie.statut !== 'disponible'} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1F7A8C] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#186575] disabled:cursor-not-allowed disabled:opacity-50"><Ambulance size={17} />Affecter et réserver les lits</button>
            </form>
          </FenetreFormulaire>}

          <section id="missions" aria-labelledby="titre-missions" className="scroll-mt-28 apparition space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#5B7480]">Suivi opérationnel</p><h2 id="titre-missions" className="mt-1 text-lg font-bold">Missions en cours <span className="ml-1 rounded-full bg-[#EAF1F1] px-2 py-0.5 text-xs text-[#0F3D52]">{missionsActives.length}</span></h2></div><span className="text-xs text-slate-500">ETA aller-retour · retard communiqué au retour</span></div>
            {!missionsActives.length ? <div className="rounded-2xl border border-dashed border-[#D5DEE0] bg-white px-5 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF1F1] text-[#5B7480]"><Ambulance size={22} /></div><p className="mt-3 text-sm font-semibold text-slate-700">Aucune mission en cours</p><p className="mt-1 text-xs text-slate-500">Les départs enregistrés apparaîtront ici.</p></div> : missionsActives.map((mission) => {
              const statut = mission.statut === 'en_cours' ? 'assigne' : mission.statut;
              const indexEtape = ETAPES_MISSION.indexOf(statut);
              const estAlerteDechargement = statut === 'arrive_urgences'
                && dureeRestante(mission.heureArriveeUrgences, DELAI_DECHARGEMENT_MINUTES, maintenant) === 0;
              const tempsDechargement = dureeRestante(mission.heureArriveeUrgences, DELAI_DECHARGEMENT_MINUTES, maintenant);
              const tempsNettoyage = dureeRestante(mission.heureBionettoyage, DELAI_BIONETTOYAGE_MINUTES, maintenant);
              const progressionAller = mission.distance
                ? (mission.distanceAller / mission.distance) * 100
                : 50;
              const tempsAllerEcoule = Math.max(0, maintenant - new Date(mission.heureDepart).getTime()) / 60000;
              const progression = statut === 'assigne'
                ? Math.min(progressionAller, (tempsAllerEcoule / Math.max(mission.dureeAller, 1)) * progressionAller)
                : statut === 'sur_les_lieux'
                  ? progressionAller
                  : statut === 'en_transport'
                    ? progressionAller + (100 - progressionAller) * Math.min(1, (Math.max(0, maintenant - new Date(mission.heureTransport).getTime()) / 60000) / Math.max(mission.dureeRetour, 1))
                    : 100;
              const litsDestines = [
                { id: mission.litId, numero: mission.litNumero, categorie: mission.litCategorie },
                { id: mission.litSecondaireId, numero: mission.litSecondaireNumero, categorie: mission.litSecondaireCategorie },
              ].filter((lit) => lit.id);
              const litChoisi = litsChoisis[mission.id] || (litsDestines.length === 1 ? litsDestines[0].id : '');
              const transitionSuivante = {
                assigne: 'arrive_urgences',
                sur_les_lieux: 'en_transport',
                en_transport: 'arrive_urgences',
                arrive_urgences: 'en_bionettoyage',
                en_bionettoyage: 'terminee',
              }[statut];
              const actionSuivante = {
                assigne: 'Marquer l’arrivée au CENHOSOA',
                sur_les_lieux: 'Début du transport',
                en_transport: 'Arrivée aux Urgences',
                arrive_urgences: mission.patientInfectieux ? 'Décharge · démarrer le bionettoyage' : 'Patient déchargé · bionettoyage',
                en_bionettoyage: 'Terminer · libérer l’ambulance',
              }[statut];
              const etiquetteEta = statut === 'assigne'
                ? `Retour estimé au CENHOSOA · ${formaterCompte(dureeRestante(mission.heureDepart, mission.dureeAller + mission.dureeRetour, maintenant))}`
                : statut === 'en_transport'
                  ? `Arrivée théorique au CENHOSOA · ${formaterCompte(dureeRestante(mission.heureTransport, mission.dureeRetour, maintenant))}`
                  : statut === 'arrive_urgences'
                    ? `Décharge brancard · ${estAlerteDechargement ? 'DÉLAI DÉPASSÉ' : formaterCompte(tempsDechargement)}`
                    : statut === 'en_bionettoyage' && mission.patientInfectieux
                      ? `Bionettoyage ambulance · ${tempsNettoyage ? formaterCompte(tempsNettoyage) : 'minimum atteint'}`
                      : null;
              const prochaineEnCours = transitionEnCours === `${mission.id}:${transitionSuivante}`;
              return (
                <article key={mission.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${estAlerteDechargement ? 'animate-pulse border-red-400 shadow-red-900/10 motion-reduce:animate-none' : 'border-black/[0.06]'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold text-[#0A2233]">{mission.patient}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${mission.urgenceVitale ? 'bg-red-100 text-red-800' : 'bg-[#EAF1F1] text-[#0F3D52]'}`}>{LIBELLES_ETAPES[statut] || LIBELLES_ETAPES.en_cours}</span>{mission.urgenceVitale && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">SMUR</span>}{mission.patientInfectieux && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">INFECTIEUX</span>}</div>
                      <p className="mt-1.5 flex items-center gap-1.5 break-words text-sm text-slate-600"><MapPin size={14} className="shrink-0 text-[#1F7A8C]" />{mission.adressePatient}</p><p className="mt-1 text-xs text-slate-500">{mission.ambulanceNom} · {mission.distance.toFixed(2)} km aller-retour · départ {formaterHeure(mission.heureDepart)}</p>
                    </div><span className="rounded-lg bg-[#EAF1F1] px-2.5 py-1.5 text-xs font-bold text-[#0F3D52]">{formaterAriary(mission.coutBase)}</span>
                  </div>
                  {(mission.telephoneContact || mission.informationsMedicales) && (
                    <div className="space-y-1 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-700 sm:px-5">
                      {mission.telephoneContact && <p><strong>Contact :</strong> {mission.telephoneContact}</p>}
                      {mission.informationsMedicales && <p className="whitespace-pre-wrap"><strong>Informations médicales :</strong> {mission.informationsMedicales}</p>}
                    </div>
                  )}
                  <div className="space-y-4 p-4 sm:p-5">
                    <ol aria-label="Étapes de mission" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {ETAPES_MISSION.map((etape, index) => <li key={etape} className={`flex min-h-14 items-center gap-2 rounded-xl border px-2.5 py-2 text-xs ${index < indexEtape ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : etape === statut ? 'border-[#1F7A8C]/30 bg-[#EAF1F1] font-bold text-[#0F3D52]' : 'border-slate-100 bg-slate-50 text-slate-400'}`}><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">{index < indexEtape ? <CheckCircle2 size={14} /> : index + 1}</span><span>{LIBELLES_ETAPES[etape]}</span></li>)}
                    </ol>
                    <div>
                      <div className="mb-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500"><span>Progression théorique OSRM</span><span>{Math.round(progression)}%</span></div>
                      <div role="progressbar" aria-label={`Progression théorique du trajet de ${mission.patient}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progression)} className="relative h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all duration-700 ${estAlerteDechargement ? 'bg-red-500' : 'bg-[#1F7A8C]'}`} style={{ width: `${Math.min(100, Math.max(0, progression))}%` }} /><span className="absolute -top-1 h-4 w-4 rounded-full border-2 border-white bg-[#0F3D52] shadow" style={{ left: `calc(${Math.min(100, Math.max(0, progression))}% - 8px)` }} /></div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600"><span>Aller {mission.distanceAller.toFixed(2)} km · {formaterDureeItineraire(mission.dureeAller)}</span><span className="text-right">Retour {mission.distanceRetour.toFixed(2)} km · {formaterDureeItineraire(mission.dureeRetour)}</span></div>
                    </div>
                    {etiquetteEta && <div role={estAlerteDechargement ? 'alert' : 'status'} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold tabular-nums ${estAlerteDechargement ? 'animate-pulse border-red-300 bg-red-50 text-red-800 motion-reduce:animate-none' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><TimerReset size={16} />{etiquetteEta}</div>}
                    <div className="flex flex-wrap items-end gap-3">
                      {(statut === 'assigne' || statut === 'en_transport') && litsDestines.length > 1 && <label className="text-xs font-semibold text-slate-700">Lit effectif à l’arrivée
                        <select value={litChoisi} onChange={(event) => fixerLitsChoisis((precedents) => ({ ...precedents, [mission.id]: event.target.value }))} className="mt-1 block h-10 min-w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1F7A8C]">{litsDestines.map((lit) => <option key={lit.id} value={lit.id}>{lit.numero} · {lit.categorie === 'dechocage' ? 'Déchoquage' : 'Salle septique'}</option>)}</select>
                      </label>}
                      {statut === 'assigne' && <label className="text-xs font-semibold text-slate-700">
                        Minutes de retard déclarées au retour
                        <input
                          type="number"
                          min="0"
                          max="1440"
                          step="1"
                          required
                          inputMode="numeric"
                          value={retardsDeclares[mission.id] ?? ''}
                          onChange={(event) => fixerRetardsDeclares((precedents) => ({ ...precedents, [mission.id]: event.target.value }))}
                          className="mt-1 block h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1F7A8C]"
                        />
                      </label>}
                      <button
                        type="button"
                        onClick={() => avancerMission(
                          mission,
                          transitionSuivante,
                          ['assigne', 'en_transport'].includes(statut) ? litChoisi : null,
                          statut === 'assigne' ? Number(retardsDeclares[mission.id]) : null,
                        )}
                        disabled={Boolean(transitionEnCours)
                          || (['assigne', 'en_transport'].includes(statut) && !litChoisi)
                          || (statut === 'assigne' && (retardsDeclares[mission.id] === undefined || retardsDeclares[mission.id] === ''))
                          || (statut === 'en_bionettoyage' && mission.patientInfectieux && tempsNettoyage > 0)}
                        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${estAlerteDechargement ? 'animate-pulse bg-red-600 hover:bg-red-700 motion-reduce:animate-none' : 'bg-[#0F3D52] hover:bg-[#0A2233]'}`}
                      ><ArrowRight size={15} />{prochaineEnCours ? 'Enregistrement…' : actionSuivante}</button>
                      {statut === 'en_bionettoyage' && mission.patientInfectieux && tempsNettoyage > 0 && <span className="text-xs text-amber-800">Fin possible après le délai incompressible de 45 minutes.</span>}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>

        (
          <section aria-label="Missions terminées" className="zone-impression-historique apparition rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5">
            <div className="non-imprimable flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  {historiqueDuJour
                    ? `Historique du ${dateAujourdhuiTexte}`
                    : resumeDateHistorique ? `Historique · ${resumeDateHistorique}` : 'Historique des missions'} · {missionsHistoriqueFiltrees.length} / {missionsTerminees.length}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={afficherHistoriqueAujourdhui}
                    aria-pressed={historiqueDuJour}
                    className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C] ${historiqueDuJour ? 'border-[#0F3D52] bg-[#0F3D52] text-white' : 'border-[#0F3D52]/20 text-[#0F3D52] hover:border-[#1F7A8C] hover:bg-[#EAF1F1]'}`}
                  >
                    Aujourd’hui · {dateAujourdhuiTexte}
                  </button>
                  <button
                    type="button"
                    onClick={afficherToutHistorique}
                    aria-pressed={!historiqueDuJour && !anneeHistorique && !moisHistorique && !jourHistorique}
                    className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C] ${!historiqueDuJour && !anneeHistorique && !moisHistorique && !jourHistorique ? 'border-[#0F3D52] bg-[#0F3D52] text-white' : 'border-[#0F3D52]/20 text-[#0F3D52] hover:border-[#1F7A8C] hover:bg-[#EAF1F1]'}`}
                  >
                    Tout l’historique
                  </button>
                </div>
              </div>
              <div className="grid w-full grid-cols-1 gap-2 sm:max-w-5xl sm:grid-cols-4">
                <label className="block">
                  <span className="sr-only">Filtrer l’historique par année</span>
                  <select
                    value={historiqueDuJour ? String(dateAujourdhui.getFullYear()) : anneeHistorique}
                    onChange={(event) => selectionnerDateHistorique('annee', event.target.value)}
                    aria-label="Filtrer l’historique par année"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10"
                  >
                    <option value="">Toutes les années</option>
                    {anneesDisponibles.map((annee) => (
                      <option key={annee} value={annee}>{annee}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">Filtrer l’historique par mois</span>
                  <select
                    value={historiqueDuJour ? String(dateAujourdhui.getMonth() + 1) : moisHistorique}
                    onChange={(event) => selectionnerDateHistorique('mois', event.target.value)}
                    aria-label="Filtrer l’historique par mois"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10"
                  >
                    <option value="">Tous les mois</option>
                    {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((mois) => (
                      <option key={mois} value={mois}>{formaterMoisMission(mois)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">Filtrer l’historique par jour</span>
                  <select
                    value={historiqueDuJour ? String(dateAujourdhui.getDate()) : jourHistorique}
                    onChange={(event) => selectionnerDateHistorique('jour', event.target.value)}
                    aria-label="Filtrer l’historique par jour"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10"
                  >
                    <option value="">Tous les jours</option>
                    {Array.from({ length: nombreJoursMoisHistorique }, (_, index) => index + 1).map((jour) => (
                      <option key={jour} value={jour}>{jour}</option>
                    ))}
                  </select>
                </label>
                <label className="relative block">
                  <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={rechercheHistorique}
                    onChange={(event) => fixerRechercheHistorique(event.target.value)}
                    placeholder="Rechercher une mission…"
                    aria-label="Rechercher dans l’historique des missions"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10"
                  />
                </label>
              </div>
            </div>
            <div className="entete-impression mb-3 hidden items-center gap-5">
              <img src={logoCenhosoa} alt="Logo CENHOSOA" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">Centre Hospitalier de Soavinandriana</p>
                <h2 className="text-xl font-bold text-black">
                  {historiqueDuJour
                    ? `Historique des missions du ${dateAujourdhuiTexte}`
                    : resumeDateHistorique ? `Historique des missions · ${resumeDateHistorique}` : 'Historique complet des missions'}
                </h2>
                <p className="mt-1 text-xs text-black">Imprimé le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(dateAujourdhui)}</p>
              </div>
            </div>
            <div className="non-imprimable mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => imprimerZone('impression-historique-active')}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0F3D52] px-4 text-xs font-bold text-white transition hover:bg-[#0A2233] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C]"
              >
                <Printer size={16} />
                <span>Imprimer l’historique affiché</span>
              </button>
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {missionsHistoriqueFiltrees.map((mission) => (
                <article key={mission.id} className="apparition transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1F7A8C]/10 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{mission.patient}</h3>
                      <p className="mt-0.5 text-xs text-slate-600">{mission.destination}</p>
                      {mission.telephoneContact && <p className="mt-1 text-xs text-slate-500">Contact : {mission.telephoneContact}</p>}
                      <p className="mt-1 text-xs font-medium text-[#1F7A8C]">Mission du {formaterDateMission(mission.heureDepart)}</p>
                    </div>
                    <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                      <span className="text-sm font-bold text-[#0A2233]">{formaterAriary(mission.coutTotal)}</span>
                      <button
                        type="button"
                        onClick={() => fixerMissionDetail(mission)}
                        aria-label={`Voir les détails de la mission de ${mission.patient}`}
                        className="inline-flex h-9 items-center justify-center gap-2 border border-[#0A2233]/15 px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#0A2233] transition-colors hover:border-[#1F7A8C] hover:bg-[#1F7A8C] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C]"
                      >
                        <Eye size={15} />
                        <span>Détails</span>
                      </button>
                    </div>
                  </div>
                  {mission.informationsMedicales && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600"><strong>Informations médicales :</strong> {mission.informationsMedicales}</p>}
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                    <div><dt className="text-slate-500">Ambulance</dt><dd className="font-semibold text-slate-700">{mission.ambulanceNom} · {mission.ambulanceCode}</dd></div>
                    <div><dt className="text-slate-500">Distance</dt><dd className="font-semibold text-slate-700">{mission.distance} km</dd></div>
                    <div><dt className="text-slate-500">Lit URGENCE</dt><dd className="font-semibold text-slate-700">{mission.litNumero || 'Aucun lit attribué'}</dd></div>
                    <div><dt className="text-slate-500">Heure de départ</dt><dd className="font-semibold text-slate-700">{formaterHeure(mission.heureDepart)}</dd></div>
                    <div><dt className="text-slate-500">Arrivée au centre</dt><dd className="font-semibold text-slate-700">{formaterHeure(mission.heureRetour)}</dd></div>
                    <div><dt className="text-slate-500">Retard</dt><dd className="font-semibold text-slate-700">{mission.minutesRetard ?? 0} min</dd></div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
                    <span>Tarif de base : {formaterAriary(mission.coutBase)}</span>
                    <span>Frais de retard : {formaterAriary(mission.fraisRetard)}</span>
                    <span className="font-bold text-slate-800">Total : {formaterAriary(mission.coutTotal)}</span>
                  </div>
                </article>
              ))}
              {missionsHistoriqueFiltrees.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">Aucune mission ne correspond à votre recherche.</p>
              )}
            </div>
          </section>
        )
        {missionDetail && (
          <DetailHistoriqueMission mission={missionDetail} fixerMissionDetail={fixerMissionDetail} />
        )}
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck size={13} />La flotte, les missions et les coûts sont enregistrés par l’API. La distance est calculée sur le réseau routier OpenStreetMap.</p>
      </main>
    </div>
  );
}
