import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, Calendar, Search, ShieldCheck, Award, Users,
  Clock, HeartPulse, Stethoscope, Activity, FileText, MapPin,
  Mail, ChevronRight, Menu, X, ArrowRight, Star, Brain, Baby, ScanLine, User, ShieldAlert, Navigation, ExternalLink, ChevronLeft
} from 'lucide-react';

import LoginCenhosoa from './components/LoginCenhosoa';
import GestionRendezVousCenhosoa from './components/RendezVous';

import cenhosoaEntrance from './assets/logo/Gemini_Generated_Image_ndofqwndofqwndof.jpg';
import image1787170777 from './assets/logo/image1787170777.jpg';
import logoImage from './assets/logo/logo.png';
import logoExpress from "./assets/logo/Logo_L'Express_de_Madagascar.jpg";
import logoMoov from './assets/logo/logo_moov.png';
import logoAllAfrica from './assets/logo/logo_all_africa.png';

const HERO_IMAGES = [
  { src: cenhosoaEntrance, alt: "CENHOSOA Vue 1" },
  { src: image1787170777, alt: "CENHOSOA Vue 2" }
];

const STATS_DATA = [
  { label: "Patients accueillis / an", value: 52000, suffix: "+", icon: Users },
  { label: "Spécialités médicales", value: 24, suffix: "", icon: Stethoscope },
  { label: "Praticiens experts", value: 180, suffix: "+", icon: Award },
  { label: "Années d'excellence", value: 135, suffix: "", icon: Clock },
];

const VALUES_DATA = [
  { 
    title: "Modernisation des infrastructures", 
    desc: "Un vaste plan de mise à niveau et de réhabilitation des structures pour célébrer 135 ans d'engagement.", 
    icon: Activity 
  },
  { 
    title: "Capacité d'accueil renforcée", 
    desc: "Optimisation continue des structures pour fluidifier les parcours et accueillir davantage de patients.", 
    icon: Users 
  },
  { 
    title: "Sécurité & accréditation", 
    desc: "Une démarche qualité rigoureuse et des équipements certifiés de dernière génération.", 
    icon: ShieldCheck 
  },
  { 
    title: "Partenariats & excellence", 
    desc: "Un soutien combiné de l'État et des partenaires techniques pour propulser les soins de santé de pointe.", 
    icon: Award 
  },
];

const SPECIALTIES_DATA = [
  { title: "Cardiologie", desc: "Soins cardiovasculaires de pointe et exploration interventionnelle.", icon: HeartPulse, count: "12 Praticiens" },
  { title: "Pédiatrie", desc: "Un environnement bienveillant dédié à la santé des enfants et nouveau-nés.", icon: Baby, count: "15 Praticiens" },
  { title: "Neurologie", desc: "Prise en charge spécialisée des pathologies du système nerveux.", icon: Brain, count: "8 Praticiens" },
  { title: "Gynécologie - Obstétrique", desc: "Suivi de la santé de la femme et accompagnement global à la maternité.", icon: Stethoscope, count: "10 Praticiens" },
  { title: "Imagerie Médicale", desc: "Radiologie et diagnostics de pointe par exploration visuelle.", icon: ScanLine, count: "9 Praticiens" }
];

const PORTAL_FEATURES = [
  { title: "Dossier médical en ligne", desc: "Consultez vos résultats et votre historique de soins en toute sécurité.", icon: FileText },
  { title: "Rendez-vous instantané", desc: "Réservez un créneau avec le praticien de votre choix en quelques clics.", icon: Calendar },
  { title: "Recherche de spécialiste", desc: "Trouvez rapidement le bon service selon votre besoin médical.", icon: Search },
  { title: "Suivi personnalisé", desc: "Recevez des rappels et un accompagnement adapté à votre parcours.", icon: Activity },
];

const NAV_LINKS = [
  { href: '#accueil', label: 'Accueil' },
  { href: '#services', label: 'Offre de soins' },
  { href: '#specialites', label: 'Spécialités' },
  { href: '#recherche', label: 'Localisation' },
  { href: '#temoignages', label: 'Témoignages' },
];

const TESTIMONIALS_DATA = [
  {
    quote: "Nous accompagnons régulièrement des proches ici, et la prise en charge y est excellente. Les soignants assurent un suivi rigoureux et la propreté est tout à fait satisfaisante.",
    author: "Eugène Randriamalala",
    role: "Proche de patient",
    sourceText: "L'Express de Madagascar",
    sourceUrl: "https://www.lexpress.mg/2026/08/sante-lhopital-militaire-porte-le-poids.html",
    logoUrl: logoExpress
  },
  {
    quote: "Le centre hospitalier Soavinandriana (Cenhsoa) s'agrandit pour son 135e anniversaire et ouvre de nouveaux services de référence inédits, renforçant l'offre de soins pour les usagers.",
    author: "Miangaly Ralitera",
    role: "Journaliste / Rapport de santé publique",
    sourceText: "AllAfrica / L'Express",
    sourceUrl: "https://fr.allafrica.com/stories/202608170594.html",
    logoUrl: logoAllAfrica
  },
  {
    quote: "L'établissement s'affirme comme un pôle de référence majeur à Madagascar, proposant des soins de pointe allant des interventions cardiovasculaires aux nouvelles filières spécialisées.",
    author: "Moov Madagascar",
    role: "Revue institutionnelle & Historique",
    sourceText: "Moov.mg",
    sourceUrl: "https://www.moov.mg/article/119985-hopital-militaire-de-soavinandriana-le-cenhosoa-celebre-135-ans-dhistoire-et-de-soins",
    logoUrl: logoMoov
  }
];

function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(node);
        }
      },
      { threshold }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);
  
  return [ref, visible];
}

function useCountUp(target, active, duration = 1600) {
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    if (!active) return;
    let start = null;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  
  return value;
}

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');
    .font-display { font-family: 'Sora', ui-sans-serif, sans-serif; }
    .font-body { font-family: 'Inter', ui-sans-serif, sans-serif; }
    .font-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }

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

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `}</style>
);

const Reveal = ({ children, className = '', delay = 0, as: Tag = 'div' }) => {
  const [ref, visible] = useReveal();
  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
};

const Navbar = ({ onOpenLogin, mobileMenuOpen, setMobileMenuOpen }) => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-b border-[#3457DC]/10 text-slate-800 transition-all">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
      <div className="flex items-center space-x-3.5 group cursor-pointer">
        <div className="w-14 h-14 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-md shadow-[#3457DC]/10 border border-[#3457DC]/10 overflow-hidden transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2">
          <img src={logoImage} alt="Logo CENHOSOA" className="w-full h-full object-contain" />
        </div>
        <div>
          <span className="text-xl font-display font-black tracking-tight text-[#0B1440] block">CENHOSOA</span>
          <span className="text-[11px] text-[#3457DC] font-mono font-semibold tracking-widest uppercase">Centre Hospitalier de Soavinandriana</span>
        </div>
      </div>

      <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600 font-body">
        {NAV_LINKS.map(({ href, label }) => (
          <a key={href} href={href} className="relative py-1 hover:text-[#3457DC] transition-colors group">
            {label}
            <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-gradient-to-r from-[#3457DC] to-[#7C9CFF] group-hover:w-full transition-all duration-300" />
          </a>
        ))}
      </nav>

      <div className="hidden lg:flex items-center space-x-3">
        <button
          onClick={onOpenLogin}
          className="bg-[#F5F7FD] hover:bg-[#E9EEFC] text-[#0B1440] border border-[#3457DC]/15 px-4.5 py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider transition-all duration-300 flex items-center space-x-2 group"
        >
          <User className="w-4 h-4 text-[#3457DC] transition-transform group-hover:scale-110" />
          <span>Login</span>
        </button>

        <a
          href="#urgence"
          className="relative bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 flex items-center space-x-2 overflow-hidden animate-pulse"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Urgence</span>
        </a>
      </div>

      <div className="md:hidden flex items-center">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2.5 rounded-xl bg-[#F5F7FD] text-[#0B1440] hover:bg-[#E9EEFC] focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
    </div>

    {mobileMenuOpen && (
      <div className="md:hidden bg-white border-b border-[#3457DC]/10 px-6 pt-4 pb-6 space-y-3 shadow-xl">
        {NAV_LINKS.map(({ href, label }) => (
          <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-700 font-semibold hover:text-[#3457DC]">
            {label}
          </a>
        ))}
        <div className="pt-3 space-y-2 border-t border-[#3457DC]/10">
          <button
            onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
            className="w-full text-center block bg-[#F5F7FD] text-[#0B1440] border border-[#3457DC]/15 py-3 rounded-xl font-semibold text-xs uppercase tracking-wider"
          >
            Portail Patient
          </button>
          <a href="#urgence" onClick={() => setMobileMenuOpen(false)} className="w-full text-center block bg-red-600 text-white py-3 rounded-xl font-semibold text-xs uppercase tracking-wider shadow-md shadow-red-600/30 flex items-center justify-center space-x-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Urgence</span>
          </a>
        </div>
      </div>
    )}
  </header>
);

export default function CENHOHOAPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRendezVous, setShowRendezVous] = useState(false);
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  
  const [statsRef, statsVisible] = useReveal(0.3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === HERO_IMAGES.length - 1 ? 0 : prev + 1));
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const testimonialTimer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev === TESTIMONIALS_DATA.length - 1 ? 0 : prev + 1));
    }, 5500);
    return () => clearInterval(testimonialTimer);
  }, []);

  if (showLogin) {
    return <LoginCenhosoa onBackToHome={() => setShowLogin(false)} />;
  }

  if (showRendezVous) {
    return <GestionRendezVousCenhosoa onBackToHome={() => setShowRendezVous(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FD] text-[#1E2333] font-body antialiased selection:bg-[#3457DC] selection:text-white overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>
      <GlobalStyles />
      <Navbar onOpenLogin={() => setShowLogin(true)} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <section id="accueil" className="relative text-white pt-40 pb-40 lg:pt-52 lg:pb-52 overflow-hidden bg-[#0B1440]">
        <div className="absolute inset-0 w-full h-full">
          {HERO_IMAGES.map((img, index) => (
            <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-60 z-0' : 'opacity-0 -z-10'}`}>
              <img src={img.src} className="absolute block w-full h-full object-cover object-right -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" alt={img.alt} />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0B1440]/70 via-[#1B2E7A]/45 to-[#3457DC]/30 mix-blend-multiply" />
        </div>

        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] bg-[#3457DC]/40 rounded-full blur-[110px] animate-blob z-0" />
        <div className="absolute top-1/3 right-0 w-[360px] h-[360px] bg-[#7C9CFF]/30 rounded-full blur-[100px] animate-blob-slow z-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1440] via-[#0B1440]/75 to-transparent z-10 pointer-events-none" />

        <div className="absolute z-30 flex -translate-x-1/2 bottom-16 left-1/2 space-x-3">
          {HERO_IMAGES.map((_, index) => (
            <button key={index} type="button" aria-label={`Aller à la diapositive ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === currentSlide ? 'bg-[#7C9CFF] w-8' : 'bg-white/40 w-3'}`} onClick={() => setCurrentSlide(index)} />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-8 space-y-7">
              <Reveal delay={100}>
                <h1 className="text-4xl sm:text-6xl font-display font-black tracking-tight leading-[1.08]">
                  Excellence en santé <span className="bg-gradient-to-r from-[#7C9CFF] via-[#A9BCFF] to-white bg-clip-text text-transparent">& innovation médicale</span>
                </h1>
              </Reveal>

              <Reveal delay={200}>
                <p className="text-lg sm:text-xl text-slate-300 font-light max-w-2xl leading-relaxed">
                  Le Centre Hospitalier de Soavinandriana vous offre des soins de référence, alliant performance technologique et valeurs humaines depuis 1891.
                </p>
              </Reveal>

              <Reveal delay={300} className="pt-4 flex flex-wrap gap-4">
                <button onClick={() => setShowLogin(true)} className="bg-[#3457DC] hover:bg-[#2c48c2] text-white px-7 py-4 rounded-2xl font-bold text-sm tracking-wide shadow-xl shadow-[#3457DC]/30 transition-all duration-300 hover:-translate-y-0.5 inline-flex items-center space-x-2.5">
                  <User className="w-5 h-5" />
                  <span>Accéder au Portail Patient</span>
                </button>
                <a href="#specialites" className="bg-white/10 hover:bg-white/15 backdrop-blur-md text-white border border-white/20 px-7 py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 inline-flex items-center space-x-2">
                  <span>Découvrir nos services</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              </Reveal>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-20 md:h-28 bg-[#F5F7FD] z-20 pointer-events-none" style={{ clipPath: 'polygon(0 100%, 100% 45%, 100% 100%, 0% 100%)' }} />
      </section>

      <section className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-mono font-bold text-[#3457DC] uppercase tracking-widest block mb-2">Notre engagement</span>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-[#0B1440] tracking-tight mb-4">Pourquoi choisir CENHOSOA</h2>
          <p className="text-slate-600 text-base sm:text-lg">À l'occasion de ses 135 ans, l'établissement accélère sa transformation à travers des projets de modernisation d'envergure.</p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES_DATA.map((val, index) => {
            const IconComponent = val.icon;
            return (
              <Reveal key={val.title} delay={index * 100}>
                <div className="h-full bg-white p-7 rounded-3xl border border-[#3457DC]/10 shadow-sm hover:shadow-xl hover:shadow-[#3457DC]/10 transition-all duration-300 hover:-translate-y-1.5 group">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3457DC] to-[#1B2E7A] text-white flex items-center justify-center mb-6 shadow-md shadow-[#3457DC]/20 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-display font-bold text-[#0B1440] mb-2">{val.title}</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{val.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section id="specialites" className="py-24 bg-white border-y border-[#3457DC]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold text-[#3457DC] uppercase tracking-widest block mb-2">Expertises cliniques</span>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-[#0B1440] tracking-tight mb-4">Nos Pôles d'Excellence</h2>
            <p className="text-slate-600 text-base sm:text-lg">Une prise en charge pluridisciplinaire d'excellence assurée par des équipes spécialisées.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {SPECIALTIES_DATA.map((spec, index) => {
              const IconComponent = spec.icon;
              return (
                <Reveal key={spec.title} delay={index * 80}>
                  <div className="relative h-full bg-[#F5F7FD] p-7 rounded-3xl border border-[#3457DC]/10 hover:border-[#3457DC]/30 shadow-sm hover:shadow-xl hover:shadow-[#3457DC]/15 transition-all duration-300 group flex flex-col justify-between hover:-translate-y-1.5 overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-[#3457DC]/5 group-hover:bg-[#3457DC]/10 transition-colors duration-300" />
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-white text-[#3457DC] flex items-center justify-center mb-6 group-hover:bg-[#3457DC] group-hover:text-white transition-all duration-300 shadow-sm border border-[#3457DC]/10">
                        <IconComponent className="w-7 h-7" />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-[#3457DC] uppercase tracking-wider">{spec.count}</span>
                      <h3 className="text-lg font-display font-bold text-[#0B1440] mt-1 mb-2">{spec.title}</h3>
                      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">{spec.desc}</p>
                    </div>
                    <div className="relative">
                      <button onClick={() => setShowRendezVous(true)} className="inline-flex items-center space-x-1 text-xs font-bold text-[#3457DC] group-hover:text-[#1B2E7A]">
                        <span>Prendre RDV</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section id="services" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <Reveal className="lg:col-span-5">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-[#3457DC]/15 aspect-[4/5]">
              <img src={cenhosoaEntrance} alt="Portail patient CENHOSOA" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1440]/90 via-[#0B1440]/20 to-transparent" />
            </div>
          </Reveal>

          <div className="lg:col-span-7">
            <Reveal>
              <span className="text-xs font-mono font-bold text-[#3457DC] uppercase tracking-widest block mb-2">Offre de soins numérique</span>
              <h2 className="text-3xl sm:text-4xl font-display font-black text-[#0B1440] tracking-tight mb-5">Votre parcours de soin, simplifié</h2>
              <p className="text-slate-600 text-base leading-relaxed mb-8 max-w-xl">
                Le portail patient CENHOSOA centralise vos démarches médicales pour vous faire gagner du temps, où que vous soyez à Madagascar.
              </p>
            </Reveal>

            <div className="grid sm:grid-cols-2 gap-5 mb-8">
              {PORTAL_FEATURES.map((feat, index) => {
                const IconComponent = feat.icon;
                return (
                  <Reveal key={feat.title} delay={index * 90} className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#3457DC]/10 text-[#3457DC] flex items-center justify-center shrink-0">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0B1440] mb-1">{feat.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{feat.desc}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal delay={360}>
              <button onClick={() => setShowLogin(true)} className="bg-[#3457DC] hover:bg-[#2c48c2] text-white px-7 py-3.5 rounded-2xl font-bold text-sm tracking-wide shadow-xl shadow-[#3457DC]/25 transition-all duration-300 hover:-translate-y-0.5 inline-flex items-center space-x-2.5">
                <User className="w-4.5 h-4.5" />
                <span>Créer mon espace patient</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="recherche" className="py-24 bg-white border-y border-[#3457DC]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold text-[#3457DC] uppercase tracking-widest block mb-2">Accès & Emplacement</span>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-[#0B1440] tracking-tight mb-4">Localisation du Centre</h2>
            <p className="text-slate-600 text-base sm:text-lg">Situé au cœur d'Antananarivo, le Centre Hospitalier de Soavinandriana est facilement accessible.</p>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <Reveal className="lg:col-span-4 space-y-6">
              <div className="bg-[#F5F7FD] p-6 rounded-3xl border border-[#3457DC]/10 space-y-4">
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#3457DC]/10 text-[#3457DC] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0B1440] mb-1">Adresse principale</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">Soavinandriana, Antananarivo 101, Madagascar</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#3457DC]/10 text-[#3457DC] flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0B1440] mb-1">Horaires d'ouverture</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">Urgences : 24h/24 et 7j/7<br />Consultations : Lun - Ven (08h00 - 16h00)</p>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href="https://www.google.com/maps/place/Centre+Hospitalier+de+Soavinandriana/@-18.8979848,47.5432881,876m/data=!3m2!1e3!4b1!4m6!3m5!1s0x21f0875465f35ec3:0x5d3e2c5d0256b83d!8m2!3d-18.8979848!4d47.5432881!16s%2Fg%2F1tr865vv?entry=ttu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#3457DC] hover:bg-[#2c48c2] text-white py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-[#3457DC]/20 transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Ouvrir dans Google Maps</span>
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-8">
              <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-[#3457DC]/15 border border-[#3457DC]/15 h-[420px] bg-slate-100">
                <iframe
                  title="Carte Google Maps CENHOSOA"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3776.9947721867964!2d47.5407078!3d-18.8979848!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x21f0875465f35ec3%3A0x5d3e2c5d0256b83d!2sCentre%20Hospitalier%20de%20Soavinandriana!5e0!3m2!1sfr!2smg!4v1700000000000!5m2!1sfr!2smg"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                ></iframe>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="temoignages" className="relative py-28 overflow-hidden bg-[#0B1440]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 dot-grid opacity-[0.08]" />
          <div className="absolute top-0 -left-40 w-[460px] h-[460px] bg-[#3457DC]/30 rounded-full blur-[130px] animate-blob" />
          <div className="absolute bottom-0 -right-40 w-[460px] h-[460px] bg-[#7C9CFF]/20 rounded-full blur-[130px] animate-blob-slow" />
        </div>

        <button
          onClick={() => setCurrentTestimonial((prev) => (prev === 0 ? TESTIMONIALS_DATA.length - 1 : prev - 1))}
          className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all z-30 hidden md:flex items-center justify-center"
          aria-label="Témoignage précédent"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setCurrentTestimonial((prev) => (prev === TESTIMONIALS_DATA.length - 1 ? 0 : prev + 1))}
          className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all z-30 hidden md:flex items-center justify-center"
          aria-label="Témoignage suivant"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <span className="text-xs font-mono font-bold text-[#7C9CFF] uppercase tracking-widest block mb-2">
              Témoignages & Presse
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight mb-14">
              L'avis des usagers et de la presse
            </h2>
          </Reveal>

          <div className="relative h-[440px] sm:h-[360px] overflow-hidden [perspective:1200px]">
            {TESTIMONIALS_DATA.map((testi, index) => {
              const total = TESTIMONIALS_DATA.length;
              let offset = index - currentTestimonial;
              if (offset > total / 2) offset -= total;
              if (offset < -total / 2) offset += total;
              if (Math.abs(offset) > 1) return null;

              const isActive = offset === 0;

              return (
                <div
                  key={index}
                  onClick={() => !isActive && setCurrentTestimonial(index)}
                  className={`absolute inset-x-0 top-0 mx-auto w-full max-w-2xl transition-all duration-700 ease-out ${isActive ? 'z-20' : 'z-10 cursor-pointer'}`}
                  style={{
                    transform: `translateX(${offset * 58}%) scale(${isActive ? 1 : 0.86}) rotateY(${offset * -6}deg)`,
                    opacity: isActive ? 1 : 0.32,
                    filter: isActive ? 'none' : 'blur(1.5px)',
                  }}
                  aria-hidden={!isActive}
                >
                  <div className="relative rounded-[2rem] bg-white/[0.05] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/30 px-7 py-9 sm:px-12 sm:py-11">
                    <span className="absolute top-3 left-6 font-display font-black text-[6rem] leading-none text-[#7C9CFF]/15 select-none pointer-events-none">
                      &ldquo;
                    </span>

                    <div className="relative flex justify-center space-x-1 mb-5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-[#7C9CFF] fill-[#7C9CFF]" />
                      ))}
                    </div>

                    <p className="relative text-lg sm:text-2xl font-display font-light text-white leading-relaxed text-center italic mb-8">
                      « {testi.quote} »
                    </p>

                    <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-11 h-11 rounded-full bg-[#7C9CFF]/20 border border-[#7C9CFF]/30 flex items-center justify-center text-[#7C9CFF] font-bold text-base shrink-0">
                          {testi.author.charAt(0)}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-white">{testi.author}</div>
                          <div className="text-xs text-slate-300">{testi.role}</div>
                        </div>
                      </div>

                      <div className="hidden sm:block w-px h-9 bg-white/15" />

                      <a
                        href={testi.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        tabIndex={isActive ? 0 : -1}
                        className="inline-flex items-center space-x-2.5 bg-white rounded-xl pl-1.5 pr-4 py-1.5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group"
                      >
                        <span className="w-7 h-7 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0 border border-slate-100">
                          <img src={testi.logoUrl} alt={testi.sourceText} className="w-full h-full object-contain" />
                        </span>
                        <span className="text-xs font-bold text-[#0B1440]">{testi.sourceText}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#3457DC] transition-colors" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center items-center mt-10 space-x-3 relative z-30">
            {TESTIMONIALS_DATA.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Aller au témoignage ${index + 1}`}
                onClick={() => setCurrentTestimonial(index)}
                className={`relative h-1.5 rounded-full overflow-hidden bg-white/15 transition-all duration-300 ${index === currentTestimonial ? 'w-10' : 'w-3 hover:bg-white/30'}`}
              >
                {index === currentTestimonial && (
                  <span
                    key={currentTestimonial}
                    className="absolute inset-y-0 left-0 bg-[#7C9CFF] rounded-full animate-[progress-fill_5.5s_linear]"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <Reveal className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0B1440] via-[#1B2E7A] to-[#3457DC] px-8 py-16 sm:px-16 sm:py-20 text-center">
          <div className="absolute inset-0 dot-grid opacity-60 pointer-events-none" />
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-[#7C9CFF]/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight mb-4">Prêt à prendre soin de vous ?</h2>
            <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto mb-8">Créez votre espace patient en quelques minutes et accédez à l'ensemble de nos services en ligne.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => setShowLogin(true)} className="bg-white hover:bg-slate-100 text-[#0B1440] px-7 py-4 rounded-2xl font-bold text-sm tracking-wide shadow-xl transition-all duration-300 hover:-translate-y-0.5 inline-flex items-center space-x-2.5">
                <User className="w-5 h-5" />
                <span>Accéder au Portail Patient</span>
              </button>
              <a
                href="#urgence"
                className="relative bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 flex items-center space-x-2 overflow-hidden animate-pulse"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Urgence</span>
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      <footer id="urgence" className="bg-[#0B1440] text-slate-300 pt-16 pb-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-white">
                <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center overflow-hidden">
                  <img src={logoImage} alt="Logo CENHOSOA" className="w-full h-full object-contain" />
                </div>
                <span className="text-lg font-display font-bold tracking-tight">CENHOSOA</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">Centre Hospitalier de Soavinandriana. Établissement public de santé de référence fondé en 1891 à Antananarivo.</p>
            </div>

            <div>
              <h4 className="text-white font-display font-bold text-xs uppercase tracking-wider mb-4">Navigation</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#accueil" className="hover:text-[#7C9CFF] transition-colors">Accueil</a></li>
                <li><a href="#services" className="hover:text-[#7C9CFF] transition-colors">Offre de soins</a></li>
                <li><a href="#specialites" className="hover:text-[#7C9CFF] transition-colors">Spécialités</a></li>
                <li><a href="#recherche" className="hover:text-[#7C9CFF] transition-colors">Localisation</a></li>
                <li><a href="#temoignages" className="hover:text-[#7C9CFF] transition-colors">Témoignages</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-display font-bold text-xs uppercase tracking-wider mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-[#7C9CFF] shrink-0 mt-0.5" />
                  <span>Soavinandriana, Antananarivo 101, Madagascar</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-[#7C9CFF] shrink-0" />
                  <span></span>
                </li>
                <li className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-[#7C9CFF] shrink-0" />
                  <span></span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-display font-bold text-xs uppercase tracking-wider mb-4">Urgences 24h/24</h4>
              <div className="space-y-3 text-sm text-slate-400">
                <p className="flex items-center space-x-2 text-[#7C9CFF] font-semibold">
                  <Clock className="w-4 h-4" />
                  <span>Service d'urgence ouvert 7j/7</span>
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
            <p>Centre Hospitalier de Soavinandriana © 2026. Tous droits réservés.</p>
            <button onClick={() => setShowLogin(true)} className="text-[#7C9CFF] hover:underline mt-4 sm:mt-0 font-medium">
              Accéder au Portail Patient
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}