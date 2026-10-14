import { useEffect, useState } from 'react';
import {
  ArrowLeft, CheckCircle2, ChevronRight, Clock, FileText, Plus, Stethoscope, UserRound, XCircle,
} from 'lucide-react';
import {
  creerConsultation,
  obtenirDossierMedical,
  obtenirPhotoProfilPatient,
} from '../services/api';
import logoCenhosoa from '../assets/logo/logo.jpeg';
import { StylesEspace } from './StylesEspace';
import { ecouterDonneesModifiees } from '../services/tempsReel';

const MEDICAMENT_VIDE = {
  nom: '',
  indication: '',
  forme: '',
  matin: '',
  midi: '',
  soir: '',
  posologie: '',
  duree_jours: '',
};

function formaterDate(date) {
  if (!date) return 'Non renseignée';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
    new Date(`${date.slice(0, 10)}T00:00:00`),
  );
}

function formaterDose(medicament, quantite) {
  if (quantite === null || quantite === undefined || quantite === '') return null;
  return `${quantite} ${medicament.forme === 'solution_buvable' ? 'mL' : 'unité(s)'}`;
}

function SeanceRendezVous({ rendezVous, token, onRetour, onConsultationEnregistree }) {
  const [dossier, setDossier] = useState(null);
  const [photoSrc, setPhotoSrc] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);
  const [actualisationTempsReel, setActualisationTempsReel] = useState(0);
  const [formulaire, setFormulaire] = useState({
    remarques: '',
    medicaments_prescrits: [{ ...MEDICAMENT_VIDE }],
    controle_supplementaire: '',
    prochain_rendez_vous: '',
  });

  useEffect(() => {
    let actif = true;
    let urlPhoto = '';
    Promise.all([
      obtenirDossierMedical(token, rendezVous.patient_id),
      obtenirPhotoProfilPatient(token, rendezVous.patient_id),
    ]).then(([donnees, photo]) => {
      if (!actif) return;
      setDossier(donnees);
      if (photo) {
        urlPhoto = URL.createObjectURL(photo);
        setPhotoSrc(urlPhoto);
      } else {
        setPhotoSrc('');
      }
    }).catch((err) => {
      if (actif) setErreurChargement(err.message || 'Impossible de charger le dossier du patient.');
    }).finally(() => {
      if (actif) setChargement(false);
    });
    return () => {
      actif = false;
      if (urlPhoto) URL.revokeObjectURL(urlPhoto);
    };
  }, [actualisationTempsReel, rendezVous.patient_id, token]);

  useEffect(() => ecouterDonneesModifiees(
    ['dossiers', 'patients', 'rendez-vous'],
    () => setActualisationTempsReel((precedent) => precedent + 1),
  ), []);

  const modifierMedicament = (index, champ, valeur) => {
    setFormulaire((precedent) => ({
      ...precedent,
      medicaments_prescrits: precedent.medicaments_prescrits.map((medicament, i) => (
        i === index ? { ...medicament, [champ]: valeur } : medicament
      )),
    }));
  };

  const enregistrerConsultation = async (evenement) => {
    evenement.preventDefault();
    setErreur('');
    setSucces('');
    setEnregistrement(true);
    try {
      await creerConsultation(token, rendezVous.id, {
        remarques: formulaire.remarques.trim(),
        medicaments_prescrits: formulaire.medicaments_prescrits
          .filter((medicament) => medicament.nom.trim())
          .map((medicament) => ({
            ...medicament,
            nom: medicament.nom.trim(),
            indication: medicament.indication || null,
            forme: medicament.forme || null,
            matin: medicament.matin ? Number(medicament.matin) : null,
            midi: medicament.midi ? Number(medicament.midi) : null,
            soir: medicament.soir ? Number(medicament.soir) : null,
            posologie: medicament.posologie.trim() || null,
            duree_jours: medicament.duree_jours ? Number(medicament.duree_jours) : null,
          })),
        controle_supplementaire: formulaire.controle_supplementaire.trim() || null,
        ...(formulaire.prochain_rendez_vous && {
          prochain_rendez_vous: new Date(formulaire.prochain_rendez_vous).toISOString(),
        }),
      });
      const dossierActualise = await obtenirDossierMedical(token, rendezVous.patient_id);
      setDossier(dossierActualise);
      setSucces('La consultation a été enregistrée dans le dossier médical.');
      await onConsultationEnregistree();
    } catch (err) {
      setErreur(err.message || 'Impossible d’enregistrer la consultation.');
    } finally {
      setEnregistrement(false);
    }
  };

  return (
    <div className="espace min-h-screen bg-[#F4F2EE] font-body text-[#1E2333]">
      <StylesEspace />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-[#0A2233] via-[#0F3D52] to-[#0A2233] text-white shadow-lg shadow-[#0A2233]/20 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="group flex min-w-0 items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-white p-1.5 shadow-md shadow-black/20 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2 sm:h-14 sm:w-14">
              <img src={logoCenhosoa} alt="Logo Centre Hospitalier de Soavinandriana" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[#7FD1CB] sm:text-[11px]">
                CENHOSOA · Espace médecin
              </span>
              <h1 className="truncate text-lg font-display font-light tracking-tight text-white sm:text-xl">
                Séance de rendez-vous
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden min-w-0 items-center gap-3 border-r border-white/15 pr-4 sm:flex">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-[#7FD1CB]">
                {photoSrc
                  ? <img src={photoSrc} alt="" className="h-full w-full object-cover" />
                  : <UserRound className="h-5 w-5" />}
              </div>
              <div className="min-w-0 text-left">
                <p className="max-w-48 truncate text-sm font-display font-bold leading-tight text-white">{rendezVous.patient}</p>
                <p className="text-[11px] font-medium text-[#7FD1CB]">{rendezVous.specialite}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRetour}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 text-white transition hover:bg-white/20"
            >
              <ArrowLeft size={17} />
              <span className="hidden text-xs font-semibold sm:inline">Retour au planning</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:px-10 lg:py-9">
        <div className="space-y-5">
          <section className="apparition overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <FileText size={18} className="text-[#1F7A8C]" />
              <h2 className="text-lg">Dossier médical antérieur</h2>
              {dossier?.consultations?.length > 0 && <span className="ml-auto rounded-full bg-[#1F7A8C]/10 px-2.5 py-1 text-xs text-[#1F7A8C]">{dossier.consultations.length}</span>}
            </div>
            {chargement ? (
              <div className="space-y-3 p-5" aria-busy="true">{[...Array(2)].map((_, index) => <div key={index} className="h-14 animate-pulse rounded-2xl bg-[#F4F2EE]" />)}</div>
            ) : erreurChargement ? (
              <p role="alert" className="p-5 text-sm text-red-700">{erreurChargement}</p>
            ) : dossier?.consultations?.length ? (
              <div className="max-h-[34rem] divide-y divide-slate-100 overflow-y-auto">
                {dossier.consultations.map((consultation, indexConsultation) => (
                  <details key={consultation.id} open={indexConsultation === 0} className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#F4F2EE]/60 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1 truncate text-sm text-[#0A2233]">
                        {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(consultation.date_creation))}
                      </span>
                      {consultation.medicaments_prescrits?.length > 0 && <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">{consultation.medicaments_prescrits.length} médicament(s)</span>}
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-90" />
                    </summary>
                    <div className="bg-[#F7F6F3]/70 px-5 py-5">
                      <p className="whitespace-pre-wrap border-l-2 border-[#1F7A8C]/40 pl-4 text-sm font-light leading-relaxed text-slate-800">{consultation.remarques}</p>
                      {consultation.medicaments_prescrits?.length > 0 && (
                        <ul className="mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-sm text-slate-700">
                          {consultation.medicaments_prescrits.map((medicament, index) => (
                            <li key={`${medicament.nom}-${index}`} className="rounded-xl bg-white p-3 shadow-sm">
                              <strong>{medicament.nom}</strong>
                              {medicament.matin !== null && medicament.matin !== undefined ? ` — Matin : ${formaterDose(medicament, medicament.matin)}` : ''}
                              {medicament.midi !== null && medicament.midi !== undefined ? ` · Midi : ${formaterDose(medicament, medicament.midi)}` : ''}
                              {medicament.soir !== null && medicament.soir !== undefined ? ` · Soir : ${formaterDose(medicament, medicament.soir)}` : ''}
                              {medicament.posologie ? ` — ${medicament.posologie}` : ''}
                              {medicament.duree_jours ? ` (${medicament.duree_jours} jours)` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                      {consultation.ordonnance && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{consultation.ordonnance}</p>}
                      {consultation.controle_supplementaire && (
                        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700"><strong>Contrôle :</strong> {consultation.controle_supplementaire}</p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-sm font-light text-slate-500">Aucune consultation antérieure dans ce service.</p>
            )}
          </section>

          <section className="apparition overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <FileText size={18} className="text-[#1F7A8C]" />
              <h2 className="font-semibold tracking-tight text-[#0A2233]">Dossier médical antérieur</h2>
            </div>
            {chargement ? (
              <p className="p-5 text-sm text-slate-500">Chargement du dossier médical…</p>
            ) : erreurChargement ? (
              <p role="alert" className="p-5 text-sm text-red-700">{erreurChargement}</p>
            ) : dossier?.consultations?.length ? (
              <div className="max-h-[34rem] space-y-3 overflow-y-auto p-4">
                {dossier.consultations.map((consultation) => (
                  <article key={consultation.id} className="apparition transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1F7A8C]/10 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(consultation.date_creation))}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{consultation.remarques}</p>
                    {consultation.medicaments_prescrits?.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-slate-200 pt-2 text-sm text-slate-700">
                        {consultation.medicaments_prescrits.map((medicament, index) => (
                          <li key={`${medicament.nom}-${index}`}>
                            <strong>{medicament.nom}</strong>
                            {medicament.matin !== null && medicament.matin !== undefined ? ` — Matin : ${formaterDose(medicament, medicament.matin)}` : ''}
                            {medicament.midi !== null && medicament.midi !== undefined ? ` · Midi : ${formaterDose(medicament, medicament.midi)}` : ''}
                            {medicament.soir !== null && medicament.soir !== undefined ? ` · Soir : ${formaterDose(medicament, medicament.soir)}` : ''}
                            {medicament.posologie ? ` — ${medicament.posologie}` : ''}
                            {medicament.duree_jours ? ` (${medicament.duree_jours} jours)` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    {consultation.ordonnance && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{consultation.ordonnance}</p>}
                    {consultation.controle_supplementaire && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700"><strong>Contrôle :</strong> {consultation.controle_supplementaire}</p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="p-5 text-sm text-slate-500">Aucune consultation antérieure dans ce service.</p>
            )}
          </section>
        </div>

        <section className="apparition h-fit overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm">
          <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-[#0A2233] via-[#0F3D52] to-[#1F7A8C] px-5 py-6 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#7FD1CB]">
                <Stethoscope size={18} />
                <p className="text-[11px] uppercase tracking-[0.25em]">Consultation du rendez-vous</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] ${rendezVous.statutApi === 'arrive' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/10 text-white/70'}`}>
                {rendezVous.statutApi === 'arrive' ? 'Patient arrivé' : 'En attente d’arrivée'}
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-light text-white">{rendezVous.specialite} · {rendezVous.date} à {rendezVous.heure}</h2>
            <p className="mt-1 text-sm font-light text-white/70"><strong className="font-medium text-white">Motif :</strong> {rendezVous.motif}</p>
          </div>
          {rendezVous.statutApi !== 'arrive' ? (
            <div className="m-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><Clock className="mt-0.5 h-4 w-4 shrink-0" />La saisie de la consultation sera disponible lorsque le secrétariat aura marqué le patient comme arrivé.</div>
          ) : dossier?.consultations?.some((consultation) => consultation.rendez_vous_id === rendezVous.id) ? (
            <div className="m-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" />La consultation de ce rendez-vous est déjà enregistrée.</div>
          ) : (
            <form onSubmit={enregistrerConsultation} className="space-y-4 p-5">
              <label className="block text-sm font-semibold text-slate-700">
                Remarques médicales
                <textarea
                  required
                  maxLength={10000}
                  rows={5}
                  value={formulaire.remarques}
                  onChange={(event) => setFormulaire({ ...formulaire, remarques: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-[#1F7A8C]"
                  placeholder="Observations, diagnostic et conduite à tenir"
                />
              </label>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Ordonnance</h3>
                {formulaire.medicaments_prescrits.map((medicament, index) => (
                  <fieldset key={`medicament-${index}`} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                    <legend className="px-1 text-xs font-bold text-slate-600">Médicament {index + 1}</legend>
                    <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                      Nom
                      <input required={Object.entries(medicament).some(([champ, valeur]) => champ !== 'nom' && String(valeur || '').trim())} maxLength={300} value={medicament.nom} onChange={(event) => modifierMedicament(index, 'nom', event.target.value)} className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2.5 text-sm font-normal" />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">
                      Type de traitement
                      <select value={medicament.indication} onChange={(event) => modifierMedicament(index, 'indication', event.target.value)} className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm font-normal">
                        <option value="">Non précisé</option>
                        <option value="Traitement de fond de la migraine">Traitement de fond de la migraine</option>
                        <option value="Traitement de la crise migraineuse">Traitement de la crise migraineuse</option>
                        <option value="Traitement des douleurs neuropathiques">Traitement des douleurs neuropathiques</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-700">
                      Forme
                      <select
                        value={medicament.forme}
                        onChange={(event) => {
                          const forme = event.target.value;
                          setFormulaire((precedent) => ({
                            ...precedent,
                            medicaments_prescrits: precedent.medicaments_prescrits.map((element, i) => (
                              i === index
                                ? {
                                  ...element,
                                  forme,
                                  ...(forme !== 'solution_buvable' && {
                                    matin: element.matin === '' ? '' : String(Math.round(Number(element.matin))),
                                    midi: element.midi === '' ? '' : String(Math.round(Number(element.midi))),
                                    soir: element.soir === '' ? '' : String(Math.round(Number(element.soir))),
                                  }),
                                }
                                : element
                            )),
                          }));
                        }}
                        className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm font-normal"
                      >
                        <option value="">Non précisée</option>
                        <option value="comprime">Comprimé(s)</option>
                        <option value="solution_buvable">Solution buvable</option>
                        <option value="gelule">Gélule(s)</option>
                        <option value="autre">Autre</option>
                      </select>
                    </label>
                    {['matin', 'midi', 'soir'].map((moment) => (
                      <label key={moment} className="text-xs font-semibold capitalize text-slate-700">
                        {moment} · {medicament.forme === 'solution_buvable' ? 'mL' : 'unités'}
                        <input
                          type="number"
                          min="0"
                          step={medicament.forme === 'solution_buvable' ? '0.1' : '1'}
                          inputMode={medicament.forme === 'solution_buvable' ? 'decimal' : 'numeric'}
                          value={medicament[moment]}
                          onChange={(event) => modifierMedicament(index, moment, event.target.value)}
                          className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2.5 text-sm font-normal"
                        />
                      </label>
                    ))}
                    <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                      Posologie
                      <textarea maxLength={2000} rows={2} value={medicament.posologie} onChange={(event) => modifierMedicament(index, 'posologie', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm font-normal" />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">
                      Durée (jours)
                      <input type="number" min="1" max="3650" value={medicament.duree_jours} onChange={(event) => modifierMedicament(index, 'duree_jours', event.target.value)} className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2.5 text-sm font-normal" />
                    </label>
                    {formulaire.medicaments_prescrits.length > 1 && (
                      <button type="button" onClick={() => setFormulaire((precedent) => ({ ...precedent, medicaments_prescrits: precedent.medicaments_prescrits.filter((_, i) => i !== index) }))} aria-label={`Supprimer le médicament ${index + 1}`} className="mt-4 flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50">
                        <XCircle size={17} />
                      </button>
                    )}
                  </fieldset>
                ))}
                <button type="button" onClick={() => setFormulaire((precedent) => ({ ...precedent, medicaments_prescrits: [...precedent.medicaments_prescrits, { ...MEDICAMENT_VIDE }] }))} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#1F7A8C]/25 px-3 text-xs font-bold text-[#1F7A8C] hover:bg-[#1F7A8C]/5">
                  <Plus size={15} /> Ajouter un médicament
                </button>
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                Contrôle ou examen complémentaire
                <textarea maxLength={10000} rows={3} value={formulaire.controle_supplementaire} onChange={(event) => setFormulaire({ ...formulaire, controle_supplementaire: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Prochain rendez-vous
                <input type="datetime-local" value={formulaire.prochain_rendez_vous} onChange={(event) => setFormulaire({ ...formulaire, prochain_rendez_vous: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 font-normal" />
              </label>
              {erreur && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{erreur}</p>}
              {succes && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{succes}</p>}
              <button type="submit" disabled={enregistrement || Boolean(erreurChargement)} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1F7A8C] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#186575] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1F7A8C]/20 disabled:cursor-wait disabled:opacity-50">
                <Stethoscope size={17} /> {enregistrement ? 'Enregistrement…' : 'Enregistrer la consultation'}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

export default SeanceRendezVous;
