import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRightLeft, BedDouble, Clock3, Eye, X,
} from 'lucide-react';
import { listerHistoriqueLits, obtenirHistoriquePatient } from '../services/api';

const TAILLE_PAGE = 100;

const LIBELLES_EVENEMENTS = {
  admission: 'Attribution du lit',
  transfert_interne: 'Transfert interne',
  transfert_service: 'Transfert vers un service',
  sortie: 'Sortie de l’hôpital',
};

const LIBELLES_CATEGORIES = {
  urgence: 'Urgence',
  dechocage: 'Déchoquage',
  triage: 'Triage',
  salle_septique: 'Salle septique',
  vip: 'VIP',
};

function afficherDate(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

function afficherDuree(secondes) {
  if (secondes == null) return '—';
  const minutes = Math.floor(secondes / 60);
  const jours = Math.floor(minutes / 1440);
  const heures = Math.floor((minutes % 1440) / 60);
  const reste = minutes % 60;
  if (jours) return `${jours} j ${heures} h`;
  if (heures) return `${heures} h ${reste} min`;
  return `${reste} min`;
}

function nomLit(numero, categorie) {
  if (!numero) return '—';
  return `${numero}${categorie ? ` · ${LIBELLES_CATEGORIES[categorie] || categorie}` : ''}`;
}

function afficherParcours(evenement) {
  if (evenement.type_evenement === 'admission') {
    return `Attribution · ${nomLit(evenement.lit_destination_numero, evenement.lit_destination_categorie)}`;
  }
  if (evenement.type_evenement === 'transfert_interne') {
    return `${nomLit(evenement.lit_source_numero, evenement.lit_source_categorie)} → ${nomLit(evenement.lit_destination_numero, evenement.lit_destination_categorie)}`;
  }
  if (evenement.type_evenement === 'transfert_service') {
    return `${nomLit(evenement.lit_source_numero, evenement.lit_source_categorie)} → ${evenement.service_destination_nom || 'Service non précisé'}`;
  }
  return nomLit(evenement.lit_source_numero, evenement.lit_source_categorie);
}

export default function HistoriqueLits({ token, rechargement }) {
  const [page, fixerPage] = useState(0);
  const [donnees, fixerDonnees] = useState({ items: [], total_patients: 0 });
  const [chargement, fixerChargement] = useState(true);
  const [erreur, fixerErreur] = useState('');
  const [recherche, fixerRecherche] = useState('');
  const [patientSelectionne, fixerPatientSelectionne] = useState(null);
  const [parcoursPatient, fixerParcoursPatient] = useState(null);
  const [chargementParcours, fixerChargementParcours] = useState(false);
  const [erreurParcours, fixerErreurParcours] = useState('');

  useEffect(() => {
    let actif = true;
    async function charger() {
      fixerChargement(true);
      try {
        const resultat = await listerHistoriqueLits(token, TAILLE_PAGE, page * TAILLE_PAGE);
        if (actif) {
          fixerDonnees(resultat);
          fixerErreur('');
        }
      } catch (err) {
        if (actif) fixerErreur(err.message || 'Impossible de charger l’historique des lits.');
      } finally {
        if (actif) fixerChargement(false);
      }
    }
    charger();
    return () => { actif = false; };
  }, [token, page, rechargement]);

  const patientsFiltres = useMemo(() => {
    const terme = recherche.trim().toLocaleLowerCase('fr');
    if (!terme) return donnees.items;
    return donnees.items.filter((patient) => [
      patient.nom_patient,
      patient.prenoms_patient,
    ].some((valeur) => valeur?.toLocaleLowerCase('fr').includes(terme)));
  }, [donnees.items, recherche]);

  const episodes = useMemo(() => {
    if (!parcoursPatient) return [];
    const groupes = new Map();
    parcoursPatient.items.forEach((evenement) => {
      if (!groupes.has(evenement.episode_id)) groupes.set(evenement.episode_id, []);
      groupes.get(evenement.episode_id).push(evenement);
    });
    return Array.from(groupes, ([episodeId, evenements]) => ({ episodeId, evenements }));
  }, [parcoursPatient]);

  const nombrePages = Math.ceil(donnees.total_patients / TAILLE_PAGE);

  const ouvrirParcours = async (patient) => {
    fixerPatientSelectionne(patient);
    fixerParcoursPatient(null);
    fixerErreurParcours('');
    fixerChargementParcours(true);
    try {
      fixerParcoursPatient(await obtenirHistoriquePatient(token, patient.patient_historique_id));
    } catch (err) {
      fixerErreurParcours(err.message || 'Impossible de charger le parcours de ce patient.');
    } finally {
      fixerChargementParcours(false);
    }
  };

  const fermerParcours = () => {
    fixerPatientSelectionne(null);
    fixerParcoursPatient(null);
    fixerErreurParcours('');
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#D5DEE0] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1F7A8C]"><BedDouble size={15} /> Données confidentielles · SuperAdmin</p>
            <h3 className="mt-1 text-lg font-semibold text-[#0A2233]">Historique des urgences par patient</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">Sélectionnez un patient pour consulter ses passages aux urgences, ses lits, ses transferts et ses durées d’occupation.</p>
          </div>
          <span className="rounded-full bg-[#EAF1F1] px-3 py-1 text-xs font-bold text-[#0F3D52]">{donnees.total_patients} patients</span>
        </div>
        <label className="mt-4 flex h-11 max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 focus-within:border-[#1F7A8C]">
          <input
            aria-label="Rechercher un patient"
            value={recherche}
            onChange={(event) => fixerRecherche(event.target.value)}
            placeholder="Rechercher un patient…"
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      {erreur && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={16} />{erreur}</div>}
      {chargement && <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Chargement de l’historique…</p>}

      {!chargement && !erreur && (
        <div className="overflow-hidden rounded-2xl border border-[#D5DEE0] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-[#F4F7F6] text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Patient</th>
                  <th className="px-4 py-3 font-bold">Passages aux urgences</th>
                  <th className="px-4 py-3 font-bold">Dernière urgence clôturée</th>
                  <th className="px-4 py-3 text-right font-bold">Historique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patientsFiltres.map((patient) => (
                  <tr key={patient.patient_historique_id} className="hover:bg-[#FAFCFB]">
                    <td className="px-4 py-4 font-semibold text-[#0A2233]">
                      {[patient.prenoms_patient, patient.nom_patient].filter(Boolean).join(' ')}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{patient.total_episodes}</td>
                    <td className="px-4 py-4 text-xs text-slate-600">{afficherDate(patient.derniere_urgence)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => ouvrirParcours(patient)}
                        title={`Voir l’historique de ${patient.prenoms_patient} ${patient.nom_patient}`}
                        aria-label={`Voir l’historique de ${patient.prenoms_patient} ${patient.nom_patient}`}
                        className="inline-flex h-10 w-10 items-center justify-center border border-[#0A2233]/10 text-[#0F3D52] transition-colors hover:border-[#0A2233] hover:bg-[#0A2233] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C]"
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!patientsFiltres.length && (
                  <tr><td colSpan="4" className="px-4 py-12 text-center text-sm text-slate-500">{recherche ? 'Aucun patient ne correspond à cette recherche sur la page affichée.' : 'Aucun patient avec un épisode d’urgence clôturé.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>Page {nombrePages ? page + 1 : 0} sur {nombrePages}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => fixerPage((valeur) => Math.max(0, valeur - 1))} disabled={page === 0 || chargement} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-[#0F3D52] disabled:opacity-40">Précédent</button>
              <button type="button" onClick={() => fixerPage((valeur) => valeur + 1)} disabled={page + 1 >= nombrePages || chargement} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-[#0F3D52] disabled:opacity-40">Suivant</button>
            </div>
          </div>
        </div>
      )}

      {patientSelectionne && (
        <div
          className="mobile-scroll-overlay fixed inset-0 z-[120] flex justify-center bg-[#081B29]/80 p-3 backdrop-blur-sm sm:p-6"
          role="presentation"
          onMouseDown={(evenement) => {
            if (evenement.target === evenement.currentTarget) fermerParcours();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-historique-patient"
            className="relative grid h-[92dvh] max-h-[92dvh] w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#F7F6F2] shadow-[0_32px_100px_rgba(0,0,0,0.35)] md:grid-cols-[0.82fr_1.18fr] md:grid-rows-1"
          >
            <div className="relative flex flex-col justify-end overflow-hidden bg-gradient-to-br from-[#0A2233] via-[#0F3D52] to-[#1F7A8C] p-5 text-white sm:p-7 md:min-h-0 md:p-9">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #7FD1CB 0, transparent 35%), radial-gradient(circle at 80% 75%, #7FD1CB 0, transparent 30%)' }} />
              <p className="relative text-[10px] font-semibold uppercase tracking-[0.22em] text-[#B5E8E3]">CENHOSOA / Dossier des urgences</p>
              <div className="relative mt-4 h-px w-12 bg-[#7FD1CB]" />
              <h2 id="titre-historique-patient" className="relative mt-5 max-w-xl font-display text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
                {[patientSelectionne.prenoms_patient, patientSelectionne.nom_patient].filter(Boolean).join(' ')}
              </h2>
              <p className="relative mt-3 text-sm leading-6 text-white/75">Parcours des prises en charge aux urgences, présenté du premier événement à la clôture de chaque passage.</p>
              <div className="relative mt-8 grid grid-cols-2 gap-3">
                <div className="border border-white/15 bg-white/[0.07] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B5E8E3]">Passages</p>
                  <p className="mt-2 text-2xl font-semibold">{parcoursPatient?.total_episodes ?? patientSelectionne.total_episodes}</p>
                </div>
                <div className="border border-white/15 bg-white/[0.07] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B5E8E3]">Événements</p>
                  <p className="mt-2 text-2xl font-semibold">{parcoursPatient?.items.length ?? '—'}</p>
                </div>
              </div>
              <p className="relative mt-5 hidden pt-4 text-[10px] font-medium uppercase tracking-[0.14em] text-white/45 md:block md:mt-auto md:pt-8">Consultation réservée au SuperAdmin</p>
            </div>
            <div className="modal-scrollbar relative min-h-0 overflow-y-auto overscroll-contain px-5 pb-7 pt-7 sm:px-8 sm:pb-9 md:px-10 md:py-10">
              <button
                type="button"
                onClick={fermerParcours}
                aria-label="Fermer l’historique du patient"
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center border border-[#0A2233]/10 text-[#0A2233]/70 transition-colors hover:border-[#0A2233] hover:bg-[#0A2233] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C] sm:right-6 sm:top-6"
              >
                <X size={18} />
              </button>
              <div className="mb-6 pr-12 sm:mb-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1F7A8C]">Historique médical des lits</p>
                <div className="mt-4 h-px w-12 bg-[#7FD1CB]" />
              </div>
              <h3 className="max-w-xl font-display text-2xl font-semibold leading-tight tracking-[-0.03em] text-[#0A2233] sm:text-3xl">
                Parcours des urgences
              </h3>
              <div className="my-5 h-px w-full bg-[#0A2233]/10 sm:my-7" />

              {chargementParcours && <p className="py-8 text-sm text-slate-500">Chargement des passages du patient…</p>}
              {erreurParcours && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={16} />{erreurParcours}</div>}
              {!chargementParcours && !erreurParcours && (
                <div className="space-y-5">
                  {episodes.map(({ episodeId, evenements }, index) => (
                    <article key={episodeId} className="border border-[#0A2233]/10 bg-white p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#0A2233]/10 pb-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1F7A8C]">Passage aux urgences · {episodes.length - index}</p>
                          <p className="mt-1 text-xs text-slate-500">{afficherDate(evenements[0].date_evenement)}</p>
                        </div>
                        <span className="rounded-full bg-[#EAF1F1] px-2.5 py-1 text-[10px] font-bold text-[#0F3D52]">{evenements.length} étapes</span>
                      </div>
                      <ol className="mt-4 space-y-4">
                        {evenements.map((evenement, position) => (
                          <li key={evenement.id} className="relative flex gap-3">
                            <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EAF1F1] text-[#1F7A8C]"><ArrowRightLeft size={14} /></span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                <p className="text-sm font-semibold text-[#0A2233]">{LIBELLES_EVENEMENTS[evenement.type_evenement] || evenement.type_evenement}</p>
                                <p className="flex items-center gap-1 text-[11px] text-slate-500"><Clock3 size={12} />{afficherDate(evenement.date_evenement)}</p>
                              </div>
                              <p className="mt-1 text-xs font-medium text-[#0F3D52]">{afficherParcours(evenement)}</p>
                              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-[#43515A]"><span className="font-semibold">Motif :</span> {evenement.motif || 'Non renseigné'}</p>
                              {evenement.duree_occupation_secondes != null && (
                                <p className="mt-1 text-[11px] text-slate-500">Durée dans le lit quitté : <span className="font-semibold text-slate-700">{afficherDuree(evenement.duree_occupation_secondes)}</span></p>
                              )}
                              <p className="mt-1 text-[10px] text-slate-400">Enregistré par {evenement.acteur_identifiant}</p>
                            </div>
                            {position < evenements.length - 1 && <span className="absolute left-[13px] top-8 h-[calc(100%+0.25rem)] w-px bg-[#0A2233]/10" />}
                          </li>
                        ))}
                      </ol>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
