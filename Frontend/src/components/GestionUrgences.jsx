import { useEffect, useState } from 'react';
import {
  Ambulance, LogOut, Menu, RefreshCw, X,
} from 'lucide-react';
import GestionAmbulances from './GestionAmbulances';
import TableauDeBordLits from './TableauDeBordLits';
import {
  listerAmbulances,
  listerLits,
  listerMissionsAmbulances,
  obtenirTokenStocke,
} from '../services/api';
import { StylesEspace, BandeauPage } from './StylesEspace';
import { ecouterDonneesModifiees } from '../services/tempsReel';
import logoCenhosoa from '../assets/logo/logo.jpeg';
import { GraphiquesUrgences } from './StatistiquesSuperAdmin';

const ROLES_AMBULANCES = ['major', 'regulateur_ambulance', 'chef_division_auto', 'chef_sim'];
const ROLES_GESTION_URGENCES = [...ROLES_AMBULANCES, 'major_de_garde'];

const ONGLETS = [
  { id: 'accueil', libelle: 'Accueil' },
  { id: 'urgence', libelle: 'Urgence' },
];

export default function GestionUrgences({ profil, onDeconnexion }) {
  const [ongletActif, setOngletActif] = useState('accueil');
  const [vueUrgence, setVueUrgence] = useState('lits');
  const [lits, setLits] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [missions, setMissions] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [actualisation, setActualisation] = useState(0);
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);

  const peutGererUrgences = ROLES_GESTION_URGENCES.includes(profil?.role);
  const nomUtilisateur = [profil?.personnel?.prenoms, profil?.personnel?.nom].filter(Boolean).join(' ');
  const token = obtenirTokenStocke();

  useEffect(() => {
    let actif = true;
    const chargerStatistiques = async () => {
      try {
        const [donneesLits, donneesAmbulances, donneesMissions] = await Promise.all([
          listerLits(token),
          listerAmbulances(token),
          listerMissionsAmbulances(token),
        ]);
        if (!actif) return;
        setLits(donneesLits);
        setAmbulances(donneesAmbulances);
        setMissions(donneesMissions);
        setErreur('');
      } catch (err) {
        if (actif) setErreur(err.message || 'Impossible de charger les statistiques des urgences.');
      } finally {
        if (actif) setChargement(false);
      }
    };

    void chargerStatistiques();
    const intervalle = window.setInterval(() => {
      if (document.visibilityState === 'visible') void chargerStatistiques();
    }, 30000);
    const desabonner = ecouterDonneesModifiees(
      ['ambulances', 'lits'],
      () => { void chargerStatistiques(); },
    );

    return () => {
      actif = false;
      window.clearInterval(intervalle);
      desabonner();
    };
  }, [actualisation, token]);

  if (!peutGererUrgences) return null;

  const litsLibres = lits.filter((lit) => lit.statut === 'libre').length;
  const litsOccupes = lits.filter((lit) => lit.statut === 'occupe').length;
  const ambulancesDisponibles = ambulances.filter((ambulance) => ambulance.statut === 'disponible').length;
  const missionsActives = missions.filter((mission) => (
    !['terminee', 'annulee', 'en_attente_confirmation'].includes(mission.statut)
  )).length;
  const statistiques = [
    { libelle: 'Lits libres', valeur: chargement ? '—' : litsLibres },
    { libelle: 'Lits occupés', valeur: chargement ? '—' : litsOccupes },
    { libelle: 'Ambulances disponibles', valeur: chargement ? '—' : ambulancesDisponibles },
    { libelle: 'Missions en cours', valeur: chargement ? '—' : missionsActives },
  ];

  return (
    <div className="espace min-h-screen bg-[#F4F2EE] font-body text-[#1E2333]">
      <StylesEspace />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A2233] text-white shadow-lg shadow-[#0A2233]/20">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-6 lg:h-20 lg:flex-nowrap lg:px-8 lg:py-0">
          <div className="group flex min-w-0 max-w-full items-center space-x-2.5 sm:space-x-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-white p-1.5 shadow-md shadow-black/20 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2 sm:h-14 sm:w-14">
              <img src={logoCenhosoa} alt="CENHOSOA" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <span className="block text-xl font-display font-light tracking-tight text-white">CENHOSOA</span>
              <h1 className="block truncate text-[10px] font-mono font-semibold uppercase tracking-widest text-[#7FD1CB] sm:text-[11px]">
                Espace opérationnel · Urgences
              </h1>
            </div>
          </div>

          <nav aria-label="Navigation des urgences" className="hidden items-center gap-8 text-sm font-semibold text-white/70 lg:flex">
            {ONGLETS.map(({ id, libelle }) => {
              const actif = ongletActif === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setOngletActif(id)}
                  aria-current={actif ? 'page' : undefined}
                  className={`group relative py-1 font-body transition-colors hover:text-white ${
                    actif ? 'text-[#7FD1CB]' : 'text-white/70'
                  }`}
                >
                  {libelle}
                  <span className={`absolute -bottom-1 left-0 h-[2px] bg-gradient-to-r from-[#1F7A8C] to-[#7FD1CB] transition-all duration-300 ${
                    actif ? 'w-full' : 'w-0 group-hover:w-full'
                  }`} />
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {nomUtilisateur && (
              <div className="hidden border-r border-white/15 pr-4 text-right sm:block">
                <p className="max-w-48 truncate text-sm font-bold text-white">{nomUtilisateur}</p>
                <p className="text-[11px] text-[#7FD1CB]">{profil?.role?.replaceAll('_', ' ')}</p>
              </div>
            )}
            <button
              type="button"
              onClick={onDeconnexion}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-red-600 text-white transition hover:bg-red-700 md:flex"
            >
              <LogOut size={18} />
            </button>
            <button
              type="button"
              onClick={() => setMenuMobileOuvert((ouvert) => !ouvert)}
              aria-label={menuMobileOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuMobileOuvert}
              aria-controls="navigation-urgences-mobile"
              className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-2.5 text-white transition hover:bg-white/20 lg:hidden"
            >
              {menuMobileOuvert ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="hidden text-xs font-semibold sm:inline">{menuMobileOuvert ? 'Fermer' : 'Menu'}</span>
            </button>
          </div>
        </div>

        {menuMobileOuvert && (
          <nav
            id="navigation-urgences-mobile"
            aria-label="Navigation des urgences"
            className="border-t border-white/10 bg-[#0A2233] px-4 py-3 text-white shadow-lg lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {ONGLETS.map(({ id, libelle }, index) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setOngletActif(id);
                  setMenuMobileOuvert(false);
                }}
                aria-current={ongletActif === id ? 'page' : undefined}
                className={`w-full rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                  ongletActif === id ? 'bg-white/10 text-[#7FD1CB]' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                style={{ animationDelay: `${60 + index * 60}ms` }}
              >
                {libelle}
              </button>
            ))}
            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 pt-4">
              {nomUtilisateur && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{nomUtilisateur}</p>
                  <p className="text-[11px] text-[#7FD1CB]">{profil?.role?.replaceAll('_', ' ')}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setMenuMobileOuvert(false);
                  onDeconnexion();
                }}
                className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </button>
            </div>
            </div>
          </nav>
        )}
      </header>

      <div className="mx-auto max-w-[1440px] space-y-6 px-3 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-9">
        {erreur && (
          <div role="alert" className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
            <p className="flex-1">{erreur}</p>
            <button
              type="button"
              onClick={() => {
                setChargement(true);
                setActualisation((valeur) => valeur + 1);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-red-700 hover:text-red-900"
            >
              <RefreshCw size={15} /> Réessayer
            </button>
          </div>
        )}

        {ongletActif === 'accueil' && (
          <section aria-label="Accueil des urgences" className="space-y-6">
            <BandeauPage
              etiquette="Espace opérationnel · Urgences"
              titre={`Bonjour${nomUtilisateur ? `, ${nomUtilisateur}` : ''}.`}
              accent="La situation en un coup d’œil."
              sousTitre="Suivez la disponibilité des lits et des ambulances, puis accédez rapidement aux outils de gestion."
              actions={(
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setChargement(true);
                      setActualisation((valeur) => valeur + 1);
                    }}
                    disabled={chargement}
                    className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm text-white transition hover:-translate-y-0.5 hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
                  >
                    <RefreshCw size={16} className={chargement ? 'animate-spin' : ''} />
                    Actualiser
                  </button>
                  <button
                    type="button"
                    onClick={() => setOngletActif('urgence')}
                    className="inline-flex items-center gap-2.5 rounded-full bg-white px-5 py-3 text-sm font-medium text-[#0A2233] transition hover:-translate-y-0.5 hover:bg-[#7FD1CB]"
                  >
                    <Ambulance size={17} /> Gérer les urgences
                  </button>
                </>
              )}
              stats={statistiques}
            />
            {chargement ? (
              <p className="rounded-2xl border border-black/[0.06] bg-white p-5 text-sm text-slate-500">
                Chargement des graphiques des lits et des ambulances…
              </p>
            ) : (
              <GraphiquesUrgences ambulances={ambulances} missions={missions} lits={lits} />
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span className={`h-2.5 w-2.5 rounded-full ${chargement ? 'animate-pulse bg-amber-400' : 'bg-emerald-500'}`} />
              {chargement ? 'Chargement des données opérationnelles…' : 'Données actualisées automatiquement toutes les 30 secondes.'}
            </div>
          </section>
        )}

        {ongletActif === 'urgence' && (
          <section aria-label="Gestion des urgences" className="space-y-6">
            <div role="tablist" aria-label="Sections urgences" className="inline-flex flex-wrap rounded-3xl border border-[#1F7A8C]/10 bg-white p-1.5 shadow-sm">
              {[
                { id: 'lits', libelle: 'Lits d’urgence' },
                { id: 'ambulances', libelle: 'Ambulances' },
              ].map(({ id, libelle }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={vueUrgence === id}
                  onClick={() => setVueUrgence(id)}
                  className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${vueUrgence === id ? 'bg-[#1F7A8C] text-white shadow-md shadow-[#1F7A8C]/20' : 'text-slate-600 hover:bg-[#F4F2EE]'}`}
                >
                  {libelle}
                </button>
              ))}
            </div>
            {vueUrgence === 'lits' && <TableauDeBordLits profil={profil} embedded />}
            {vueUrgence === 'ambulances' && <GestionAmbulances profil={profil} onDeconnexion={onDeconnexion} embedded />}
          </section>
        )}
      </div>
    </div>
  );
}
