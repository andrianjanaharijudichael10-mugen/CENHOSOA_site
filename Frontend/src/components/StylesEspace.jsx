// ───────────────────────── StylesEspace.jsx ─────────────────────────
import { useEffect, useRef, useState } from 'react';

const SELECTEUR_REVELATION = '.apparition, [data-reveal], main article';
let utilisateursMoteur = 0;
let arreterMoteur = null;

// Moteur d'animations au scroll (un seul exemplaire actif, même si StylesEspace est monté plusieurs fois).
function demarrerMoteur() {
  const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const barre = document.createElement('div');
  barre.className = 'fx-progress';
  barre.setAttribute('aria-hidden', 'true');

  const haut = document.createElement('button');
  haut.type = 'button';
  haut.className = 'fx-top';
  haut.setAttribute('aria-label', 'Revenir en haut de la page');
  haut.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
  const surClicHaut = () => window.scrollTo({ top: 0, behavior: reduit ? 'auto' : 'smooth' });
  haut.addEventListener('click', surClicHaut);
  document.body.append(barre, haut);

  let image = 0;
  const majDefilement = () => {
    image = 0;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    barre.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    haut.classList.toggle('fx-top-visible', y > 600);
    document.querySelectorAll('.espace > header').forEach((entete) => {
      entete.classList.toggle('fx-header-scrolled', y > 8);
    });
    if (!reduit) {
      document.querySelectorAll('[class*="blur-[90px]"]').forEach((lueur, index) => {
        lueur.style.transform = `translate3d(0, ${Math.round(y * (index % 2 ? -0.05 : 0.07))}px, 0)`;
      });
    }
  };
  const surDefilement = () => {
    if (!image) image = requestAnimationFrame(majDefilement);
  };
  window.addEventListener('scroll', surDefilement, { passive: true });
  window.addEventListener('resize', surDefilement);
  majDefilement();

  // Révélation au scroll
  const vus = new WeakSet();
  const caches = new Set();
  let observateur = null;
  if (!reduit && 'IntersectionObserver' in window) {
    observateur = new IntersectionObserver((entrees) => {
      entrees
        .filter((entree) => entree.isIntersecting)
        .sort((a, b) => (
          a.boundingClientRect.top - b.boundingClientRect.top
          || a.boundingClientRect.left - b.boundingClientRect.left
        ))
        .forEach((entree, index) => {
          const element = entree.target;
          observateur.unobserve(element);
          caches.delete(element);
          element.style.setProperty('--rv-delay', `${Math.min(index, 5) * 70}ms`);
          element.classList.remove('rv-hidden');
          element.classList.add('rv-in');
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
  }
  const analyser = () => {
    if (!observateur) return;
    document.querySelectorAll(SELECTEUR_REVELATION).forEach((element) => {
      if (vus.has(element)) return;
      vus.add(element);
      if (element.getBoundingClientRect().top < window.innerHeight * 0.94) return;
      element.classList.add('rv-hidden');
      caches.add(element);
      observateur.observe(element);
    });
  };
  let analyseProgrammee = 0;
  const programmerAnalyse = () => {
    if (analyseProgrammee) return;
    analyseProgrammee = requestAnimationFrame(() => {
      analyseProgrammee = 0;
      analyser();
    });
  };
  const mutations = new MutationObserver(programmerAnalyse);
  mutations.observe(document.body, { childList: true, subtree: true });
  analyser();

  // Halo dynamique au survol des cartes
  const surPointeur = (evenement) => {
    const carte = evenement.target.closest?.('main article');
    if (!carte) return;
    const zone = carte.getBoundingClientRect();
    carte.style.setProperty('--mx', `${evenement.clientX - zone.left}px`);
    carte.style.setProperty('--my', `${evenement.clientY - zone.top}px`);
  };
  const survolPossible = window.matchMedia?.('(hover: hover)').matches && !reduit;
  if (survolPossible) document.addEventListener('pointermove', surPointeur, { passive: true });

  return () => {
    window.removeEventListener('scroll', surDefilement);
    window.removeEventListener('resize', surDefilement);
    if (survolPossible) document.removeEventListener('pointermove', surPointeur);
    haut.removeEventListener('click', surClicHaut);
    cancelAnimationFrame(image);
    cancelAnimationFrame(analyseProgrammee);
    mutations.disconnect();
    observateur?.disconnect();
    caches.forEach((element) => element.classList.remove('rv-hidden'));
    document.querySelectorAll('[class*="blur-[90px]"]').forEach((lueur) => { lueur.style.transform = ''; });
    document.querySelectorAll('.fx-header-scrolled').forEach((entete) => entete.classList.remove('fx-header-scrolled'));
    barre.remove();
    haut.remove();
  };
}

// Habillage commun des espaces connectés (design uniquement, aucune logique métier).
export const StylesEspace = () => {
  useEffect(() => {
    utilisateursMoteur += 1;
    if (utilisateursMoteur === 1) arreterMoteur = demarrerMoteur();
    return () => {
      utilisateursMoteur -= 1;
      if (utilisateursMoteur === 0) {
        arreterMoteur?.();
        arreterMoteur = null;
      }
    };
  }, []);

  return (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@200;300;400;500;600&display=swap');
    html { scroll-behavior: smooth; scroll-padding-top: 6rem; }
    .espace { position: relative; isolation: isolate; min-width: 0; max-width: 100%; overflow-x: clip; }
    .espace.min-h-screen { min-height: 100vh; min-height: 100svh; }
    @supports (min-height: 100dvh) {
      .espace.min-h-screen { min-height: 100dvh; }
    }
    .espace, .espace * { font-family: 'Inter Tight', system-ui, sans-serif; }
    .espace :where(main, section, article, form, dl) { min-width: 0; }
    .espace :where(h1, h2, h3, h4, p, td, th) { overflow-wrap: anywhere; }
    .espace :where(img, video, canvas) { max-width: 100%; }
    .espace h1, .espace h2, .espace h3 { font-weight: 300; letter-spacing: -0.025em; }
    .espace h4 { font-weight: 500; }
    .espace ::selection { background: #1F7A8C; color: #fff; }
    .espace input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="submit"]):not([type="button"]):not([type="reset"]),
    .espace textarea,
    .espace select {
      border-color: #e2e8f0;
      transition: border-color .2s ease, box-shadow .2s ease;
    }
    .espace input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="submit"]):not([type="button"]):not([type="reset"]):focus,
    .espace textarea:focus,
    .espace select:focus {
      border-color: #1F7A8C;
      outline: none;
      box-shadow: 0 0 0 2px rgba(31,122,140,.2);
    }
    .espace::before {
      content: ''; position: absolute; inset: 0 0 auto 0; height: 460px; z-index: -1; pointer-events: none;
      background:
        radial-gradient(60% 100% at 12% 0%, rgba(31,122,140,.20), transparent 70%),
        radial-gradient(45% 90% at 92% 0%, rgba(127,209,203,.22), transparent 70%);
    }

    @keyframes apparition { from { opacity: 0; transform: translateY(14px); } }
    .apparition { animation: apparition .65s cubic-bezier(.2,.7,.2,1) backwards; }
    .apparition:nth-child(2) { animation-delay: .06s; } .apparition:nth-child(3) { animation-delay: .12s; }
    .apparition:nth-child(4) { animation-delay: .18s; } .apparition:nth-child(5) { animation-delay: .24s; }
    .apparition:nth-child(6) { animation-delay: .30s; } .apparition:nth-child(n+7) { animation-delay: .36s; }
    @keyframes zoom-entree { from { opacity: 0; transform: scale(.96); } }
    .animate-in { animation: zoom-entree .22s ease-out; }
    .espace button:not(:disabled):active { transform: scale(.97); }

    /* Révélation au scroll */
    @keyframes revelation { from { opacity: 0; transform: translate3d(0, 28px, 0) scale(.985); } }
    .rv-hidden { opacity: 0 !important; transform: translate3d(0, 28px, 0) scale(.985) !important; animation: none !important; }
    .rv-in { animation: revelation .8s cubic-bezier(.2,.7,.2,1) var(--rv-delay, 0s) backwards !important; }

    /* Barre de progression du scroll */
    .fx-progress {
      position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 200; pointer-events: none;
      transform-origin: left center; transform: scaleX(0);
      background: linear-gradient(90deg, #1F7A8C, #7FD1CB);
      box-shadow: 0 0 12px rgba(127,209,203,.7);
      transition: transform .12s linear;
    }

    /* Bouton retour en haut */
    .fx-top {
      position: fixed; right: max(20px, env(safe-area-inset-right)); bottom: max(20px, env(safe-area-inset-bottom)); z-index: 90; width: 46px; height: 46px;
      display: flex; align-items: center; justify-content: center; border-radius: 9999px;
      border: 1px solid rgba(255,255,255,.18); background: #0A2233; color: #7FD1CB;
      box-shadow: 0 12px 28px -8px rgba(10,34,51,.55);
      opacity: 0; transform: translateY(14px) scale(.9); pointer-events: none; cursor: pointer;
      transition: opacity .35s ease, transform .35s cubic-bezier(.2,.7,.2,1), background-color .2s, color .2s;
    }
    .fx-top.fx-top-visible { opacity: 1; transform: none; pointer-events: auto; }
    .fx-top:hover { background: #7FD1CB; color: #0A2233; transform: translateY(-3px); }
    .fx-top:active { transform: scale(.94); }

    /* En-tête dynamique */
    .espace > header { padding-top: env(safe-area-inset-top); transition: box-shadow .35s ease, background-color .35s ease; }
    .espace > header.fx-header-scrolled { box-shadow: 0 14px 34px -14px rgba(10,34,51,.6); }
    @media (max-width: 639px) {
      .espace :where(table) { font-size: .8125rem; }
      .espace :where(button, a[href]) { touch-action: manipulation; }
    }

    /* Cartes : survol + halo qui suit le curseur */
    .espace main article, main.anim article { position: relative; transition: transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s ease, border-color .35s ease; }
    .espace main article::after, main.anim article::after {
      content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0;
      background: radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), rgba(31,122,140,.10), transparent 70%);
      transition: opacity .35s ease;
    }
    @media (hover: hover) {
      .espace main article:hover, main.anim article:hover { box-shadow: 0 18px 38px -16px rgba(31,122,140,.28); }
      .espace main article:hover::after, main.anim article:hover::after { opacity: 1; }
      .espace main li:hover > article { transform: none; }
    }

    /* Boutons & liens : retour tactile */
    .espace button:not(:disabled), .espace a[href], main.anim button:not(:disabled) { cursor: pointer; }
    @media (hover: hover) {
      .espace button:not(:disabled):not(.fx-top):hover { filter: brightness(1.04); }
      .espace tbody tr { transition: background-color .25s ease; }
    }

    /* Accordéons : contenu qui se déploie */
    @keyframes deploiement { from { opacity: 0; transform: translateY(-8px); } }
    .espace details[open] > :not(summary) { animation: deploiement .4s cubic-bezier(.2,.7,.2,1); }

    /* Barres et graphiques : croissance quand ils entrent à l'écran */
    @keyframes croissance { from { transform: scaleX(0); } }
    @keyframes anneau { from { opacity: 0; transform: scale(.8) rotate(-40deg); } }
    .espace .overflow-hidden.rounded-full > div[style*="width"],
    .espace [role="progressbar"] > div,
    main.anim .overflow-hidden.rounded-full > div[style*="width"] {
      transform-origin: left center; animation: croissance 1s cubic-bezier(.2,.7,.2,1) .15s backwards;
    }
    .espace [role="img"][style*="conic-gradient"] { animation: anneau .9s cubic-bezier(.2,.7,.2,1) .1s backwards; }
    .rv-hidden .overflow-hidden.rounded-full > div[style*="width"],
    .rv-hidden [role="progressbar"] > div { animation: none !important; transform: scaleX(0); }
    .rv-hidden [role="img"][style*="conic-gradient"] { animation: none !important; opacity: 0; }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      .apparition, .animate-in, .rv-in, .espace details[open] > :not(summary),
      .espace .overflow-hidden.rounded-full > div[style*="width"], .espace [role="progressbar"] > div,
      .espace [role="img"][style*="conic-gradient"] { animation: none !important; }
      .rv-hidden { opacity: 1 !important; transform: none !important; }
      .fx-progress, .fx-top, .espace main article { transition: none; }
    }
  `}</style>
  );
};

// Compteur animé : démarre quand l'indicateur devient visible.
export function Compteur({ valeur, duree = 900 }) {
  const reference = useRef(null);
  const [vu, setVu] = useState(false);
  const [affiche, setAffiche] = useState(typeof valeur === 'number' ? 0 : valeur);
  const precedent = useRef(0);

  useEffect(() => {
    const element = reference.current;
    if (!element || typeof IntersectionObserver === 'undefined') { setVu(true); return undefined; }
    const observateur = new IntersectionObserver(([entree]) => {
      if (entree.isIntersecting) { setVu(true); observateur.disconnect(); }
    }, { threshold: 0.2 });
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);

  useEffect(() => {
    if (typeof valeur !== 'number') { setAffiche(valeur); return undefined; }
    if (!vu) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setAffiche(valeur); return undefined; }
    const depart = precedent.current;
    const debut = performance.now();
    let image;
    const pas = (maintenant) => {
      const t = Math.min(1, (maintenant - debut) / duree);
      setAffiche(Math.round(depart + (valeur - depart) * (1 - (1 - t) ** 3)));
      if (t < 1) image = requestAnimationFrame(pas);
      else precedent.current = valeur;
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [valeur, duree, vu]);

  return <span ref={reference}>{affiche}</span>;
}

export const BTN_CLAIR = 'group inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#0A2233] transition hover:-translate-y-0.5 hover:bg-[#7FD1CB] hover:shadow-lg hover:shadow-black/20';
export const BTN_VERRE = 'inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20';

// Grand bandeau d'en-tête de page : titre fin, sous-titre, actions et indicateurs animés.
export function BandeauPage({ etiquette, titre, accent, sousTitre, actions, stats = [] }) {
  return (
    <section className="apparition relative overflow-hidden rounded-[2rem] bg-[#0A2233] px-6 py-9 text-white sm:px-10 sm:py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A2233] via-[#0F3D52]/80 to-[#0A2233]" />
      <div className="absolute -left-20 -top-24 h-72 w-72 animate-pulse rounded-full bg-[#1F7A8C]/50 blur-[90px]" />
      <div className="absolute -bottom-28 right-0 h-72 w-72 animate-pulse rounded-full bg-[#7FD1CB]/30 blur-[90px]" />
      <div className={`relative grid items-end gap-8 ${stats.length ? 'lg:grid-cols-[1.3fr_1fr]' : ''}`}>
        <div>
          {etiquette && <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">{etiquette}</p>}
          <h2 className="mt-4 text-3xl font-light leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl">
            {titre}{accent && <><br /><span className="text-white/40">{accent}</span></>}
          </h2>
          {sousTitre && <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-white/70 sm:text-base">{sousTitre}</p>}
          {actions && <div className="mt-7 flex flex-wrap gap-3">{actions}</div>}
        </div>
        {stats.length > 0 && (
          <dl className="grid grid-cols-2 gap-3">
            {stats.map(({ libelle, valeur }) => (
              <div key={libelle} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/15 hover:shadow-lg hover:shadow-black/10">
                <dd className="truncate text-3xl font-light tabular-nums"><Compteur valeur={valeur} /></dd>
                <dt className="mt-1 text-[10px] uppercase tracking-widest text-white/60">{libelle}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}