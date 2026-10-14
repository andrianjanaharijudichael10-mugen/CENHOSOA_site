import { useEffect, useMemo, useState } from 'react';
import {
  Activity, Ambulance, ArrowRight, BedDouble, Check, Clock3, ImagePlus,
  LayoutDashboard, LogOut, Pencil, Plus, RefreshCw, Search, ShieldCheck,
  Stethoscope, ToggleLeft, ToggleRight, Trash2, Users, X,
} from 'lucide-react';
import {
  creerAmbulance, creerComptePersonnel, creerService, listerAmbulances,
  listerLits, listerLitsUrgenceDisponibles, listerMissionsAmbulances, listerTousServices,
  listerUtilisateurs, modifierMotDePasse, modifierService, modifierStatutCompte,
  obtenirTokenStocke,
  obtenirStatistiquesRendezVous,
  reinitialiserMotDePassePersonnel,
  supprimerAmbulance, supprimerComptePersonnel, supprimerService, televerserPhotoResponsableService,
} from '../services/api';
import TableauDeBordLits from './TableauDeBordLits';
import StatistiquesSuperAdmin from './StatistiquesSuperAdmin';
import logoCenhosoa from '../assets/logo/logo.jpeg';
import { StylesEspace, Compteur, BandeauPage, BTN_CLAIR, BTN_VERRE } from './StylesEspace';
import { ecouterDonneesModifiees } from '../services/tempsReel';

const ONGLETS = [
  { id: 'resume', libelle: 'Vue d’ensemble', icone: LayoutDashboard },
  { id: 'comptes', libelle: 'Comptes utilisateurs', icone: Users },
  { id: 'services', libelle: 'Services hospitaliers', icone: Stethoscope },
  { id: 'ambulances', libelle: 'Flotte ambulances', icone: Ambulance },
  { id: 'lits', libelle: 'Lits d’urgence', icone: BedDouble },
  { id: 'statistiques', libelle: 'Statistiques', icone: Activity },
];

const ROLES_PERSONNEL = [
  ['secretaire', 'Secrétaire'],
  ['regulateur_ambulance', 'Régulateur ambulance'],
  ['medecin', 'Médecin'],
  ['major', 'Major'],
  ['major_de_garde', 'Major de garde'],
  ['chef_division_auto', 'Chef Division Auto'],
  ['chef_sim', 'Chef SIM'],
];

const ROLES_CREATION = [
  ...ROLES_PERSONNEL,
  ['superadmin', 'Super administrateur'],
];

const FORMULAIRE_PERSONNEL_VIDE = {
  mot_de_passe: '', role: 'secretaire', nom: '', prenoms: '',
  matricule: '', service: '',
};

const FORMULAIRE_SERVICE_VIDE = {
  nom: '', description: '', responsable: '', photo_responsable_url: '',
  horaires: '', localisation: '', telephone: '',
};

function afficherDate(date) {
  return date
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
    : 'Jamais connecté';
}

function nomUtilisateur(utilisateur) {
  const personne = utilisateur.personnel || utilisateur.patient;
  return personne ? `${personne.prenoms} ${personne.nom}`.trim() : 'Compte administrateur';
}

function etiquetteRole(role) {
  return ROLES_CREATION.find(([valeur]) => valeur === role)?.[1] || 'Patient';
}

function champ(className = '') {
  return `mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10 ${className}`;
}

export default function SuperAdmin({ profil, onDeconnexion }) {
  const [onglet, fixerOnglet] = useState('resume');
  const [utilisateurs, fixerUtilisateurs] = useState([]);
  const [services, fixerServices] = useState([]);
  const [ambulances, fixerAmbulances] = useState([]);
  const [missions, fixerMissions] = useState([]);
  const [litsDisponibles, fixerLitsDisponibles] = useState([]);
  const [lits, fixerLits] = useState([]);
  const [statistiquesRendezVous, fixerStatistiquesRendezVous] = useState(null);
  const [chargement, fixerChargement] = useState(true);
  const [rechargement, fixerRechargement] = useState(0);
  const [erreur, fixerErreur] = useState('');
  const [succes, fixerSucces] = useState('');
  const [recherche, fixerRecherche] = useState('');
  const [formulaireCompte, fixerFormulaireCompte] = useState(null);
  const [formulaireMotDePasse, fixerFormulaireMotDePasse] = useState(null);
  const [personnelSelectionne, fixerPersonnelSelectionne] = useState(null);
  const [formulaireMotDePassePersonnel, fixerFormulaireMotDePassePersonnel] = useState({
    nouveau_mot_de_passe: '',
    confirmation: '',
  });
  const [formulaireService, fixerFormulaireService] = useState(null);
  const [photoService, fixerPhotoService] = useState(null);
  const [enregistrement, fixerEnregistrement] = useState(false);

  const token = obtenirTokenStocke();
  const nomAdmin = [profil?.personnel?.prenoms, profil?.personnel?.nom].filter(Boolean).join(' ') || profil?.identifiant || 'SuperAdmin';
  const servicesActifs = services.filter((service) => service.est_actif);

  useEffect(() => {
    let actif = true;
    async function chargerTableau() {
      fixerChargement(true);
      try {
        const [comptes, listeServices, flotte, courses, litsUrgence, inventaireLits, statistiquesRdv] = await Promise.all([
          listerUtilisateurs(token),
          listerTousServices(token),
          listerAmbulances(token),
          listerMissionsAmbulances(token),
          listerLitsUrgenceDisponibles(token),
          listerLits(token),
          obtenirStatistiquesRendezVous(token),
        ]);
        if (!actif) return;
        fixerUtilisateurs(comptes);
        fixerServices(listeServices);
        fixerAmbulances(flotte);
        fixerMissions(courses);
        fixerLitsDisponibles(litsUrgence);
        fixerLits(inventaireLits);
        fixerStatistiquesRendezVous(statistiquesRdv);
        fixerErreur('');
      } catch (err) {
        if (actif) fixerErreur(err.message || 'Impossible de charger les données d’administration.');
      } finally {
        if (actif) fixerChargement(false);
      }
    }
    chargerTableau();
    return () => { actif = false; };
  }, [token, rechargement]);

  useEffect(() => ecouterDonneesModifiees(
    ['administration', 'ambulances', 'dossiers', 'informations', 'lits', 'rendez-vous', 'services'],
    () => fixerRechargement((precedent) => precedent + 1),
  ), []);

  const missionsActives = useMemo(
    () => missions.filter((mission) => mission.statut === 'en_cours'),
    [missions],
  );
  const comptesFiltres = useMemo(() => {
    const saisie = recherche.trim().toLocaleLowerCase('fr');
    if (!saisie) return utilisateurs;
    return utilisateurs.filter((utilisateur) => (
      `${nomUtilisateur(utilisateur)} ${utilisateur.identifiant} ${utilisateur.role} ${utilisateur.personnel?.matricule || ''}`
        .toLocaleLowerCase('fr')
        .includes(saisie)
    ));
  }, [recherche, utilisateurs]);

  const annoncerSucces = (message) => {
    fixerErreur('');
    fixerSucces(message);
    fixerRechargement((valeur) => valeur + 1);
  };

  const gererCreationCompte = async (evenement) => {
    evenement.preventDefault();
    fixerEnregistrement(true);
    fixerErreur('');
    fixerSucces('');
    try {
      await creerComptePersonnel(token, formulaireCompte);
      fixerFormulaireCompte(null);
      annoncerSucces('Le compte du membre du personnel a été créé.');
    } catch (err) {
      fixerErreur(err.message || 'Impossible de créer ce compte.');
    } finally {
      fixerEnregistrement(false);
    }
  };

  const basculerCompte = async (utilisateur) => {
    fixerErreur('');
    fixerSucces('');
    try {
      await modifierStatutCompte(token, utilisateur.id, !utilisateur.est_actif);
      annoncerSucces(`Le compte de ${nomUtilisateur(utilisateur)} a été ${utilisateur.est_actif ? 'désactivé' : 'activé'}.`);
    } catch (err) {
      fixerErreur(err.message || 'Impossible de modifier ce compte.');
    }
  };

  const supprimerCompte = async (utilisateur) => {
    if (!ROLES_PERSONNEL.some(([role]) => role === utilisateur.role)) return;
    if (utilisateur.id === profil?.id) {
      fixerErreur('Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    if (!window.confirm(`Supprimer définitivement le compte de ${nomUtilisateur(utilisateur)} (${etiquetteRole(utilisateur.role)}) ? Cette action est irréversible.`)) return;

    fixerErreur('');
    fixerSucces('');
    try {
      await supprimerComptePersonnel(token, utilisateur.id);
      annoncerSucces(`Le compte de ${nomUtilisateur(utilisateur)} a été supprimé.`);
    } catch (err) {
      fixerErreur(err.message || 'Impossible de supprimer ce compte.');
    }
  };

  const gererChangementMotDePasse = async (evenement) => {
    evenement.preventDefault();
    if (formulaireMotDePasse.nouveau_mot_de_passe !== formulaireMotDePasse.confirmation) {
      fixerErreur('La confirmation du nouveau mot de passe ne correspond pas.');
      return;
    }
    fixerErreur('');
    fixerSucces('');
    fixerEnregistrement(true);
    try {
      await modifierMotDePasse(token, {
        mot_de_passe_actuel: formulaireMotDePasse.mot_de_passe_actuel,
        nouveau_mot_de_passe: formulaireMotDePasse.nouveau_mot_de_passe,
      });
      fixerFormulaireMotDePasse(null);
      annoncerSucces('Le mot de passe de votre compte SuperAdmin a été modifié.');
    } catch (err) {
      fixerErreur(err.message || 'Impossible de modifier le mot de passe.');
    } finally {
      fixerEnregistrement(false);
    }
  };

  const gererReinitialisationMotDePassePersonnel = async (evenement) => {
    evenement.preventDefault();
    if (formulaireMotDePassePersonnel.nouveau_mot_de_passe !== formulaireMotDePassePersonnel.confirmation) {
      fixerErreur('La confirmation du nouveau mot de passe ne correspond pas.');
      return;
    }
    fixerErreur('');
    fixerSucces('');
    fixerEnregistrement(true);
    try {
      await reinitialiserMotDePassePersonnel(
        token,
        personnelSelectionne.id,
        formulaireMotDePassePersonnel.nouveau_mot_de_passe,
      );
      const nom = nomUtilisateur(personnelSelectionne);
      fixerPersonnelSelectionne(null);
      fixerFormulaireMotDePassePersonnel({ nouveau_mot_de_passe: '', confirmation: '' });
      annoncerSucces(`Le mot de passe de ${nom} a été réinitialisé.`);
    } catch (err) {
      fixerErreur(err.message || 'Impossible de réinitialiser le mot de passe du personnel.');
    } finally {
      fixerEnregistrement(false);
    }
  };

  const preparerService = (service = null) => {
    fixerErreur('');
    fixerSucces('');
    fixerPhotoService(null);
    fixerFormulaireService(service
      ? { ...service }
      : { ...FORMULAIRE_SERVICE_VIDE, est_actif: true });
  };

  const gererEnregistrementService = async (evenement) => {
    evenement.preventDefault();
    fixerEnregistrement(true);
    fixerErreur('');
    fixerSucces('');
    let nouveauServiceCree = false;
    try {
      const { id, est_actif: actif, ...champsService } = formulaireService;
      const service = id
        ? await modifierService(token, id, { ...champsService, est_actif: actif })
        : await creerService(token, champsService);
      if (!id) {
        nouveauServiceCree = true;
        fixerFormulaireService({ ...formulaireService, id: service.id });
      }
      if (photoService) {
        await televerserPhotoResponsableService(token, service.id, photoService);
      }
      fixerFormulaireService(null);
      fixerPhotoService(null);
      annoncerSucces(id ? 'Le service a été mis à jour.' : 'Le service a été ajouté.');
    } catch (err) {
      fixerErreur(nouveauServiceCree
        ? `Le service a été créé, mais sa photo n’a pas été téléversée. Réessayez l’enregistrement : ${err.message}`
        : err.message || 'Impossible d’enregistrer le service.');
    } finally {
      fixerEnregistrement(false);
    }
  };

  const basculerService = async (service) => {
    fixerErreur('');
    fixerSucces('');
    try {
      await modifierService(token, service.id, { est_actif: !service.est_actif });
      annoncerSucces(`Le service ${service.est_actif ? 'a été masqué du site public' : 'est de nouveau publié'}.`);
    } catch (err) {
      fixerErreur(err.message || 'Impossible de modifier la visibilité du service.');
    }
  };

  const effacerService = async (service) => {
    if (!window.confirm(`Supprimer définitivement le service « ${service.nom} » ?`)) return;
    fixerErreur('');
    fixerSucces('');
    try {
      await supprimerService(token, service.id);
      annoncerSucces('Le service a été supprimé.');
    } catch (err) {
      fixerErreur(err.message || 'Impossible de supprimer le service.');
    }
  };

  const effacerAmbulance = async (ambulance) => {
    if (!window.confirm(`Supprimer l’ambulance ${ambulance.code} ?`)) return;
    fixerErreur('');
    fixerSucces('');
    try {
      await supprimerAmbulance(token, ambulance.id);
      annoncerSucces(`L’ambulance ${ambulance.code} a été supprimée.`);
    } catch (err) {
      fixerErreur(err.message || 'Impossible de supprimer cette ambulance.');
    }
  };

  const gererCreationAmbulance = async (evenement) => {
    evenement.preventDefault();
    fixerEnregistrement(true);
    fixerErreur('');
    fixerSucces('');
    const formulaire = evenement.currentTarget;
    const donnees = new FormData(formulaire);
    try {
      await creerAmbulance(token, {
        numero: donnees.get('numero').trim(),
        est_principale: donnees.get('est_principale') === 'true',
      });
      formulaire.reset();
      annoncerSucces('L’ambulance a été ajoutée à la flotte.');
    } catch (err) {
      fixerErreur(err.message || 'Impossible d’ajouter cette ambulance.');
    } finally {
      fixerEnregistrement(false);
    }
  };

  return (
    <div className="espace min-h-screen bg-[#F4F2EE] font-body text-[#1E2333]">
      <StylesEspace />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-[#0A2233] via-[#0F3D52] to-[#0A2233] text-white shadow-lg shadow-[#0A2233]/20 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5">
              <img src={logoCenhosoa} alt="CENHOSOA" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7FD1CB]">CENHOSOA · Administration</p>
              <h1 className="truncate text-lg font-light text-white sm:text-xl">Espace SuperAdmin</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden text-right sm:block"><p className="text-sm font-bold text-white">{nomAdmin}</p><p className="text-[11px] text-[#7FD1CB]">Super administrateur</p></div>
            <button type="button" onClick={onDeconnexion} title="Se déconnecter" aria-label="Se déconnecter" className="flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-red-600 text-white transition hover:bg-red-700"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-7 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-7 lg:px-10 lg:py-8">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <nav aria-label="Administration" className="flex gap-2 overflow-x-auto rounded-2xl border border-black/[0.06] bg-white p-2 shadow-sm lg:flex-col">
            {ONGLETS.map(({ id, libelle, icone: Icone }) => (
              <button key={id} type="button" aria-pressed={onglet === id} onClick={() => {
                fixerErreur('');
                fixerSucces('');
                fixerOnglet(id);
              }} className={`group flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C] focus-visible:ring-offset-2 ${onglet === id ? 'bg-[#0F3D52] text-white shadow-md shadow-[#0F3D52]/15' : 'text-slate-600 hover:bg-[#F4F7F6] hover:text-[#0A2233]'}`}>
                <Icone size={17} className={onglet === id ? 'text-[#7FD1CB]' : 'text-slate-400 transition-colors group-hover:text-[#1F7A8C]'} />{libelle}
              </button>
            ))}
          </nav>
          <div className="mt-4 hidden rounded-2xl border border-black/[0.06] bg-white p-4 text-xs leading-relaxed text-slate-500 lg:block">
            <div className="mb-2 flex items-center gap-2 font-bold text-[#0F3D52]"><ShieldCheck size={15} /> Accès sécurisé</div>
            Les modifications de comptes, services et flotte sont réservées aux administrateurs.
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          {onglet !== 'lits' && <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1F7A8C]">Pilotage du centre</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#0A2233]">{ONGLETS.find((item) => item.id === onglet)?.libelle}</h2></div>
            <button type="button" onClick={() => fixerRechargement((valeur) => valeur + 1)} disabled={chargement} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D5DEE0] bg-white px-3 text-xs font-bold text-[#0F3D52] transition hover:border-[#1F7A8C]/30 hover:bg-[#EAF1F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C] disabled:cursor-wait disabled:opacity-50"><RefreshCw size={15} className={chargement ? 'animate-spin' : ''} /> Actualiser</button>
          </div>}

          {onglet !== 'lits' && erreur && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</div>}
          {onglet !== 'lits' && succes && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={16} />{succes}</div>}
          {chargement && onglet !== 'lits' && <p className="rounded-2xl border border-black/[0.06] bg-white p-5 text-sm text-slate-500">Chargement des données d’administration…</p>}

          {onglet === 'lits' && <TableauDeBordLits profil={profil} embedded />}
          {!chargement && onglet === 'statistiques' && (
            <StatistiquesSuperAdmin
              utilisateurs={utilisateurs}
              ambulances={ambulances}
              missions={missions}
              lits={lits}
              statistiquesRendezVous={statistiquesRendezVous}
            />
          )}
          {!chargement && onglet === 'resume' && (
            <section className="apparition space-y-5">
              <BandeauPage
                etiquette="Administration · CENHOSOA"
                titre={`Bonjour, ${nomAdmin}.`}
                accent="Pilotez le centre."
                sousTitre="Comptes, services publiés, flotte d’ambulances et lits d’urgence : tout se gère d’ici."
                actions={<>
                  <button type="button" className={BTN_CLAIR} onClick={() => { fixerOnglet('comptes'); fixerFormulaireCompte({ ...FORMULAIRE_PERSONNEL_VIDE }); }}><Plus size={16} /> Créer un compte</button>
                  <button type="button" className={BTN_VERRE} onClick={() => { fixerOnglet('services'); preparerService(); }}><Stethoscope size={16} /> Ajouter un service</button>
                  <button type="button" className={BTN_VERRE} onClick={() => fixerOnglet('ambulances')}><Ambulance size={16} /> Flotte</button>
                </>}
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { titre: 'Comptes actifs', valeur: utilisateurs.filter((u) => u.est_actif).length, detail: `${utilisateurs.length} au total`, icone: Users, couleur: 'text-blue-700 bg-blue-50' },
                  { titre: 'Services publiés', valeur: services.filter((service) => service.est_actif).length, detail: `${services.length} répertoriés`, icone: Stethoscope, couleur: 'text-violet-700 bg-violet-50' },
                  { titre: 'Ambulances disponibles', valeur: ambulances.filter((a) => a.statut === 'disponible').length, detail: `${ambulances.length} véhicules`, icone: Ambulance, couleur: 'text-emerald-700 bg-emerald-50' },
                  { titre: 'Missions en cours', valeur: missionsActives.length, detail: `${missions.length} missions enregistrées`, icone: Activity, couleur: 'text-amber-700 bg-amber-50' },
                ].map(({ titre, valeur, detail, icone: Icone, couleur }) => (
                  <article key={titre} className="apparition rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#1F7A8C]/20 hover:shadow-lg hover:shadow-[#1F7A8C]/10 sm:p-5">
                    <div className="flex min-h-10 items-start justify-between gap-3"><span className="max-w-[12rem] text-xs font-semibold leading-relaxed text-slate-600">{titre}</span><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${couleur}`}><Icone size={18} /></span></div>
                    <p className="mt-3 text-3xl font-semibold tabular-nums text-[#0A2233]"><Compteur valeur={valeur} /></p><p className="mt-1 text-xs text-slate-500">{detail}</p>
                  </article>
                ))}
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <section className="apparition rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-[#5B7480]">Suivi opérationnel</p><h3 className="mt-1 text-base font-bold text-[#0A2233]">Activité des ambulances</h3></div><Clock3 size={19} className="text-[#1F7A8C]" /></div>
                  {!missions.length ? <p className="mt-5 text-sm text-slate-500">Aucune mission enregistrée.</p> : <div className="mt-4 divide-y divide-slate-100">{missions.slice(0, 5).map((mission) => <div key={mission.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{mission.patient}</p><p className="truncate text-xs text-slate-500">{mission.ambulance_nom} · {mission.destination}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${mission.statut === 'terminee' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>{mission.statut === 'terminee' ? 'Terminée' : 'En cours'}</span></div>)}</div>}
                </section>
                <section className="apparition rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-[#5B7480]">Ressources</p><h3 className="mt-1 text-base font-bold text-[#0A2233]">État général</h3></div><Activity size={19} className="text-[#1F7A8C]" /></div>
                  <dl className="mt-4 divide-y divide-slate-100">
                    <div className="flex justify-between gap-3 py-3 text-sm"><dt className="text-slate-600">Comptes désactivés</dt><dd className="font-bold text-slate-800">{utilisateurs.filter((u) => !u.est_actif).length}</dd></div>
                    <div className="flex justify-between gap-3 py-3 text-sm"><dt className="text-slate-600">Ambulances en mission</dt><dd className="font-bold text-slate-800">{ambulances.filter((a) => a.statut !== 'disponible').length}</dd></div>
                    <div className="flex justify-between gap-3 py-3 text-sm"><dt className="text-slate-600">Lits d’urgence disponibles</dt><dd className="font-bold text-slate-800">{litsDisponibles.length}</dd></div>
                    <div className="flex justify-between gap-3 py-3 text-sm"><dt className="text-slate-600">Missions terminées</dt><dd className="font-bold text-slate-800">{missions.filter((m) => m.statut === 'terminee').length}</dd></div>
                  </dl>
                  <button type="button" onClick={() => fixerOnglet('lits')} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#1F7A8C] hover:underline">Ouvrir le tableau des lits <ArrowRight size={14} /></button>
                </section>
              </div>
            </section>
          )}

          {!chargement && onglet === 'comptes' && (
            <section className="apparition space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
                <div><h3 className="font-bold text-[#0A2233]">Comptes utilisateurs</h3><p className="mt-1 text-xs text-slate-500">{utilisateurs.length} comptes · activation et désactivation</p></div>
                <button type="button" onClick={() => fixerFormulaireCompte({ ...FORMULAIRE_PERSONNEL_VIDE })} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#1F7A8C] px-4 text-xs font-bold text-white transition hover:bg-[#186575]"><Plus size={16} /> Créer un compte</button>
              </div>
              {formulaireCompte && <form onSubmit={gererCreationCompte} className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between"><div><h3 className="font-bold text-[#0A2233]">{formulaireCompte.role === 'superadmin' ? 'Nouveau compte SuperAdmin' : 'Nouveau compte du personnel'}</h3><p className="mt-1 text-xs text-slate-500">Un mot de passe d’au moins 8 caractères est requis.</p></div><button type="button" onClick={() => fixerFormulaireCompte(null)} aria-label="Fermer" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <label className="text-xs font-semibold text-slate-600">Prénom<input required maxLength={150} value={formulaireCompte.prenoms} onChange={(e) => fixerFormulaireCompte({ ...formulaireCompte, prenoms: e.target.value })} className={champ()} /></label>
                  <label className="text-xs font-semibold text-slate-600">Nom<input required maxLength={100} value={formulaireCompte.nom} onChange={(e) => fixerFormulaireCompte({ ...formulaireCompte, nom: e.target.value })} className={champ()} /></label>
                  <label className="text-xs font-semibold text-slate-600">Matricule (identifiant de connexion)<input required maxLength={50} value={formulaireCompte.matricule} onChange={(e) => fixerFormulaireCompte({ ...formulaireCompte, matricule: e.target.value })} className={champ()} /></label>
                  <label className="text-xs font-semibold text-slate-600">Mot de passe provisoire<input type="password" minLength={8} maxLength={128} required value={formulaireCompte.mot_de_passe} onChange={(e) => fixerFormulaireCompte({ ...formulaireCompte, mot_de_passe: e.target.value })} className={champ()} /></label>
                  <label className="text-xs font-semibold text-slate-600">Rôle<select value={formulaireCompte.role} onChange={(e) => fixerFormulaireCompte({ ...formulaireCompte, role: e.target.value, service: '' })} className={champ()}>{ROLES_CREATION.map(([role, libelle]) => <option key={role} value={role}>{libelle}</option>)}</select></label>
                  {['secretaire', 'medecin'].includes(formulaireCompte.role) && <label className="text-xs font-semibold text-slate-600">
                    Service de rattachement
                    <select
                      required
                      value={formulaireCompte.service}
                      onChange={(e) => fixerFormulaireCompte({ ...formulaireCompte, service: e.target.value })}
                      className={champ()}
                    >
                      <option value="">Sélectionner un service</option>
                      {servicesActifs.map((service) => (
                        <option key={service.id} value={service.nom}>{service.nom}</option>
                      ))}
                    </select>
                    {formulaireCompte.role === 'secretaire' && (
                      <span className="mt-1 block text-[10px] font-normal text-slate-500">
                        {servicesActifs.length
                          ? 'Le compte sera rattaché au service sélectionné.'
                          : 'Ajoutez et activez un service avant de créer ce compte.'}
                      </span>
                    )}
                  </label>}
                </div>
                <div className="mt-4 flex justify-end"><button disabled={enregistrement || (['secretaire', 'medecin'].includes(formulaireCompte.role) && !servicesActifs.length)} className="h-10 rounded-full bg-[#1F7A8C] px-4 text-xs font-bold text-white disabled:opacity-50">{enregistrement ? 'Création…' : formulaireCompte.role === 'superadmin' ? 'Créer le compte SuperAdmin' : 'Créer le compte'}</button></div>
              </form>}
              {formulaireMotDePasse && <form onSubmit={gererChangementMotDePasse} className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between"><div><h3 className="font-bold text-[#0A2233]">Modifier le mot de passe SuperAdmin</h3><p className="mt-1 text-xs text-slate-500">Confirmez votre mot de passe actuel pour sécuriser cette modification.</p></div><button type="button" onClick={() => fixerFormulaireMotDePasse(null)} aria-label="Fermer" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-slate-600">Mot de passe actuel<input type="password" autoComplete="current-password" required value={formulaireMotDePasse.mot_de_passe_actuel} onChange={(e) => fixerFormulaireMotDePasse({ ...formulaireMotDePasse, mot_de_passe_actuel: e.target.value })} className={champ()} /></label>
                  <label className="text-xs font-semibold text-slate-600">Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={formulaireMotDePasse.nouveau_mot_de_passe} onChange={(e) => fixerFormulaireMotDePasse({ ...formulaireMotDePasse, nouveau_mot_de_passe: e.target.value })} className={champ()} /><span className="mt-1 block text-[10px] font-normal text-slate-500">8 caractères minimum, avec une lettre et un chiffre.</span></label>
                  <label className="text-xs font-semibold text-slate-600">Confirmer le nouveau mot de passe<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={formulaireMotDePasse.confirmation} onChange={(e) => fixerFormulaireMotDePasse({ ...formulaireMotDePasse, confirmation: e.target.value })} className={champ()} /></label>
                </div>
                <div className="mt-4 flex justify-end"><button disabled={enregistrement} className="h-10 rounded-full bg-[#1F7A8C] px-4 text-xs font-bold text-white disabled:opacity-50">{enregistrement ? 'Modification…' : 'Modifier le mot de passe'}</button></div>
              </form>}
              {personnelSelectionne && <form onSubmit={gererReinitialisationMotDePassePersonnel} className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between">
                  <div><h3 className="font-bold text-[#0A2233]">Réinitialiser le mot de passe</h3><p className="mt-1 text-xs text-slate-500">Compte concerné : {nomUtilisateur(personnelSelectionne)} · {personnelSelectionne.identifiant}</p></div>
                  <button type="button" onClick={() => fixerPersonnelSelectionne(null)} aria-label="Fermer" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={formulaireMotDePassePersonnel.nouveau_mot_de_passe} onChange={(e) => fixerFormulaireMotDePassePersonnel({ ...formulaireMotDePassePersonnel, nouveau_mot_de_passe: e.target.value })} className={champ()} /><span className="mt-1 block text-[10px] font-normal text-slate-500">8 caractères minimum, avec une lettre et un chiffre.</span></label>
                  <label className="text-xs font-semibold text-slate-600">Confirmer le nouveau mot de passe<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={formulaireMotDePassePersonnel.confirmation} onChange={(e) => fixerFormulaireMotDePassePersonnel({ ...formulaireMotDePassePersonnel, confirmation: e.target.value })} className={champ()} /></label>
                </div>
                <div className="mt-4 flex justify-end"><button disabled={enregistrement} className="h-10 rounded-full bg-[#1F7A8C] px-4 text-xs font-bold text-white disabled:opacity-50">{enregistrement ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}</button></div>
              </form>}
              <div className="flex items-center gap-2 rounded-2xl border border-black/[0.06] bg-white px-3 shadow-sm"><Search size={16} className="text-slate-400" /><input value={recherche} onChange={(e) => fixerRecherche(e.target.value)} placeholder="Rechercher un nom, identifiant, rôle ou matricule" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
              <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
                <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-[#F7F6F3] text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Utilisateur</th><th className="px-4 py-3">Rôle</th><th className="px-4 py-3">Matricule / service</th><th className="px-4 py-3">Dernière connexion</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{comptesFiltres.map((utilisateur) => {
                    const estPersonnel = ROLES_PERSONNEL.some(([role]) => role === utilisateur.role);
                    return (
                      <tr key={utilisateur.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm ${utilisateur.est_actif ? 'bg-[#0A2233] text-[#7FD1CB]' : 'bg-slate-200 text-slate-500'}`}>{nomUtilisateur(utilisateur).charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="font-semibold text-slate-800">{nomUtilisateur(utilisateur)}</p><p className="text-xs text-slate-500">{utilisateur.identifiant}</p><p className="mt-0.5 text-[10px] text-slate-400">Créé le {afficherDate(utilisateur.date_creation)}</p></div></div></td>
                        <td className="px-4 py-3 text-slate-600">{etiquetteRole(utilisateur.role)}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{utilisateur.personnel?.matricule || utilisateur.personnel?.service || utilisateur.patient?.telephone || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{afficherDate(utilisateur.derniere_connexion)}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${utilisateur.est_actif ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{utilisateur.est_actif ? 'Actif' : 'Désactivé'}</span></td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-1">
                            {(estPersonnel || ['patient', 'superadmin'].includes(utilisateur.role)) && utilisateur.id !== profil?.id && (
                              <button type="button" onClick={() => { fixerErreur(''); fixerSucces(''); fixerPersonnelSelectionne(utilisateur); fixerFormulaireMotDePassePersonnel({ nouveau_mot_de_passe: '', confirmation: '' }); }} className="rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100">
                                Réinitialiser mot de passe
                              </button>
                            )}
                            <button type="button" onClick={() => basculerCompte(utilisateur)} disabled={utilisateur.id === profil?.id} title={utilisateur.id === profil?.id ? 'Votre propre compte ne peut pas être désactivé' : undefined} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-[#1F7A8C] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40">
                              {utilisateur.est_actif ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}{utilisateur.est_actif ? 'Désactiver' : 'Activer'}
                            </button>
                            {estPersonnel && (
                              <button
                                type="button"
                                onClick={() => supprimerCompte(utilisateur)}
                                disabled={utilisateur.id === profil?.id}
                                title={utilisateur.id === profil?.id ? 'Votre propre compte ne peut pas être supprimé' : 'Supprimer le compte personnel'}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Trash2 size={15} /> Supprimer
                              </button>
                            )}
                            {utilisateur.id === profil?.id && utilisateur.role === 'superadmin' && <button type="button" onClick={() => { fixerErreur(''); fixerSucces(''); fixerFormulaireMotDePasse({ mot_de_passe_actuel: '', nouveau_mot_de_passe: '', confirmation: '' }); }} className="rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100">Mot de passe</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table></div>
                {!comptesFiltres.length && <p className="p-8 text-center text-sm text-slate-500">Aucun compte ne correspond à votre recherche.</p>}
              </div>
            </section>
          )}

          {!chargement && onglet === 'services' && (
            <section className="apparition space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
                <div><h3 className="font-bold text-[#0A2233]">Services hospitaliers</h3><p className="mt-1 text-xs text-slate-500">Coordonnées, responsable, photo et publication sur le site public</p></div>
                <button type="button" onClick={() => preparerService()} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#1F7A8C] px-4 text-xs font-bold text-white transition hover:bg-[#186575]"><Plus size={16} /> Ajouter un service</button>
              </div>
              {formulaireService && <form onSubmit={gererEnregistrementService} className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between"><div><h3 className="font-bold text-[#0A2233]">{formulaireService.id ? 'Modifier le service' : 'Ajouter un service'}</h3><p className="mt-1 text-xs text-slate-500">La photo du responsable est facultative · JPG, PNG ou WEBP · 5 Mo maximum</p></div><button type="button" onClick={() => fixerFormulaireService(null)} aria-label="Fermer" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <label className="text-xs font-semibold text-slate-600">Nom du service<input required maxLength={100} value={formulaireService.nom} onChange={(e) => fixerFormulaireService({ ...formulaireService, nom: e.target.value })} className={champ()} /></label>
                  <label className="text-xs font-semibold text-slate-600">Responsable<input maxLength={150} value={formulaireService.responsable || ''} onChange={(e) => fixerFormulaireService({ ...formulaireService, responsable: e.target.value })} className={champ()} /></label>
                  <label className="text-xs font-semibold text-slate-600">Téléphone de contact<input type="tel" maxLength={20} value={formulaireService.telephone || ''} onChange={(e) => fixerFormulaireService({ ...formulaireService, telephone: e.target.value })} className={champ()} /></label>
                  <label className="text-xs font-semibold text-slate-600">Localisation<input maxLength={150} value={formulaireService.localisation || ''} onChange={(e) => fixerFormulaireService({ ...formulaireService, localisation: e.target.value })} className={champ()} /></label>
                  <label className="text-xs font-semibold text-slate-600">Horaires<input maxLength={255} value={formulaireService.horaires || ''} onChange={(e) => fixerFormulaireService({ ...formulaireService, horaires: e.target.value })} className={champ()} /></label>
                  <label className="text-xs font-semibold text-slate-600">Photo du responsable<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(e) => fixerPhotoService(e.target.files?.[0] || null)} className="mt-1.5 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#edf2ff] file:px-3 file:py-2 file:font-bold file:text-[#1F7A8C]" />{photoService && <span className="mt-1 block truncate text-[11px] text-slate-500">{photoService.name}</span>}</label>
                  <label className="text-xs font-semibold text-slate-600 sm:col-span-2 xl:col-span-3">Description<textarea rows={3} value={formulaireService.description || ''} onChange={(e) => fixerFormulaireService({ ...formulaireService, description: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10" /></label>
                  {formulaireService.id && <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={formulaireService.est_actif} onChange={(e) => fixerFormulaireService({ ...formulaireService, est_actif: e.target.checked })} /> Publier sur le site public</label>}
                </div>
                <div className="mt-4 flex justify-end"><button disabled={enregistrement} className="h-10 rounded-full bg-[#1F7A8C] px-4 text-xs font-bold text-white disabled:opacity-50">{enregistrement ? 'Enregistrement…' : 'Enregistrer le service'}</button></div>
              </form>}
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {services.map((service) => <article key={service.id} className="apparition transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1F7A8C]/10 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
                  <div className="flex gap-4 p-4">
                    {service.photo_responsable_url ? <img src={service.photo_responsable_url} alt={service.responsable ? `Photo de ${service.responsable}` : `Responsable de ${service.nom}`} className="h-16 w-16 shrink-0 rounded-2xl object-cover" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#edf2ff] text-[#1F7A8C]"><ImagePlus size={22} /></div>}
                    <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="truncate font-bold text-[#0A2233]">{service.nom}</h3><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${service.est_actif ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{service.est_actif ? 'Publié' : 'Masqué'}</span></div><p className="mt-1 truncate text-xs text-slate-500">{service.responsable || 'Responsable non renseigné'}</p><p className="mt-1 text-xs text-slate-500">{service.telephone || 'Aucun téléphone'}</p></div>
                  </div>
                  {service.description && <p className="px-4 pb-3 text-xs leading-relaxed text-slate-600">{service.description}</p>}
                  <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 px-4 py-3">
                    <button type="button" onClick={() => basculerService(service)} className="text-xs font-bold text-slate-600 hover:text-[#1F7A8C]">{service.est_actif ? 'Masquer du site' : 'Publier'}</button>
                    <div className="flex gap-1"><button type="button" onClick={() => preparerService(service)} title="Modifier" className="rounded-lg p-2 text-[#1F7A8C] hover:bg-blue-50"><Pencil size={15} /></button><button type="button" onClick={() => effacerService(service)} title="Supprimer définitivement" className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button></div>
                  </div>
                </article>)}
              </div>
              {!services.length && <p className="rounded-2xl border border-dashed border-[#D5DEE0] bg-white p-10 text-center text-sm text-slate-500">Aucun service. Ajoutez votre premier service hospitalier.</p>}
            </section>
          )}

          {!chargement && onglet === 'ambulances' && (
            <section className="apparition space-y-4">
              <form onSubmit={gererCreationAmbulance} className="grid gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
                <label className="text-xs font-semibold text-slate-600">Numéro d’immatriculation / code<input name="numero" required maxLength={20} placeholder="AMB-05" className={champ()} /></label>
                <label className="text-xs font-semibold text-slate-600">Type<select name="est_principale" className={champ()}><option value="false">Ambulance secondaire</option><option value="true">Ambulance principale</option></select></label>
                <button disabled={enregistrement} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#1F7A8C] px-4 text-xs font-bold text-white transition hover:bg-[#186575] disabled:opacity-50"><Plus size={16} /> Ajouter</button>
              </form>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {ambulances.map((ambulance) => {
                  const lieeAMission = missions.some((mission) => mission.ambulance_id === ambulance.id);
                  const estDisponible = ambulance.statut === 'disponible';
                  return <article key={ambulance.id} className="apparition transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1F7A8C]/10 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${estDisponible ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}><Ambulance size={20} /></span><div><h3 className="font-bold text-[#0A2233]">{ambulance.nom}</h3><p className="text-xs text-slate-500">{ambulance.code}</p></div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${estDisponible ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{estDisponible ? 'Disponible' : 'En mission'}</span></div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs text-slate-500">{ambulance.type === 'principale' ? 'Ambulance principale' : 'Ambulance secondaire'}</span><button type="button" onClick={() => effacerAmbulance(ambulance)} disabled={!estDisponible || lieeAMission} title={lieeAMission ? 'Une ambulance liée à des missions ne peut pas être supprimée' : !estDisponible ? 'Impossible de supprimer un véhicule en mission' : 'Supprimer cette ambulance'} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={14} /> Supprimer</button></div>
                  </article>;
                })}
              </div>
              {!ambulances.length && <p className="rounded-2xl border border-dashed border-[#D5DEE0] bg-white p-10 text-center text-sm text-slate-500">La flotte est vide. Ajoutez une ambulance ci-dessus.</p>}
              <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><ShieldCheck size={15} className="mt-0.5 shrink-0" />Une ambulance liée à une mission ou actuellement en service ne peut pas être supprimée : son historique opérationnel est conservé.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
