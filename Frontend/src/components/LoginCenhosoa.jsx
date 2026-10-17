// creation des imports
import { useState } from 'react';
import { Eye, EyeOff, Loader2, Phone, UserCheck } from 'lucide-react';
import imageFondHopital from '../assets/logo/Gemini_Generated_Image_ndofqwndofqwndof.jpg';
import logoImage from '../assets/logo/logo.jpeg';
import { enregistrerTokens, inscrirePatient, seConnecter } from '../services/api';
import { StylesEspace } from './StylesEspace';

const EXPRESSION_TELEPHONE_MALAGASY = /^\+261[0-9]{6,9}$/;
const CLE_TELEPHONE_MEMORISE = 'telephone_connexion';

function normaliserTelephone(telephone) {
  return telephone.replace(/[\s-]/g, '');
}

function validerTelephone(telephone) {
  if (!telephone) return 'Le numéro de téléphone est obligatoire.';
  return EXPRESSION_TELEPHONE_MALAGASY.test(normaliserTelephone(telephone))
    ? ''
    : 'Saisissez un numéro Malagasy valide commençant par +261.';
}

function validerForceMotDePasse(motDePasse) {
  if (!motDePasse) return '';
  if (motDePasse.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (!/[0-9]/.test(motDePasse)) return 'Le mot de passe doit contenir au moins un chiffre.';
  if (!/[a-zA-Z]/.test(motDePasse)) return 'Le mot de passe doit contenir au moins une lettre.';
  return '';
}

function BoutonInvite({ onBackToHome }) {
  if (!onBackToHome) return null;
  return (
    <button
      type="button"
      onClick={onBackToHome}
      className="w-full py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
    >
      <UserCheck className="w-4 h-4 text-[#1F7A8C]" />
      <span>Continuer en mode invité</span>
    </button>
  );
}

function SeparateurOu() {
  return (
    <div className="relative my-4 sm:my-5 text-center">
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
      <span className="relative px-3 bg-white text-[10px] text-slate-400 uppercase tracking-widest font-medium">Ou</span>
    </div>
  );
}

export default function AuthCENHOSOA({ onBackToHome, onConnexion, espacePersonnel = false }) {
  const [estInscription, fixerEstInscription] = useState(false);
  const [voirMotDePasse, fixerVoirMotDePasse] = useState(false);
  const modeConnexion = espacePersonnel ? 'personnel' : 'patient';
  const [identifiantPersonnel, fixerIdentifiantPersonnel] = useState('');
  const [estEnCoursDeChargement, fixerEstEnCoursDeChargement] = useState(false);
  const [erreur, fixerErreur] = useState('');
  const [estMessageSucces, fixerEstMessageSucces] = useState(false);
  const [erreursChamps, fixerErreursChamps] = useState({ motDePasse: '', telephone: '' });
  const [donneesFormulaire, fixerDonneesFormulaire] = useState({
    prenom: '',
    nom: '',
    motDePasse: '',
    telephone: localStorage.getItem(CLE_TELEPHONE_MEMORISE) || '',
    seSouvenirDeMoi: Boolean(localStorage.getItem(CLE_TELEPHONE_MEMORISE)),
  });

  const gererChangement = ( evenement ) => {
    const { name, value, type, checked } = evenement.target;
    fixerDonneesFormulaire((precedent) => ({
      ...precedent,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (name === 'telephone') {
      fixerErreursChamps((precedent) => ({ ...precedent, telephone: validerTelephone(value) }));
      if (donneesFormulaire.seSouvenirDeMoi) {
        const telephone = normaliserTelephone(value);
        if (validerTelephone(telephone)) {
          localStorage.removeItem(CLE_TELEPHONE_MEMORISE);
        } else {
          localStorage.setItem(CLE_TELEPHONE_MEMORISE, telephone);
        }
      }
    }
    if (name === 'motDePasse' && estInscription) {
      fixerErreursChamps((precedent) => ({ ...precedent, motDePasse: validerForceMotDePasse(value) }));
    }
  };

  const gererSoumission = async (evenement) => {
    evenement.preventDefault();
    fixerErreur('');
    fixerEstMessageSucces(false);

    const telephone = normaliserTelephone(donneesFormulaire.telephone);
    const erreurTelephone = estInscription || modeConnexion === 'patient'
      ? validerTelephone(telephone)
      : '';
    const erreurMotDePasse = estInscription
      ? validerForceMotDePasse(donneesFormulaire.motDePasse)
      : !donneesFormulaire.motDePasse
        ? 'Le mot de passe est obligatoire.'
        : '';
    fixerErreursChamps({ motDePasse: erreurMotDePasse, telephone: erreurTelephone });
    if (erreurTelephone || erreurMotDePasse) return;
    if (!estInscription && modeConnexion === 'personnel' && !identifiantPersonnel.trim()) {
      fixerErreur('Le matricule ou identifiant est obligatoire.');
      return;
    }

    fixerEstEnCoursDeChargement(true);
    try {
      if (estInscription) {
        await inscrirePatient({
          mot_de_passe: donneesFormulaire.motDePasse,
          nom: donneesFormulaire.nom,
          prenoms: donneesFormulaire.prenom,
          telephone,
        });
        fixerDonneesFormulaire((precedent) => ({ ...precedent, telephone }));
        gererBoutonMode(false);
        fixerErreur('Inscription réussie ! Vous pouvez maintenant vous connecter.');
        fixerEstMessageSucces(true);
      } else {
        const identifiant = modeConnexion === 'patient'
          ? telephone
          : identifiantPersonnel.trim();
        const tokens = await seConnecter(identifiant, donneesFormulaire.motDePasse);
        enregistrerTokens(tokens, donneesFormulaire.seSouvenirDeMoi);
        if (donneesFormulaire.seSouvenirDeMoi && modeConnexion === 'patient') {
          localStorage.setItem(CLE_TELEPHONE_MEMORISE, telephone);
        } else if (!donneesFormulaire.seSouvenirDeMoi) {
          localStorage.removeItem(CLE_TELEPHONE_MEMORISE);
        }
        if (onConnexion) {
          const connexionAutorisee = await onConnexion();
          if (!connexionAutorisee) {
            fixerErreur(espacePersonnel
              ? "Ce compte n’a pas accès à l’espace du personnel."
              : "Aucun espace opérationnel n’est associé au rôle de ce compte.");
          }
        } else {
          alert('Connexion réussie !');
        }
      }
    } catch (err) {
      fixerErreur(err.message);
      fixerEstMessageSucces(false);
    } finally {
      fixerEstEnCoursDeChargement(false);
    }
  };

  const gererBoutonMode = (etatInscription) => {
    fixerEstInscription(etatInscription);
    fixerErreur('');
    fixerEstMessageSucces(false);
    fixerErreursChamps({ motDePasse: '', telephone: '' });
  };

  const changerSouvenir = (evenement) => {
    const seSouvenirDeMoi = evenement.target.checked;
    fixerDonneesFormulaire((precedent) => ({ ...precedent, seSouvenirDeMoi }));
    if (seSouvenirDeMoi) {
      const telephone = normaliserTelephone(donneesFormulaire.telephone);
      if (modeConnexion === 'patient' && !validerTelephone(telephone)) {
        localStorage.setItem(CLE_TELEPHONE_MEMORISE, telephone);
      }
    } else {
      localStorage.removeItem(CLE_TELEPHONE_MEMORISE);
    }
  };

  const decoupeGauche = 'polygon(0% 0%, 47% 0%, 36.7% 100%, 0% 100%)';
  const decoupeDroite = 'polygon(53% 0%, 100% 0%, 100% 100%, 63.3% 100%)';

  return (
    <div className="espace min-h-screen bg-[#0A2233] font-body antialiased flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <StylesEspace />
      <img src={imageFondHopital} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A2233]/90 via-[#0F3D52]/70 to-[#0A2233]/95" />
      <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-[#1F7A8C]/40 blur-[110px] animate-pulse motion-reduce:animate-none" />
      <div className="absolute -bottom-32 -right-24 w-[380px] h-[380px] rounded-full bg-[#7FD1CB]/25 blur-[110px] animate-pulse motion-reduce:animate-none" />
      
      <div className="w-full max-w-[1040px] min-h-[620px] bg-white rounded-[2rem] shadow-2xl shadow-black/40 relative overflow-hidden flex flex-col lg:block">
        
        <div className="absolute top-5 left-7 z-40 flex items-center space-x-3">
          <div className="w-12 h-12 bg-white rounded-2xl p-1 shadow-md border border-slate-100 flex items-center justify-center overflow-hidden">
            <img src={logoImage} alt="Logo CENHOSOA" className="w-full h-full object-contain" />
          </div>
          <span className={`text-base font-bold tracking-tight transition-colors duration-500 ${estInscription ? 'text-[#0F3D52] lg:text-white' : 'text-[#1F7A8C]'}`}>
            CENHOSOA
          </span>
          
        </div>

        <div className="hidden lg:block w-full h-full min-h-[620px] relative">
          
          <div
            className="absolute inset-0 bg-[#1F7A8C] transition-[clip-path] duration-700 ease-in-out z-10 overflow-hidden"
            style={{ clipPath: estInscription ? decoupeGauche : decoupeDroite }}
          >
            <img src={imageFondHopital} alt="Centre Hospitalier CENHOSOA" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-[#0A2233]/60" />
          </div>

          {!espacePersonnel && <div className={`absolute top-0 left-0 w-[45%] h-full flex flex-col items-center justify-center text-center px-10 z-20 transition-all duration-500 ${estInscription ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
            <h2 className="text-3xl font-bold text-white tracking-tight">Déjà inscrit ?</h2>
            <p className="text-xs text-white/85 max-w-[240px] mx-auto leading-relaxed mt-4">
              Connectez-vous à votre espace patient CENHOSOA pour consulter et gérer vos rendez-vous.
            </p>
            <button
              type="button"
              onClick={() => gererBoutonMode(false)}
              className="mt-8 px-8 py-3 rounded-2xl border border-white text-white text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer shadow-lg"
            >
              Connexion
            </button>
          </div>}

          <div className={`absolute top-0 right-0 w-[45%] h-full flex flex-col items-center justify-center text-center px-10 z-20 transition-all duration-500 ${!estInscription ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {espacePersonnel ? 'Espace professionnel' : 'Nouveau sur CENHOSOA ?'}
            </h2>
            <p className="text-xs text-white/85 max-w-[240px] mx-auto leading-relaxed mt-4">
              {espacePersonnel
                ? 'Accès réservé au personnel autorisé et aux administrateurs du centre.'
                : 'Créez votre compte patient pour planifier vos consultations et profiter de nos services de santé en ligne.'}
            </p>
            {!espacePersonnel && <button
              type="button"
              onClick={() => gererBoutonMode(true)}
              className="mt-8 px-8 py-3 rounded-2xl border border-white text-white text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer shadow-lg"
            >
              Inscription
            </button>}
          </div>

          <div className={`absolute top-0 left-0 w-[55%] h-full flex flex-col justify-center px-14 z-20 transition-all duration-500 ${!estInscription ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
            <div className="max-w-[360px] w-full mx-auto">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {espacePersonnel ? 'Connexion du personnel' : 'Connexion'}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {modeConnexion === 'patient'
                    ? 'Connectez-vous avec votre numéro Malagasy et votre mot de passe.'
                    : 'Connectez-vous avec votre matricule ou identifiant et votre mot de passe.'}
                </p>
              </div>

              <form onSubmit={gererSoumission} className="space-y-4">
                {modeConnexion === 'patient' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Numéro de téléphone</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><Phone className="w-4 h-4" /></span>
                      <input
                        type="tel"
                        name="telephone"
                        required
                        autoComplete="tel"
                        value={donneesFormulaire.telephone}
                        onChange={gererChangement}
                        placeholder="+261 34 12 345 67"
                        className="w-full pl-10 pr-4 py-3 bg-[#F4F2EE] border border-transparent hover:border-slate-200 rounded-full text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1F7A8C] focus:bg-white transition-all"
                      />
                    </div>
                    {erreursChamps.telephone && <p className="text-[11px] text-red-500 mt-1">{erreursChamps.telephone}</p>}
                  </div>
                )}

                {modeConnexion === 'personnel' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Matricule / identifiant</label>
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={identifiantPersonnel}
                      onChange={(evenement) => fixerIdentifiantPersonnel(evenement.target.value)}
                      placeholder="Votre matricule ou identifiant"
                      className="w-full px-4 py-3 bg-[#F4F2EE] border border-transparent hover:border-slate-200 rounded-full text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1F7A8C] focus:bg-white transition-all"
                    />
                  </div>
                )}

                {!estInscription && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Mot de passe</label>
                    <div className="relative"><input
                      type={voirMotDePasse ? 'text' : 'password'}
                      name="motDePasse"
                      required
                      autoComplete="current-password"
                      value={donneesFormulaire.motDePasse}
                      onChange={gererChangement}
                      placeholder="Votre mot de passe"
                      className="w-full pl-4 pr-11 py-3 bg-[#F4F2EE] border border-transparent hover:border-slate-200 rounded-full text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1F7A8C] focus:bg-white transition-all"
                    /><button type="button" onClick={() => fixerVoirMotDePasse((precedent) => !precedent)} aria-label={voirMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#1F7A8C]">{voirMotDePasse ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                    {erreursChamps.motDePasse && <p className="text-[11px] text-red-500 mt-1">{erreursChamps.motDePasse}</p>}
                  </div>
                )}

                {!estInscription && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center space-x-2 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        name="seSouvenirDeMoi"
                        checked={donneesFormulaire.seSouvenirDeMoi}
                        onChange={changerSouvenir}
                        className="w-4 h-4 rounded border-slate-300 text-[#1F7A8C] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-slate-600 text-[11px]">Se souvenir de moi</span>
                    </label>
                  </div>
                )}

                {erreur && <p className={`text-xs text-center ${estMessageSucces ? 'text-emerald-600' : 'text-red-500'}`}>{erreur}</p>}

                <button
                  type="submit"
                  disabled={estEnCoursDeChargement}
                  className="w-full mt-2 bg-[#1F7A8C] hover:bg-[#186575] text-white py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-[#1F7A8C]/20"
                >
                  {estEnCoursDeChargement ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{estInscription ? "S'inscrire" : 'Se connecter'}</span>}
                </button>
              </form>

              {!espacePersonnel && (
                <>
                  <SeparateurOu />
                  <BoutonInvite onBackToHome={onBackToHome} />
                </>
              )}
              {espacePersonnel && onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="w-full py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
                >
                  Retour au portail public
                </button>
              )}
            </div>
          </div>

          {!espacePersonnel && <div className={`absolute top-0 right-0 w-[55%] h-full flex flex-col justify-center px-14 z-20 transition-all duration-500 ${estInscription ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
            <div className="max-w-[360px] w-full mx-auto">
              <div className="text-center mb-5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inscription</h1>
                <p className="text-xs text-slate-500 mt-1">Créez votre dossier patient en quelques clics</p>
              </div>

              <form onSubmit={gererSoumission} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Prénom</label>
                    <input
                      type="text"
                      name="prenom"
                      required={estInscription}
                      value={donneesFormulaire.prenom}
                      onChange={gererChangement}
                      placeholder="Jean"
                      className="w-full px-4 py-3 bg-[#F4F2EE] border border-transparent hover:border-slate-200 rounded-full text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1F7A8C] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom</label>
                    <input
                      type="text"
                      name="nom"
                      required={estInscription}
                      value={donneesFormulaire.nom}
                      onChange={gererChangement}
                      placeholder="Dupont"
                      className="w-full px-4 py-3 bg-[#F4F2EE] border border-transparent hover:border-slate-200 rounded-full text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1F7A8C] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Téléphone Malagasy (+261)</label>
                  <input
                    type="tel"
                    name="telephone"
                    required
                    autoComplete="tel"
                    value={donneesFormulaire.telephone}
                    onChange={gererChangement}
                    placeholder="+261 34 12 345 67"
                    className="w-full px-4 py-3 bg-[#F4F2EE] border border-transparent hover:border-slate-200 rounded-full text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1F7A8C] focus:bg-white transition-all"
                  />
                  {erreursChamps.telephone && <p className="text-[11px] text-red-500 mt-1">{erreursChamps.telephone}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mot de passe</label>
                  <div className="relative"><input
                    type={voirMotDePasse ? 'text' : 'password'}
                    name="motDePasse"
                    required={estInscription}
                    value={donneesFormulaire.motDePasse}
                    onChange={gererChangement}
                    placeholder="Minimum 8 caractères"
                    className="w-full pl-4 pr-11 py-3 bg-[#F4F2EE] border border-transparent hover:border-slate-200 rounded-full text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1F7A8C] focus:bg-white transition-all"
                  /><button type="button" onClick={() => fixerVoirMotDePasse((precedent) => !precedent)} aria-label={voirMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#1F7A8C]">{voirMotDePasse ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  {erreursChamps.motDePasse && <p className="text-[11px] text-red-500 mt-1">{erreursChamps.motDePasse}</p>}
                </div>

                {erreur && <p className={`text-xs text-center ${estMessageSucces ? 'text-emerald-600' : 'text-red-500'}`}>{erreur}</p>}

                <button
                  type="submit"
                  disabled={estEnCoursDeChargement}
                  className="w-full mt-2 bg-[#1F7A8C] hover:bg-[#186575] text-white py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-[#1F7A8C]/20"
                >
                  {estEnCoursDeChargement ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>S'inscrire</span>}
                </button>
              </form>

              <SeparateurOu />
              <BoutonInvite onBackToHome={onBackToHome} />
            </div>
          </div>}

        </div>

        <div className="lg:hidden flex flex-col w-full">
          <div className="relative bg-[#1F7A8C] text-white text-center px-6 pt-20 pb-10 overflow-hidden">
            <img src={imageFondHopital} alt="CENHOSOA" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-[#0A2233]/60" />
            <div className="relative z-10">
              <h2 className="text-2xl font-bold">
                {estInscription
                    ? 'Créer un compte'
                    : espacePersonnel ? 'Espace du personnel' : 'Bon retour !'}
              </h2>
              <p className="text-xs text-white/85 mt-2 max-w-xs mx-auto">
                {estInscription
                    ? 'Rejoignez notre portail pour gérer vos soins.'
                    : modeConnexion === 'patient'
                      ? 'Connectez-vous avec votre numéro Malagasy et votre mot de passe.'
                      : 'Connectez-vous avec votre matricule ou identifiant et votre mot de passe.'}
              </p>
              {!espacePersonnel && (
                <button
                  type="button"
                  onClick={() => gererBoutonMode(!estInscription)}
                  className="mt-4 px-6 py-2.5 rounded-2xl border border-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  {estInscription ? 'Déjà un compte ? Connexion' : 'Pas de compte ? Inscription'}
                </button>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-white space-y-4">
            <div className="mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1F7A8C]">
                {espacePersonnel ? 'Accès professionnel' : 'Espace patient'}
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#0A2233]">
                {estInscription ? 'Créer mon compte' : espacePersonnel ? 'Connexion du personnel' : 'Connexion à mon espace'}
              </h1>
            </div>
            <form onSubmit={gererSoumission} className="space-y-4">
              {estInscription && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Prénom
                    <input type="text" name="prenom" required autoComplete="given-name" placeholder="Votre prénom" value={donneesFormulaire.prenom} onChange={gererChangement} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10" />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">
                    Nom
                    <input type="text" name="nom" required autoComplete="family-name" placeholder="Votre nom" value={donneesFormulaire.nom} onChange={gererChangement} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10" />
                  </label>
                </div>
              )}
              {(estInscription || modeConnexion === 'patient') && <div>
                <label className="block text-xs font-semibold text-slate-700" htmlFor="telephone-mobile">Téléphone Malagasy (+261)</label>
                <input id="telephone-mobile" type="tel" name="telephone" required autoComplete="tel" placeholder="+261 34 12 345 67" value={donneesFormulaire.telephone} onChange={gererChangement} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10" />
                {erreursChamps.telephone && <p className="text-[11px] text-red-500 mt-1">{erreursChamps.telephone}</p>}
              </div>}
              {!estInscription && modeConnexion === 'personnel' && (
                <label className="block text-xs font-semibold text-slate-700" htmlFor="identifiant-personnel-mobile">
                  Matricule / identifiant
                  <input id="identifiant-personnel-mobile" type="text" required autoComplete="username" placeholder="Votre matricule ou identifiant" value={identifiantPersonnel} onChange={(evenement) => fixerIdentifiantPersonnel(evenement.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10" />
                </label>
              )}
              {estInscription && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="mot-de-passe-inscription-mobile">Mot de passe</label>
                  <div className="relative"><input id="mot-de-passe-inscription-mobile" type={voirMotDePasse ? 'text' : 'password'} name="motDePasse" required autoComplete="new-password" placeholder="8 caractères minimum" value={donneesFormulaire.motDePasse} onChange={gererChangement} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white pl-4 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10" /><button type="button" onClick={() => fixerVoirMotDePasse((precedent) => !precedent)} aria-label={voirMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#1F7A8C]">{voirMotDePasse ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  {erreursChamps.motDePasse && <p className="text-[11px] text-red-500 mt-1">{erreursChamps.motDePasse}</p>}
                </div>
              )}
              {!estInscription && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="mot-de-passe-connexion-mobile">Mot de passe</label>
                  <div className="relative"><input id="mot-de-passe-connexion-mobile" type={voirMotDePasse ? 'text' : 'password'} name="motDePasse" required autoComplete="current-password" placeholder="Votre mot de passe" value={donneesFormulaire.motDePasse} onChange={gererChangement} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white pl-4 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1F7A8C] focus:ring-4 focus:ring-[#1F7A8C]/10" /><button type="button" onClick={() => fixerVoirMotDePasse((precedent) => !precedent)} aria-label={voirMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#1F7A8C]">{voirMotDePasse ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  {erreursChamps.motDePasse && <p className="text-[11px] text-red-500 mt-1">{erreursChamps.motDePasse}</p>}
                </div>
              )}
              {!estInscription && (
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 select-none cursor-pointer">
                    <input type="checkbox" checked={donneesFormulaire.seSouvenirDeMoi} onChange={changerSouvenir} className="w-4 h-4 rounded border-slate-300 text-[#1F7A8C]" />
                    <span className="text-slate-600 text-[11px]">Se souvenir de moi</span>
                  </label>
                </div>
              )}
              {erreur && <p className="text-xs text-red-500 text-center">{erreur}</p>}
              <button type="submit" disabled={estEnCoursDeChargement} className="w-full min-h-12 bg-[#1F7A8C] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer transition hover:bg-[#186575] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1F7A8C]/20 disabled:cursor-not-allowed disabled:opacity-50">
                {estEnCoursDeChargement ? 'Veuillez patienter…' : estInscription ? "S'inscrire" : 'Se connecter'}
              </button>
            </form>

            {!espacePersonnel && !estInscription && <BoutonInvite onBackToHome={onBackToHome} />}
            {espacePersonnel && onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="w-full py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
              >
                Retour au portail public
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}