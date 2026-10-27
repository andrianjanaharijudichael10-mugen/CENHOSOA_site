import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone, Calendar, ShieldCheck, Award, Users, Ambulance,
  Clock, HeartPulse, Stethoscope, Activity, MapPin,
  Mail, ChevronRight, Menu, X, ArrowRight, Star, Brain, Baby, ScanLine, User, Navigation, ExternalLink, ChevronLeft, LogOut, ChevronUp, ChevronDown
} from 'lucide-react';

import LoginCenhosoa from './components/LoginCenhosoa';
import GestionRendezVousCenhosoa from './components/RendezVous';
import SuperAdmin from './components/SuperAdmin';
import GestionUrgences from './components/GestionUrgences';
import DemandeAmbulancePatient from './components/DemandeAmbulancePatient';
import {
  effacerTokens,
  listerActualites,
  listerServices,
  obtenirProfil, obtenirTokenStocke,
} from './services/api';
import { demarrerConnexionTempsReel, ecouterDonneesModifiees } from './services/tempsReel';

import cenhosoaEntrance from './assets/logo/Gemini_Generated_Image_ndofqwndofqwndof.jpg';
import image1787170777 from './assets/logo/image1787170777.jpg';
import logoImage from './assets/logo/logo.jpeg';
import logoExpress from "./assets/logo/Logo_L'Express_de_Madagascar.jpg";
import logoMoov from './assets/logo/logo_moov.png';
import logoAllAfrica from './assets/logo/logo_all_africa.png';

const IMAGES_HERO = [
  { source: cenhosoaEntrance, alternative: "CENHOSOA Vue 1" },
  { source: image1787170777, alternative: "CENHOSOA Vue 2" }
];

const DONNEES_VALEURS = [
  { 
    titre: "Modernisation des infrastructures", 
    description: "Un vaste plan de mise à niveau et de réhabilitation des structures pour célébrer 135 ans d'engagement.", 
    icone: Activity 
  },
  { 
    titre: "Capacité d'accueil renforcée", 
    description: "Optimisation continue des structures pour fluidifier les parcours et accueillir davantage de patients.", 
    icone: Users 
  },
  { 
    titre: "Sécurité & accréditation", 
    description: "Une démarche qualité rigoureuse et des équipements certifiés de dernière génération.", 
    icone: ShieldCheck 
  },
  { 
    titre: "Partenariats & excellence", 
    description: "Un soutien combiné de l'État et des partenaires techniques pour propulser les soins de santé de pointe.", 
    icone: Award 
  },
];

const ICONE_PAR_DEFAUT = Stethoscope;
const COORDONNEES_CENTRE = {
  adresse: '6 bis, Rue du Dr Moss, Soavinandriana, Antananarivo 101, Madagascar',
  telephones: [
    { libelle: 'Téléphones fixes', numeros: ['+261 20 23 397 51', '+261 20 22 593 57'] },
    {
      libelle: 'Téléphones portables',
      numeros: ['+261 32 11 049 00', '+261 32 11 049 27', '+261 32 11 050 59', '+261 32 11 049 09'],
    },
  ],
  email: 'secdircenhosoa@gmail.com',
};

const ICONES_PAR_NOM_SERVICE = {
  "Cardiologie": HeartPulse,
  "Pédiatrie": Baby,
  "Neurologie": Brain,
  "Gynécologie - Obstétrique": Stethoscope,
  "Imagerie Médicale": ScanLine,
};

const LIENS_NAVIGATION = [
  { lien: '#accueil', libelle: 'Accueil' },
  { lien: '#specialites', libelle: 'Spécialités' },
  { lien: '#temoignages', libelle: 'Témoignages & Presse' },
  { lien: '#recherche', libelle: 'Localisation' },
];

const DONNEES_TEMOIGNAGES = [
  {
    citation: "Nous accompagnons régulièrement des proches ici, et la prise en charge y est excellente. Les soignants assurent un suivi rigoureux et la propreté est tout à fait satisfaisante.",
    auteur: "Eugène Randriamalala",
    role: "Proche de patient",
    texteSource: "L'Express de Madagascar",
    urlSource: "https://www.lexpress.mg/2026/08/sante-lhopital-militaire-porte-le-poids.html",
    urlLogo: logoExpress
  },
  {
    citation: "Le centre hospitalier Soavinandriana (Cenhsoa) s'agrandit pour son 135e anniversaire et ouvre de nouveaux services de référence inédits, renforçant l'offre de soins pour les usagers.",
    auteur: "Miangaly Ralitera",
    role: "Journaliste / Rapport de santé publique",
    texteSource: "AllAfrica / L'Express",
    urlSource: "https://fr.allafrica.com/stories/202608170594.html",
    urlLogo: logoAllAfrica
  },
  {
    citation: "L'établissement s'affirme comme un pôle de référence majeur à Madagascar, proposant des soins de pointe allant des interventions cardiovasculaires aux nouvelles filières spécialisées.",
    auteur: "Moov Madagascar",
    role: "Revue institutionnelle & Historique",
    texteSource: "Moov.mg",
    urlSource: "https://www.moov.mg/article/119985-hopital-militaire-de-soavinandriana-le-cenhosoa-celebre-135-ans-dhistoire-et-de-soins",
    urlLogo: logoMoov
  }
];

const DELAI_ROTATION_HERO = 15000;

const ACTUALITES_HERO = [
  { debut: "Des soins de référence, au cœur d'", accent: "Antananarivo." },
];

const prefereMouvementReduit = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const abonnesDefilement = new Set();
let imageDefilement = 0;

const surDefilementGlobal = () => {
  if (imageDefilement) return;
  imageDefilement = requestAnimationFrame(() => {
    imageDefilement = 0;
    abonnesDefilement.forEach((rappel) => rappel(window.scrollY));
  });
};

function abonnerDefilement(rappel) {
  if (abonnesDefilement.size === 0) {
    window.addEventListener('scroll', surDefilementGlobal, { passive: true });
    window.addEventListener('resize', surDefilementGlobal);
  }
  abonnesDefilement.add(rappel);
  rappel(window.scrollY);
  return () => {
    abonnesDefilement.delete(rappel);
    if (abonnesDefilement.size === 0) {
      window.removeEventListener('scroll', surDefilementGlobal);
      window.removeEventListener('resize', surDefilementGlobal);
    }
  };
}

function useRevelation(seuil = 0.15) {
  const reference = useRef(null);
  const [estVisible, fixerEstVisible] = useState(false);
  
  useEffect(() => {
    const noeud = reference.current;
    if (!noeud) return;
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          fixerEstVisible(true);
          observateur.unobserve(noeud);
        }
      },
      { threshold: seuil, rootMargin: '0px 0px -6% 0px' }
    );
    observateur.observe(noeud);
    return () => observateur.disconnect();
  }, [seuil]);
  
  return [reference, estVisible];
}

function useParallaxe(vitesse = 0.12) {
  const reference = useRef(null);

  useEffect(() => {
    const noeud = reference.current;
    const conteneur = noeud ? noeud.parentElement : null;
    if (!noeud || !conteneur || prefereMouvementReduit()) return;

    let visible = true;
    const observateur = new IntersectionObserver(
      ([entree]) => { visible = entree.isIntersecting; },
      { rootMargin: '150px 0px' }
    );
    observateur.observe(conteneur);

    const desabonner = abonnerDefilement(() => {
      if (!visible) return;
      const rect = conteneur.getBoundingClientRect();
      const decalage = (rect.top + rect.height / 2 - window.innerHeight / 2) * -vitesse;
      noeud.style.transform = `translate3d(0, ${decalage.toFixed(1)}px, 0)`;
    });

    return () => {
      observateur.disconnect();
      desabonner();
    };
  }, [vitesse]);

  return reference;
}

function useEstompageHero() {
  const reference = useRef(null);

  useEffect(() => {
    const noeud = reference.current;
    if (!noeud || prefereMouvementReduit()) return;

    return abonnerDefilement((y) => {
      const hauteur = window.innerHeight;
      if (y > hauteur * 1.2) return;
      const progression = Math.min(1, y / (hauteur * 0.75));
      noeud.style.opacity = String(1 - progression);
      noeud.style.transform = `translate3d(0, ${(y * 0.22).toFixed(1)}px, 0)`;
    });
  }, []);

  return reference;
}

const Parallaxe = ({ vitesse = 0.12, className = '', children }) => {
  const reference = useParallaxe(vitesse);
  return (
    <div ref={reference} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
};

const EstompageHero = ({ className = '', children }) => {
  const reference = useEstompageHero();
  return (
    <div ref={reference} className={className}>
      {children}
    </div>
  );
};

const Magnetique = ({ children, force = 0.22, className = '' }) => {
  const reference = useRef(null);

  const surMouvement = (evenement) => {
    if (evenement.pointerType !== 'mouse' || !reference.current) return;
    const rect = reference.current.getBoundingClientRect();
    const dx = evenement.clientX - (rect.left + rect.width / 2);
    const dy = evenement.clientY - (rect.top + rect.height / 2);
    reference.current.style.transform = `translate3d(${(dx * force).toFixed(1)}px, ${(dy * force).toFixed(1)}px, 0)`;
  };

  const surSortie = () => {
    if (reference.current) reference.current.style.transform = '';
  };

  return (
    <div
      ref={reference}
      onPointerMove={surMouvement}
      onPointerLeave={surSortie}
      className={`block w-fit transition-transform duration-300 ease-out ${className}`}
    >
      {children}
    </div>
  );
};

const MotsAnimes = ({ texte, debut = 0, pas = 70, collant = false, anime = true }) => {
  const mots = texte.split(' ');
  return mots.map((mot, index) => (
    <React.Fragment key={`${mot}-${index}`}>
      <span className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
        <span
          className={anime ? 'mot-anim' : 'inline-block'}
          style={anime ? { animationDelay: `${debut + index * pas}ms` } : undefined}
        >
          {mot}
        </span>
      </span>
      {!(collant && index === mots.length - 1) && ' '}
    </React.Fragment>
  ));
};

const OutilsDefilement = () => {
  const barre = useRef(null);
  const anneau = useRef(null);
  const [boutonVisible, fixerBoutonVisible] = useState(false);

  useEffect(() => {
    let affiche = false;
    return abonnerDefilement((y) => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const progression = total > 0 ? Math.min(1, Math.max(0, y / total)) : 0;
      if (barre.current) barre.current.style.transform = `scaleX(${progression})`;
      if (anneau.current) anneau.current.style.strokeDashoffset = String(1 - progression);
      const doitAfficher = y > 600;
      if (doitAfficher !== affiche) {
        affiche = doitAfficher;
        fixerBoutonVisible(doitAfficher);
      }
    });
  }, []);

  return (
    <>
      <div aria-hidden="true" className="fixed top-0 left-0 right-0 z-[60] h-[3px] pointer-events-none">
        <div
          ref={barre}
          className="h-full origin-left bg-gradient-to-r from-[#7FD1CB] via-[#1F7A8C] to-[#7FD1CB]"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      <button
        type="button"
        aria-label="Retour en haut de la page"
        tabIndex={boutonVisible ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`group fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-[#0A2233]/90 text-white shadow-xl backdrop-blur-md flex items-center justify-center transition-all duration-500 hover:bg-[#1F7A8C] hover:-translate-y-1 ${boutonVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-75 pointer-events-none'}`}
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          <circle
            ref={anneau}
            cx="24" cy="24" r="22"
            fill="none"
            stroke="#7FD1CB"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            style={{ strokeDashoffset: 1 }}
          />
        </svg>
        <ChevronUp className="relative w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
      </button>
    </>
  );
};

const StylesGlobaux = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@200;300;400;500&display=swap');
    html { scroll-behavior: smooth; scroll-padding-top: 5rem; }
    .fine, .fine * { font-family: 'Inter Tight', system-ui, sans-serif; }
    .fine h1, .fine h2, .fine h3 { font-weight: 300; }
    @keyframes blob-float {
      0%, 100% { transform: translate(0,0) scale(1); }
      33% { transform: translate(30px,-40px) scale(1.12); }
      66% { transform: translate(-24px,26px) scale(0.94); }
    }
    .animate-blob { animation: blob-float 16s ease-in-out infinite; }
    .animate-blob-slow { animation: blob-float 22s ease-in-out infinite; animation-delay: -7s; }

    .dot-grid {
      background-image: radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px);
      background-size: 22px 22px;
    }

    @keyframes progress-fill {
      from { width: 0%; }
      to { width: 100%; }
    }

    @keyframes rev-in {
      from { opacity: 0; transform: var(--rev-from, translate3d(0, 40px, 0)); }
      to { opacity: 1; transform: none; }
    }
    @keyframes rev-in-flou {
      from { opacity: 0; transform: var(--rev-from, translate3d(0, 24px, 0)); filter: blur(14px); }
      to { opacity: 1; transform: none; filter: blur(0); }
    }
    .rev-cache { opacity: 0; }
    .rev-visible {
      opacity: 1;
      animation: rev-in 1s cubic-bezier(0.22, 1, 0.36, 1) backwards;
      animation-delay: var(--rev-delai, 0ms);
    }
    .rev-visible.rev-flou { animation-name: rev-in-flou; }

    @keyframes mot-monte {
      from { transform: translateY(110%) rotate(4deg); opacity: 0; }
      to { transform: none; opacity: 1; }
    }
    .mot-anim { display: inline-block; animation: mot-monte 1s cubic-bezier(0.22, 1, 0.36, 1) both; }

    @keyframes kenburns {
      from { transform: scale(1.02); }
      to { transform: scale(1.12) translate3d(-1%, -1%, 0); }
    }
    .animate-kenburns { animation: kenburns 16s ease-in-out infinite alternate; }

    @keyframes defiler-point {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(280%); }
    }
    .animate-defiler-point { animation: defiler-point 1.8s cubic-bezier(0.65, 0, 0.35, 1) infinite; }

    @keyframes menu-in {
      from { opacity: 0; transform: translateY(-12px); }
      to { opacity: 1; transform: none; }
    }
    .animate-menu-in { animation: menu-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
    @keyframes lien-in {
      from { opacity: 0; transform: translateX(-16px); }
      to { opacity: 1; transform: none; }
    }
    .animate-lien-in { animation: lien-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
    @keyframes icone-rot {
      from { opacity: 0; transform: rotate(-90deg) scale(0.6); }
      to { opacity: 1; transform: none; }
    }
    .animate-icone-rot { animation: icone-rot 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }

    @keyframes carte-entree {
      from { opacity: 0; transform: translateY(18px) scale(0.985); }
      to { opacity: 1; transform: none; }
    }
    .animate-carte-entree { animation: carte-entree 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; }

    @keyframes etoile-pop {
      0% { opacity: 0; transform: scale(0) rotate(-40deg); }
      100% { opacity: 1; transform: none; }
    }
    .animate-etoile { animation: etoile-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

    @keyframes pulse-ring {
      0% { transform: scale(1); opacity: 0.55; }
      100% { transform: scale(1.8); opacity: 0; }
    }
    .animate-pulse-ring { animation: pulse-ring 2.4s cubic-bezier(0, 0, 0.2, 1) infinite; }

    .carte-lueur { position: relative; overflow: hidden; isolation: isolate; }
    .carte-lueur::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.4s ease;
      background: radial-gradient(380px circle at var(--mx, 50%) var(--my, 50%), rgba(127, 209, 203, 0.22), transparent 45%);
    }
    .carte-lueur:hover::before { opacity: 1; }

    .btn-brillance { position: relative; overflow: hidden; }
    .btn-brillance::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(110deg, transparent 30%, rgba(127, 209, 203, 0.45) 50%, transparent 70%);
      transform: translateX(-120%);
      transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .btn-brillance:hover::after { transform: translateX(120%); }

    @keyframes modale-fond { from { opacity: 0; } to { opacity: 1; } }
    .animate-modale-fond { animation: modale-fond 0.35s ease-out both; }

    @keyframes modale-fond-sortie { from { opacity: 1; } to { opacity: 0; } }
    @keyframes modale-panneau-sortie {
      from { opacity: 1; transform: none; }
      to { opacity: 0; transform: translateY(16px) scale(0.95); }
    }
    .animate-modale-fond-sortie { animation: modale-fond-sortie 0.28s ease-in both; }
    .animate-modale-panneau-sortie { animation: modale-panneau-sortie 0.28s cubic-bezier(0.4, 0, 1, 1) both; }

    @keyframes modale-panneau-v2 {
      0% { opacity: 0; transform: translateY(32px) scale(0.94); filter: blur(6px); }
      60% { opacity: 1; filter: blur(0); }
      100% { opacity: 1; transform: none; filter: blur(0); }
    }
    .animate-modale-panneau { animation: modale-panneau-v2 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }

    @keyframes modale-halo {
      0%, 100% { transform: scale(1); opacity: 0.45; }
      50% { transform: scale(1.18); opacity: 0.15; }
    }
    .animate-modale-halo { animation: modale-halo 3.2s ease-in-out infinite; }

    @keyframes modale-trait { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .animate-modale-trait { transform-origin: left; animation: modale-trait 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.45s both; }

    .modale-scroll::-webkit-scrollbar { width: 6px; }
    .modale-scroll::-webkit-scrollbar-thumb { background: rgba(10, 34, 51, 0.15); border-radius: 999px; }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      .rev-cache { opacity: 1; }
      .rev-visible { animation: none; }
      .animate-kenburns, .animate-pulse-ring, .animate-defiler-point, .animate-modale-halo { animation: none; }
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `}</style>
);

const VARIANTES_REVELATION = {
  haut: 'translate3d(0, 40px, 0)',
  bas: 'translate3d(0, -40px, 0)',
  gauche: 'translate3d(-56px, 0, 0)',
  droite: 'translate3d(56px, 0, 0)',
  zoom: 'scale(0.92)',
  flou: 'translate3d(0, 24px, 0)',
};

const Revelation = ({ children, className = '', delai = 0, variante = 'haut', as: Balise = 'div' }) => {
  const [reference, estVisible] = useRevelation();
  const classeEtat = estVisible
    ? (variante === 'flou' ? 'rev-visible rev-flou' : 'rev-visible')
    : 'rev-cache';
  return (
    <Balise
      ref={reference}
      className={`${classeEtat} ${className}`}
      style={{
        '--rev-from': VARIANTES_REVELATION[variante] || VARIANTES_REVELATION.haut,
        '--rev-delai': `${delai}ms`,
      }}
    >
      {children}
    </Balise>
  );
};

const BarreNavigation = ({
  profil,
  surOuvertureConnexion,
  surOuvertureRendezVous,
  surDemandeAmbulance,
  surDeconnexion,
  menuMobileOuvert,
  fixerMenuMobileOuvert,
}) => {
  const [defile, fixerDefile] = useState(false);
  const [sectionActive, fixerSectionActive] = useState('accueil');

  useEffect(() => {
    const surDefilement = () => fixerDefile(window.scrollY > 40);
    surDefilement();
    window.addEventListener('scroll', surDefilement, { passive: true });
    return () => window.removeEventListener('scroll', surDefilement);
  }, []);

  useEffect(() => {
    const noeuds = LIENS_NAVIGATION
      .map(({ lien }) => document.getElementById(lien.slice(1)))
      .filter(Boolean);
    if (noeuds.length === 0) return;
    const observateur = new IntersectionObserver(
      (entrees) => {
        entrees.forEach((entree) => {
          if (entree.isIntersecting) fixerSectionActive(entree.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    noeuds.forEach((noeud) => observateur.observe(noeud));
    return () => observateur.disconnect();
  }, []);

  const liens = LIENS_NAVIGATION;
  const estPatient = profil?.role === 'patient';
  const navigationTransparente = sectionActive === 'accueil' && !menuMobileOuvert;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 border-b pt-[env(safe-area-inset-top)] transition-all duration-500 ${
      navigationTransparente
        ? 'border-transparent bg-transparent text-white'
        : 'border-black/5 bg-white text-[#0A2233]'
    } ${defile && !navigationTransparente ? 'shadow-[0_8px_30px_-12px_rgba(10,34,51,0.25)]' : ''}`}>
      <div className={`max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between transition-[height] duration-500 ${defile ? 'h-16' : 'h-20'}`}>
        <a href="#accueil" className="group flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-white p-1.5 flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105">
            <img src={logoImage} alt="Logo CENHOSOA" className="w-full h-full object-contain" />
          </div>
          <div className="leading-tight">
            <span className="text-lg font-light tracking-[0.18em] block">CENHOSOA</span>
            <span className={`hidden sm:block text-[10px] tracking-[0.2em] uppercase transition-all duration-500 ${navigationTransparente ? 'text-white/70' : 'text-slate-500'} ${defile ? 'max-h-0 opacity-0' : 'max-h-4 opacity-100'}`}>Centre Hospitalier de Soavinandriana</span>
          </div>
        </a>

        <nav className={`hidden md:flex items-center ${estPatient ? 'space-x-4 lg:space-x-6' : 'space-x-9'} text-[13px] font-light tracking-wide`}>
          {liens.map(({ lien, libelle }) => {
            const actif = sectionActive === lien.slice(1);
            return (
              <a
                key={lien}
                href={lien}
                aria-current={actif ? 'true' : undefined}
                className={`relative py-1 transition-opacity group ${actif ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
              >
                {libelle}
                <span className={`absolute left-0 -bottom-0.5 h-px bg-current transition-all duration-500 ${actif ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </a>
            );
          })}
        </nav>

        <div className={`hidden md:flex items-center ${estPatient ? 'space-x-2' : 'space-x-3'}`}>
          <button
            type="button"
            onClick={surDemandeAmbulance}
            className={`btn-brillance inline-flex items-center rounded-full bg-[#7FD1CB] text-[#0A2233] transition-all duration-300 hover:bg-white hover:scale-105 active:scale-95 ${estPatient ? 'space-x-1.5 px-3 py-2 text-xs tracking-normal' : 'space-x-2 px-4 py-2.5 text-[13px] font-semibold tracking-wide'}`}
          >
            <Ambulance className={estPatient ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4'} />
            <span>{estPatient ? 'Ambulance' : 'Demander une ambulance'}</span>
          </button>
          <button
            onClick={estPatient ? surOuvertureRendezVous : surOuvertureConnexion}
            className={`rounded-full border ${navigationTransparente ? 'border-white/50' : 'border-[#0A2233]/20'} transition-all duration-300 active:scale-95 flex items-center hover:bg-[#0A2233] hover:text-white ${estPatient ? 'space-x-1.5 px-3 py-2 text-xs tracking-normal' : 'space-x-2 px-5 py-2.5 text-[13px] tracking-wide'}`}
          >
            {estPatient ? <Calendar className="h-3.5 w-3.5 shrink-0" /> : <User className="w-4 h-4" />}
            <span>{estPatient ? 'Rendez-vous' : 'Login'}</span>
          </button>
          {estPatient && (
            <button
              type="button"
              onClick={surDeconnexion}
              className="flex items-center space-x-1.5 rounded-full bg-red-600 px-3 py-2 text-xs tracking-normal text-white transition-all duration-300 hover:bg-red-700 active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>Déconnexion</span>
            </button>
          )}
        </div>

        <button
          onClick={() => fixerMenuMobileOuvert(!menuMobileOuvert)}
          aria-label="Menu"
          aria-expanded={menuMobileOuvert}
          aria-controls="navigation-mobile"
          className="md:hidden p-2.5 rounded-full focus:outline-none active:scale-90 transition-transform"
        >
          <span key={menuMobileOuvert ? 'ferme' : 'ouvre'} className="inline-flex animate-icone-rot">
            {menuMobileOuvert ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </span>
        </button>
        {estPatient && (
          <button
            type="button"
            onClick={surDeconnexion}
            aria-label="Déconnexion"
            title="Déconnexion"
            className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-600 bg-red-50 text-red-600 transition-colors hover:bg-red-100 active:scale-95"
          >
            <LogOut className="h-4 w-4 text-red-600" />
          </button>
        )}
      </div>

      {menuMobileOuvert && (
        <div
          id="navigation-mobile"
          className="animate-menu-in fixed inset-x-0 top-[calc(env(safe-area-inset-top)+5rem)] z-[60] max-h-[calc(100dvh-env(safe-area-inset-top)-5rem)] overflow-y-auto overscroll-contain border-b border-black/5 bg-white px-6 pt-2 pb-6 text-[#0A2233] md:hidden"
        >
          <nav aria-label="Navigation mobile" className="space-y-1">
            {liens.map(({ lien, libelle }, index) => (
              <a
                key={lien}
                href={lien}
                onClick={() => fixerMenuMobileOuvert(false)}
                className="animate-lien-in block border-b border-black/5 py-3 text-xl font-light"
                style={{ animationDelay: `${60 + index * 60}ms` }}
              >
                {libelle}
              </a>
            ))}
          </nav>
          <div className="animate-lien-in space-y-2 pt-4" style={{ animationDelay: `${60 + liens.length * 60}ms` }}>
            <button
              type="button"
              onClick={() => {
                fixerMenuMobileOuvert(false);
                surDemandeAmbulance();
              }}
              className="flex w-full items-center justify-center space-x-2 rounded-full bg-[#1F7A8C] py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              <Ambulance className="h-4 w-4" />
              <span>Demander une ambulance</span>
            </button>
            <button
              type="button"
              onClick={() => {
                fixerMenuMobileOuvert(false);
                (estPatient ? surOuvertureRendezVous : surOuvertureConnexion)();
              }}
              className="w-full rounded-full bg-[#0A2233] py-3.5 text-sm tracking-wide text-white transition-transform active:scale-[0.98]"
            >
              {estPatient ? 'Mes rendez-vous' : 'Portail Patient'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

const ModaleDetailService = ({ service, onFermer, onPrendreRdv }) => {
  const ouverte = Boolean(service);
  const [enFermeture, fixerEnFermeture] = useState(false);
  const minuterieFermeture = useRef(null);

  useEffect(() => {
    return () => clearTimeout(minuterieFermeture.current);
  }, []);

  useEffect(() => {
    if (!ouverte) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = precedent;
    };
  }, [ouverte]);

  const fermerAvecAnimation = useCallback(() => {
    if (enFermeture) return;
    fixerEnFermeture(true);
    minuterieFermeture.current = setTimeout(onFermer, 280);
  }, [enFermeture, onFermer]);

  useEffect(() => {
    if (!ouverte) return;
    const surTouche = (e) => { if (e.key === 'Escape') fermerAvecAnimation(); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [ouverte, fermerAvecAnimation]);

  if (!service) return null;

  return (
    <div
      className={`${enFermeture ? 'animate-modale-fond-sortie' : 'animate-modale-fond'} mobile-scroll-overlay fixed inset-0 z-[120] flex justify-center bg-[#081B29]/80 p-3 backdrop-blur-sm sm:p-6`}
      role="presentation"
      onMouseDown={(evenement) => {
        if (evenement.target === evenement.currentTarget) fermerAvecAnimation();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-modale-service"
        className={`${enFermeture ? 'animate-modale-panneau-sortie' : 'animate-modale-panneau'} mobile-scroll-dialog modal-scrollbar relative my-auto grid w-full max-w-6xl overflow-x-hidden overflow-y-auto overscroll-contain bg-[#F7F6F2] shadow-[0_32px_100px_rgba(0,0,0,0.35)] md:grid-cols-[1.08fr_0.92fr] md:overflow-hidden`}
      >
        <div className="relative h-[min(46dvh,24rem)] min-h-[15rem] overflow-hidden bg-[#0A2233] md:h-auto md:min-h-[620px]">
          {service.photo_responsable_url ? (
            <img
              src={service.photo_responsable_url}
              alt={service.responsable ? `Photo de ${service.responsable}` : service.nom}
              className="absolute inset-0 h-full w-full object-contain md:object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0F3D52]">
              <Stethoscope className="h-24 w-24 text-white/25" strokeWidth={0.8} />
              <span className="absolute font-display text-8xl font-light text-white/80">
                {service.nom.charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#071A27]/35 via-transparent to-transparent md:from-[#071A27]/70 md:to-[#071A27]/10" />
          <p className="absolute bottom-5 left-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85 sm:bottom-7 sm:left-7">
            CENHOSOA <span className="mx-2 text-[#7FD1CB]">/</span> Service hospitalier
          </p>
        </div>

        <div className="relative flex min-h-0 flex-col px-6 pb-8 pt-7 sm:px-9 sm:pb-10 sm:pt-9 md:overflow-y-auto md:px-12 md:py-12">
          <button
            type="button"
            onClick={fermerAvecAnimation}
            aria-label="Fermer les informations du service"
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center border border-[#0A2233]/10 text-[#0A2233]/70 transition-colors hover:border-[#0A2233] hover:bg-[#0A2233] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C] sm:right-6 sm:top-6"
          >
            <X size={18} />
          </button>
          <div className="mb-7 pr-12 sm:mb-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1F7A8C]">
              Service médical
            </p>
            <div className="mt-4 h-px w-12 bg-[#7FD1CB]" />
          </div>
          <h2
            id="titre-modale-service"
            className="max-w-xl font-display text-3xl font-semibold leading-[1.13] tracking-[-0.035em] text-[#0A2233] sm:text-4xl lg:text-[2.75rem]"
          >
            {service.nom}
          </h2>
          {service.responsable && (
            <p className="mt-3 text-sm font-medium text-[#43515A]">
              Responsable : {service.responsable}
            </p>
          )}
          <div className="my-7 h-px w-full bg-[#0A2233]/10 sm:my-9" />
          <div className="max-w-xl whitespace-pre-line text-sm leading-7 text-[#43515A] sm:text-base sm:leading-8">
            {service.description || 'Description non renseignée.'}
          </div>

          <dl className="mt-8 divide-y divide-[#0A2233]/10 border-y border-[#0A2233]/10">
            {service.horaires && (
              <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr] sm:gap-4">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1F7A8C]">Horaires</dt>
                <dd className="text-sm leading-relaxed text-[#43515A]">{service.horaires}</dd>
              </div>
            )}
            {service.localisation && (
              <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr] sm:gap-4">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1F7A8C]">Localisation</dt>
                <dd className="text-sm leading-relaxed text-[#43515A]">{service.localisation}</dd>
              </div>
            )}
            <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr] sm:gap-4">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1F7A8C]">Contact</dt>
              <dd className="text-sm leading-relaxed text-[#43515A]">
                {service.telephone ? (
                  <a href={`tel:${service.telephone}`} className="transition-colors hover:text-[#1F7A8C]">
                    {service.telephone}
                  </a>
                ) : 'Non renseigné'}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={onPrendreRdv}
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 bg-[#0A2233] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#1F7A8C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C] focus-visible:ring-offset-2 active:scale-[0.99] sm:w-auto sm:self-start"
          >
            <Calendar className="h-4 w-4" />
            <span>Prendre rendez-vous</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
};

const CHEMIN_CONNEXION_PERSONNEL = '/connexion-personnel';
const ROLES_GESTION_URGENCES = [
  'major',
  'major_de_garde',
  'regulateur_ambulance',
  'chef_division_auto',
  'chef_sim',
];

export default function PageCenhosoa() {
  const [menuMobileOuvert, fixerMenuMobileOuvert] = useState(false);
  const [afficherConnexion, fixerAfficherConnexion] = useState(false);
  const [espaceConnexionPersonnel, fixerEspaceConnexionPersonnel] = useState(
    window.location.pathname === CHEMIN_CONNEXION_PERSONNEL,
  );
  const [afficherRendezVous, fixerAfficherRendezVous] = useState(false);
  const [afficherDemandeAmbulance, fixerAfficherDemandeAmbulance] = useState(false);
  const [afficherGestionLits, fixerAfficherGestionLits] = useState(false);
  const [afficherGestionAmbulances, fixerAfficherGestionAmbulances] = useState(false);
  const [afficherSuperAdmin, fixerAfficherSuperAdmin] = useState(false);
  const [profilUtilisateur, fixerProfilUtilisateur] = useState(null);
  
  const [temoignageCourant, fixerTemoignageCourant] = useState(0);
  const [actualiteCourante, fixerActualiteCourante] = useState(0);
  const [actualitesPubliees, fixerActualitesPubliees] = useState([]);
  const [actualiteDetailsOuverte, fixerActualiteDetailsOuverte] = useState(null);

  const [services, fixerServices] = useState([]);
  const [chargementServices, fixerChargementServices] = useState(true);
  const [serviceSelectionne, fixerServiceSelectionne] = useState(null);
  const [serviceActif, fixerServiceActif] = useState(0);
  const actualitesHero = [
    ...ACTUALITES_HERO.map((actualite, index) => ({
      ...actualite,
      id: `defaut-${index}`,
      photo: IMAGES_HERO[index % IMAGES_HERO.length].source,
    })),
    ...actualitesPubliees.map((actualite) => ({
      debut: actualite.texte,
      accent: '',
      id: actualite.id,
      photo: actualite.photo_url || IMAGES_HERO[0].source,
      details: actualite.details,
      dateCreation: actualite.date_creation,
    })),
  ];
  const indexActualiteHero = actualiteCourante % actualitesHero.length;
  const changerActualite = (direction) => {
    fixerActualiteCourante(
      (courante) => (courante + direction + actualitesHero.length) % actualitesHero.length,
    );
  };

  useEffect(() => {
    if (!actualiteDetailsOuverte) return undefined;
    const debordementPrecedent = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const fermerAvecEchap = (evenement) => {
      if (evenement.key === 'Escape') fixerActualiteDetailsOuverte(null);
    };
    window.addEventListener('keydown', fermerAvecEchap);
    return () => {
      document.body.style.overflow = debordementPrecedent;
      window.removeEventListener('keydown', fermerAvecEchap);
    };
  }, [actualiteDetailsOuverte]);

  const ouvrirRendezVous = (service = null) => {
    fixerServiceSelectionne(service);
    fixerAfficherRendezVous(true);
  };

  const naviguerVers = useCallback((chemin, remplacer = false) => {
    const methodeHistorique = remplacer ? 'replaceState' : 'pushState';
    window.history[methodeHistorique]({}, '', chemin);
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  }, []);

  const retournerAuPortailPublic = () => {
    naviguerVers('/');
    fixerAfficherConnexion(false);
  };

  const retournerALAccueilPatient = () => {
    naviguerVers('/');
    fixerAfficherRendezVous(false);
    fixerServiceSelectionne(null);
    window.scrollTo(0, 0);
  };

  const quitterConnexionPersonnel = useCallback(() => {
    if (window.location.pathname === CHEMIN_CONNEXION_PERSONNEL) {
      naviguerVers('/', true);
    } else {
      fixerEspaceConnexionPersonnel(false);
    }
  }, [naviguerVers]);

  useEffect(() => {
    return demarrerConnexionTempsReel();
  }, []);

  useEffect(() => {
    let actif = true;
    const chargerServices = () => {
      listerServices()
        .then((donnees) => {
          if (actif) fixerServices(donnees);
        })
        .catch((err) => console.error('Erreur chargement services :', err))
        .finally(() => {
          if (actif) fixerChargementServices(false);
        });
    };

    chargerServices();
    const arreterEcoute = ecouterDonneesModifiees(['services'], chargerServices);
    return () => {
      actif = false;
      arreterEcoute();
    };
  }, []);

  useEffect(() => {
    let actif = true;
    const chargerActualites = () => {
      listerActualites()
        .then((donnees) => {
          if (actif) fixerActualitesPubliees(donnees);
        })
        .catch((err) => console.error('Erreur chargement actualités :', err));
    };

    chargerActualites();
    const arreterEcoute = ecouterDonneesModifiees(['actualites'], chargerActualites);
    return () => {
      actif = false;
      arreterEcoute();
    };
  }, []);

  useEffect(() => {
    const accessToken = obtenirTokenStocke();
    if (!accessToken) return;

    obtenirProfil(accessToken)
      .then((profil) => {
        quitterConnexionPersonnel();
        if (profil.role === 'superadmin') {
          fixerProfilUtilisateur(profil);
          fixerAfficherSuperAdmin(true);
        } else if (profil.role === 'patient') {
          fixerProfilUtilisateur(profil);
        } else if (ROLES_GESTION_URGENCES.includes(profil.role)) {
          fixerProfilUtilisateur(profil);
          fixerAfficherGestionLits(true);
          fixerAfficherGestionAmbulances(true);
        } else if (profil.role === 'secretaire') {
          fixerProfilUtilisateur(profil);
          fixerAfficherRendezVous(true);
        } else if (profil.role === 'medecin') {
          fixerProfilUtilisateur(profil);
          fixerAfficherRendezVous(true);
        }
      })
      .catch((err) => console.error('Erreur de vérification de session :', err));
  }, [quitterConnexionPersonnel]);

  const gererConnexionPersonnel = async (espacePersonnel = false) => {
    try {
      const profil = await obtenirProfil(obtenirTokenStocke());
      if (profil.role === 'patient') {
        if (espacePersonnel) {
          effacerTokens();
          return false;
        }
        quitterConnexionPersonnel();
        fixerProfilUtilisateur(profil);
        fixerAfficherRendezVous(false);
        fixerAfficherGestionLits(false);
        fixerAfficherGestionAmbulances(false);
        fixerAfficherSuperAdmin(false);
        fixerAfficherDemandeAmbulance(false);
        fixerAfficherConnexion(false);
        return true;
      }
      const rolePersonnelAutorise = ROLES_GESTION_URGENCES.includes(profil.role)
        || ['secretaire', 'medecin', 'superadmin'].includes(profil.role);
      if (!rolePersonnelAutorise) {
        if (espacePersonnel) effacerTokens();
        return false;
      }
      quitterConnexionPersonnel();
      fixerProfilUtilisateur(profil);
      fixerAfficherRendezVous(profil.role === 'secretaire' || profil.role === 'medecin');
      fixerAfficherSuperAdmin(profil.role === 'superadmin');
      fixerAfficherGestionLits(ROLES_GESTION_URGENCES.includes(profil.role));
      fixerAfficherGestionAmbulances(ROLES_GESTION_URGENCES.includes(profil.role));
      fixerAfficherDemandeAmbulance(false);
      fixerAfficherConnexion(false);
      return true;
    } catch (err) {
      console.error('Erreur de vérification du profil :', err);
      return false;
    }
  };

  const deconnecterPersonnel = () => {
    effacerTokens();
    naviguerVers(CHEMIN_CONNEXION_PERSONNEL, true);
    fixerProfilUtilisateur(null);
    fixerServiceSelectionne(null);
    fixerMenuMobileOuvert(false);
    fixerAfficherGestionLits(false);
    fixerAfficherGestionAmbulances(false);
    fixerAfficherSuperAdmin(false);
    fixerAfficherRendezVous(false);
    fixerAfficherConnexion(false);
  };

  const deconnecterPatient = () => {
    effacerTokens();
    naviguerVers('/', true);
    fixerProfilUtilisateur(null);
    fixerServiceSelectionne(null);
    fixerMenuMobileOuvert(false);
    fixerAfficherGestionLits(false);
    fixerAfficherGestionAmbulances(false);
    fixerAfficherSuperAdmin(false);
    fixerAfficherRendezVous(false);
    fixerAfficherConnexion(false);
  };

  useEffect(() => {
    const gererSessionExpiree = () => {
      effacerTokens();
      fixerProfilUtilisateur(null);
      fixerAfficherGestionLits(false);
      fixerAfficherGestionAmbulances(false);
      fixerAfficherSuperAdmin(false);
      fixerAfficherRendezVous(false);
      fixerAfficherConnexion(!espaceConnexionPersonnel);
    };

    window.addEventListener('session-expiree', gererSessionExpiree);
    return () => window.removeEventListener('session-expiree', gererSessionExpiree);
  }, [espaceConnexionPersonnel]);

  useEffect(() => {
    const synchroniserRoute = () => {
      fixerEspaceConnexionPersonnel(window.location.pathname === CHEMIN_CONNEXION_PERSONNEL);
    };
    window.addEventListener('popstate', synchroniserRoute);
    return () => window.removeEventListener('popstate', synchroniserRoute);
  }, []);

  useEffect(() => {
    const minuterieActualite = setTimeout(() => {
      fixerActualiteCourante((precedent) => (precedent + 1) % actualitesHero.length);
    }, DELAI_ROTATION_HERO);
    return () => clearTimeout(minuterieActualite);
  }, [actualiteCourante, actualitesHero.length]);

  useEffect(() => {
    const minuterieTemoignage = setInterval(() => {
      fixerTemoignageCourant((precedent) => (precedent === DONNEES_TEMOIGNAGES.length - 1 ? 0 : precedent + 1));
    }, 5500);
    return () => clearInterval(minuterieTemoignage);
  }, []);

  if (afficherSuperAdmin) {
    return (
      <SuperAdmin
        profil={profilUtilisateur}
        onDeconnexion={deconnecterPersonnel}
      />
    );
  }

  if (afficherDemandeAmbulance) {
    return (
      <DemandeAmbulancePatient
        profil={profilUtilisateur?.role === 'patient' ? profilUtilisateur : null}
        onFermer={() => fixerAfficherDemandeAmbulance(false)}
      />
    );
  }

  if (afficherGestionAmbulances || afficherGestionLits) {
    return (
      <GestionUrgences
        profil={profilUtilisateur}
        onDeconnexion={deconnecterPersonnel}
      />
    );
  }

  if (espaceConnexionPersonnel) {
    return (
      <LoginCenhosoa
        espacePersonnel
        onConnexion={() => gererConnexionPersonnel(true)}
        onBackToHome={retournerAuPortailPublic}
      />
    );
  }

  if (afficherConnexion) {
    return <LoginCenhosoa onConnexion={gererConnexionPersonnel} onBackToHome={() => fixerAfficherConnexion(false)} />;
  }

  if (afficherRendezVous) {
    return (
      <GestionRendezVousCenhosoa
        profil={profilUtilisateur}
        onProfilMisAJour={fixerProfilUtilisateur}
        onDemandeAmbulance={() => fixerAfficherDemandeAmbulance(true)}
        services={services}
        serviceInitial={serviceSelectionne}
        onDeconnexion={profilUtilisateur?.role === 'patient' ? deconnecterPatient : deconnecterPersonnel}
        onRetourAccueil={retournerALAccueilPatient}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F2EE] text-[#1E2333] font-body fine antialiased selection:bg-[#1F7A8C] selection:text-white overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>
      <StylesGlobaux />
      <OutilsDefilement />
      <BarreNavigation
        profil={profilUtilisateur}
        surOuvertureConnexion={() => fixerAfficherConnexion(true)}
        surOuvertureRendezVous={() => ouvrirRendezVous()}
        surDemandeAmbulance={() => fixerAfficherDemandeAmbulance(true)}
        surDeconnexion={profilUtilisateur?.role === 'patient' ? deconnecterPatient : deconnecterPersonnel}
        menuMobileOuvert={menuMobileOuvert}
        fixerMenuMobileOuvert={fixerMenuMobileOuvert}
      />

      <section id="accueil" className="relative min-h-[100svh] flex flex-col justify-end text-white overflow-hidden bg-[#0A2233]">
        <div className="absolute inset-0">
          <Parallaxe vitesse={0.14} className="absolute inset-x-0 -top-[14%] h-[128%]">
            {actualitesHero.map((actualite, index) => (
              <img key={actualite.id} src={actualite.photo} alt=""
                className={`animate-kenburns absolute inset-0 w-full h-full object-cover transition-opacity duration-[1400ms] ease-in-out ${index === indexActualiteHero ? 'opacity-70' : 'opacity-0'}`}
                style={{ animationDelay: `${index * -8}s` }} />
            ))}
          </Parallaxe>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A2233]/70 via-[#0A2233]/35 to-[#0A2233]/95" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A2233]/80 via-transparent to-transparent" />
          <div className="absolute -bottom-32 -left-24 w-[420px] h-[420px] rounded-full bg-[#1F7A8C]/25 blur-[120px] animate-blob pointer-events-none" />
        </div>

        <button
          type="button"
          aria-label="Actualité précédente"
          onClick={() => changerActualite(-1)}
          className="group absolute left-4 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/[0.08] text-white shadow-lg shadow-black/10 backdrop-blur-md transition-all duration-300 hover:-translate-y-[calc(50%+2px)] hover:border-[#7FD1CB]/80 hover:bg-[#7FD1CB] hover:text-[#0A2233] hover:shadow-[0_0_24px_rgba(127,209,203,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FD1CB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A2233] active:scale-90 sm:left-6 md:flex"
        >
          <ChevronLeft size={19} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
        </button>
        <button
          type="button"
          aria-label="Actualité suivante"
          onClick={() => changerActualite(1)}
          className="group absolute right-4 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-[#7FD1CB]/55 bg-[#7FD1CB] text-[#0A2233] shadow-lg shadow-[#7FD1CB]/15 transition-all duration-300 hover:translate-x-0.5 hover:border-[#A5EEE7] hover:bg-[#A5EEE7] hover:shadow-[0_0_28px_rgba(127,209,203,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A2233] active:scale-90 sm:right-6 md:flex"
        >
          <ChevronRight size={19} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>

        <EstompageHero className="relative z-10 max-w-7xl w-full mx-auto px-5 sm:px-8 pt-40 pb-12 lg:pb-16">
          <Revelation>
            <p className="text-[11px] sm:text-xs tracking-[0.3em] uppercase text-white/60 mb-6">Antananarivo · Madagascar · depuis 1891</p>
          </Revelation>
          {indexActualiteHero >= 1 && (
            <div
              key={actualitesHero[indexActualiteHero].id}
              className="mb-5 inline-flex items-center gap-2.5 border-l-2 border-[#7FD1CB] py-1 pl-3.5 animate-[fade-in_350ms_ease-out]"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/75 sm:text-[11px]">
                Actualité
              </span>
            </div>
          )}
          <h1 className="grid text-4xl sm:text-6xl lg:text-[5.5rem] font-light tracking-[-0.045em] leading-[1.05] max-w-5xl">
            {actualitesHero.map((actualite, index) => {
              const estActif = index === indexActualiteHero;
              const nbMotsDebut = actualite.debut.split(' ').length;
              return (
                <span
                  key={index}
                  aria-hidden={!estActif}
                  aria-live={estActif ? 'polite' : undefined}
                  className={`col-start-1 row-start-1 transition-all duration-[1200ms] ease-out ${
                    estActif
                      ? 'opacity-100 blur-0 translate-y-0 delay-300'
                      : 'opacity-0 blur-sm translate-y-3 pointer-events-none select-none'
                  }`}
                >
                  <MotsAnimes
                    texte={actualite.debut}
                    debut={250}
                    collant={actualite.debut.endsWith("'")}
                    anime={estActif}
                  />
                  {actualite.accent && (
                    <span className="text-white/40">
                      <MotsAnimes
                        texte={actualite.accent}
                        debut={250 + nbMotsDebut * 70}
                        anime={estActif}
                      />
                    </span>
                  )}
                </span>
              );
            })}
          </h1>
          <Revelation delai={900} variante="flou">
            <p className="mt-8 max-w-xl text-base sm:text-lg font-light text-white/70 leading-relaxed">
              Le Centre Hospitalier de Soavinandriana allie performance technologique et valeurs humaines pour accompagner chaque patient.
            </p>
          </Revelation>
          {indexActualiteHero >= 1 && (
            <button
              type="button"
              onClick={() => fixerActualiteDetailsOuverte(actualitesHero[indexActualiteHero])}
              className="group mt-6 inline-flex items-center gap-3 border-b border-[#7FD1CB]/55 pb-2 text-sm font-medium text-white/90 transition-colors duration-200 hover:border-[#7FD1CB] hover:text-[#A5EEE7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FD1CB] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0A2233]"
            >
              Voir les détails
              <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          )}

          {profilUtilisateur?.role === 'patient' && (
            <Revelation delai={1050} variante="zoom" className="mt-12">
              <a href="#specialites" className="btn-brillance group inline-flex items-center justify-between rounded-2xl bg-white px-7 py-6 text-[#0A2233] transition-colors hover:bg-[#F4F2EE]">
                  <span className="text-sm font-medium">Découvrir nos spécialités</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-2" />
              </a>
            </Revelation>
          )}

          <div className="mt-8 flex max-w-2xl items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2" aria-label="Choisir une actualité">
                {actualitesHero.map((actualite, index) => (
                  <button
                    key={actualite.id}
                    type="button"
                    aria-label={`Afficher l'actualité ${index + 1}`}
                    aria-current={index === indexActualiteHero ? 'true' : undefined}
                    onClick={() => fixerActualiteCourante(index)}
                    className="group flex h-11 w-11 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FD1CB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A2233]"
                  >
                    <span className={`block h-1 rounded-full transition-all duration-500 ${index === indexActualiteHero ? 'w-10 bg-[#7FD1CB] shadow-[0_0_12px_rgba(127,209,203,0.7)]' : 'w-4 bg-white/35 group-hover:w-7 group-hover:bg-white/75'}`} />
                  </button>
                ))}
              </div>
              <span className="font-mono text-[11px] tracking-[0.18em] text-white/55" aria-live="polite">
                {String(indexActualiteHero + 1).padStart(2, '0')}
                <span className="mx-1.5 text-[#7FD1CB]/70">/</span>
                {String(actualitesHero.length).padStart(2, '0')}
              </span>
            </div>
          </div>
        </EstompageHero>

        <a
          href="#engagement"
          aria-label="Défiler vers la suite"
          className="hidden lg:flex absolute z-10 bottom-10 right-10 flex-col items-center gap-3 text-white/60 hover:text-white transition-colors"
        >
          <span className="text-[10px] tracking-[0.3em] uppercase [writing-mode:vertical-rl]">Défiler</span>
          <span className="relative block h-14 w-px overflow-hidden bg-white/25">
            <span className="absolute inset-x-0 top-0 h-5 bg-white animate-defiler-point" />
          </span>
        </a>
      </section>

      {actualiteDetailsOuverte && (
        <div
          className="mobile-scroll-overlay fixed inset-0 z-[120] flex justify-center bg-[#081B29]/80 p-3 backdrop-blur-sm sm:p-6"
          role="presentation"
          onMouseDown={(evenement) => {
            if (evenement.target === evenement.currentTarget) fixerActualiteDetailsOuverte(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-details-actualite"
            className="mobile-scroll-dialog modal-scrollbar relative my-auto grid w-full max-w-6xl overflow-x-hidden overflow-y-auto overscroll-contain bg-[#F7F6F2] shadow-[0_32px_100px_rgba(0,0,0,0.35)] md:grid-cols-[1.08fr_0.92fr] md:overflow-hidden"
          >
            <div className="relative h-[min(46dvh,24rem)] min-h-[15rem] overflow-hidden bg-[#0A2233] md:h-auto md:min-h-[620px]">
              <img
                src={actualiteDetailsOuverte.photo}
                alt={actualiteDetailsOuverte.debut}
                className="absolute inset-0 h-full w-full object-contain md:object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071A27]/35 via-transparent to-transparent md:from-[#071A27]/70 md:to-[#071A27]/10" />
              <p className="absolute bottom-5 left-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85 sm:bottom-7 sm:left-7">
                CENHOSOA <span className="mx-2 text-[#7FD1CB]">/</span> Actualité
              </p>
            </div>
            <div className="relative flex min-h-0 flex-col px-6 pb-8 pt-7 sm:px-9 sm:pb-10 sm:pt-9 md:overflow-y-auto md:px-12 md:py-12">
              <button
                type="button"
                onClick={() => fixerActualiteDetailsOuverte(null)}
                aria-label="Fermer les détails de l’actualité"
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center border border-[#0A2233]/10 text-[#0A2233]/70 transition-colors hover:border-[#0A2233] hover:bg-[#0A2233] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A8C] sm:right-6 sm:top-6"
              >
                <X size={18} />
              </button>
              <div className="mb-7 pr-12 sm:mb-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1F7A8C]">
                  Actualité
                </p>
                <div className="mt-4 h-px w-12 bg-[#7FD1CB]" />
              </div>
              <h2
                id="titre-details-actualite"
                className="max-w-xl font-display text-3xl font-semibold leading-[1.13] tracking-[-0.035em] text-[#0A2233] sm:text-4xl lg:text-[2.75rem]"
              >
                {actualiteDetailsOuverte.debut}
              </h2>
              <div className="my-7 h-px w-full bg-[#0A2233]/10 sm:my-9" />
              <div className="max-w-xl whitespace-pre-line text-sm leading-7 text-[#43515A] sm:text-base sm:leading-8">
                {actualiteDetailsOuverte.details
                  || 'Les détails de cette actualité seront bientôt disponibles.'}
              </div>
              {actualiteDetailsOuverte.dateCreation && (
                <p className="mt-auto pt-8 text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A2233]/45">
                  Publiée le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(actualiteDetailsOuverte.dateCreation))}
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      <section id="engagement" className="bg-white">
        <div className="grid lg:grid-cols-2 min-h-[680px]">
          <Revelation variante="gauche" className="group relative min-h-[360px] lg:min-h-full overflow-hidden">
            <Parallaxe vitesse={0.1} className="absolute inset-x-0 -top-[12%] h-[124%]">
              <img src={image1787170777} alt="CENHOSOA" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-105" />
            </Parallaxe>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A2233]/50 to-transparent" />
            <p className="absolute bottom-8 left-8 text-white/80 text-xs tracking-[0.3em] uppercase transition-all duration-500 group-hover:tracking-[0.4em] group-hover:text-white">135 ans d'engagement</p>
          </Revelation>

          <div className="bg-[#EDECE9] px-6 sm:px-14 py-16 lg:py-20 flex flex-col justify-between gap-14">
            <Revelation variante="flou">
              <p className="text-[11px] tracking-[0.3em] uppercase text-slate-500 mb-5">Notre engagement</p>
              <h2 className="text-4xl sm:text-5xl font-light tracking-[-0.035em] leading-[1.08] text-[#0A2233] max-w-lg">
                Pourquoi choisir <span className="text-[#0A2233]/40">CENHOSOA</span>
              </h2>
              <p className="mt-6 text-slate-600 font-light leading-relaxed max-w-md">
                À l'occasion de ses 135 ans, l'établissement accélère sa transformation à travers des projets de modernisation d'envergure.
              </p>
            </Revelation>

            <div>
              {DONNEES_VALEURS.map((valeurItem, index) => {
                const ComposantIcone = valeurItem.icone;
                return (
                  <Revelation key={valeurItem.titre} delai={index * 110} variante="droite" className="group flex items-start gap-5 py-5 border-t border-black/10 transition-all duration-500 hover:pl-3 hover:border-[#1F7A8C]/50">
                    <span className="text-xs text-slate-400 w-6 pt-1 transition-colors duration-300 group-hover:text-[#1F7A8C]">0{index + 1}</span>
                    <div className="flex-1">
                      <h3 className="text-base text-[#0A2233] mb-1 transition-colors duration-300 group-hover:text-[#1F7A8C]">{valeurItem.titre}</h3>
                      <p className="text-sm font-light text-slate-600 leading-relaxed">{valeurItem.description}</p>
                    </div>
                    <ComposantIcone className="w-5 h-5 text-[#1F7A8C] shrink-0 mt-1 transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-12" strokeWidth={1.5} />
                  </Revelation>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="specialites" className="bg-white py-28 lg:py-36">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <Revelation variante="flou" className="text-center mb-10">
            <p className="text-[11px] tracking-[0.3em] uppercase text-slate-500">Nos spécialités</p>
          </Revelation>

          <Revelation delai={100}>
            {chargementServices ? (
              <div className="space-y-5 flex flex-col items-center">
                {[...Array(5)].map((_, index) => <div key={index} className="h-8 rounded-full bg-[#EDECE9] animate-pulse" style={{ width: `${70 - index * 8}%`, maxWidth: 420 }} />)}
              </div>
            ) : services.length === 0 ? (
              <p className="text-center text-slate-500 text-sm">Aucun service disponible pour le moment.</p>
            ) : (() => {
              const indexActif = Math.min(serviceActif, services.length - 1);
              const serviceCourant = services[indexActif];
              const IconeCourante = ICONES_PAR_NOM_SERVICE[serviceCourant.nom] || ICONE_PAR_DEFAUT;
              const debut = Math.max(0, indexActif - 2);
              const fin = Math.min(services.length - 1, indexActif + 2);
              return (
                <>
                  <div className="relative flex items-center justify-center gap-2 sm:gap-6">
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[330px] sm:min-h-[400px]">
                      {services.slice(debut, fin + 1).map((serviceItem, decalageIndex) => {
                        const i = debut + decalageIndex;
                        const distance = Math.abs(i - indexActif);
                        const taille = distance === 0 ? 'text-3xl sm:text-6xl text-[#0A2233]' : distance === 1 ? 'text-xl sm:text-3xl text-[#0A2233]/55' : 'text-lg sm:text-2xl text-[#0A2233]/20 blur-[0.6px]';
                        return (
                          <button key={serviceItem.id} type="button" onClick={() => fixerServiceActif(i)} onMouseEnter={() => fixerServiceActif(i)}
                            className={`font-light tracking-[-0.035em] text-center py-2 sm:py-2.5 transition-all duration-500 ease-out ${taille}`}>
                            {serviceItem.nom}
                            <span className={`block h-px mx-auto bg-[#1F7A8C] transition-all duration-700 ease-out ${distance === 0 ? 'w-full mt-1 opacity-100' : 'w-0 opacity-0'}`} />
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-col gap-3">
                      <button type="button" aria-label="Spécialité précédente" disabled={indexActif === 0} onClick={() => fixerServiceActif(indexActif - 1)} className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center text-[#0A2233] hover:bg-[#EDECE9] hover:scale-110 active:scale-90 disabled:opacity-25 disabled:hover:scale-100 transition-all duration-300"><ChevronUp className="w-4 h-4" /></button>
                      <button type="button" aria-label="Spécialité suivante" disabled={indexActif === services.length - 1} onClick={() => fixerServiceActif(indexActif + 1)} className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center text-[#0A2233] hover:bg-[#EDECE9] hover:scale-110 active:scale-90 disabled:opacity-25 disabled:hover:scale-100 transition-all duration-300"><ChevronDown className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div key={serviceCourant.id} className="animate-carte-entree group mt-10 rounded-3xl bg-[#F4F2EE] border border-black/5 p-7 sm:p-9 grid sm:grid-cols-[auto_1fr_auto] gap-6 items-center transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(10,34,51,0.3)]">
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#1F7A8C] shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"><IconeCourante className="w-6 h-6" strokeWidth={1.5} /></div>
                    <div>
                      {serviceCourant.responsable && <p className="text-[11px] tracking-[0.2em] uppercase text-slate-500 mb-1">{serviceCourant.responsable}</p>}
                      <p className="text-sm font-light text-slate-600 leading-relaxed line-clamp-3">{serviceCourant.description || 'Description non renseignée.'}</p>
                      <p className="mt-3 flex items-center space-x-2 text-xs text-slate-500"><Phone className="w-3.5 h-3.5 text-[#1F7A8C]" /><span>{serviceCourant.telephone || 'Non renseigné'}</span></p>
                    </div>
                    <button onClick={() => fixerServiceSelectionne(serviceCourant)} className="btn-brillance group/bouton inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-full bg-[#0A2233] text-white text-sm hover:bg-[#0F3D52] hover:shadow-lg active:scale-95 transition-all duration-300">
                      <span>Voir les détails</span>
                      <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover/bouton:translate-x-1" />
                    </button>
                  </div>
                </>
              );
            })()}
          </Revelation>
        </div>
      </section>

      <section id="temoignages" className="relative py-28 overflow-hidden bg-[#0A2233]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 dot-grid opacity-[0.08]" />
          <Parallaxe vitesse={-0.12} className="absolute inset-0">
            <div className="absolute top-0 -left-40 w-[460px] h-[460px] bg-[#1F7A8C]/30 rounded-full blur-[130px] animate-blob" />
          </Parallaxe>
          <Parallaxe vitesse={0.16} className="absolute inset-0">
            <div className="absolute bottom-0 -right-40 w-[460px] h-[460px] bg-[#7FD1CB]/20 rounded-full blur-[130px] animate-blob-slow" />
          </Parallaxe>
        </div>

        <button
          onClick={() => fixerTemoignageCourant((precedent) => (precedent === 0 ? DONNEES_TEMOIGNAGES.length - 1 : precedent - 1))}
          className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-white/10 hover:bg-white/20 hover:scale-110 active:scale-90 text-white border border-white/20 backdrop-blur-md transition-all z-30 hidden md:flex items-center justify-center"
          aria-label="Témoignage précédent"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => fixerTemoignageCourant((precedent) => (precedent === DONNEES_TEMOIGNAGES.length - 1 ? 0 : precedent + 1))}
          className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-white/10 hover:bg-white/20 hover:scale-110 active:scale-90 text-white border border-white/20 backdrop-blur-md transition-all z-30 hidden md:flex items-center justify-center"
          aria-label="Témoignage suivant"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Revelation variante="flou" className="text-center">
            <span className="text-xs font-mono font-bold text-[#7FD1CB] uppercase tracking-widest block mb-2">
              Témoignages & Presse
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight mb-14">
              L'avis des usagers et de la presse
            </h2>
          </Revelation>

          <Revelation delai={150} variante="zoom">
            <div className="relative h-[440px] sm:h-[360px] overflow-hidden [perspective:1200px]">
              {DONNEES_TEMOIGNAGES.map((testiItem, index) => {
                const total = DONNEES_TEMOIGNAGES.length;
                let decalage = index - temoignageCourant;
                if (decalage > total / 2) decalage -= total;
                if (decalage < -total / 2) decalage += total;
                if (Math.abs(decalage) > 1) return null;

                const estActif = decalage === 0;

                return (
                  <div
                    key={index}
                    onClick={() => !estActif && fixerTemoignageCourant(index)}
                    className={`absolute inset-x-0 top-0 mx-auto w-full max-w-2xl transition-all duration-700 ease-out ${estActif ? 'z-20' : 'z-10 cursor-pointer hover:opacity-60'}`}
                    style={{
                      transform: `translateX(${decalage * 58}%) scale(${estActif ? 1 : 0.86}) rotateY(${decalage * -6}deg)`,
                      opacity: estActif ? 1 : 0.32,
                      filter: estActif ? 'none' : 'blur(1.5px)',
                    }}
                    aria-hidden={!estActif}
                  >
                    <div className="relative rounded-[2rem] bg-white/[0.05] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/30 px-7 py-9 sm:px-12 sm:py-11">
                      <span className="absolute top-3 left-6 font-display font-black text-[6rem] leading-none text-[#7FD1CB]/15 select-none pointer-events-none">
                        &ldquo;
                      </span>

                      <div className="relative flex justify-center space-x-1 mb-5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 text-[#7FD1CB] fill-[#7FD1CB] ${estActif ? 'animate-etoile' : ''}`}
                            style={estActif ? { animationDelay: `${300 + i * 90}ms` } : undefined}
                          />
                        ))}
                      </div>

                      <p className="relative text-lg sm:text-2xl font-display font-light text-white leading-relaxed text-center italic mb-8">
                        « {testiItem.citation} »
                      </p>

                      <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-11 h-11 rounded-full bg-[#7FD1CB]/20 border border-[#7FD1CB]/30 flex items-center justify-center text-[#7FD1CB] font-bold text-base shrink-0">
                            {testiItem.auteur.charAt(0)}
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-bold text-white">{testiItem.auteur}</div>
                            <div className="text-xs text-slate-300">{testiItem.role}</div>
                          </div>
                        </div>

                        <div className="hidden sm:block w-px h-9 bg-white/15" />

                        <a
                          href={testiItem.urlSource}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          tabIndex={estActif ? 0 : -1}
                          className="inline-flex items-center space-x-2.5 bg-white rounded-xl pl-1.5 pr-4 py-1.5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group"
                        >
                          <span className="w-7 h-7 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0 border border-slate-100">
                            <img src={testiItem.urlLogo} alt={testiItem.texteSource} className="w-full h-full object-contain" />
                          </span>
                          <span className="text-xs font-bold text-[#0A2233]">{testiItem.texteSource}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1F7A8C] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Revelation>

          <div className="flex justify-center items-center mt-10 space-x-3 relative z-30">
            {DONNEES_TEMOIGNAGES.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Aller au témoignage ${index + 1}`}
                onClick={() => fixerTemoignageCourant(index)}
                className="group relative flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FD1CB]"
              >
                <span className={`relative block h-1.5 overflow-hidden rounded-full bg-white/15 transition-all duration-300 ${index === temoignageCourant ? 'w-10' : 'w-3 group-hover:w-5 group-hover:bg-white/30'}`}>
                {index === temoignageCourant && (
                  <span
                    key={temoignageCourant}
                    className="absolute inset-y-0 left-0 bg-[#7FD1CB] rounded-full animate-[progress-fill_5.5s_linear]"
                  />
                )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="recherche" className="bg-white">
        <div className="grid lg:grid-cols-2 min-h-[620px]">
          <div className="bg-[#EDECE9] px-6 sm:px-14 py-16 lg:py-20 flex flex-col justify-between gap-12">
            <Revelation variante="flou">
              <p className="text-[11px] tracking-[0.3em] uppercase text-slate-500 mb-5">Accès & emplacement</p>
              <h2 className="text-4xl sm:text-5xl font-light tracking-[-0.035em] leading-[1.08] text-[#0A2233]">
                Localisation <span className="text-[#0A2233]/40">du centre</span>
              </h2>
              <p className="mt-6 text-slate-600 font-light leading-relaxed max-w-md">
                Situé au cœur d'Antananarivo, le Centre Hospitalier de Soavinandriana est facilement accessible.
              </p>
            </Revelation>

            <Revelation delai={120} className="space-y-6">
              <div className="group flex items-start space-x-4 border-t border-black/10 pt-6 transition-all duration-500 hover:pl-2 hover:border-[#1F7A8C]/50">
                <MapPin className="w-5 h-5 text-[#1F7A8C] shrink-0 mt-0.5 transition-transform duration-500 group-hover:scale-125 group-hover:-translate-y-0.5" strokeWidth={1.5} />
                <div>
                  <h4 className="text-sm text-[#0A2233] mb-1">Adresse principale</h4>
                  <p className="text-sm font-light text-slate-600 leading-relaxed">{COORDONNEES_CENTRE.adresse}</p>
                </div>
              </div>
              <div className="group flex items-start space-x-4 border-t border-black/10 pt-6 transition-all duration-500 hover:pl-2 hover:border-[#1F7A8C]/50">
                <Clock className="w-5 h-5 text-[#1F7A8C] shrink-0 mt-0.5 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12" strokeWidth={1.5} />
                <div>
                  <h4 className="text-sm text-[#0A2233] mb-1">Horaires d'ouverture</h4>
                  <p className="text-sm font-light text-slate-600 leading-relaxed">Urgences : 24h/24 et 7j/7<br />Consultations : Lun - Ven (08h00 - 16h00)</p>
                </div>
              </div>
              <Magnetique>
                <a href="https://www.google.com/maps/place/Centre+Hospitalier+de+Soavinandriana/@-18.8979848,47.5432881,876m/data=!3m2!1e3!4b1!4m6!3m5!1s0x21f0875465f35ec3:0x5d3e2c5d0256b83d!8m2!3d-18.8979848!4d47.5432881!16s%2Fg%2F1tr865vv?entry=ttu" target="_blank" rel="noopener noreferrer"
                  className="btn-brillance group inline-flex items-center space-x-3 bg-[#0A2233] hover:bg-[#0F3D52] text-white px-7 py-3.5 rounded-full text-sm transition-colors active:scale-95">
                  <Navigation className="w-4 h-4 transition-transform duration-500 group-hover:rotate-45" />
                  <span>Ouvrir dans Google Maps</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </Magnetique>
            </Revelation>
          </div>

          <Revelation variante="droite" className="relative min-h-[420px] bg-slate-100">
            <iframe
              title="Carte Google Maps CENHOSOA"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3776.9947721867964!2d47.5407078!3d-18.8979848!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x21f0875465f35ec3%3A0x5d3e2c5d0256b83d!2sCentre%20Hospitalier%20de%20Soavinandriana!5e0!3m2!1sfr!2smg!4v1700000000000!5m2!1sfr!2smg"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 w-full h-full grayscale-[30%] transition-[filter] duration-700 hover:grayscale-0"
            ></iframe>
          </Revelation>
        </div>
      </section>

      <footer id="urgence" className="bg-[#0A2233] pt-16 pb-12 text-white border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <Revelation className="space-y-4">
              <div className="group flex items-center space-x-3 text-white">
                <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                  <img src={logoImage} alt="Logo CENHOSOA" className="w-full h-full object-contain" />
                </div>
                <span className="text-lg font-display font-bold tracking-tight">CENHOSOA</span>
              </div>
              <p className="text-sm leading-relaxed text-white">Centre Hospitalier de Soavinandriana. Établissement public de santé de référence fondé en 1891 à Antananarivo.</p>
            </Revelation>

            <Revelation delai={100}>
              <h4 className="text-white font-display font-bold text-xs uppercase tracking-wider mb-4">Navigation</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#accueil" className="inline-block hover:text-[#7FD1CB] hover:translate-x-1 transition-all duration-300">Accueil</a></li>
                <li><a href="#temoignages" className="inline-block hover:text-[#7FD1CB] hover:translate-x-1 transition-all duration-300">Témoignages & Presse</a></li>
                <li><a href="#specialites" className="inline-block hover:text-[#7FD1CB] hover:translate-x-1 transition-all duration-300">Spécialités</a></li>
                <li><a href="#recherche" className="inline-block hover:text-[#7FD1CB] hover:translate-x-1 transition-all duration-300">Localisation</a></li>
                {profilUtilisateur?.role !== 'patient' && (
                  <li>
                    <a
                      href={CHEMIN_CONNEXION_PERSONNEL}
                      onClick={(event) => {
                        event.preventDefault();
                        naviguerVers(CHEMIN_CONNEXION_PERSONNEL);
                        fixerAfficherConnexion(false);
                      }}
                      className="inline-block hover:text-[#7FD1CB] hover:translate-x-1 transition-all duration-300"
                    >
                      Connexion du personnel
                    </a>
                  </li>
                )}
              </ul>
            </Revelation>

            <Revelation delai={200}>
              <h4 className="text-white font-display font-bold text-xs uppercase tracking-wider mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li className="group flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-[#7FD1CB] shrink-0 mt-0.5 transition-transform duration-500 group-hover:scale-125" />
                  <span>{COORDONNEES_CENTRE.adresse}</span>
                </li>
                {COORDONNEES_CENTRE.telephones.map((tel) => (
                  <li key={tel.libelle} className="group flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-[#7FD1CB] shrink-0 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12" />
                    <span>
                      {tel.libelle} :{' '}
                      {tel.numeros.map((numero, index) => (
                        <span key={numero}>
                          {index > 0 && ' / '}
                          <a href={`tel:${numero}`} className="hover:text-[#7FD1CB] transition-colors">{numero}</a>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
                <li className="group flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-[#7FD1CB] shrink-0 transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-12" />
                  <a href={`mailto:${COORDONNEES_CENTRE.email}`} className="hover:text-[#7FD1CB] transition-colors">{COORDONNEES_CENTRE.email}</a>
                </li>
              </ul>
            </Revelation>

            <Revelation delai={300}>
              <h4 className="text-white font-display font-bold text-xs uppercase tracking-wider mb-4">Urgences 24h/24</h4>
              <div className="space-y-3 text-sm text-white">
                <p className="flex items-center space-x-2 text-[#7FD1CB] font-semibold">
                  <Clock className="w-4 h-4" />
                  <span>Service d'urgence ouvert 7j/7</span>
                </p>
              </div>
            </Revelation>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white">
            <span>© CENHOSOA · Tous droits réservés</span>
            <button
              onClick={profilUtilisateur?.role === 'patient' ? () => ouvrirRendezVous() : () => fixerAfficherConnexion(true)}
              className="text-[#7FD1CB] hover:underline hover:translate-x-0.5 transition-transform mt-4 sm:mt-0 font-medium"
            >
              {profilUtilisateur?.role === 'patient' ? 'Mes rendez-vous' : 'Accéder au Portail Patient'}
            </button>
          </div>
        </div>
      </footer>

      <ModaleDetailService
        key={serviceSelectionne?.id ?? 'aucun-service'}
        service={serviceSelectionne}
        onFermer={() => fixerServiceSelectionne(null)}
        onPrendreRdv={() => ouvrirRendezVous(serviceSelectionne)}
      />
    </div>
  );
}