import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ambulance, ArrowRight, CheckCircle2, Clock, MapPin, Navigation, Phone,
  ShieldCheck, TimerReset, User, Siren,
} from 'lucide-react';
import {
  creerMissionAmbulance,
  creerMissionAmbulancePatient,
  creerMissionAmbulanceUrgente,
  listerAmbulances,
  listerLieuxTana,
  listerLitsUrgenceDisponibles,
  listerMissionsAmbulancePatient,
  simulerTrajetAmbulance,
  suivreMissionAmbulanceInvite,
  completerMissionAmbulanceInvite,
  obtenirTokenStocke,
} from '../services/api';
import { StylesEspace } from './StylesEspace';
import { ecouterDonneesModifiees } from '../services/tempsReel';

const CLE_SUIVI_INVITE = 'cenhosoa:suivi-ambulance-invite';
const ETAPES_SUIVI = [
  { statut: 'en_attente_confirmation', label: 'Demande envoyée · en attente du régulateur' },
  { statut: 'assigne', label: 'Ambulance assignée' },
  { statut: 'sur_les_lieux', label: 'Ambulance arrivée sur place' },
  { statut: 'en_transport', label: 'Patient en transport' },
];
const STATUTS_TERMINES = ['terminee', 'annulee'];

function formaterAriary(montant) {
  return `${new Intl.NumberFormat('fr-FR').format(montant || 0)} Ar`;
}

function formaterDuree(secondes) {
  const duree = Math.max(0, secondes);
  const heures = Math.floor(duree / 3600);
  const minutes = Math.floor((duree % 3600) / 60);
  const reste = duree % 60;
  return [heures, minutes, reste].map((nombre) => String(nombre).padStart(2, '0')).join(':');
}

function normaliserStatut(statut) {
  return String(statut || '').toLowerCase();
}

function nomPatientProfil(profil) {
  return [profil?.patient?.prenoms, profil?.patient?.nom].filter(Boolean).join(' ').trim();
}

export default function DemandeAmbulancePatient({ profil = null, onFermer }) {
  const token = profil ? obtenirTokenStocke() : null;
  const estConnecte = Boolean(profil?.role === 'patient' && profil?.patient?.id);
  const [etape, setEtape] = useState('accueil');
  const [modeUrgent, setModeUrgent] = useState(false);
  const [nombreAmbulancesDisponibles, setNombreAmbulancesDisponibles] = useState(0);
  const [lieux, setLieux] = useState([]);
  const [lits, setLits] = useState([]);
  const [mission, setMission] = useState(null);
  const [suiviInvite, setSuiviInvite] = useState(null);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(true);
  const [simulationEnCours, setSimulationEnCours] = useState(false);
  const [soumissionEnCours, setSoumissionEnCours] = useState(false);
  const [complementOuvert, setComplementOuvert] = useState(false);
  const [complementEnCours, setComplementEnCours] = useState(false);
  const [complementEnregistre, setComplementEnregistre] = useState(false);
  const [complement, setComplement] = useState({
    patient: '',
    telephone_contact: '',
    informations_medicales: '',
  });
  const [tempsActuel, setTempsActuel] = useState(() => Date.now());
  const [formulaire, setFormulaire] = useState({
    patient: nomPatientProfil(profil),
    telephone_contact: profil?.patient?.telephone || '',
    destination: '',
    urgence_vitale: false,
    patient_infectieux: false,
    motif_infectieux: '',
    itineraire_index: 0,
  });
  const lieuSelectionne = useMemo(
    () => lieux.find((lieu) => lieu.nom === formulaire.destination),
    [formulaire.destination, lieux],
  );
  const nomPatient = nomPatientProfil(profil);

  const lireSuiviInvite = useCallback(async (session) => {
    if (!session?.missionId || !session?.jeton) return null;
    return suivreMissionAmbulanceInvite(session.missionId, session.jeton);
  }, []);

  const actualiserMission = useCallback(async () => {
    if (estConnecte) {
      const missions = await listerMissionsAmbulancePatient(token);
      const missionSuivie = missions.find((element) => element.id === mission?.id)
        || missions.find((element) => !STATUTS_TERMINES.includes(normaliserStatut(element.statut)))
        || missions.find((element) => element.message_refus);
      if (missionSuivie) setMission((precedente) => ({ ...missionSuivie, simulation: precedente?.simulation }));
      else if (mission) setMission(null);
      return;
    }
    if (!suiviInvite) return;
    const missionActualisee = await lireSuiviInvite(suiviInvite);
    setMission((precedente) => ({ ...missionActualisee, simulation: precedente?.simulation }));
  }, [estConnecte, lireSuiviInvite, mission, suiviInvite, token]);

  useEffect(() => {
    let actif = true;
    const chargerDonnees = async () => {
      setChargement(true);
      setErreur('');
      try {
        const [flotte, lieuxTana, litsDisponibles] = await Promise.all([
          listerAmbulances(null),
          listerLieuxTana(null),
          listerLitsUrgenceDisponibles(null),
        ]);
        if (!actif) return;
        setLieux(lieuxTana);
        setLits(litsDisponibles);
        if (estConnecte) {
          setNombreAmbulancesDisponibles(flotte.nombre_disponibles || 0);
          setFormulaire((precedent) => ({
            ...precedent,
            patient: nomPatient,
            telephone_contact: profil?.patient?.telephone || '',
          }));
          const missions = await listerMissionsAmbulancePatient(token);
          if (actif) {
            const active = missions.find((item) => !STATUTS_TERMINES.includes(normaliserStatut(item.statut)));
            const demandeRefusee = missions.find((item) => item.message_refus);
            if (active || demandeRefusee) {
              setMission(active || demandeRefusee);
              setEtape('suivi');
            }
          }
        } else {
          setNombreAmbulancesDisponibles(flotte.nombre_disponibles || 0);
          const sessionBrute = localStorage.getItem(CLE_SUIVI_INVITE);
          if (sessionBrute) {
            try {
              const session = JSON.parse(sessionBrute);
              const missionInvite = await lireSuiviInvite(session);
              if (actif) {
                setSuiviInvite(session);
                setMission(missionInvite);
                setEtape('suivi');
              }
            } catch (erreurSuivi) {
              if (actif) {
                localStorage.removeItem(CLE_SUIVI_INVITE);
                setErreur(erreurSuivi.message || 'Le suivi précédent n’est plus accessible.');
              }
            }
          }
        }
      } catch (erreurChargement) {
        if (actif) setErreur(erreurChargement.message || 'Impossible de charger les informations ambulancières.');
      } finally {
        if (actif) setChargement(false);
      }
    };
    void chargerDonnees();
    return () => { actif = false; };
  }, [estConnecte, lireSuiviInvite, nomPatient, profil?.patient?.telephone, token]);

  useEffect(() => {
    if (etape !== 'formulaire' || modeUrgent || !lieuSelectionne) {
      return undefined;
    }
    let actif = true;
    const timer = window.setTimeout(async () => {
      setSimulationEnCours(true);
      setErreur('');
      try {
        const simulation = await simulerTrajetAmbulance(null, lieuSelectionne.nom, lieuSelectionne);
        if (actif) {
          setFormulaire((precedent) => ({
            ...precedent,
            simulation,
            itineraire_index: 0,
          }));
        }
      } catch (erreurSimulation) {
        if (actif) {
          setFormulaire((precedent) => ({ ...precedent, simulation: null }));
          setErreur(erreurSimulation.message || 'Impossible de calculer le trajet.');
        }
      } finally {
        if (actif) setSimulationEnCours(false);
      }
    }, 350);
    return () => {
      actif = false;
      window.clearTimeout(timer);
    };
  }, [etape, lieuSelectionne, modeUrgent, token]);

  useEffect(() => {
    if (etape !== 'suivi' || !mission) return undefined;
    const actualiser = () => {
      actualiserMission().catch((erreurSuivi) => {
        setErreur(erreurSuivi.message || 'Impossible d’actualiser le suivi de la mission.');
      });
    };
    const intervalle = window.setInterval(actualiser, 30000);
    return () => window.clearInterval(intervalle);
  }, [actualiserMission, etape, mission]);

  useEffect(() => ecouterDonneesModifiees(['ambulances', 'lits'], () => {
    actualiserMission().catch((erreurSuivi) => {
      setErreur(erreurSuivi.message || 'Impossible d’actualiser le suivi de la mission.');
    });
    Promise.all([
      listerAmbulances(null),
      listerLitsUrgenceDisponibles(null),
    ]).then(([flotte, litsDisponibles]) => {
      setNombreAmbulancesDisponibles(flotte.nombre_disponibles || 0);
      setLits(litsDisponibles);
    }).catch((erreurDisponibilites) => {
      setErreur(erreurDisponibilites.message || 'Impossible d’actualiser les disponibilités.');
    });
  }), [actualiserMission]);

  useEffect(() => {
    if (!mission) return undefined;
    const intervalle = window.setInterval(() => setTempsActuel(Date.now()), 1000);
    return () => window.clearInterval(intervalle);
  }, [mission]);

  const statutActuel = normaliserStatut(mission?.statut);
  const demandeEnAttente = statutActuel === 'en_attente_confirmation';
  const demandeRefusee = statutActuel === 'annulee' && Boolean(mission?.message_refus);
  const secondesRestantes = !demandeEnAttente && mission?.heure_depart && mission.duree_aller_minutes
    ? Math.max(0, Math.ceil((
      new Date(mission.heure_depart).getTime() + mission.duree_aller_minutes * 60000 - tempsActuel
    ) / 1000))
    : 0;

  const litsManquants = useMemo(() => {
    const categories = [];
    if (formulaire.urgence_vitale) categories.push(['dechocage', 'Déchoquage']);
    if (formulaire.patient_infectieux) categories.push(['salle_septique', 'Salle septique']);
    if (!categories.length) categories.push(['urgence', 'Urgence']);
    return categories.filter(([cle]) => !lits.some((lit) => String(lit.categorie).toLowerCase() === cle));
  }, [formulaire.patient_infectieux, formulaire.urgence_vitale, lits]);

  const modifierChamp = (champ, valeur) => {
    setFormulaire((precedent) => ({ ...precedent, [champ]: valeur }));
  };

  const modifierDestination = (valeur) => {
    setFormulaire((precedent) => ({ ...precedent, destination: valeur, simulation: null }));
  };

  const ouvrirComplement = () => {
    setComplement({
      patient: mission?.patient && mission.patient !== 'Patient non renseigné' ? mission.patient : '',
      telephone_contact: mission?.telephone_contact || '',
      informations_medicales: mission?.informations_medicales || '',
    });
    setComplementEnregistre(false);
    setComplementOuvert(true);
  };

  const enregistrerComplement = async (evenement) => {
    evenement.preventDefault();
    if (!suiviInvite) return;
    const donnees = Object.fromEntries(
      Object.entries(complement).map(([cle, valeur]) => [cle, valeur.trim() || undefined]),
    );
    if (!Object.values(donnees).some(Boolean)) {
      setErreur('Renseignez au moins une information avant de valider.');
      return;
    }
    setComplementEnCours(true);
    setErreur('');
    try {
      const missionActualisee = await completerMissionAmbulanceInvite(
        suiviInvite.missionId,
        suiviInvite.jeton,
        donnees,
      );
      setMission((precedente) => ({ ...missionActualisee, simulation: precedente?.simulation }));
      setComplementEnregistre(true);
      setComplementOuvert(false);
    } catch (erreurComplement) {
      setErreur(erreurComplement.message || 'Impossible d’enregistrer les informations complémentaires.');
    } finally {
      setComplementEnCours(false);
    }
  };

  const soumettreDemande = async (evenement) => {
    evenement.preventDefault();
    setErreur('');
    if (modeUrgent) {
      if (!formulaire.destination.trim()) {
        setErreur('Saisissez l’adresse où se trouve le patient.');
        return;
      }
      if (!formulaire.telephone_contact.trim()) {
        setErreur('Saisissez le numéro de téléphone du demandeur.');
        return;
      }
      setSoumissionEnCours(true);
      try {
        const resultat = await creerMissionAmbulanceUrgente(token, {
          destination: formulaire.destination.trim(),
          telephone_contact: formulaire.telephone_contact.trim(),
          ...(lieuSelectionne && {
            latitude_destination: lieuSelectionne.latitude,
            longitude_destination: lieuSelectionne.longitude,
          }),
          urgence_vitale: formulaire.urgence_vitale,
          patient_infectieux: formulaire.patient_infectieux,
          motif_infectieux: formulaire.motif_infectieux.trim() || null,
        });
        if (estConnecte) {
          setMission(resultat);
        } else {
          const session = { missionId: resultat.mission.id, jeton: resultat.jeton_suivi };
          setSuiviInvite(session);
          setMission(resultat.mission);
          try {
            localStorage.setItem(CLE_SUIVI_INVITE, JSON.stringify(session));
          } catch {
            setErreur('La demande urgente est transmise, mais le suivi ne peut pas être conservé dans ce navigateur. Gardez cette page ouverte.');
          }
        }
        setEtape('suivi');
      } catch (erreurCreation) {
        setErreur(erreurCreation.message || 'La demande urgente n’a pas pu être transmise.');
      } finally {
        setSoumissionEnCours(false);
      }
      return;
    }
    if (!lieuSelectionne || !formulaire.simulation?.itineraires?.length) {
      setErreur('Sélectionnez une adresse proposée et attendez la simulation du trajet.');
      return;
    }
    setSoumissionEnCours(true);
    try {
      const itineraire = formulaire.simulation.itineraires[formulaire.itineraire_index];
      const donnees = {
        patient: estConnecte ? nomPatient : formulaire.patient.trim(),
        destination: lieuSelectionne.nom,
        latitude_destination: lieuSelectionne.latitude,
        longitude_destination: lieuSelectionne.longitude,
        distance_km: itineraire.distance_km,
        itineraire_index: formulaire.itineraire_index,
        urgence_vitale: formulaire.urgence_vitale,
        patient_infectieux: formulaire.patient_infectieux,
        motif_infectieux: formulaire.patient_infectieux ? formulaire.motif_infectieux.trim() : null,
        ...(!estConnecte ? {
          telephone_contact: formulaire.telephone_contact.trim(),
        } : {}),
      };
      const resultat = estConnecte
        ? await creerMissionAmbulancePatient(token, donnees)
        : await creerMissionAmbulance(null, donnees);
      if (estConnecte) {
        setMission({ ...resultat, simulation: formulaire.simulation });
      } else {
        const session = { missionId: resultat.mission.id, jeton: resultat.jeton_suivi };
        setSuiviInvite(session);
        setMission({ ...resultat.mission, simulation: formulaire.simulation });
        try {
          localStorage.setItem(CLE_SUIVI_INVITE, JSON.stringify(session));
        } catch {
          setErreur('La mission est créée, mais le suivi n’a pas pu être conservé dans ce navigateur. Gardez cette page ouverte.');
        }
      }
      setEtape('suivi');
    } catch (erreurCreation) {
      setErreur(erreurCreation.message || 'La demande d’ambulance n’a pas pu être envoyée.');
    } finally {
      setSoumissionEnCours(false);
    }
  };

  const indexEtape = demandeEnAttente
    ? 0
    : ['arrive_urgences', 'en_bionettoyage', 'en_cours'].includes(statutActuel)
    ? ETAPES_SUIVI.length - 1
    : Math.max(0, ETAPES_SUIVI.findIndex((element) => element.statut === statutActuel));
  const estTerminee = STATUTS_TERMINES.includes(statutActuel);
  const annulerSuiviLocal = () => {
    if (!estConnecte) {
      localStorage.removeItem(CLE_SUIVI_INVITE);
      setSuiviInvite(null);
    }
    setMission(null);
    setEtape('accueil');
    setErreur('');
  };

  return (
    <main className="anim min-h-screen bg-[#F4F2EE] px-4 py-8 text-[#0A2233] sm:px-6 lg:py-12">
      <StylesEspace />
      <div className="mx-auto max-w-5xl">
        <header className="apparition mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A2233] text-[#7FD1CB]">
              <Ambulance className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1F7A8C]">CENHOSOA · Assistance</p>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Demande d’ambulance</h1>
            </div>
          </div>
          {onFermer && (
            <button type="button" onClick={onFermer} className="min-h-11 rounded-xl border border-[#0A2233]/10 px-4 py-2 text-sm font-semibold hover:bg-white">
              Retour
            </button>
          )}
        </header>

        <div className="apparition rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#0A2233]/[0.06] backdrop-blur-xl transition-shadow duration-500 hover:shadow-2xl hover:shadow-[#0A2233]/10 sm:p-8">
          {erreur && (
            <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {erreur}
            </div>
          )}
          {chargement ? (
            <div className="py-16 text-center text-sm font-medium text-slate-500">Chargement des disponibilités…</div>
          ) : etape === 'accueil' ? (
            <section className="py-5 text-center sm:py-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#1F7A8C]/10 text-[#1F7A8C]">
                <Ambulance className="h-8 w-8" />
              </div>
              <p className="mb-2 text-sm font-bold text-[#1F7A8C]">
                {nombreAmbulancesDisponibles} ambulance{nombreAmbulancesDisponibles > 1 ? 's' : ''} disponible{nombreAmbulancesDisponibles > 1 ? 's' : ''}
              </p>
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Une prise en charge commence ici.</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600">
                Indiquez le lieu où se trouve le patient pour estimer le trajet et transmettre une demande à la régulation.
              </p>
              <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-2xl bg-[#0A2233]/[0.04] p-4 text-left text-xs leading-5 text-slate-600">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1F7A8C]" />
                <p>En cas de danger immédiat, contactez directement les secours ou le standard CENHOSOA. Cette demande en ligne ne remplace pas un appel d’urgence.</p>
              </div>
              <button
                type="button"
                onClick={() => { setModeUrgent(false); setErreur(''); setEtape('formulaire'); }}
                className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-[#0A2233] px-7 py-4 text-sm font-bold text-white shadow-lg shadow-[#0A2233]/20 transition hover:-translate-y-0.5 hover:bg-[#0F3D52] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Demande standard <ArrowRight className="h-4 w-4" />
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => { setModeUrgent(true); setErreur(''); setEtape('formulaire'); }}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Siren className="h-4 w-4" /> Demande urgente · formulaire rapide
                </button>
              </div>
            </section>
          ) : etape === 'formulaire' ? (
            <form onSubmit={soumettreDemande} className="space-y-6">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.16em] ${modeUrgent ? 'text-red-700' : 'text-[#1F7A8C]'}`}>
                  {modeUrgent ? 'Demande urgente · accès rapide' : 'Nouvelle demande'}
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {modeUrgent ? 'Où se trouve le patient ?' : 'Informations de prise en charge'}
                </h2>
              </div>
              {modeUrgent && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-5 text-red-800">
                  Saisissez l’adresse et le numéro de téléphone du demandeur. Les informations médicales sont facultatives. En danger immédiat, appelez également le standard.
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                {modeUrgent && (
                  <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                    <span className="mb-2 flex items-center gap-2"><Phone className="h-4 w-4 text-red-700" /> Téléphone du demandeur *</span>
                    <input required type="tel" minLength={8} maxLength={20} autoComplete="tel" value={formulaire.telephone_contact} onChange={(event) => modifierChamp('telephone_contact', event.target.value)} placeholder="Numéro auquel le régulateur peut vous joindre" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-red-600" />
                  </label>
                )}
                {!modeUrgent && (
                  <>
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-2 flex items-center gap-2"><User className="h-4 w-4 text-[#1F7A8C]" /> Nom du patient *</span>
                  <input required maxLength={150} value={estConnecte ? nomPatient : formulaire.patient} disabled={estConnecte} onChange={(event) => modifierChamp('patient', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#1F7A8C] disabled:bg-slate-100" />
                </label>
                {!estConnecte && (
                  <label className="block text-sm font-semibold text-slate-700">
                    <span className="mb-2 flex items-center gap-2"><Phone className="h-4 w-4 text-[#1F7A8C]" /> Téléphone de contact *</span>
                    <input required type="tel" minLength={8} maxLength={20} value={formulaire.telephone_contact} onChange={(event) => modifierChamp('telephone_contact', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#1F7A8C]" />
                  </label>
                )}
                  </>
                )}
                <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                  <span className="mb-2 flex items-center gap-2"><MapPin className="h-4 w-4 text-[#1F7A8C]" /> Adresse de prise en charge *</span>
                  <input required list="lieux-tana" autoComplete="street-address" value={formulaire.destination} onChange={(event) => modifierDestination(event.target.value)} placeholder={modeUrgent ? 'Adresse complète où se trouve le patient' : 'Choisir un lieu proposé à Antananarivo'} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#1F7A8C]" />
                  <datalist id="lieux-tana">{lieux.map((lieu) => <option key={lieu.id} value={lieu.nom}>{lieu.aliases?.join(', ')}</option>)}</datalist>
                </label>
              </div>

              {!modeUrgent && simulationEnCours && <p className="text-sm font-medium text-[#1F7A8C]">Calcul du trajet…</p>}
              {!modeUrgent && formulaire.simulation && (
                <section className="rounded-2xl border border-[#7FD1CB]/60 bg-[#7FD1CB]/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">Estimation du trajet</h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0F3D52]">
                      {formulaire.simulation.itineraires?.[formulaire.itineraire_index]?.distance_km} km · {formulaire.simulation.itineraires?.[formulaire.itineraire_index]?.duree_estimee_minutes} min
                    </span>
                  </div>
                  {formulaire.simulation.itineraires?.length > 1 && (
                    <label className="mt-3 block text-xs font-semibold text-slate-600">
                      Itinéraire
                      <select value={formulaire.itineraire_index} onChange={(event) => modifierChamp('itineraire_index', Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2">
                        {formulaire.simulation.itineraires.map((option) => <option key={option.index} value={option.index}>Option {option.index + 1} · {option.distance_km} km · {option.duree_estimee_minutes} min</option>)}
                      </select>
                    </label>
                  )}
                  <p className="mt-3 text-sm font-bold text-[#0F3D52]">
                    Tarif estimé : {formaterAriary(formulaire.simulation.itineraires?.[formulaire.itineraire_index]?.cout_base)}
                  </p>
                </section>
              )}

              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="mb-3 text-sm font-semibold">Informations médicales pour la régulation</legend>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm">
                  <input type="checkbox" checked={formulaire.urgence_vitale} onChange={(event) => modifierChamp('urgence_vitale', event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#1F7A8C]" />
                  <span><strong className="block">Urgence vitale (SMUR)</strong><span className="text-xs text-slate-500">Nécessite un lit de déchoquage disponible.</span></span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm">
                  <input type="checkbox" checked={formulaire.patient_infectieux} onChange={(event) => modifierChamp('patient_infectieux', event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#1F7A8C]" />
                  <span><strong className="block">Patient infectieux</strong><span className="text-xs text-slate-500">{modeUrgent ? 'Si cette information est connue.' : 'Nécessite un lit de salle septique disponible.'}</span></span>
                </label>
              </fieldset>
              {formulaire.patient_infectieux && (
                <label className="block text-sm font-semibold text-slate-700">
                  Motif infectieux {modeUrgent ? '(facultatif)' : '*'}
                  <input required={!modeUrgent} maxLength={255} value={formulaire.motif_infectieux} onChange={(event) => modifierChamp('motif_infectieux', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#1F7A8C]" />
                </label>
              )}
              {!modeUrgent && litsManquants.length > 0 && (
                <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
                  Aucun lit disponible en {litsManquants.map(([, nom]) => nom).join(' et ')} pour le moment. Vous pouvez transmettre la demande ; le régulateur vérifiera la disponibilité.
                </div>
              )}
              <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={() => { setErreur(''); setEtape('accueil'); }} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50">Retour</button>
                <button type="submit" disabled={soumissionEnCours || (!modeUrgent && (simulationEnCours || !formulaire.simulation))} className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${modeUrgent ? 'bg-red-700 hover:bg-red-800' : 'bg-[#0A2233] hover:bg-[#0F3D52]'}`}>
                  {soumissionEnCours ? 'Envoi en cours…' : modeUrgent ? 'Envoyer la demande urgente' : 'Confirmer la demande'} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          ) : (
            <section className="py-3">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1F7A8C]">Suivi de mission</p>
                  <h2 className="mt-1 text-2xl font-semibold">{demandeRefusee ? 'Demande non prise en charge' : demandeEnAttente ? 'Demande transmise au régulateur' : 'Votre ambulance est en route'}</h2>
                  <p className="mt-2 text-sm text-slate-600">{mission?.ambulance_nom ? `${mission.ambulance_nom} · ` : ''}{mission?.destination}</p>
                </div>
                {!demandeEnAttente && !demandeRefusee && <div className="rounded-2xl bg-[#0A2233] px-5 py-4 text-white">
                  <p className="flex items-center gap-2 text-xs font-semibold text-white/65"><TimerReset className="h-4 w-4 text-[#7FD1CB]" /> Arrivée estimée</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{formaterDuree(secondesRestantes)}</p>
                </div>}
              </div>
              {demandeEnAttente && (
                <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
                  Votre demande est reçue. Un régulateur doit la confirmer et choisir une ambulance avant son départ.
                </div>
              )}
              {demandeRefusee && (
                <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-900">
                  <p className="font-bold">Le régulateur a refusé votre demande d’ambulance.</p>
                  <p className="mt-2 whitespace-pre-line">{mission.message_refus}</p>
                </div>
              )}
              {!estConnecte && mission?.patient_id == null && !estTerminee && (
                <section className="mb-5 rounded-2xl border border-[#7FD1CB]/60 bg-[#7FD1CB]/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#0A2233]">Patient non identifié ou informations à compléter ?</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-600">Vous pouvez ajouter les renseignements dès que vous en avez le temps. Cela ne retarde pas la demande.</p>
                    </div>
                    {!complementOuvert && (
                      <button type="button" onClick={ouvrirComplement} className="rounded-xl bg-[#0A2233] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0F3D52]">
                        Compléter les informations
                      </button>
                    )}
                  </div>
                  {complementEnregistre && <p role="status" className="mt-3 text-xs font-semibold text-emerald-800">Les informations ont été transmises au régulateur.</p>}
                  {complementOuvert && (
                    <form onSubmit={enregistrerComplement} className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Nom complet du patient (facultatif)
                        <input maxLength={150} value={complement.patient} onChange={(event) => setComplement((precedent) => ({ ...precedent, patient: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#1F7A8C]" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Téléphone de contact (facultatif)
                        <input type="tel" minLength={8} maxLength={20} value={complement.telephone_contact} onChange={(event) => setComplement((precedent) => ({ ...precedent, telephone_contact: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#1F7A8C]" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                        Informations médicales utiles (facultatif)
                        <textarea maxLength={2000} rows={3} value={complement.informations_medicales} onChange={(event) => setComplement((precedent) => ({ ...precedent, informations_medicales: event.target.value }))} placeholder="Symptômes, antécédents ou autres informations utiles à l’équipe…" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#1F7A8C]" />
                      </label>
                      <p className="text-xs leading-5 text-slate-500 sm:col-span-2">Pour protéger le dossier du patient, ne saisissez que les informations nécessaires à sa prise en charge.</p>
                      <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                        <button type="button" onClick={() => setComplementOuvert(false)} disabled={complementEnCours} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-white disabled:opacity-50">Annuler</button>
                        <button type="submit" disabled={complementEnCours} className="rounded-xl bg-[#1F7A8C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#186575] disabled:opacity-50">{complementEnCours ? 'Enregistrement…' : 'Transmettre au régulateur'}</button>
                      </div>
                    </form>
                  )}
                </section>
              )}
              {mission?.informations_medicales && (
                <p className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <strong className="block text-xs uppercase tracking-wide text-slate-500">Informations transmises</strong>
                  <span className="mt-1 block whitespace-pre-wrap">{mission.informations_medicales}</span>
                </p>
              )}
              {!demandeRefusee && (
                <div className="relative space-y-5 py-2">
                  {ETAPES_SUIVI.map((element, index) => {
                    const accompli = index <= indexEtape || estTerminee;
                    return (
                      <div key={element.statut} className="flex items-center gap-4">
                        <span className={`z-10 flex h-10 w-10 items-center justify-center rounded-full ${accompli ? 'bg-[#1F7A8C] text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {accompli ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                        </span>
                        <span className={`text-sm font-semibold ${accompli ? 'text-[#0A2233]' : 'text-slate-400'}`}>{element.label}</span>
                      </div>
                    );
                  })}
                  <div className="absolute bottom-7 left-5 top-7 w-px bg-slate-200" />
                </div>
              )}
              {estTerminee && !demandeRefusee && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Cette mission est terminée.</p>}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#0A2233]/[0.04] p-4">
                <p className="flex items-center gap-2 text-xs text-slate-600"><Navigation className="h-4 w-4 text-[#1F7A8C]" /> Actualisation automatique toutes les 15 secondes</p>
                <button type="button" onClick={annulerSuiviLocal} className="text-sm font-bold text-[#1F7A8C] hover:underline">
                  {estConnecte ? 'Nouvelle demande' : 'Terminer le suivi sur cet appareil'}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
