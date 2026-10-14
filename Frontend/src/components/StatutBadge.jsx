import { LIBELLE_STATUT } from './rendezVousUtils';

const STYLES_STATUT = {
  en_attente: 'bg-amber-50 text-amber-700',
  confirme: 'bg-emerald-50 text-emerald-700',
  arrive: 'bg-sky-50 text-sky-700',
  termine: 'bg-emerald-50 text-emerald-700',
  refuse: 'bg-red-50 text-red-700',
  annule: 'bg-red-50 text-red-700',
  absent: 'bg-slate-100 text-slate-600',
};

const POINTS_STATUT = {
  en_attente: 'bg-amber-500',
  confirme: 'bg-emerald-500',
  arrive: 'bg-sky-500',
  termine: 'bg-emerald-500',
  refuse: 'bg-red-500',
  annule: 'bg-red-500',
  absent: 'bg-slate-400',
};

export default function StatutBadge({ statut, libelle, className = '' }) {
  const statutNormalise = String(statut || '').toLowerCase();
  const style = STYLES_STATUT[statutNormalise] || 'bg-slate-100 text-slate-600';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style} ${className}`}>
      <i className={`h-1.5 w-1.5 shrink-0 rounded-full ${POINTS_STATUT[statutNormalise] || 'bg-slate-400'}`} />
      {libelle || LIBELLE_STATUT[statutNormalise] || statut}
    </span>
  );
}
