import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, ChevronRight, FileText, MapPin, Phone, UserRound } from 'lucide-react';
import {
  obtenirDossierCompletPatient,
  obtenirPhotoProfilPatient,
} from '../services/api';
import logoCenhosoa from '../assets/logo/logo.jpeg';
import { StylesEspace } from './StylesEspace';
import StatutBadge from './StatutBadge';
import { formaterDate } from './rendezVousUtils';
import { ecouterDonneesModifiees } from '../services/tempsReel';

function DossierPatient({ patient, token, role, onRetour }) {
  const [dossier, setDossier] = useState(null);
  const [photo, setPhoto] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [actualisationTempsReel, setActualisationTempsReel] = useState(0);

  useEffect(() => {
    let actif = true;
    let urlPhoto = '';
    Promise.all([
      obtenirDossierCompletPatient(token, patient.patientId),
      obtenirPhotoProfilPatient(token, patient.patientId),
    ]).then(([donnees, fichierPhoto]) => {
      if (!actif) return;
      setDossier(donnees);
      if (fichierPhoto) {
        urlPhoto = URL.createObjectURL(fichierPhoto);
        setPhoto(urlPhoto);
      }
    }).catch((cause) => {
      if (actif) setErreur(cause.message || 'Impossible de charger le dossier complet du patient.');
    }).finally(() => {
      if (actif) setChargement(false);
    });
    return () => {
      actif = false;
      if (urlPhoto) URL.revokeObjectURL(urlPhoto);
    };
  }, [actualisationTempsReel, patient.patientId, token]);

  useEffect(() => ecouterDonneesModifiees(
    ['dossiers', 'patients', 'rendez-vous'],
    () => setActualisationTempsReel((precedent) => precedent + 1),
  ), []);

  const formaterQuantite = (medicament, valeur) => (
    valeur === null || valeur === undefined || valeur === ''
      ? '—'
      : `${valeur} ${medicament.forme === 'solution_buvable' ? 'mL' : 'unité(s)'}`
  );

  return (
    <div className="espace min-h-screen bg-[#F4F2EE] font-body text-[#1E2333]">
      <StylesEspace />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-[#0A2233] via-[#0F3D52] to-[#0A2233] text-white shadow-lg shadow-[#0A2233]/20 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-white p-1.5 sm:h-14 sm:w-14">
              <img src={logoCenhosoa} alt="Logo Centre Hospitalier de Soavinandriana" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[#7FD1CB] sm:text-[11px]">
                CENHOSOA · {role === 'patient' ? 'Espace patient' : 'Espace médecin'}
              </span>
              <h1 className="truncate text-lg font-display font-light tracking-tight sm:text-xl">Dossier médical complet</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetour}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 text-white transition hover:bg-white/20"
          >
            <ArrowLeft size={17} />
            <span className="hidden text-xs font-semibold sm:inline">{role === 'patient' ? 'Retour à mes rendez-vous' : 'Retour au planning'}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-7 sm:space-y-8 sm:px-7 lg:px-10 lg:py-9">
        {chargement && (
          <div className="space-y-4" aria-busy="true">
            <div className="h-56 animate-pulse rounded-[2rem] bg-[#EAF1F1]" />
            <div className="h-24 animate-pulse rounded-3xl bg-[#EAF1F1]" />
          </div>
        )}
        {erreur && <section role="alert" className="rounded-3xl border border-red-200 bg-white p-5 text-sm text-red-700">{erreur}</section>}
        {dossier && (
          <>
            <section className="apparition relative overflow-hidden rounded-[2rem] bg-[#0A2233] px-6 py-9 text-white sm:px-10 sm:py-12">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0A2233] via-[#0F3D52]/80 to-[#0A2233]" />
              <div className="absolute -left-20 -top-24 h-72 w-72 animate-pulse rounded-full bg-[#1F7A8C]/50 blur-[90px]" />
              <div className="absolute -bottom-28 right-0 h-72 w-72 animate-pulse rounded-full bg-[#7FD1CB]/30 blur-[90px]" />
              <div className="relative flex flex-wrap items-center gap-6 sm:gap-8">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-[#7FD1CB] ring-4 ring-white/20">
                  {photo ? <img src={photo} alt={`Photo de ${dossier.patient_prenoms} ${dossier.patient_nom}`} className="h-full w-full object-cover" /> : <UserRound className="h-12 w-12" strokeWidth={1.4} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Profil du patient</p>
                  <h2 className="mt-3 break-words text-4xl font-light tracking-[-0.04em] text-white sm:text-5xl">{dossier.patient_prenoms} <span className="text-white/40">{dossier.patient_nom}</span></h2>
                </div>
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white/80 backdrop-blur-md">{dossier.rendez_vous.length} rendez-vous</span>
              </div>
              <dl className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [Phone, 'Téléphone', dossier.patient_telephone || 'Non renseigné'],
                  [Calendar, 'Date de naissance', dossier.patient_date_naissance ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${dossier.patient_date_naissance}T00:00:00`)) : 'Non renseignée'],
                  [MapPin, 'Lieu de naissance', dossier.patient_lieu_naissance || 'Non renseigné'],
                  [MapPin, 'Adresse', dossier.patient_adresse || 'Non renseignée'],
                ].map(([Icone, libelle, valeur]) => (
                  <div key={libelle} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl transition hover:bg-white/15">
                    <dt className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/60"><Icone size={13} className="text-[#7FD1CB]" />{libelle}</dt>
                    <dd className="mt-2 whitespace-pre-wrap break-words text-sm text-white">{valeur}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="apparition overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:gap-6 sm:px-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-[#5B7480]">Historique médical</p>
                  <h2 className="mt-1 text-2xl">Tous les rendez-vous et comptes rendus</h2>
                </div>
              </div>
              {dossier.rendez_vous.length ? (
                <div className="divide-y divide-slate-100">
                  {dossier.rendez_vous.map((rdv, indexRdv) => {
                    const dateRdv = new Date(rdv.date_confirmee || rdv.date_souhaitee);
                    const termine = rdv.statut === 'termine';
                    return (
                      <details key={rdv.id} open={indexRdv === 0} className="group">
                        <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition-colors hover:bg-[#F4F2EE]/60 sm:px-6 [&::-webkit-details-marker]:hidden">
                          <span className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl ${termine ? 'bg-[#0A2233] text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <span className="text-xl font-light leading-none tabular-nums">{dateRdv.getDate()}</span>
                            <span className={`mt-1 text-[10px] uppercase tracking-wider ${termine ? 'text-[#7FD1CB]' : 'text-slate-400'}`}>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(dateRdv)}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-[#0A2233]">{rdv.service_nom}</span>
                            <span className="block truncate text-xs font-light text-slate-500">{formaterDate(rdv.date_confirmee || rdv.date_souhaitee)}</span>
                          </span>
                          <StatutBadge
                            statut={rdv.statut}
                            className="hidden shrink-0 sm:inline-flex"
                          />
                          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-90" />
                        </summary>
                        <div className="space-y-4 border-t border-slate-100 bg-[#F7F6F3]/70 px-5 py-6 sm:space-y-6 sm:px-6">
                          <p className="text-sm font-light text-slate-600"><span className="text-[#0A2233]">Motif :</span> {rdv.motif}</p>
                          {rdv.numero_file && <p className="inline-flex rounded-full bg-[#1F7A8C]/10 px-3 py-1 text-xs text-[#1F7A8C]">File d’attente · n° {rdv.numero_file}</p>}
                          {rdv.commentaire && <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900"><strong>Commentaire :</strong> {rdv.commentaire}</p>}
                          {rdv.consultation ? (
                            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                              <div className="flex items-center gap-2 text-sm text-[#1F7A8C]"><FileText size={16} /> Compte rendu · {formaterDate(rdv.consultation.date_creation)}</div>
                              <p className="mt-3 whitespace-pre-wrap border-l-2 border-[#1F7A8C]/40 pl-4 text-sm font-light leading-relaxed text-slate-700">{rdv.consultation.remarques}</p>
                              {rdv.consultation.medicaments_prescrits?.length > 0 && (
                                <div className="mt-5 border-t border-slate-100 pt-4">
                                  <h4 className="text-[11px] uppercase tracking-[0.2em] text-[#5B7480]">Ordonnance</h4>
                                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                                    {rdv.consultation.medicaments_prescrits.map((medicament, index) => (
                                      <li key={`${medicament.nom}-${index}`} className="rounded-2xl border border-slate-100 bg-[#F4F2EE]/60 p-4 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                                        <p className="text-[#0A2233]">{medicament.nom}{medicament.forme ? ` · ${medicament.forme}` : ''}</p>
                                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                          {[['Matin', medicament.matin], ['Midi', medicament.midi], ['Soir', medicament.soir]].map(([moment, quantite]) => (
                                            <div key={moment} className="rounded-xl bg-white px-1 py-2">
                                              <p className="text-[10px] uppercase tracking-wider text-slate-500">{moment}</p>
                                              <p className="mt-0.5 text-xs text-[#0A2233]">{formaterQuantite(medicament, quantite)}</p>
                                            </div>
                                          ))}
                                        </div>
                                        {medicament.posologie && <p className="mt-3 whitespace-pre-wrap text-xs font-light text-slate-600"><strong>Posologie :</strong> {medicament.posologie}</p>}
                                        {medicament.duree_jours && <p className="mt-1 text-xs font-light text-slate-600"><strong>Durée :</strong> {medicament.duree_jours} jour(s)</p>}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {rdv.consultation.ordonnance && <p className="mt-4 whitespace-pre-wrap text-sm font-light text-slate-700"><strong>Ancienne ordonnance :</strong> {rdv.consultation.ordonnance}</p>}
                              {rdv.consultation.controle_supplementaire && <p className="mt-4 whitespace-pre-wrap text-sm font-light text-slate-700"><strong>Contrôle / examen :</strong> {rdv.consultation.controle_supplementaire}</p>}
                            </div>
                          ) : (
                            <p className="rounded-2xl bg-white p-4 text-sm font-light text-slate-500">Aucun compte rendu médical enregistré pour ce rendez-vous.</p>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-14 text-center sm:px-6">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1F7A8C]/10 text-[#1F7A8C]"><FileText size={24} strokeWidth={1.5} /></div>
                  <p className="mt-4 text-lg font-light text-[#0A2233]">Aucun rendez-vous enregistré</p>
                  <p className="mt-1 text-sm font-light text-slate-500">Aucun rendez-vous enregistré dans ce service.</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default DossierPatient;
