import { Calendar, Clock, FileText, XCircle } from 'lucide-react';
import StatutBadge from './StatutBadge';

export default function CarteRendezVous({ rendezVous, date, actif, enregistrement, onAnnuler }) {
  return (
    <article className="group flex flex-wrap items-start gap-4 border-b border-slate-100 px-5 py-5 transition-colors hover:bg-[#F4F2EE]/60 last:border-b-0 sm:flex-nowrap sm:items-center sm:px-6">
      <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${actif ? 'bg-[#0A2233] text-white' : 'bg-slate-100 text-slate-500'}`}>
        <span className="text-2xl font-light leading-none tabular-nums">{date.getDate()}</span>
        <span className={`mt-1 text-[10px] uppercase tracking-wider ${actif ? 'text-[#7FD1CB]' : 'text-slate-400'}`}>
          {new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-normal tracking-normal text-[#0A2233]">{rendezVous.specialite}</h3>
          <StatutBadge statut={rendezVous.statutApi} libelle={rendezVous.statut} />
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-light text-slate-600">
          <span className="inline-flex items-center gap-1.5"><Calendar size={14} className="text-[#5B7480]" />{rendezVous.date}</span>
          <span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-[#5B7480]" />{rendezVous.heure}</span>
          {rendezVous.numero_file && (
            <span className="inline-flex items-center rounded-full bg-[#1F7A8C]/10 px-2.5 py-0.5 text-xs font-medium text-[#1F7A8C]">
              File d’attente · N° {rendezVous.numero_file}
            </span>
          )}
        </p>
        <p className="mt-2 flex items-start gap-2 text-sm font-light text-slate-500">
          <FileText size={14} className="mt-0.5 shrink-0" />{rendezVous.motif}
        </p>
      </div>
      {['en_attente', 'confirme'].includes(rendezVous.statutApi) && (
        <button
          type="button"
          disabled={enregistrement}
          onClick={onAnnuler}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-200/80 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          <XCircle size={15} /> Annuler
        </button>
      )}
    </article>
  );
}
