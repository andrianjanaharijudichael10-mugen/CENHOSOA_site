import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, Calendar, Search, ShieldCheck, Award, Users, Ambulance,
  Clock, HeartPulse, Stethoscope, Activity, FileText, MapPin,
  Mail, ChevronRight, Menu, X, ArrowRight, Star, Brain, Baby, ScanLine, User, Navigation, ExternalLink, ChevronLeft, LogOut, ChevronUp, ChevronDown
} from 'lucide-react';

import LoginCenhosoa from './components/LoginCenhosoa';
import GestionRendezVousCenhosoa from './components/RendezVous';
import GestionAmbulances from './components/GestionAmbulances';
import SuperAdmin from './components/SuperAdmin';
import TableauDeBordLits from './components/TableauDeBordLits';
import DemandeAmbulancePatient from './components/DemandeAmbulancePatient';
import {
  effacerTokens,
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

const DONNEES_STATISTIQUES = [
  { libelle: "Patients accueillis / an", valeur: 52000, suffixe: "+", icone: Users },
  { libelle: "Spécialités médicales", valeur: 24, suffixe: "", icone: Stethoscope },
  { libelle: "Praticiens experts", valeur: 180, suffixe: "+", icone: Award },
  { libelle: "Années d'excellence", valeur: 135, suffixe: "", icone: Clock },
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

// Les services eux-mêmes viennent maintenant du backend (table `services`).
// Le backend ne connaît pas les icônes : on les associe ici côté frontend,
// par nom de service, avec une icône de repli si le nom n'est pas reconnu.
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

const FONCTIONNALITES_PORTAIL = [
  { titre: "Dossier médical en ligne", description: "Consultez vos résultats et votre historique de soins en toute sécurité.", icone: FileText },
  { titre: "Rendez-vous instantané", description: "Réservez un créneau avec le praticien de votre choix en quelques clics.", icone: Calendar },
  { titre: "Recherche de spécialiste", description: "Trouvez rapidement le bon service selon votre besoin médical.", icone: Search },
  { titre: "Suivi personnalisé", description: "Recevez des rappels et un accompagnement adapté à votre parcours.", icone: Activity },
];

const LIENS_NAVIGATION = [
  { lien: '#accueil', libelle: 'Accueil' },
  { lien: '#specialites', libelle: 'Spécialités' },
  { lien: '#services', libelle: 'Offre de soins' },
  { lien: '#recherche', libelle: 'Localisation' },
  { lien: '#temoignages', libelle: 'Témoignages' },
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

/* ═════════════════════════════════════════════════════════════
   MOTEUR DE SCROLL & D'ANIMATIONS
   ═════════════════════════════════════════════════════════════ */

const prefereMouvementReduit = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Un seul écouteur de scroll partagé (throttlé via requestAnimationFrame)
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

function utiliserRevelation(seuil = 0.15) {
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

// Parallaxe : décale l'élément selon sa position par rapport au centre de l'écran
function utiliserParallaxe(vitesse = 0.12) {
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

// Hero : le contenu s'estompe et glisse doucement pendant le scroll
function utiliserEstompageHero() {
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
  const reference = utiliserParallaxe(vitesse);
  return (
    <div ref={reference} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
};

const EstompageHero = ({ className = '', children }) => {
  const reference = utiliserEstompageHero();
  return (
    <div ref={reference} className={className}>
      {children}
    </div>
  );
};

// Carte 3D : inclinaison + halo lumineux qui suit le curseur
const CarteInclinable = ({ children, className = '', force = 7 }) => {
  const reference = useRef(null);

  const surMouvement = (evenement) => {
    if (evenement.pointerType !== 'mouse') return;
    const noeud = reference.current;
    if (!noeud) return;
    const rect = noeud.getBoundingClientRect();
    const x = (evenement.clientX - rect.left) / rect.width;
    const y = (evenement.clientY - rect.top) / rect.height;
    noeud.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    noeud.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    noeud.style.transform = `perspective(900px) rotateX(${((0.5 - y) * force).toFixed(2)}deg) rotateY(${((x - 0.5) * force).toFixed(2)}deg) translate3d(0, -4px, 0)`;
  };

  const surSortie = () => {
    if (reference.current) reference.current.style.transform = '';
  };

  return (
    <div
      ref={reference}
      onPointerMove={surMouvement}
      onPointerLeave={surSortie}
      className={`carte-lueur transition-all duration-300 ease-out ${className}`}
    >
      {children}
    </div>
  );
};

// Bouton magnétique : suit légèrement le curseur
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

// Titre : apparition mot par mot
const MotsAnimes = ({ texte, debut = 0, pas = 70, collant = false }) => {
  const mots = texte.split(' ');
  return mots.map((mot, index) => (
    <React.Fragment key={`${mot}-${index}`}>
      <span className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
        <span className="mot-anim" style={{ animationDelay: `${debut + index * pas}ms` }}>{mot}</span>
      </span>
      {!(collant && index === mots.length - 1) && ' '}
    </React.Fragment>
  ));
};

// Barre de progression du scroll + bouton « retour en haut » avec anneau de progression
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

    /* ── Révélation au scroll ── */
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

    /* ── Hero ── */
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

    /* ── Navigation mobile ── */
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

    /* ── Cartes, boutons, micro-interactions ── */
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

    /* ── Modale ── */
    @keyframes modale-fond { from { opacity: 0; } to { opacity: 1; } }
    .animate-modale-fond { animation: modale-fond 0.35s ease-out both; }

    /* ── Modale détail service (v2) ── */
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
  const [reference, estVisible] = utiliserRevelation();
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

  // Scrollspy : met en avant le lien de la section visible
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

  const solide = defile || menuMobileOuvert;
  const liens = LIENS_NAVIGATION.filter(({ lien }) => profil?.role !== 'patient' || lien !== '#services');
  const estPatient = profil?.role === 'patient';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${solide ? 'bg-white/80 backdrop-blur-xl border-b border-black/5 text-[#0A2233]' : 'bg-transparent text-white'} ${defile ? 'shadow-[0_8px_30px_-12px_rgba(10,34,51,0.25)]' : ''}`}>
      <div className={`max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between transition-[height] duration-500 ${defile ? 'h-16' : 'h-20'}`}>
        <a href="#accueil" className="group flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-white p-1.5 flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105">
            <img src={logoImage} alt="Logo CENHOSOA" className="w-full h-full object-contain" />
          </div>
          <div className="leading-tight">
            <span className="text-lg font-light tracking-[0.18em] block">CENHOSOA</span>
            <span className={`hidden sm:block text-[10px] tracking-[0.2em] uppercase transition-all duration-500 ${solide ? 'text-slate-500' : 'text-white/60'} ${defile ? 'max-h-0 opacity-0' : 'max-h-4 opacity-100'}`}>Centre Hospitalier de Soavinandriana</span>
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
            className={`rounded-full border transition-all duration-300 active:scale-95 flex items-center ${estPatient ? 'space-x-1.5 px-3 py-2 text-xs tracking-normal' : 'space-x-2 px-5 py-2.5 text-[13px] tracking-wide'} ${solide ? 'border-[#0A2233]/20 hover:bg-[#0A2233] hover:text-white' : 'border-white/30 bg-white/10 backdrop-blur-md hover:bg-white hover:text-[#0A2233]'}`}
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
          className="md:hidden p-2.5 rounded-full focus:outline-none active:scale-90 transition-transform"
        >
          <span key={menuMobileOuvert ? 'ferme' : 'ouvre'} className="inline-flex animate-icone-rot">
            {menuMobileOuvert ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </span>
        </button>
      </div>

      {menuMobileOuvert && (
        <div className="animate-menu-in md:hidden bg-white text-[#0A2233] border-b border-black/5 px-6 pt-2 pb-6 space-y-1">
          {liens.map(({ lien, libelle }, index) => (
            <a
              key={lien}
              href={lien}
              onClick={() => fixerMenuMobileOuvert(false)}
              className="animate-lien-in block py-3 text-xl font-light border-b border-black/5"
              style={{ animationDelay: `${60 + index * 60}ms` }}
            >
              {libelle}
            </a>
          ))}
          <div className="pt-4 space-y-2 animate-lien-in" style={{ animationDelay: `${60 + liens.length * 60}ms` }}>
            <button
              type="button"
              onClick={() => {
                fixerMenuMobileOuvert(false);
                surDemandeAmbulance();
              }}
              className="flex w-full items-center justify-center space-x-2 rounded-full bg-[#1F7A8C] py-3.5 text-sm font-semibold text-white active:scale-[0.98] transition-transform"
            >
              <Ambulance className="h-4 w-4" />
              <span>Demander une ambulance</span>
            </button>
            <button
              onClick={() => {
                fixerMenuMobileOuvert(false);
                (estPatient ? surOuvertureRendezVous : surOuvertureConnexion)();
              }}
              className="w-full py-3.5 rounded-full bg-[#0A2233] text-white text-sm tracking-wide active:scale-[0.98] transition-transform"
            >
              {estPatient ? 'Mes rendez-vous' : 'Portail Patient'}
            </button>
            {estPatient && (
              <button
                type="button"
                onClick={() => {
                  fixerMenuMobileOuvert(false);
                  surDeconnexion();
                }}
                className="w-full py-3.5 rounded-full bg-red-600 text-white text-sm tracking-wide flex items-center justify-center space-x-2 active:scale-[0.98] transition-transform"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            )}
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

  // Réinitialise l'état de fermeture à chaque nouvelle ouverture
  useEffect(() => {
    if (ouverte) fixerEnFermeture(false);
    return () => clearTimeout(minuterieFermeture.current);
  }, [service]);

  // Bloque le scroll de la page derrière la modale
  useEffect(() => {
    if (!ouverte) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = precedent;
    };
  }, [ouverte]);

  // Fermeture animée (le parent reste maître de l'état via onFermer)
  const fermerAvecAnimation = () => {
    if (enFermeture) return;
    fixerEnFermeture(true);
    minuterieFermeture.current = setTimeout(onFermer, 280);
  };

  // Fermeture à la touche Échap
  useEffect(() => {
    if (!ouverte) return;
    const surTouche = (e) => { if (e.key === 'Escape') fermerAvecAnimation(); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [ouverte, enFermeture]);

  if (!service) return null;

  const classeBloc = 'animate-lien-in group relative flex items-start gap-4 rounded-2xl border border-black/5 bg-[#F4F2EE]/70 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#1F7A8C]/30 hover:bg-white hover:shadow-[0_12px_30px_-14px_rgba(10,34,51,0.35)]';
  const classePastille = 'w-10 h-10 rounded-xl bg-[#1F7A8C]/10 text-[#1F7A8C] flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-[#1F7A8C] group-hover:text-white group-hover:scale-110 group-hover:-rotate-6';
  const classeLibelle = 'text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titre-modale-service"
    >
      <div
        className={`${enFermeture ? 'animate-modale-fond-sortie' : 'animate-modale-fond'} absolute inset-0 bg-[#0A2233]/70 backdrop-blur-md cursor-pointer`}
        onClick={fermerAvecAnimation}
      />

      <div className={`${enFermeture ? 'animate-modale-panneau-sortie' : 'animate-modale-panneau'} modale-scroll relative w-full max-w-xl overflow-hidden rounded-[30px] border border-white/10 bg-white shadow-[0_40px_100px_rgba(10,34,51,0.45)] max-h-[88vh] overflow-y-auto overscroll-contain`}>
        <button
          onClick={fermerAvecAnimation}
          aria-label="Fermer"
          className="group/fermer absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:rotate-90 hover:bg-white/20 active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative overflow-hidden bg-gradient-to-br from-[#0A2233] via-[#0F3D52] to-[#1F7A8C] px-6 pb-6 pt-7 sm:px-8">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/12 blur-3xl" />
          <div className="absolute -bottom-16 left-6 h-36 w-36 rounded-full bg-[#7FD1CB]/20 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-white/20 bg-white/10 shadow-[0_20px_40px_rgba(10,34,51,0.25)] backdrop-blur-sm">
              {service.photo_responsable_url ? (
                <img
                  src={service.photo_responsable_url}
                  alt={service.responsable || service.nom}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-display text-3xl font-black text-white">
                  {(service.responsable || service.nom).charAt(0)}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#B5E8E3]">Service médical</p>
              <h3 id="titre-modale-service" className="mt-2 text-2xl font-display font-black leading-tight text-white">
                {service.nom}
              </h3>
              {service.responsable && (
                <p className="mt-1 text-sm font-medium text-white/75">{service.responsable}</p>
              )}
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap gap-2">
            {service.horaires && (
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/85">
                {service.horaires}
              </span>
            )}
            {service.localisation && (
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/85">
                {service.localisation}
              </span>
            )}
          </div>
        </div>

        <div className="bg-[#F4F2EE] px-5 pb-5 pt-5 sm:px-6">
          <div className="rounded-[24px] border border-[#0A2233]/5 bg-white p-4 shadow-[0_12px_30px_rgba(10,34,51,0.05)]">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F7A8C]/10 text-[#1F7A8C]">
                <FileText className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0A2233]/65">Description</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {service.description || 'Description non renseignée.'}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {service.horaires && (
              <div className="rounded-2xl border border-[#0A2233]/5 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F7A8C]/10 text-[#1F7A8C]">
                    <Clock className="h-4 w-4" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A2233]/60">Horaires</p>
                </div>
                <p className="mt-3 text-sm text-slate-600">{service.horaires}</p>
              </div>
            )}

            {service.localisation && (
              <div className="rounded-2xl border border-[#0A2233]/5 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F7A8C]/10 text-[#1F7A8C]">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A2233]/60">Localisation</p>
                </div>
                <p className="mt-3 text-sm text-slate-600">{service.localisation}</p>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-[#0A2233]/5 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F7A8C]/10 text-[#1F7A8C]">
                <Phone className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A2233]/60">Contact</p>
            </div>
            {service.telephone ? (
              <a href={`tel:${service.telephone}`} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#0A2233] transition-colors hover:text-[#1F7A8C]">
                <span>{service.telephone}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Non renseigné</p>
            )}
          </div>

          <button
            onClick={onPrendreRdv}
            className="btn-brillance mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1F7A8C] to-[#186575] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-lg shadow-[#1F7A8C]/20 transition-all duration-300 hover:from-[#0F3D52] hover:to-[#1F7A8C] hover:shadow-xl hover:shadow-[#1F7A8C]/30 active:scale-[0.98]"
          >
            <Calendar className="h-4 w-4" />
            <span>Prendre rendez-vous</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const CHEMIN_CONNEXION_PERSONNEL = '/connexion-personnel';

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
  
  const [diapositiveCourante, fixerDiapositiveCourante] = useState(0);
  const [temoignageCourant, fixerTemoignageCourant] = useState(0);

  const [services, fixerServices] = useState([]);
  const [chargementServices, fixerChargementServices] = useState(true);
  const [serviceSelectionne, fixerServiceSelectionne] = useState(null);
  const [serviceActif, fixerServiceActif] = useState(0);

  const ouvrirRendezVous = (service = null) => {
    fixerServiceSelectionne(service);
    fixerAfficherRendezVous(true);
  };

  const retournerAuPortailPublic = () => {
    window.history.pushState({}, '', '/');
    fixerEspaceConnexionPersonnel(false);
    fixerAfficherConnexion(false);
  };

  const quitterConnexionPersonnel = () => {
    if (window.location.pathname === CHEMIN_CONNEXION_PERSONNEL) {
      window.history.replaceState({}, '', '/');
    }
    fixerEspaceConnexionPersonnel(false);
  };

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
        } else if (profil.role === 'major_de_garde') {
          fixerProfilUtilisateur(profil);
          fixerAfficherGestionLits(true);
        } else if (profil.role === 'secretaire') {
          fixerProfilUtilisateur(profil);
          fixerAfficherRendezVous(true);
        } else if (profil.role === 'medecin') {
          fixerProfilUtilisateur(profil);
          fixerAfficherRendezVous(true);
        } else if (['major', 'regulateur_ambulance', 'chef_division_auto', 'chef_sim'].includes(profil.role)) {
          fixerProfilUtilisateur(profil);
          fixerAfficherGestionAmbulances(true);
        }
      })
      .catch((err) => console.error('Erreur de vérification de session :', err));
  }, []);

  const gererConnexionPersonnel = async (espacePersonnel = false) => {
    try {
      const profil = await obtenirProfil(obtenirTokenStocke());
      const rolesLits = ['major_de_garde'];
      const rolesAmbulances = ['major', 'regulateur_ambulance', 'chef_division_auto', 'chef_sim'];
      if (profil.role === 'patient') {
        if (espacePersonnel) {
          effacerTokens();
          return false;
        }
        quitterConnexionPersonnel();
        fixerProfilUtilisateur(profil);
        fixerAfficherRendezVous(false);
        fixerAfficherConnexion(false);
        return true;
      }
      if (profil.role === 'secretaire') {
        quitterConnexionPersonnel();
        fixerProfilUtilisateur(profil);
        fixerAfficherRendezVous(true);
        fixerAfficherConnexion(false);
        return true;
      }
      if (profil.role === 'medecin') {
        quitterConnexionPersonnel();
        fixerProfilUtilisateur(profil);
        fixerAfficherRendezVous(true);
        fixerAfficherConnexion(false);
        return true;
      }
      if (profil.role === 'superadmin') {
        quitterConnexionPersonnel();
        fixerProfilUtilisateur(profil);
        fixerAfficherSuperAdmin(true);
        fixerAfficherConnexion(false);
        return true;
      }
      if (![...rolesLits, ...rolesAmbulances].includes(profil.role)) {
        if (espacePersonnel) effacerTokens();
        return false;
      }
      quitterConnexionPersonnel();
      fixerProfilUtilisateur(profil);
      fixerAfficherGestionLits(rolesLits.includes(profil.role));
      fixerAfficherGestionAmbulances(rolesAmbulances.includes(profil.role));
      fixerAfficherConnexion(false);
      return true;
    } catch (err) {
      console.error('Erreur de vérification du profil :', err);
      return false;
    }
  };

  const deconnecterPersonnel = () => {
    effacerTokens();
    window.history.replaceState({}, '', CHEMIN_CONNEXION_PERSONNEL);
    fixerProfilUtilisateur(null);
    fixerAfficherGestionLits(false);
    fixerAfficherGestionAmbulances(false);
    fixerAfficherSuperAdmin(false);
    fixerAfficherRendezVous(false);
    fixerAfficherConnexion(false);
    fixerEspaceConnexionPersonnel(true);
  };

  const deconnecterPatient = () => {
    effacerTokens();
    window.history.replaceState({}, '', '/');
    fixerProfilUtilisateur(null);
    fixerAfficherGestionLits(false);
    fixerAfficherGestionAmbulances(false);
    fixerAfficherSuperAdmin(false);
    fixerAfficherRendezVous(false);
    fixerAfficherConnexion(false);
    fixerEspaceConnexionPersonnel(false);
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
    const minuterie = setInterval(() => {
      fixerDiapositiveCourante((precedent) => (precedent === IMAGES_HERO.length - 1 ? 0 : precedent + 1));
    }, 3500);
    return () => clearInterval(minuterie);
  }, []);

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

  if (afficherGestionAmbulances) {
    return (
      <GestionAmbulances
        profil={profilUtilisateur}
        onDeconnexion={deconnecterPersonnel}
      />
    );
  }

  if (afficherGestionLits) {
    return (
      <TableauDeBordLits
        profil={profilUtilisateur}
        onDeconnexion={deconnecterPersonnel}
        onRetourAdministration={profilUtilisateur?.role === 'superadmin' ? () => {
          fixerAfficherGestionLits(false);
          fixerAfficherSuperAdmin(true);
        } : undefined}
        onOuvrirAmbulances={['major', 'regulateur_ambulance', 'chef_division_auto', 'chef_sim'].includes(profilUtilisateur?.role) ? () => {
          fixerAfficherGestionLits(false);
          fixerAfficherGestionAmbulances(true);
        } : undefined}
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
        onBackToHome={() => {
          fixerAfficherRendezVous(false);
          fixerServiceSelectionne(null);
        }}
        onDeconnexion={deconnecterPersonnel}
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

      {/* ───────── HERO ───────── */}
      <section id="accueil" className="relative min-h-[100svh] flex flex-col justify-end text-white overflow-hidden bg-[#0A2233]">
        <div className="absolute inset-0">
          <Parallaxe vitesse={0.14} className="absolute inset-x-0 -top-[14%] h-[128%]">
            {IMAGES_HERO.map((img, index) => (
              <img key={index} src={img.source} alt={img.alternative}
                className={`animate-kenburns absolute inset-0 w-full h-full object-cover transition-opacity duration-[1400ms] ease-in-out ${index === diapositiveCourante ? 'opacity-70' : 'opacity-0'}`}
                style={{ animationDelay: `${index * -8}s` }} />
            ))}
          </Parallaxe>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A2233]/70 via-[#0A2233]/35 to-[#0A2233]/95" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A2233]/80 via-transparent to-transparent" />
          <div className="absolute -bottom-32 -left-24 w-[420px] h-[420px] rounded-full bg-[#1F7A8C]/25 blur-[120px] animate-blob pointer-events-none" />
        </div>

        <EstompageHero className="relative z-10 max-w-7xl w-full mx-auto px-5 sm:px-8 pt-40 pb-12 lg:pb-16">
          <Revelation>
            <p className="text-[11px] sm:text-xs tracking-[0.3em] uppercase text-white/60 mb-6">Antananarivo · Madagascar · depuis 1891</p>
          </Revelation>
          <h1 className="text-5xl sm:text-7xl lg:text-[7rem] font-light tracking-[-0.045em] leading-[1.02] max-w-5xl">
            <MotsAnimes texte="Des soins de référence, au cœur d'" debut={250} collant />
            <span className="text-white/40">
              <MotsAnimes texte="Antananarivo." debut={740} />
            </span>
          </h1>
          <Revelation delai={900} variante="flou">
            <p className="mt-8 max-w-xl text-base sm:text-lg font-light text-white/70 leading-relaxed">
              Le Centre Hospitalier de Soavinandriana allie performance technologique et valeurs humaines pour accompagner chaque patient.
            </p>
          </Revelation>

          <Revelation delai={1050} variante="zoom" className="mt-12">
            <div className="grid grid-cols-1 md:grid-cols-3 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 divide-y md:divide-y-0 md:divide-x divide-white/15 overflow-hidden">
              <div className="group flex items-center space-x-4 px-7 py-6 transition-colors duration-300 hover:bg-white/10">
                <Clock className="w-5 h-5 text-[#7FD1CB] shrink-0 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12" />
                <div>
                  <p className="text-[11px] tracking-[0.2em] uppercase text-white/50">Urgences</p>
                  <p className="text-sm font-light">24h/24 et 7j/7</p>
                </div>
              </div>
              <div className="group flex items-center space-x-4 px-7 py-6 transition-colors duration-300 hover:bg-white/10">
                <Stethoscope className="w-5 h-5 text-[#7FD1CB] shrink-0 transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-12" />
                <div>
                  <p className="text-[11px] tracking-[0.2em] uppercase text-white/50">Consultations</p>
                  <p className="text-sm font-light">Lun – Ven · 08h00 – 16h00</p>
                </div>
              </div>
              {profilUtilisateur?.role !== 'patient' ? (
                <button onClick={() => fixerAfficherConnexion(true)} className="btn-brillance group flex items-center justify-between px-7 py-6 bg-white text-[#0A2233] hover:bg-[#F4F2EE] transition-colors text-left">
                  <span className="flex items-center space-x-4">
                    <User className="w-5 h-5 shrink-0 transition-transform duration-500 group-hover:scale-125" />
                    <span className="text-sm font-medium">Accéder au Portail Patient</span>
                  </span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-2" />
                </button>
              ) : (
                <a href="#specialites" className="btn-brillance group flex items-center justify-between px-7 py-6 bg-white text-[#0A2233] hover:bg-[#F4F2EE] transition-colors">
                  <span className="text-sm font-medium">Découvrir nos spécialités</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-2" />
                </a>
              )}
            </div>
          </Revelation>

          <div className="flex space-x-2 mt-8">
            {IMAGES_HERO.map((_, index) => (
              <button key={index} type="button" aria-label={`Aller à la diapositive ${index + 1}`} onClick={() => fixerDiapositiveCourante(index)}
                className={`h-px transition-all duration-500 hover:bg-white ${index === diapositiveCourante ? 'w-12 bg-white' : 'w-6 bg-white/40 hover:w-9'}`} />
            ))}
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

      {/* ───────── ENGAGEMENT : image + panneau ───────── */}
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

      {/* ───────── SPÉCIALITÉS : liste focus ───────── */}
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

      {/* ───────── PORTAIL : fond immersif + cartes en verre dépoli ───────── */}
      <section id="services" className="relative overflow-hidden bg-[#0A2233] text-white py-28 lg:py-36">
        <Parallaxe vitesse={0.1} className="absolute inset-x-0 -top-[10%] h-[120%]">
          <img src={cenhosoaEntrance} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        </Parallaxe>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A2233] via-[#0A2233]/70 to-[#0A2233]" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <Revelation variante="flou" className="max-w-3xl mb-16">
            <p className="text-[11px] tracking-[0.3em] uppercase text-white/50 mb-5">Offre de soins numérique</p>
            <h2 className="text-4xl sm:text-6xl font-light tracking-[-0.04em] leading-[1.05]">
              Votre parcours de soin, <span className="text-white/40">simplifié.</span>
            </h2>
            <p className="mt-6 text-white/65 font-light leading-relaxed max-w-xl">
              Le portail patient CENHOSOA centralise vos démarches médicales pour vous faire gagner du temps, où que vous soyez à Madagascar.
            </p>
          </Revelation>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FONCTIONNALITES_PORTAIL.map((featItem, index) => {
              const ComposantIcone = featItem.icone;
              return (
                <Revelation key={featItem.titre} delai={index * 110} variante="zoom">
                  <CarteInclinable className="group h-full rounded-3xl bg-white/[0.07] backdrop-blur-xl border border-white/10 hover:bg-white/[0.12] hover:border-white/25 p-7">
                    <ComposantIcone className="w-6 h-6 text-[#7FD1CB] mb-12 transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-6" strokeWidth={1.5} />
                    <h3 className="text-lg font-light mb-2">{featItem.titre}</h3>
                    <p className="text-sm font-light text-white/60 leading-relaxed transition-colors duration-300 group-hover:text-white/80">{featItem.description}</p>
                  </CarteInclinable>
                </Revelation>
              );
            })}
          </div>

          <Revelation delai={320} className="mt-5">
            <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-white/15 bg-white/[0.08] p-6 backdrop-blur-xl transition-colors duration-500 hover:border-[#7FD1CB]/40 hover:bg-white/[0.12] sm:flex-row sm:items-center sm:p-8">
              <div className="flex items-start gap-4">
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#7FD1CB]/15 text-[#7FD1CB]">
                  <span className="absolute inset-0 rounded-2xl bg-[#7FD1CB]/30 animate-pulse-ring" aria-hidden="true" />
                  <Ambulance className="relative h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-medium">Demande urgente d’ambulance</h3>
                  <p className="mt-1 max-w-xl text-sm font-light leading-relaxed text-white/60">
                    Estimez un trajet et transmettez une demande à la régulation, avec ou sans compte patient.
                  </p>
                </div>
              </div>
              <Magnetique className="shrink-0">
                <button
                  type="button"
                  onClick={() => fixerAfficherDemandeAmbulance(true)}
                  className="btn-brillance group inline-flex shrink-0 items-center gap-2 rounded-full bg-[#7FD1CB] px-6 py-3 text-sm font-bold text-[#0A2233] transition hover:bg-white active:scale-95"
                >
                  Faire une demande <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </Magnetique>
            </div>
          </Revelation>

          {profilUtilisateur?.role !== 'patient' && (
            <Revelation delai={360} className="mt-12">
              <Magnetique>
                <button onClick={() => fixerAfficherConnexion(true)} className="btn-brillance group inline-flex items-center space-x-3 bg-white text-[#0A2233] hover:bg-[#F4F2EE] px-8 py-4 rounded-full text-sm font-medium transition-colors active:scale-95">
                  <span>Créer mon espace patient</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </Magnetique>
            </Revelation>
          )}
        </div>
      </section>

      {/* ───────── LOCALISATION ───────── */}
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
                className={`relative h-1.5 rounded-full overflow-hidden bg-white/15 transition-all duration-300 ${index === temoignageCourant ? 'w-10' : 'w-3 hover:w-5 hover:bg-white/30'}`}
              >
                {index === temoignageCourant && (
                  <span
                    key={temoignageCourant}
                    className="absolute inset-y-0 left-0 bg-[#7FD1CB] rounded-full animate-[progress-fill_5.5s_linear]"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {profilUtilisateur?.role !== 'patient' && <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <Revelation variante="zoom" className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0A2233] via-[#0F3D52] to-[#1F7A8C] px-8 py-16 sm:px-16 sm:py-20 text-center">
          <div className="absolute inset-0 dot-grid opacity-60 pointer-events-none" />
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-[#7FD1CB]/20 rounded-full blur-[100px] pointer-events-none animate-blob" />
          <div className="absolute -bottom-20 -left-16 w-72 h-72 bg-[#1F7A8C]/30 rounded-full blur-[100px] pointer-events-none animate-blob-slow" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight mb-4">Prêt à prendre soin de vous ?</h2>
            <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto mb-8">Créez votre espace patient en quelques minutes et accédez à l'ensemble de nos services en ligne.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Magnetique>
                <button onClick={() => fixerAfficherConnexion(true)} className="btn-brillance bg-white hover:bg-slate-100 text-[#0A2233] px-7 py-4 rounded-2xl font-bold text-sm tracking-wide shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl active:scale-95 inline-flex items-center space-x-2.5">
                  <User className="w-5 h-5" />
                  <span>Accéder au Portail Patient</span>
                </button>
              </Magnetique>
            </div>
          </div>
        </Revelation>
      </section>}

      <footer id="urgence" className="bg-[#0A2233] text-slate-300 pt-16 pb-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <Revelation className="space-y-4">
              <div className="group flex items-center space-x-3 text-white">
                <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                  <img src={logoImage} alt="Logo CENHOSOA" className="w-full h-full object-contain" />
                </div>
                <span className="text-lg font-display font-bold tracking-tight">CENHOSOA</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">Centre Hospitalier de Soavinandriana. Établissement public de santé de référence fondé en 1891 à Antananarivo.</p>
            </Revelation>

            <Revelation delai={100}>
              <h4 className="text-white font-display font-bold text-xs uppercase tracking-wider mb-4">Navigation</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#accueil" className="inline-block hover:text-[#7FD1CB] hover:translate-x-1 transition-all duration-300">Accueil</a></li>
                {profilUtilisateur?.role !== 'patient' && <li><a href="#services" className="inline-block hover:text-[#7FD1CB] hover:translate-x-1 transition-all duration-300">Offre de soins</a></li>}
                <li><a href="#specialites" className="inline-block hover:text-[#7FD1CB] hover:translate-x-1 transition-all duration-300">Spécialités</a></li>
                <li><a href="#recherche" className="inline-block hover:text-[#7FD1CB] hover:translate-x-1 transition-all duration-300">Localisation</a></li>
                <li><a href="#temoignages" className="inline-block hover:text-[#7FD1CB] hover:translate-x-1 transition-all duration-300">Témoignages</a></li>
                {profilUtilisateur?.role !== 'patient' && (
                  <li>
                    <a
                      href={CHEMIN_CONNEXION_PERSONNEL}
                      onClick={(event) => {
                        event.preventDefault();
                        window.history.pushState({}, '', CHEMIN_CONNEXION_PERSONNEL);
                        fixerAfficherConnexion(false);
                        fixerEspaceConnexionPersonnel(true);
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
              <div className="space-y-3 text-sm text-slate-400">
                <p className="flex items-center space-x-2 text-[#7FD1CB] font-semibold">
                  <Clock className="w-4 h-4" />
                  <span>Service d'urgence ouvert 7j/7</span>
                </p>
              </div>
            </Revelation>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
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
        service={serviceSelectionne}
        onFermer={() => fixerServiceSelectionne(null)}
        onPrendreRdv={() => ouvrirRendezVous(serviceSelectionne)}
      />
    </div>
  );
}