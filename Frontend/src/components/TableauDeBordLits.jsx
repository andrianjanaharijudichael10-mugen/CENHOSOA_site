import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Ambulance, BedDouble, CheckCircle2, ChevronDown, Clock, Eye, LogOut,
  Plus, RefreshCw, Search, ShieldCheck, UserRound, Users, X, ArrowRightLeft, Siren, TimerReset
} from 'lucide-react';
import {
  admettreUrgenceVitale, annulerReservationTransfertLit, completerIdentiteLit,
  confirmerTransfertLit, creerCategorieLit, creerLit, libererLit, listerLits, obtenirResumeLits,
  obtenirTokenStocke, occuperLit, reserverTransfertLit, listerServices,
} from '../services/api';
import logoCenhosoa from '../assets/logo/logo.jpeg';
import { StylesEspace, Compteur } from './StylesEspace';
import { ecouterDonneesModifiees } from '../services/tempsReel';
import HistoriqueLits from './HistoriqueLits';

const LIBELLES_CATEGORIES = {
  vip: 'VIP',
  salle_septique: 'Salle septique',
  dechocage: 'Déchoquage',
  urgence: 'Urgence',
  triage: 'Triage',
};

const LIBELLES_STATUTS = {
  libre: 'Libre',
  reserve: 'Réservé · transfert',
  occupe: 'Occupé',
  nettoyage: 'Bionettoyage · bloqué',
};

const DELAI_TRIAGE_MINUTES = 30;
const ALERTE_TRIAGE_MINUTES = 45;
const DELAI_URGENCE_MINUTES = 12 * 60;
const DELAI_NETTOYAGE_MINUTES = 120;
function afficherDuree(date) {
  if (!date) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  const jours = Math.floor(minutes / 1440);
  const heures = Math.floor((minutes % 1440) / 60);
  const resteMinutes = minutes % 60;
  if (jours) return `${jours} j ${heures} h`;
  if (heures) return `${heures} h ${resteMinutes} min`;
  return `${resteMinutes} min`;
}

function minutesDepuis(date, maintenant) {
  const debut = date ? new Date(date).getTime() : NaN;
  return Number.isFinite(debut) ? Math.max(0, Math.floor((maintenant - debut) / 60000)) : 0;
}

function delaiDepasse(date, limiteMinutes, maintenant) {
  const debut = date ? new Date(date).getTime() : NaN;
  return Number.isFinite(debut) && maintenant - debut > limiteMinutes * 60 * 1000;
}

function afficherCompteARebours(date, limiteMinutes, maintenant) {
  const debut = date ? new Date(date).getTime() : NaN;
  const reste = Number.isFinite(debut)
    ? Math.max(0, limiteMinutes * 60 - Math.floor((maintenant - debut) / 1000))
    : limiteMinutes * 60;
  const heures = Math.floor(reste / 3600);
  const minutes = Math.floor((reste % 3600) / 60);
  const secondes = reste % 60;
  return `${String(heures).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secondes).padStart(2, '0')}`;
}

function afficherCompteNettoyage(date, maintenant) {
  const debut = date ? new Date(date).getTime() : NaN;
  const reste = Number.isFinite(debut)
    ? Math.max(0, DELAI_NETTOYAGE_MINUTES * 60 - Math.floor((maintenant - debut) / 1000))
    : DELAI_NETTOYAGE_MINUTES * 60;
  const heures = Math.floor(reste / 3600);
  const minutes = Math.floor((reste % 3600) / 60);
  const secondes = reste % 60;
  return `${String(heures).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secondes).padStart(2, '0')}`;
}

function formaterDateHeure(date) {
  if (!date) return '—';
  const dateAdmission = new Date(date);
  if (Number.isNaN(dateAdmission.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(dateAdmission);
}

export default function TableauDeBordLits({
  profil,
  onDeconnexion,
  onOuvrirAmbulances,
  onRetourAdministration,
  embedded = false,
}) {
  const [lits, fixerLits] = useState([]);
  const [resume, fixerResume] = useState([]);
  const [vue, fixerVue] = useState('plan');
  const [chargement, fixerChargement] = useState(true);
  const [erreur, fixerErreur] = useState('');
  const [rechargement, fixerRechargement] = useState(0);
  const [recherche, fixerRecherche] = useState('');
  const [filtreStatut, fixerFiltreStatut] = useState('tous');
  const [filtreCategorie, fixerFiltreCategorie] = useState('toutes');
  const [litSelectionne, fixerLitSelectionne] = useState(null);
  const [litDetailsId, fixerLitDetailsId] = useState(null);
  const [soumission, fixerSoumission] = useState(false);
  const [erreurAction, fixerErreurAction] = useState('');
  const [messageSucces, fixerMessageSucces] = useState('');
  const [categorieALitAjouter, fixerCategorieALitAjouter] = useState(null);
  const [formulaireCategorie, fixerFormulaireCategorie] = useState(false);
  const [nomNouvelleCategorie, fixerNomNouvelleCategorie] = useState('');
  const [numeroNouveauLit, fixerNumeroNouveauLit] = useState('');
  const [enregistrementInventaire, fixerEnregistrementInventaire] = useState(false);
  const [erreurInventaire, fixerErreurInventaire] = useState('');
  const [formulaire, fixerFormulaire] = useState({
    nom_patient: '', prenoms_patient: '', motif_admission: '', motif_infectieux: '', facturation_vip_validee: false,
  });
  const [maintenant, fixerMaintenant] = useState(0);
  const [litDestination, fixerLitDestination] = useState('');
  const [motifTransfert, fixerMotifTransfert] = useState('');
  const [motifTransfertRaison, fixerMotifTransfertRaison] = useState('');
  const [facturationTransfert, fixerFacturationTransfert] = useState(false);
  const [identite, fixerIdentite] = useState({ nom_patient: '', prenoms_patient: '' });
  const [actionDetails, fixerActionDetails] = useState(false);
  const [clotureLit, fixerClotureLit] = useState(null);
  const [typeFin, fixerTypeFin] = useState('sortie');
  const [motifCloture, fixerMotifCloture] = useState('');
  const [serviceDestination, fixerServiceDestination] = useState('');
  const [services, fixerServices] = useState([]);

  const token = obtenirTokenStocke();
  const peutGererLits = ['major_de_garde', 'superadmin'].includes(profil?.role);

  useEffect(() => {
    const amorcage = window.setTimeout(() => fixerMaintenant(Date.now()), 0);
    const horloge = window.setInterval(() => fixerMaintenant(Date.now()), 1000);
    return () => {
      window.clearTimeout(amorcage);
      window.clearInterval(horloge);
    };
  }, []);

  useEffect(() => {
    let estActif = true;
    const charger = async () => {
      try {
        const [listeLits, donneesResume] = await Promise.all([
          listerLits(token), obtenirResumeLits(token),
        ]);
        if (estActif) {
          fixerLits(listeLits);
          fixerResume(donneesResume);
          fixerErreur('');
        }
      } catch (err) {
        if (estActif) fixerErreur(err.message || 'Impossible de charger les lits.');
      } finally {
        if (estActif) fixerChargement(false);
      }
    };

    charger();
    const actualisation = window.setInterval(charger, 30000);
    return () => {
      estActif = false;
      window.clearInterval(actualisation);
    };
  }, [token, rechargement]);

  useEffect(() => ecouterDonneesModifiees(['ambulances', 'lits'], () => {
    fixerRechargement((precedent) => precedent + 1);
  }), []);

  const statistiques = useMemo(() => {
    const occupes = lits.filter((lit) => lit.statut === 'occupe').length;
    const libres = lits.filter((lit) => lit.statut === 'libre').length;
    const reserves = lits.filter((lit) => lit.statut === 'reserve').length;
    const enNettoyage = lits.filter((lit) => lit.statut === 'nettoyage').length;
    return {
      total: lits.length, occupes, libres, reserves, enNettoyage,
      taux: lits.length ? Math.round((occupes / lits.length) * 100) : 0,
    };
  }, [lits]);

  const litsParCategorie = useMemo(() => resume.map((ligne) => ({
    ...ligne,
    lits: lits.filter((lit) => lit.categorie === ligne.categorie),
  })), [resume, lits]);

  const litsFiltres = useMemo(() => {
    const rechercheNormalisee = recherche.trim().toLocaleLowerCase('fr');
    return lits.filter((lit) => {
      const correspondRecherche = !rechercheNormalisee || [
        lit.numero, lit.nom_patient_actuel, lit.prenoms_patient_actuel, lit.motif_admission,
      ].some((valeur) => valeur?.toLocaleLowerCase('fr').includes(rechercheNormalisee));
      return correspondRecherche
        && (filtreStatut === 'tous' || lit.statut === filtreStatut)
        && (filtreCategorie === 'toutes' || lit.categorie === filtreCategorie);
    });
  }, [lits, recherche, filtreStatut, filtreCategorie]);
  const litDetails = lits.find((lit) => lit.id === litDetailsId);
  const identiteLitACompleter = litDetails?.statut === 'occupe'
    && !litDetails.patient_id
    && (litDetails.prenoms_patient_actuel || '').trim().toLocaleLowerCase('fr') === 'patient'
    && ['non renseigné', 'non identifié'].includes(
      (litDetails.nom_patient_actuel || '').trim().toLocaleLowerCase('fr'),
    );
  const nomCategorie = (cle) => resume.find((ligne) => ligne.categorie === cle)?.nom
    || LIBELLES_CATEGORIES[cle]
    || cle;

  const recharger = () => fixerRechargement((precedent) => precedent + 1);

  const ouvrirFormulaireNouveauLit = (categorie) => {
    fixerCategorieALitAjouter(categorie);
    fixerNumeroNouveauLit('');
    fixerErreurInventaire('');
  };

  const enregistrerNouveauLit = async (evenement) => {
    evenement.preventDefault();
    if (profil?.role !== 'superadmin' || !categorieALitAjouter) return;
    fixerEnregistrementInventaire(true);
    fixerErreurInventaire('');
    fixerMessageSucces('');
    try {
      await creerLit(token, {
        numero: numeroNouveauLit.trim(),
        categorie: categorieALitAjouter.categorie,
      });
      fixerMessageSucces(`Lit ${numeroNouveauLit.trim()} ajouté à ${categorieALitAjouter.nom}.`);
      fixerCategorieALitAjouter(null);
      recharger();
    } catch (err) {
      fixerErreurInventaire(err.message || 'Impossible d’ajouter ce lit.');
    } finally {
      fixerEnregistrementInventaire(false);
    }
  };

  const enregistrerNouvelleCategorie = async (evenement) => {
    evenement.preventDefault();
    if (profil?.role !== 'superadmin') return;
    fixerEnregistrementInventaire(true);
    fixerErreurInventaire('');
    fixerMessageSucces('');
    try {
      const categorie = await creerCategorieLit(token, { nom: nomNouvelleCategorie.trim() });
      fixerMessageSucces(`Catégorie « ${categorie.nom} » ajoutée. Vous pouvez maintenant y créer des lits.`);
      fixerNomNouvelleCategorie('');
      fixerFormulaireCategorie(false);
      recharger();
    } catch (err) {
      fixerErreurInventaire(err.message || 'Impossible d’ajouter cette catégorie.');
    } finally {
      fixerEnregistrementInventaire(false);
    }
  };

  const ouvrirAdmission = (lit) => {
    if (!peutGererLits) return;
    fixerLitSelectionne(lit);
    fixerIdentite({ nom_patient: '', prenoms_patient: '' });
    fixerFormulaire({ nom_patient: '', prenoms_patient: '', motif_admission: '', motif_infectieux: '', facturation_vip_validee: false });
    fixerErreurAction('');
  };

  const ouvrirDetails = (lit) => {
    fixerLitDetailsId(lit.id);
    fixerLitDestination('');
    fixerMotifTransfert('');
    fixerMotifTransfertRaison('');
    fixerFacturationTransfert(false);
    fixerErreurAction('');
  };

  const admettrePatient = async (evenement) => {
    evenement.preventDefault();
    if (!peutGererLits || !litSelectionne) return;
    fixerSoumission(true);
    fixerErreurAction('');
    try {
      await occuperLit(token, litSelectionne.id, {
        nom_patient: formulaire.nom_patient.trim(),
        prenoms_patient: formulaire.prenoms_patient.trim(),
        motif_admission: formulaire.motif_admission.trim(),
        motif_infectieux: formulaire.motif_infectieux.trim() || null,
        facturation_vip_validee: formulaire.facturation_vip_validee,
      });
      fixerLitSelectionne(null);
      recharger();
    } catch (err) {
      fixerErreurAction(err.message || 'L’admission n’a pas pu être enregistrée.');
    } finally {
      fixerSoumission(false);
    }
  };

  const admissionVitale = async () => {
    if (!peutGererLits || !litSelectionne || litSelectionne.categorie !== 'dechocage' || soumission) return;
    fixerSoumission(true);
    fixerErreurAction('');
    try {
      await admettreUrgenceVitale(token, litSelectionne.id, {
        motif_admission: formulaire.motif_admission.trim() || 'Admission vitale · dossier à compléter',
      });
      fixerLitSelectionne(null);
      fixerMessageSucces('Admission vitale enregistrée. Complétez l’identité du patient dès que possible.');
      recharger();
    } catch (err) {
      fixerErreurAction(err.message || 'L’admission vitale n’a pas pu être enregistrée.');
    } finally {
      fixerSoumission(false);
    }
  };

  const terminerTransfert = async (evenement) => {
    evenement.preventDefault();
    if (!peutGererLits || !litDetails || !litDestination) return;
    const destination = lits.find((lit) => lit.id === litDestination);
    if (!destination) return;
    fixerActionDetails(true);
    fixerErreurAction('');
    try {
      await reserverTransfertLit(token, litDetails.id, {
        lit_destination_id: destination.id,
        motif_transfert: motifTransfertRaison.trim(),
        motif_infectieux: motifTransfert.trim() || null,
        facturation_vip_validee: facturationTransfert,
      });
      try {
        await confirmerTransfertLit(token, destination.id, litDetails.id);
      } catch (erreurConfirmation) {
        try {
          await annulerReservationTransfertLit(token, destination.id, litDetails.id);
        } catch (erreurAnnulation) {
          throw new Error(`${erreurConfirmation.message || 'Le transfert a échoué.'} La réservation temporaire n’a pas pu être annulée et expirera automatiquement sous 5 minutes. ${erreurAnnulation.message || ''}`.trim(), { cause: erreurAnnulation });
        }
        throw erreurConfirmation;
      }
      fixerLitDetailsId(null);
      fixerMessageSucces(`Transfert vers ${destination.numero} confirmé.`);
      fixerLitDestination('');
      fixerMotifTransfert('');
      fixerMotifTransfertRaison('');
      fixerFacturationTransfert(false);
      recharger();
    } catch (err) {
      fixerErreurAction(err.message || 'Le transfert du patient a échoué.');
    } finally {
      fixerActionDetails(false);
    }
  };

  const enregistrerIdentite = async (evenement) => {
    evenement.preventDefault();
    if (!peutGererLits || !litDetails) return;
    fixerActionDetails(true);
    fixerErreurAction('');
    try {
      await completerIdentiteLit(token, litDetails.id, identite);
      fixerLitDetailsId(null);
      fixerMessageSucces('Identité du patient mise à jour.');
      recharger();
    } catch (err) {
      fixerErreurAction(err.message || 'Impossible de mettre à jour l’identité.');
    } finally {
      fixerActionDetails(false);
    }
  };

  const liberer = async (lit) => {
    if (!peutGererLits) return;
    fixerClotureLit(lit);
    fixerTypeFin('sortie');
    fixerMotifCloture('');
    fixerServiceDestination('');
    fixerErreurAction('');
    try {
      fixerServices(await listerServices());
    } catch (err) {
      fixerErreurAction(err.message || 'Impossible de charger les services de destination.');
    }
  };

  const confirmerCloture = async (evenement) => {
    evenement.preventDefault();
    if (!peutGererLits || !clotureLit) return;
    fixerActionDetails(true);
    fixerErreurAction('');
    try {
      await libererLit(token, clotureLit.id, {
        type_fin: typeFin,
        motif: motifCloture.trim() || null,
        service_destination_id: typeFin === 'transfert_service' ? serviceDestination : null,
      });
      const libelle = typeFin === 'transfert_service'
        ? `Transfert vers ${services.find((service) => service.id === serviceDestination)?.nom || 'le service sélectionné'} enregistré.`
        : clotureLit.categorie === 'salle_septique'
          ? `Sortie enregistrée. Le lit ${clotureLit.numero} est bloqué pour bionettoyage terminal (2 heures).`
          : `Sortie enregistrée. Le lit ${clotureLit.numero} est maintenant disponible.`;
      fixerClotureLit(null);
      fixerLitDetailsId(null);
      fixerMessageSucces(libelle);
      recharger();
    } catch (err) {
      fixerErreurAction(err.message || 'La clôture du passage aux urgences a échoué.');
    } finally {
      fixerActionDetails(false);
    }
  };

  const nomUtilisateur = profil?.personnel
    ? `${profil.personnel.prenoms} ${profil.personnel.nom}`
    : profil?.role === 'superadmin' ? 'Super administrateur' : 'Major de garde';
  const roleAffiche = profil?.role === 'superadmin' ? 'SuperAdmin' : 'Major de garde';
  const litsDechocage = lits.filter((lit) => lit.categorie === 'dechocage');
  const litsDechocageOccupes = litsDechocage.filter((lit) => lit.statut === 'occupe').length;
  const alerteRougeGenerale = litsDechocage.length > 0 && litsDechocageOccupes === litsDechocage.length;
  const alerteVigilanceDechocage = litsDechocageOccupes > 0
    && !alerteRougeGenerale
    && litsDechocageOccupes / litsDechocage.length >= 0.5;
  const litsUrgenceEnAlerte = lits.filter((lit) => lit.categorie === 'urgence'
    && lit.statut === 'occupe'
    && delaiDepasse(lit.date_occupation, DELAI_URGENCE_MINUTES, maintenant));
  const litsTriageEnAlerte = lits.filter((lit) => lit.categorie === 'triage'
    && lit.statut === 'occupe'
    && delaiDepasse(lit.date_occupation, ALERTE_TRIAGE_MINUTES, maintenant));

  return (
    <div className={embedded ? 'espace font-body text-[#1E2333]' : 'espace min-h-screen bg-[#F4F2EE] font-body text-[#1E2333] selection:bg-[#1F7A8C] selection:text-white'}>
      <StylesEspace />
      {!embedded && <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-[#0A2233] via-[#0F3D52] to-[#0A2233] text-white shadow-lg shadow-[#0A2233]/20 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="group flex min-w-0 items-center space-x-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-white p-1.5 shadow-md shadow-black/20 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2 sm:h-14 sm:w-14">
              <img
                src={logoCenhosoa}
                alt="Logo Centre Hospitalier de Soavinandriana"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="block text-xl font-display font-light tracking-tight text-white">CENHOSOA</span>
              <h1 className="block truncate text-[10px] font-mono font-semibold uppercase tracking-widest text-[#7FD1CB] sm:text-[11px]">
                Gestion des lits · Services d’urgence
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-3 border-r border-white/15 pr-4 sm:flex">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#7FD1CB]">
                <UserRound className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-display font-bold leading-tight text-white">{nomUtilisateur}</p>
                <p className="text-[11px] font-medium text-[#7FD1CB]">{roleAffiche}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onDeconnexion}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-600 px-3 text-white transition-all duration-200 hover:bg-red-700"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden text-xs font-semibold sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>}

      <main className={embedded ? 'space-y-5' : 'mx-auto max-w-[1440px] space-y-7 px-4 py-7 sm:px-7 lg:px-10 lg:py-9'}>
        <section className="apparition relative mb-6 overflow-hidden rounded-[2rem] bg-[#0A2233] p-5 text-white shadow-lg shadow-[#0A2233]/10 sm:p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A2233] via-[#0F3D52]/90 to-[#1F7A8C]" />
          <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-[#7FD1CB]/20 blur-[90px]" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#7FD1CB]">
              {profil?.role === 'superadmin' ? 'Administration du centre' : 'Tableau de service'}
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              État des lits en temps réel
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
              Suivi de la capacité d’accueil, des admissions et des transferts immédiats. Actualisation automatique toutes les 30 secondes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:max-w-[620px] xl:justify-end">
            {profil?.role === 'superadmin' && <button
              type="button"
              onClick={() => { fixerNomNouvelleCategorie(''); fixerErreurInventaire(''); fixerFormulaireCategorie(true); }}
              disabled={enregistrementInventaire}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Ajouter une catégorie
            </button>}
            {!embedded && profil?.role === 'superadmin' && onRetourAdministration && <button
              type="button"
              onClick={onRetourAdministration}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#1F7A8C]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#1F7A8C] shadow-sm transition-all hover:bg-[#F4F2EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C]"
            >
              <ShieldCheck className="h-4 w-4" />
              Administration
            </button>}
            {['major', 'regulateur_ambulance', 'chef_division_auto', 'chef_sim'].includes(profil?.role) && onOuvrirAmbulances && <button
              type="button"
              onClick={onOuvrirAmbulances}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#1F7A8C]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#1F7A8C] shadow-sm transition-all hover:bg-[#F4F2EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C]"
            >
              <Ambulance className="h-4 w-4" />
              Ambulances
            </button>}
            <button
              type="button"
              onClick={recharger}
              disabled={chargement}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#1F7A8C]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#1F7A8C] shadow-sm transition-all hover:bg-[#F4F2EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C] disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
          </div>
        </section>

        {alerteRougeGenerale && (
          <section role="alert" className="apparition flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900 shadow-sm">
            <Siren className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-red-600 motion-reduce:animate-none" />
            <div><p className="font-bold">Alerte rouge générale · Déchoquage saturé</p><p className="mt-1 text-sm">{litsDechocageOccupes} lit(s) sur {litsDechocage.length} sont occupés. Signalez la saturation et recherchez immédiatement une capacité d’aval.</p></div>
          </section>
        )}
        {!alerteRougeGenerale && alerteVigilanceDechocage && (
          <section role="status" className="apparition flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div><p className="font-bold">Vigilance · Déchoquage à mi-capacité</p><p className="mt-1 text-sm">{litsDechocageOccupes} lit(s) sur {litsDechocage.length} sont occupés.</p></div>
          </section>
        )}
        {litsUrgenceEnAlerte.length > 0 && (
          <section role="alert" className="apparition flex items-start gap-3 rounded-2xl border border-red-500 bg-red-600 p-4 text-white shadow-md shadow-red-900/15">
            <TimerReset className="mt-0.5 h-5 w-5 shrink-0 animate-pulse motion-reduce:animate-none" />
            <div className="min-w-0"><p className="font-bold">Alerte critique · séjour supérieur à 12 h</p><p className="mt-1 text-sm text-white/90">Recherchez un lit en aval et transférez : {litsUrgenceEnAlerte.map((lit) => `${lit.numero} (${[lit.prenoms_patient_actuel, lit.nom_patient_actuel].filter(Boolean).join(' ') || 'patient'})`).join(', ')}.</p></div>
          </section>
        )}
        {litsTriageEnAlerte.length > 0 && (
          <section role="alert" className="apparition flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900 shadow-sm">
            <Clock className="mt-0.5 h-5 w-5 shrink-0" />
            <div><p className="font-bold">Orientation de triage requise</p><p className="mt-1 text-sm">Transfert à effectuer avant le seuil de 30 minutes : {litsTriageEnAlerte.map((lit) => `${lit.numero} · ${afficherDuree(lit.date_occupation)}`).join(', ')}. Alerte renforcée après 45 minutes.</p></div>
          </section>
        )}
        {statistiques.occupes >= 19 && (
          <section role="alert" className="apparition flex items-start gap-3 rounded-2xl border border-violet-300 bg-violet-50 p-4 text-violet-950 shadow-sm">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
            <div><p className="font-bold">Plan Blanc · seuil de réquisition atteint</p><p className="mt-1 text-sm">Au moins 19 lits sont occupés. L’attribution VIP peut être dérogée pour répondre aux urgences.</p></div>
          </section>
        )}

        {erreur && (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 shadow-sm backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1 font-medium">{erreur}</div>
            <button type="button" onClick={() => fixerErreur('')} aria-label="Fermer le message" className="text-red-500 hover:text-red-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {messageSucces && (
          <div role="status" className="mb-6 flex items-start gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="flex-1 font-medium">{messageSucces}</div>
            <button type="button" onClick={() => fixerMessageSucces('')} aria-label="Fermer le message" className="text-emerald-600 hover:text-emerald-800">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {!embedded && (
        <>
        <section aria-label="Synthèse des lits" className="apparition relative mb-8 overflow-hidden rounded-[2rem] bg-[#0A2233] p-6 text-white sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A2233] via-[#0F3D52]/80 to-[#0A2233]" />
          <div className="absolute -left-20 -top-24 h-72 w-72 animate-pulse rounded-full bg-[#1F7A8C]/50 blur-[90px]" />
          <div className="absolute -bottom-28 right-0 h-72 w-72 animate-pulse rounded-full bg-[#7FD1CB]/30 blur-[90px]" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:items-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Occupation globale</p>
              <p className="mt-3 flex items-baseline gap-1 text-7xl font-light tabular-nums tracking-[-0.05em] sm:text-8xl">
                {chargement ? '—' : <Compteur valeur={statistiques.taux} />}<span className="text-3xl text-white/50">%</span>
              </p>
              <div className="mt-4 h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Taux d’occupation de l’hôpital" aria-valuemin="0" aria-valuemax="100" aria-valuenow={statistiques.taux}>
                <div className={`h-full rounded-full transition-all duration-700 ${statistiques.taux >= 85 ? 'bg-red-400' : 'bg-[#7FD1CB]'}`} style={{ width: `${statistiques.taux}%` }} />
              </div>
              <p className="mt-3 text-sm font-light text-white/60">{statistiques.occupes} lit{statistiques.occupes > 1 ? 's' : ''} occupé{statistiques.occupes > 1 ? 's' : ''} sur {statistiques.total}</p>
            </div>
            <dl className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
              {[
                [BedDouble, 'Lits configurés', statistiques.total, 'text-[#7FD1CB]', 'Capacité disponible'],
                [CheckCircle2, 'Lits libres', statistiques.libres, 'text-emerald-300', 'Disponibles immédiatement'],
                [Users, 'Lits occupés', statistiques.occupes, 'text-red-300', 'Patients en soins'],
              ].map(([Icone, libelle, valeur, couleur, aide]) => (
                <div key={libelle} className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15">
                  <dt className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/60">{libelle}<Icone className={`h-4 w-4 ${couleur}`} /></dt>
                  <dd className={`mt-3 text-4xl font-light tabular-nums ${couleur}`}>{chargement ? '—' : <Compteur valeur={valeur} />}</dd>
                  <p className="mt-1 text-xs font-light text-white/50">{aide}</p>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section aria-label="État des zones critiques" className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {resume.map((ligne) => {
            const config = {
              triage: 'Évaluation initiale · orientation sous 30 min',
              urgence: 'Stabilisation · maximum 12 h',
              dechocage: 'Urgence vitale · surveillance des admissions',
              salle_septique: 'Isolation · nettoyage terminal 2 h',
              vip: 'Facturation dédiée · dérogation au seuil de 19 patients',
            }[ligne.categorie];
            const enAlerte = ligne.categorie === 'dechocage' && litsDechocageOccupes === 2;
            return (
              <article key={ligne.categorie} className={`rounded-2xl border p-4 shadow-sm ${enAlerte ? 'border-red-300 bg-red-50' : 'border-[#1F7A8C]/10 bg-white'}`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#0A2233]">{nomCategorie(ligne.categorie)}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${enAlerte ? 'bg-red-600 text-white' : 'bg-[#EAF1F1] text-[#0F3D52]'}`}>{ligne.occupes}/{ligne.total}</span>
                </div>
                <p className="mt-2 min-h-8 text-[11px] leading-relaxed text-slate-500">{config || 'Catégorie configurée par le centre'}</p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">{ligne.libres} libre(s)</span>
                  {(ligne.reserves || 0) > 0 && <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-800">{ligne.reserves} réservé(s)</span>}
                  {(ligne.en_nettoyage || 0) > 0 && <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-900">{ligne.en_nettoyage} nettoyage(s)</span>}
                </div>
              </article>
            );
          })}
        </section>

        <section aria-labelledby="titre-statistiques-lits" className="apparition mb-8 space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#5B7480]">Vue d’ensemble</p>
            <h3 id="titre-statistiques-lits" className="mt-1 text-xl font-bold text-[#0A2233]">
              Statistiques d’occupation
            </h3>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="apparition transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1F7A8C]/10 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
              <h4 className="text-base font-bold text-[#0A2233]">Taux d’occupation global</h4>
              <p className="mt-1 text-xs text-slate-500">Part des lits occupés dans la capacité totale.</p>
              {chargement ? (
                <p className="mt-6 rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                  Chargement des statistiques…
                </p>
              ) : statistiques.total ? (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                  <div
                    className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(#ef4444 ${statistiques.taux}%, #10b981 ${statistiques.taux}% 100%)`,
                    }}
                    role="img"
                    aria-label={`${statistiques.taux}% des lits sont occupés`}
                  >
                    <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                      <span className="text-2xl font-light tabular-nums text-[#0A2233]">{statistiques.taux}%</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">occupés</span>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-slate-700">
                      <span className="h-3 w-3 rounded-full bg-red-500" />
                      Occupés <span className="ml-auto font-bold tabular-nums text-[#0A2233]">{statistiques.occupes}</span>
                    </p>
                    <p className="flex items-center gap-2 font-semibold text-slate-700">
                      <span className="h-3 w-3 rounded-full bg-emerald-500" />
                      Libres <span className="ml-auto font-bold tabular-nums text-[#0A2233]">{statistiques.libres}</span>
                    </p>
                    <p className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                      Capacité totale : {statistiques.total} lits
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-6 rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                  Aucun lit disponible pour calculer le taux d’occupation.
                </p>
              )}
            </article>

            <article className="apparition transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1F7A8C]/10 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
              <h4 className="text-base font-bold text-[#0A2233]">Occupation par catégorie</h4>
              <p className="mt-1 text-xs text-slate-500">Comparaison des lits occupés et libres dans chaque catégorie.</p>
              {chargement ? (
                <p className="mt-6 rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                  Chargement des statistiques…
                </p>
              ) : resume.length ? (
                <>
                  <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-red-500" />Occupés</span>
                    <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Libres</span>
                  </div>
                  <div className="mt-4 max-h-56 space-y-4 overflow-y-auto pr-1" role="img" aria-label="Graphique des lits occupés et libres par catégorie">
                    {resume.map((ligne) => {
                      const total = ligne.total || 0;
                      const pourcentageOccupes = total ? (ligne.occupes / total) * 100 : 0;
                      const pourcentageLibres = total ? (ligne.libres / total) * 100 : 0;
                      return (
                        <div key={ligne.categorie}>
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                            <span className="truncate font-semibold text-slate-700">
                              {nomCategorie(ligne.categorie)}
                            </span>
                            <span className="shrink-0 font-bold tabular-nums text-[#0A2233]">
                              {ligne.occupes}/{total}
                            </span>
                          </div>
                          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full bg-red-500 transition-all" style={{ width: `${pourcentageOccupes}%` }} />
                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pourcentageLibres}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="mt-6 rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                  Aucune catégorie de lit à afficher.
                </p>
              )}
            </article>
          </div>
        </section>
        </>
        )}

        <div role="tablist" aria-label="Vue des lits" className="mb-6 inline-flex rounded-3xl border border-[#1F7A8C]/10 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            role="tab"
            aria-selected={vue === 'plan'}
            onClick={() => fixerVue('plan')}
            className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${vue === 'plan' ? 'bg-[#1F7A8C] text-white shadow-md shadow-[#1F7A8C]/20' : 'text-slate-600 hover:bg-[#F4F2EE]'}`}
          >
            Plan de salle
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vue === 'liste'}
            onClick={() => fixerVue('liste')}
            className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${vue === 'liste' ? 'bg-[#1F7A8C] text-white shadow-md shadow-[#1F7A8C]/20' : 'text-slate-600 hover:bg-[#F4F2EE]'}`}
          >
            Liste détaillée
          </button>
          {profil?.role === 'superadmin' && (
            <button
              type="button"
              role="tab"
              aria-selected={vue === 'historique'}
              onClick={() => fixerVue('historique')}
              className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${vue === 'historique' ? 'bg-[#1F7A8C] text-white shadow-md shadow-[#1F7A8C]/20' : 'text-slate-600 hover:bg-[#F4F2EE]'}`}
            >
              Historique des lits
            </button>
          )}
        </div>

        {vue === 'historique' && profil?.role === 'superadmin' && (
          <HistoriqueLits token={token} rechargement={rechargement} />
        )}

        {vue === 'plan' && (
          <section aria-label="Plan de salle des lits" className="apparition mb-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-display font-bold text-[#0A2233]">Plan de salle</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {peutGererLits
                    ? 'Sélectionnez un lit pour l’admettre ou le libérer.'
                    : 'Sélectionnez un lit occupé pour consulter les détails.'}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Libre</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Occupé</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Réservé</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Nettoyage</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {litsParCategorie.map((departement) => (
                <article key={departement.categorie} className="apparition transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1F7A8C]/10 rounded-3xl border border-[#1F7A8C]/10 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-display text-base font-bold text-[#0A2233]">
                        {nomCategorie(departement.categorie)}
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500">{departement.total} lit{departement.total > 1 ? 's' : ''} · {departement.occupes} occupé{departement.occupes > 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        {departement.libres} libre{departement.libres > 1 ? 's' : ''}
                      </span>
                      {profil?.role === 'superadmin' && <button
                        type="button"
                        onClick={() => ouvrirFormulaireNouveauLit(departement)}
                        aria-label={`Ajouter un lit dans ${departement.nom}`}
                        title={`Ajouter un lit dans ${departement.nom}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#1F7A8C]/20 bg-white text-[#1F7A8C] transition hover:bg-[#EAF1F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C]"
                      >
                        <Plus className="h-4 w-4" />
                      </button>}
                    </div>
                  </div>
                  <div className="-mt-1 mb-4 h-1.5 overflow-hidden rounded-full bg-emerald-100" aria-hidden="true">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-700" style={{ width: `${departement.total ? (departement.occupes / departement.total) * 100 : 0}%` }} />
                  </div>

                  {departement.lits.length ? (
                    <div className="grid grid-cols-2 gap-2.5 min-[480px]:grid-cols-3 sm:gap-3">
                      {departement.lits.map((lit) => {
                        const estOccupe = lit.statut === 'occupe';
                        const estLibre = lit.statut === 'libre';
                        const estReserve = lit.statut === 'reserve';
                        const estNettoyage = lit.statut === 'nettoyage';
                        const patient = [lit.prenoms_patient_actuel, lit.nom_patient_actuel].filter(Boolean).join(' ');
                        const dureeLit = minutesDepuis(lit.date_occupation, maintenant);
                        const orientationTriageRequise = estOccupe && lit.categorie === 'triage' && dureeLit >= DELAI_TRIAGE_MINUTES;
                        const alerteTriage = estOccupe && lit.categorie === 'triage' && delaiDepasse(lit.date_occupation, ALERTE_TRIAGE_MINUTES, maintenant);
                        const alerteUrgence = estOccupe && lit.categorie === 'urgence' && delaiDepasse(lit.date_occupation, DELAI_URGENCE_MINUTES, maintenant);
                        return (
                          <div key={lit.id} className="relative aspect-square min-h-[92px]">
                            <button
                              type="button"
                              onClick={() => estOccupe ? ouvrirDetails(lit) : estLibre ? ouvrirAdmission(lit) : undefined}
                              disabled={(!peutGererLits && !estOccupe) || (!estOccupe && !estLibre)}
                              aria-label={estOccupe ? `Détails d’occupation du lit ${lit.numero}, ${patient || 'patient admis'}` : estLibre ? `Admettre un patient dans le lit ${lit.numero}` : `${lit.numero}, ${LIBELLES_STATUTS[lit.statut]}`}
                              title={estOccupe ? 'Afficher les détails du patient admis' : estLibre && peutGererLits ? `Admettre un patient dans ${lit.numero}` : LIBELLES_STATUTS[lit.statut]}
                              className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl border p-2 text-center transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-75 ${alerteUrgence ? 'animate-pulse border-red-500 bg-red-600 text-white motion-reduce:animate-none' : alerteTriage ? 'border-red-300 bg-red-50 text-red-800' : orientationTriageRequise ? 'border-amber-300 bg-amber-50 text-amber-900' : estOccupe ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : estReserve ? 'border-blue-200 bg-blue-50 text-blue-800' : estNettoyage ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                            >
                              <span aria-hidden="true" className="absolute left-2 top-2">
                                <span className={`block h-2 w-2 rounded-full ${alerteUrgence ? 'animate-ping bg-white motion-reduce:animate-none' : estOccupe ? 'animate-pulse bg-red-500 motion-reduce:animate-none' : estReserve ? 'bg-blue-500' : estNettoyage ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                              </span>
                              <span className="mt-2 font-display text-lg font-semibold leading-none">{lit.numero}</span>
                              {estOccupe && (
                                <>
                                  <span className={`mt-1 w-full truncate text-[10px] font-semibold leading-tight ${alerteUrgence ? 'text-white' : 'text-red-700/80'}`}>{patient || 'Patient admis'}</span>
                                  <span className="mt-0.5 inline-flex max-w-full items-center justify-center gap-0.5 overflow-hidden whitespace-nowrap text-[9px] leading-tight text-slate-500">
                                    <Clock className="h-2.5 w-2.5 shrink-0" />
                                    <span className={`truncate ${alerteUrgence ? 'text-white/90' : ''}`}>{lit.categorie === 'urgence' ? afficherCompteARebours(lit.date_occupation, DELAI_URGENCE_MINUTES, maintenant) : `Depuis ${afficherDuree(lit.date_occupation)}`}</span>
                                  </span>
                                  {orientationTriageRequise && <span className={`mt-1 text-[9px] font-bold uppercase ${alerteTriage ? 'text-red-800' : 'text-amber-900'}`}>{alerteTriage ? 'Alerte > 45 min' : 'Orientation requise'}</span>}
                                  {lit.urgence_vitale && <span className="mt-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[8px] font-bold uppercase">Identité à compléter</span>}
                                </>
                              )}
                              {estLibre && <span className="mt-2 text-[10px] font-medium text-emerald-700/70">Disponible</span>}
                              {estReserve && <><span className="mt-2 text-[10px] font-bold">Réservé</span><span className="mt-1 text-[9px]">Transfert immédiat</span></>}
                              {estNettoyage && <><span className="mt-2 text-[10px] font-bold">Bionettoyage</span><span className="mt-1 text-[9px] tabular-nums">{afficherCompteNettoyage(lit.date_debut_nettoyage, maintenant)}</span></>}
                            </button>
                            {estOccupe && <button
                              type="button"
                              onClick={() => ouvrirDetails(lit)}
                              title={`Voir les détails du lit ${lit.numero}`}
                              aria-label={`Voir les détails de ${patient || 'patient admis'} dans le lit ${lit.numero}`}
                              className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-xl border border-[#1F7A8C]/20 bg-white/95 text-[#1F7A8C] shadow-sm transition-colors hover:bg-[#F4F2EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C]"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">Aucun lit dans cette salle.</p>
                  )}
                </article>
              ))}
              {!litsParCategorie.length && !chargement && (
                <p className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Aucune catégorie de lit n’est disponible.</p>
              )}
            </div>
          </section>
        )}

        {vue === 'liste' && (
          <>
        <section className="apparition mb-8" aria-label="Répartition par catégorie">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold uppercase tracking-wider text-[#0A2233]">
              Répartition par catégorie
            </h3>
            <span className="text-xs font-semibold text-slate-400">{resume.length} catégories répertoriées</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {resume.map((ligne) => {
              const estActive = filtreCategorie === ligne.categorie;
              return (
                <button
                  key={ligne.categorie}
                  type="button"
                  onClick={() => fixerFiltreCategorie(estActive ? 'toutes' : ligne.categorie)}
                  aria-pressed={estActive}
                  className={`rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C] focus-visible:ring-offset-2 ${
                    estActive
                      ? 'bg-[#1F7A8C] text-white border-[#1F7A8C] shadow-md shadow-[#1F7A8C]/20'
                      : 'bg-white text-[#0A2233] border-[#1F7A8C]/10 hover:border-[#1F7A8C]/30 hover:bg-[#F4F2EE]'
                  }`}
                >
                  <span className={`block truncate text-xs font-bold uppercase tracking-wider ${estActive ? 'text-[#B5E8E3]' : 'text-slate-400'}`}>
                    {nomCategorie(ligne.categorie)}
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-display font-light tabular-nums">{ligne.libres}</span>
                    <span className={`text-xs font-semibold ${estActive ? 'text-white/80' : 'text-slate-500'}`}>/ {ligne.total} libres</span>
                  </div>
                  <span className={`mt-1 block text-[11px] font-medium ${estActive ? 'text-white/70' : 'text-slate-400'}`}>
                    {ligne.occupes} occupé{ligne.occupes > 1 ? 's' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="apparition overflow-hidden rounded-3xl border border-[#1F7A8C]/10 bg-white shadow-xl shadow-[#1F7A8C]/5" aria-label="Liste des lits">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F7A8C]/10 bg-[#F4F2EE]/50 p-5 sm:p-6">
            <div>
              <h3 className="text-lg font-display font-bold text-[#0A2233]">Tous les lits</h3>
              <p className="text-xs text-slate-500 font-medium">
                {litsFiltres.length} lit{litsFiltres.length > 1 ? 's' : ''} correspondant{litsFiltres.length > 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <div className="relative min-w-[220px] flex-1 sm:flex-none">
                <Search className="absolute left-3.5 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={recherche}
                  onChange={(e) => fixerRecherche(e.target.value)}
                  placeholder="Rechercher lit, patient..."
                  className="w-full rounded-2xl border border-[#1F7A8C]/15 bg-white pl-10 pr-4 py-2.5 text-sm text-[#0A2233] placeholder:text-slate-400 focus:border-[#1F7A8C] focus:ring-2 focus:ring-[#1F7A8C]/20 outline-none transition-all"
                />
              </div>

              <div className="relative">
                <select
                  aria-label="Filtrer par statut"
                  value={filtreStatut}
                  onChange={(e) => fixerFiltreStatut(e.target.value)}
                  className="appearance-none rounded-2xl border border-[#1F7A8C]/15 bg-white pl-4 pr-10 py-2.5 text-sm font-semibold text-[#0A2233] focus:border-[#1F7A8C] outline-none transition-all cursor-pointer"
                >
                  <option value="tous">Tous les statuts</option>
                  <option value="libre">Libres uniquement</option>
                  <option value="occupe">Occupés uniquement</option>
                  <option value="reserve">Réservés uniquement</option>
                  <option value="nettoyage">En nettoyage uniquement</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
              </div>

              {filtreCategorie !== 'toutes' && (
                <button
                  type="button"
                  onClick={() => fixerFiltreCategorie('toutes')}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-[#1F7A8C]/20 bg-[#1F7A8C]/10 px-3 py-2 text-xs font-bold text-[#1F7A8C] hover:bg-[#1F7A8C]/20 transition-all"
                >
                  <span>{nomCategorie(filtreCategorie)}</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#1F7A8C]/10 bg-[#F4F2EE] text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">N° Lit</th>
                  <th className="px-4 py-4">Catégorie</th>
                  <th className="px-4 py-4">Statut</th>
                  <th className="px-4 py-4">Patient / Détails d'admission</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F7A8C]/10 text-sm">
                {litsFiltres.map((lit) => {
                  const estOccupe = lit.statut === 'occupe';
                  const patient = [lit.prenoms_patient_actuel, lit.nom_patient_actuel].filter(Boolean).join(' ');
                  return (
                    <tr key={lit.id} className="transition-colors hover:bg-[#F4F2EE]/60">
                      <td className="px-6 py-4 font-display font-light text-[#0A2233] text-base">
                        {lit.numero}
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-600">
                        {nomCategorie(lit.categorie)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                          estOccupe ? 'border-red-200 bg-red-50 text-red-700' : lit.statut === 'reserve' ? 'border-blue-200 bg-blue-50 text-blue-800' : lit.statut === 'nettoyage' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${estOccupe ? 'animate-pulse bg-red-500 motion-reduce:animate-none' : lit.statut === 'reserve' ? 'bg-blue-500' : lit.statut === 'nettoyage' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          {LIBELLES_STATUTS[lit.statut] || lit.statut}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {estOccupe ? (
                          <div>
                            <p className="font-display font-bold text-[#0A2233]">{patient || 'Patient anonyme'}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              Depuis {afficherDuree(lit.date_occupation)}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">Admis le {formaterDateHeure(lit.date_occupation)}</p>
                            {lit.motif_admission && <p className="mt-1 max-w-[28rem] text-xs text-slate-600"><span className="font-semibold">Motif :</span> {lit.motif_admission}</p>}
                          </div>
                        ) : lit.statut === 'nettoyage' ? (
                          <div><p className="font-semibold text-amber-900">Bionettoyage terminal</p><p className="mt-1 text-xs tabular-nums text-slate-600">Disponible dans {afficherCompteNettoyage(lit.date_debut_nettoyage, maintenant)}</p></div>
                        ) : lit.statut === 'reserve' ? (
                          <div><p className="font-semibold text-blue-900">Transfert immédiat en cours</p><p className="mt-1 text-xs text-slate-600">Patient : {patient || 'Non renseigné'}</p></div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 italic">Aucun patient admis</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {estOccupe ? (
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => fixerLitDetailsId(lit.id)}
                              title={`Voir les détails du lit ${lit.numero}`}
                              aria-label={`Voir les détails de ${patient || 'patient admis'} dans le lit ${lit.numero}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#1F7A8C]/20 bg-white text-[#1F7A8C] transition-colors hover:bg-[#F4F2EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C]"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {peutGererLits && <button
                              type="button"
                              onClick={() => liberer(lit)}
                              className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-600 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Libérer le lit
                            </button>}
                          </div>
                        ) : lit.statut === 'libre' ? (
                          peutGererLits ? <button
                            type="button"
                            onClick={() => ouvrirAdmission(lit)}
                            className="inline-flex items-center justify-center rounded-full bg-[#1F7A8C] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-[#1F7A8C]/20 hover:bg-[#186575] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                          >
                            Admettre patient
                          </button> : (
                            <span className="text-xs font-semibold text-slate-400">Consultation uniquement</span>
                          )
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">Action indisponible</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 border-t border-[#1F7A8C]/10 bg-[#F4F2EE]/50 px-6 py-3 text-xs font-medium text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#1F7A8C]" />
            Les opérations effectuées sont transmises instantanément à la base centrale du centre.
          </div>
        </section>
          </>
        )}
      </main>

      {formulaireCategorie && profil?.role === 'superadmin' && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A2233]/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) fixerFormulaireCategorie(false); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="titre-nouvelle-categorie" className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#1F7A8C]">Inventaire des lits</p>
                <h2 id="titre-nouvelle-categorie" className="mt-2 text-xl font-bold text-[#0A2233]">Ajouter une catégorie</h2>
                <p className="mt-2 text-sm text-slate-600">Créez une nouvelle catégorie de lits. Elle sera ensuite disponible dans le plan de salle.</p>
              </div>
              <button type="button" onClick={() => fixerFormulaireCategorie(false)} aria-label="Fermer" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={enregistrerNouvelleCategorie} className="mt-5 space-y-4">
              <div>
                <label htmlFor="nom-nouvelle-categorie" className="mb-1.5 block text-sm font-semibold text-slate-700">Nom de la catégorie</label>
                <input
                  id="nom-nouvelle-categorie"
                  autoFocus
                  required
                  maxLength={100}
                  value={nomNouvelleCategorie}
                  onChange={(event) => fixerNomNouvelleCategorie(event.target.value)}
                  placeholder="Ex. Soins continus"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1F7A8C] focus:ring-2 focus:ring-[#1F7A8C]/15"
                />
              </div>
              {erreurInventaire && <p role="alert" className="text-sm font-semibold text-red-700">{erreurInventaire}</p>}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => fixerFormulaireCategorie(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={enregistrementInventaire} className="inline-flex items-center gap-2 rounded-xl bg-[#0F3D52] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0A2233] disabled:opacity-60">
                  {enregistrementInventaire ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Ajouter la catégorie
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {categorieALitAjouter && profil?.role === 'superadmin' && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A2233]/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) fixerCategorieALitAjouter(null); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="titre-nouveau-lit" className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#1F7A8C]">Inventaire des lits</p>
                <h2 id="titre-nouveau-lit" className="mt-2 text-xl font-bold text-[#0A2233]">Ajouter un lit · {categorieALitAjouter.nom}</h2>
                <p className="mt-2 text-sm text-slate-600">Le numéro doit être unique dans l’inventaire du centre.</p>
              </div>
              <button type="button" onClick={() => fixerCategorieALitAjouter(null)} aria-label="Fermer" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={enregistrerNouveauLit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="numero-nouveau-lit" className="mb-1.5 block text-sm font-semibold text-slate-700">Numéro du lit</label>
                <input
                  id="numero-nouveau-lit"
                  autoFocus
                  required
                  maxLength={20}
                  value={numeroNouveauLit}
                  onChange={(event) => fixerNumeroNouveauLit(event.target.value)}
                  placeholder="Ex. SEP-03"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1F7A8C] focus:ring-2 focus:ring-[#1F7A8C]/15"
                />
              </div>
              {erreurInventaire && <p role="alert" className="text-sm font-semibold text-red-700">{erreurInventaire}</p>}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => fixerCategorieALitAjouter(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={enregistrementInventaire} className="inline-flex items-center gap-2 rounded-xl bg-[#0F3D52] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0A2233] disabled:opacity-60">
                  {enregistrementInventaire ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Ajouter le lit
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {litDetails && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A2233]/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) fixerLitDetailsId(null); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-details-lit"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between bg-gradient-to-br from-[#0A2233] via-[#0F3D52] to-[#1F7A8C] px-6 py-5 text-white">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#B5E8E3]">
                  Lit occupé · {nomCategorie(litDetails.categorie)}
                </span>
                <h2 id="titre-details-lit" className="mt-2 text-xl font-display font-light">
                  {litDetails.numero} · {[litDetails.prenoms_patient_actuel, litDetails.nom_patient_actuel].filter(Boolean).join(' ') || 'Patient admis'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => fixerLitDetailsId(null)}
                title="Fermer les détails"
                aria-label="Fermer les détails du lit"
                className="rounded-xl p-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</dt>
                <dd className="mt-1 text-sm font-bold text-[#0A2233]">{[litDetails.prenoms_patient_actuel, litDetails.nom_patient_actuel].filter(Boolean).join(' ') || 'Non renseigné'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Durée d’occupation</dt>
                <dd className="mt-1 text-sm font-bold text-[#0A2233]">{afficherDuree(litDetails.date_occupation)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admis le</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700">{formaterDateHeure(litDetails.date_occupation)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Motif d’admission</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700">{litDetails.motif_admission || 'Non renseigné'}</dd>
              </div>
            </dl>
            <div className="space-y-5 border-t border-slate-100 p-6">
              {peutGererLits && (litDetails.urgence_vitale || identiteLitACompleter) && (
                <form onSubmit={enregistrerIdentite} className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div><p className="text-sm font-bold text-amber-950">Identité provisoire</p><p className="mt-1 text-xs text-amber-800">Complétez le dossier dès que l’état du patient le permet. Si le lit est lié à une mission d’ambulance, son identité sera mise à jour également.</p></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input aria-label="Nom du patient" required maxLength={100} value={identite.nom_patient} onChange={(event) => fixerIdentite({ ...identite, nom_patient: event.target.value })} placeholder="Nom" className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
                    <input aria-label="Prénoms du patient" required maxLength={150} value={identite.prenoms_patient} onChange={(event) => fixerIdentite({ ...identite, prenoms_patient: event.target.value })} placeholder="Prénoms" className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                  <button type="submit" disabled={actionDetails} className="rounded-xl bg-amber-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{actionDetails ? 'Enregistrement…' : 'Enregistrer l’identité'}</button>
                </form>
              )}
              {peutGererLits && <form onSubmit={terminerTransfert} className="space-y-3 rounded-2xl border border-[#1F7A8C]/15 bg-[#F5F9F9] p-4">
                <div><p className="text-sm font-bold text-[#0A2233]">Transfert vers une autre zone</p><p className="mt-1 text-xs text-slate-600">La destination est réservée puis confirmée après validation serveur des règles applicables.</p></div>
                <select aria-label="Lit de destination" required value={litDestination} onChange={(event) => fixerLitDestination(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1F7A8C] focus:ring-2 focus:ring-[#1F7A8C]/15">
                  <option value="">Choisir un lit libre…</option>
                  {lits.filter((lit) => lit.statut === 'libre' && lit.categorie !== litDetails.categorie).map((lit) => <option key={lit.id} value={lit.id}>{lit.numero} · {nomCategorie(lit.categorie)}</option>)}
                </select>
                <div>
                  <label htmlFor="transfert-motif" className="mb-1 block text-xs font-semibold text-slate-700">Motif du transfert interne <span className="text-red-600">Obligatoire</span></label>
                  <textarea id="transfert-motif" required maxLength={2000} rows="2" value={motifTransfertRaison} onChange={(event) => fixerMotifTransfertRaison(event.target.value)} placeholder="Ex. surveillance renforcée, besoin d’un lit de déchoquage…" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1F7A8C]" />
                </div>
                {lits.find((lit) => lit.id === litDestination)?.categorie === 'salle_septique' && (
                  <div>
                    <label htmlFor="transfert-motif-infectieux" className="mb-1 block text-xs font-semibold text-slate-700">Motif infectieux obligatoire</label>
                    <input id="transfert-motif-infectieux" required maxLength={255} value={motifTransfert} onChange={(event) => fixerMotifTransfert(event.target.value)} placeholder="Ex. BMR, COVID-19…" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1F7A8C]" />
                  </div>
                )}
                {lits.find((lit) => lit.id === litDestination)?.categorie === 'vip' && statistiques.occupes < 19 && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-violet-200 bg-white p-3 text-xs text-slate-700">
                    <input type="checkbox" checked={facturationTransfert} onChange={(event) => fixerFacturationTransfert(event.target.checked)} className="mt-0.5 accent-violet-700" />
                    <span><strong className="block text-violet-950">Validation de facturation VIP</strong>Je confirme la validation spécifique avant ce transfert.</span>
                  </label>
                )}
                {erreurAction && <p role="alert" className="text-xs font-semibold text-red-700">{erreurAction}</p>}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => liberer(litDetails)} disabled={actionDetails || !peutGererLits} className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50">Sortie patient · libérer le lit</button>
                  <button type="submit" disabled={actionDetails || !peutGererLits || !litDestination} className="inline-flex items-center gap-2 rounded-xl bg-[#0F3D52] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0A2233] disabled:opacity-50"><ArrowRightLeft size={14} />{actionDetails ? 'Transfert…' : 'Confirmer le transfert'}</button>
                </div>
              </form>}
            </div>
          </section>
        </div>
      )}

      {clotureLit && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0A2233]/75 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="titre-cloture-lit" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-[#0A2233] to-[#1F7A8C] px-6 py-5 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-[#B5E8E3]">Fin du passage aux urgences</p>
              <h2 id="titre-cloture-lit" className="mt-1 text-xl font-semibold">Clôturer {clotureLit.numero}</h2>
              <p className="mt-1 text-sm text-white/80">{[clotureLit.prenoms_patient_actuel, clotureLit.nom_patient_actuel].filter(Boolean).join(' ')}</p>
            </div>
            <form onSubmit={confirmerCloture} className="space-y-4 p-6">
              <label className="block text-xs font-semibold text-slate-700">
                Destination du patient
                <select value={typeFin} onChange={(event) => fixerTypeFin(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1F7A8C]">
                  <option value="sortie">Sortie de l’hôpital</option>
                  <option value="transfert_service">Transfert vers un service</option>
                </select>
              </label>
              {typeFin === 'transfert_service' && (
                <>
                  <label className="block text-xs font-semibold text-slate-700">
                    Service destinataire
                    <select required value={serviceDestination} onChange={(event) => fixerServiceDestination(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1F7A8C]">
                      <option value="">Choisir un service…</option>
                      {services.map((service) => <option key={service.id} value={service.id}>{service.nom}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">
                    Motif du transfert <span className="text-red-600">Obligatoire</span>
                    <textarea required maxLength={2000} rows="3" value={motifCloture} onChange={(event) => fixerMotifCloture(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1F7A8C]" placeholder="Précisez la raison et le contexte du transfert…" />
                  </label>
                </>
              )}
              {erreurAction && <p role="alert" className="text-xs font-semibold text-red-700">{erreurAction}</p>}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => fixerClotureLit(null)} disabled={actionDetails} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-50">Annuler</button>
                <button type="submit" disabled={actionDetails || !peutGererLits || (typeFin === 'transfert_service' && !services.length)} className="rounded-xl bg-[#0F3D52] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{actionDetails ? 'Enregistrement…' : 'Confirmer la clôture'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal d'Admission */}
      {litSelectionne && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A2233]/70 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) fixerLitSelectionne(null); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-admission"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between gap-3 bg-gradient-to-br from-[#0A2233] via-[#0F3D52] to-[#1F7A8C] px-5 py-5 text-white sm:px-8 sm:py-7">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#B5E8E3]">
                  Admission Immédiate · Lit {litSelectionne.numero}
                </span>
                <h2 id="titre-admission" className="mt-2 text-xl font-display font-light sm:text-2xl">
                  Enregistrer un patient
                </h2>
                <p className="mt-1 text-sm text-white/80">
                  Secteur : {nomCategorie(litSelectionne.categorie)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => fixerLitSelectionne(null)}
                aria-label="Fermer"
                className="rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={admettrePatient} className="space-y-6 bg-white p-6 sm:p-8">
              {litSelectionne.categorie === 'dechocage' && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-900">Urgence vitale · admission en un clic</p>
                  <p className="mt-1 text-xs leading-relaxed text-red-800">Le patient peut être pris en charge immédiatement sous l’identité provisoire « Patient non identifié ». Le dossier sera complété après stabilisation.</p>
                  <button type="button" onClick={admissionVitale} disabled={soumission} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"><Siren size={15} />{soumission ? 'Admission…' : 'Admettre sans dossier complet'}</button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="admission-nom" className="mb-2 block text-sm font-semibold text-slate-700">
                    Nom
                  </label>
                  <input
                    required
                    maxLength={100}
                    id="admission-nom"
                    value={formulaire.nom_patient}
                    onChange={(event) => fixerFormulaire({ ...formulaire, nom_patient: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10"
                    placeholder="Ex. RAKOTO"
                  />
                </div>
                <div>
                  <label htmlFor="admission-prenoms" className="mb-2 block text-sm font-semibold text-slate-700">
                    Prénoms
                  </label>
                  <input
                    autoFocus
                    required
                    maxLength={150}
                    id="admission-prenoms"
                    value={formulaire.prenoms_patient}
                    onChange={(event) => fixerFormulaire({ ...formulaire, prenoms_patient: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10"
                    placeholder="Ex. Jean"
                  />
                </div>
              </div>

              {litSelectionne.categorie === 'salle_septique' && (
                <div>
                  <label htmlFor="admission-motif-infectieux" className="mb-2 block text-sm font-semibold text-slate-700">Motif infectieux <span className="text-red-600">Obligatoire</span></label>
                  <input required maxLength={255} id="admission-motif-infectieux" value={formulaire.motif_infectieux} onChange={(event) => fixerFormulaire({ ...formulaire, motif_infectieux: event.target.value })} placeholder="Ex. BMR, COVID-19, tuberculose…" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10" />
                  <p className="mt-1.5 text-xs text-slate-500">Le lit sera bloqué pendant 2 heures pour bionettoyage terminal après la sortie.</p>
                </div>
              )}
              {litSelectionne.categorie === 'vip' && statistiques.occupes < 19 && (
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-slate-700">
                  <input type="checkbox" required checked={formulaire.facturation_vip_validee} onChange={(event) => fixerFormulaire({ ...formulaire, facturation_vip_validee: event.target.checked })} className="mt-1 accent-violet-700" />
                  <span><strong className="block text-violet-950">Validation de facturation spécifique</strong>Je confirme que la facturation VIP est validée avant attribution.</span>
                </label>
              )}
              {litSelectionne.categorie === 'vip' && statistiques.occupes >= 19 && (
                <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">Plan Blanc : dérogation automatique de facturation, l’hôpital ayant atteint au moins 19 lits occupés.</p>
              )}

              <div>
                <label htmlFor="admission-motif" className="mb-2 block text-sm font-semibold text-slate-700">
                  Motif d’attribution du lit <span className="ml-1 text-xs font-medium text-red-600">Obligatoire</span>
                </label>
                <textarea
                  id="admission-motif"
                  required
                  maxLength={2000}
                  rows="3"
                  value={formulaire.motif_admission}
                  onChange={(event) => fixerFormulaire({ ...formulaire, motif_admission: event.target.value })}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10"
                  placeholder="Précisez le motif de l’admission…"
                />
              </div>

              {erreurAction && (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
                  {erreurAction}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => fixerLitSelectionne(null)}
                  className="rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={soumission || !peutGererLits}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1F7A8C] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1F7A8C]/20 transition-all duration-200 hover:bg-[#186575] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {soumission && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Confirmer l'admission</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}