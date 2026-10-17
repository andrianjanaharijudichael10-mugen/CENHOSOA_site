import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function FenetreFormulaire({
  titre,
  description,
  erreur,
  onFermer,
  children,
  largeur = 'max-w-3xl',
}) {
  const fermerRef = useRef(onFermer);
  useEffect(() => {
    fermerRef.current = onFermer;
  }, [onFermer]);

  useEffect(() => {
    const debordementPrecedent = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const fermerAvecEchap = (evenement) => {
      if (evenement.key === 'Escape') fermerRef.current();
    };
    window.addEventListener('keydown', fermerAvecEchap);
    return () => {
      document.body.style.overflow = debordementPrecedent;
      window.removeEventListener('keydown', fermerAvecEchap);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-[#081B29]/80 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(evenement) => {
        if (evenement.target === evenement.currentTarget) onFermer();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-fenetre-formulaire"
        className={`flex max-h-[92dvh] w-full ${largeur} flex-col overflow-hidden bg-[#F7F6F2] shadow-[0_32px_100px_rgba(0,0,0,0.35)]`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 bg-gradient-to-r from-[#0A2233] via-[#0F3D52] to-[#1F7A8C] px-5 py-5 text-white sm:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7FD1CB]">CENHOSOA · Administration</p>
            <h2 id="titre-fenetre-formulaire" className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{titre}</h2>
            {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/70">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer la fenêtre"
            className="shrink-0 rounded-xl border border-white/15 bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FD1CB]"
          >
            <X size={20} />
          </button>
        </header>
        <div className="modal-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
          {erreur && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{erreur}</p>}
          {children}
        </div>
      </section>
    </div>
  );
}
