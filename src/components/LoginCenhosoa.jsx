import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, Mail, Lock, UserCheck } from 'lucide-react';
import hospitalBgImage from '../assets/logo/Gemini_Generated_Image_ndofqwndofqwndof.jpg';
import logoImage from '../assets/logo/logo.png';

export default function AuthCENHOSOA({ onBackToHome }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    acceptTerms: false,
    rememberMe: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert(isSignUp ? 'Inscription réussie !' : 'Connexion réussie !');
    }, 1200);
  };

  const handleToggleMode = (signUpState) => {
    setIsSignUp(signUpState);
    setShowPassword(false);
  };

  const clipLeft = 'polygon(0% 0%, 47% 0%, 36.7% 100%, 0% 100%)';
  const clipRight = 'polygon(53% 0%, 100% 0%, 100% 100%, 63.3% 100%)';

  // Composant réutilisable pour le bouton "Mode invité"
  const GuestButton = () => (
    onBackToHome ? (
      <button
        type="button"
        onClick={onBackToHome}
        className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
      >
        <UserCheck className="w-4 h-4 text-[#1F3A93]" />
        <span>Continuer en mode invité</span>
      </button>
    ) : null
  );

  // Composant réutilisable pour le séparateur "Ou"
  const DividerOr = () => (
    <div className="relative my-4 sm:my-5 text-center">
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
      <span className="relative px-3 bg-white text-[10px] text-slate-400 uppercase tracking-widest font-medium">Ou</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1333] font-sans antialiased flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      
      {/* Carte principale */}
      <div className="w-full max-w-[960px] min-h-[620px] bg-white rounded-3xl shadow-2xl relative overflow-hidden flex flex-col lg:block">
        
        {/* Logo et Texte Flottants */}
        <div className="absolute top-5 left-7 z-40 flex items-center space-x-3">
          <div className="w-12 h-12 bg-white rounded-xl p-1 shadow-md border border-slate-100 flex items-center justify-center overflow-hidden">
            <img src={logoImage} alt="Logo CENHOSOA" className="w-full h-full object-contain" />
          </div>
          <span className={`text-base font-bold tracking-tight transition-colors duration-500 ${isSignUp ? 'text-white' : 'text-[#1F3A93]'}`}>
            CENHOSOA
          </span>
          
        </div>

        {/* ================= VERSION DESKTOP ================= */}
        <div className="hidden lg:block w-full h-full min-h-[620px] relative">
          
          {/* Panneau Glissant Arrière-plan */}
          <div
            className="absolute inset-0 bg-[#1F3A93] transition-[clip-path] duration-700 ease-in-out z-10 overflow-hidden"
            style={{ clipPath: isSignUp ? clipLeft : clipRight }}
          >
            <img src={hospitalBgImage} alt="Centre Hospitalier CENHOSOA" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-[#0F1E54]/60" />
          </div>

          {/* Panneau Gauche (Action Inscription / Switch) */}
          <div className={`absolute top-0 left-0 w-[45%] h-full flex flex-col items-center justify-center text-center px-10 z-20 transition-all duration-500 ${isSignUp ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
            <h2 className="text-3xl font-bold text-white tracking-tight">Déjà inscrit ?</h2>
            <p className="text-xs text-white/85 max-w-[240px] mx-auto leading-relaxed mt-4">
              Connectez-vous à votre espace patient CENHOSOA pour accéder à vos rendez-vous et à votre dossier médical.
            </p>
            <button
              type="button"
              onClick={() => handleToggleMode(false)}
              className="mt-8 px-8 py-3 rounded-xl border border-white text-white text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer shadow-lg"
            >
              Connexion
            </button>
          </div>

          {/* Panneau Droit (Action Connexion / Switch) */}
          <div className={`absolute top-0 right-0 w-[45%] h-full flex flex-col items-center justify-center text-center px-10 z-20 transition-all duration-500 ${!isSignUp ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
            <h2 className="text-3xl font-bold text-white tracking-tight">Nouveau sur CENHOSOA ?</h2>
            <p className="text-xs text-white/85 max-w-[240px] mx-auto leading-relaxed mt-4">
              Créez votre compte patient pour planifier vos consultations et profiter de nos services de santé en ligne.
            </p>
            <button
              type="button"
              onClick={() => handleToggleMode(true)}
              className="mt-8 px-8 py-3 rounded-xl border border-white text-white text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer shadow-lg"
            >
              Inscription
            </button>
          </div>

          {/* ---- FORMULAIRE DE CONNEXION ---- */}
          <div className={`absolute top-0 left-0 w-[55%] h-full flex flex-col justify-center px-14 z-20 transition-all duration-500 ${!isSignUp ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
            <div className="max-w-[360px] w-full mx-auto">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Connexion</h1>
                <p className="text-xs text-slate-500 mt-1">Renseignez vos identifiants pour continuer</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Adresse email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><Mail className="w-4 h-4" /></span>
                    <input
                      type="email"
                      name="email"
                      required={!isSignUp}
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="nom@exemple.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1F3A93] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><Lock className="w-4 h-4" /></span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required={!isSignUp}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1F3A93] focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-slate-300 text-[#1F3A93] focus:ring-0 cursor-pointer"
                    />
                    <span className="text-slate-600 text-[11px]">Se souvenir de moi</span>
                  </label>
                  <a href="#forgot" className="text-[#1F3A93] font-medium hover:underline text-[11px]">Mot de passe oublié ?</a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 bg-[#1F3A93] hover:bg-[#14296b] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-[#1F3A93]/20"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Se connecter</span>}
                </button>
              </form>

              <DividerOr />
              <GuestButton />
            </div>
          </div>

          {/* ---- FORMULAIRE D'INSCRIPTION ---- */}
          <div className={`absolute top-0 right-0 w-[55%] h-full flex flex-col justify-center px-14 z-20 transition-all duration-500 ${isSignUp ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
            <div className="max-w-[360px] w-full mx-auto">
              <div className="text-center mb-5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inscription</h1>
                <p className="text-xs text-slate-500 mt-1">Créez votre dossier patient en quelques clics</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Prénom</label>
                    <input
                      type="text"
                      name="firstName"
                      required={isSignUp}
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Jean"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1F3A93] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom</label>
                    <input
                      type="text"
                      name="lastName"
                      required={isSignUp}
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Dupont"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1F3A93] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Adresse email</label>
                  <input
                    type="email"
                    name="email"
                    required={isSignUp}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="nom@exemple.com"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1F3A93] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mot de passe</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required={isSignUp}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 caractères"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1F3A93] focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-slate-300 text-[#1F3A93] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-[11px] text-slate-600 select-none cursor-pointer">
                    J'accepte les <a href="#terms" className="text-[#1F3A93] font-medium hover:underline">conditions générales</a>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 bg-[#1F3A93] hover:bg-[#14296b] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-[#1F3A93]/20"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>S'inscrire</span>}
                </button>
              </form>

              <DividerOr />
              <GuestButton />
            </div>
          </div>

        </div>

        {/* ================= VERSION MOBILE (Empilée) ================= */}
        <div className="lg:hidden flex flex-col w-full">
          <div className="relative bg-[#1F3A93] text-white text-center px-6 pt-20 pb-10 overflow-hidden">
            <img src={hospitalBgImage} alt="CENHOSOA" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-[#0F1E54]/60" />
            <div className="relative z-10">
              <h2 className="text-2xl font-bold">{isSignUp ? 'Créer un compte' : 'Bon retour !'}</h2>
              <p className="text-xs text-white/85 mt-2 max-w-xs mx-auto">
                {isSignUp ? "Rejoignez notre portail pour gérer vos soins." : "Connectez-vous pour accéder à votre espace."}
              </p>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="mt-4 px-6 py-2.5 rounded-xl border border-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                {isSignUp ? 'Déjà un compte ? Connexion' : 'Pas de compte ? Inscription'}
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-white space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" name="firstName" placeholder="Prénom" value={formData.firstName} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                  <input type="text" name="lastName" placeholder="Nom" value={formData.lastName} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
              )}
              <input type="email" name="email" placeholder="Adresse email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              <input type="password" name="password" placeholder="Mot de passe" value={formData.password} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              <button type="submit" className="w-full bg-[#1F3A93] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer">
                {isSignUp ? "S'inscrire" : "Se connecter"}
              </button>
            </form>

            <GuestButton />
          </div>
        </div>

      </div>
    </div>
  );
}