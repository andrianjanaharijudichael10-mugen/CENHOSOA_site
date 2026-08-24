import React, { useState } from 'react';
import {
  Calendar as CalendarIcon, Clock, Stethoscope, User, Search,
  CheckCircle2, MapPin, ChevronRight, ChevronLeft, ArrowRight,
  FileText, ShieldCheck, Activity, X, Plus, Trash2, Edit3
} from 'lucide-react';

// Liste des spécialités médicales disponibles au CENHOSOA
const SPECIALITES = [
  { id: 'cardio', titre: 'Cardiologie', desc: 'Soins cardiovasculaires de pointe et exploration interventionnelle.', effectif: '12 Praticiens', icone: Activity },
  { id: 'pediatrie', titre: 'Pédiatrie', desc: 'Un environnement bienveillant dédié à la santé des enfants et nouveau-nés.', effectif: '15 Praticiens', icone: User },
  { id: 'neuro', titre: 'Neurologie', desc: 'Prise en charge spécialisée des pathologies du système nerveux.', effectif: '8 Praticiens', icone: Stethoscope },
  { id: 'gyneco', titre: 'Gynécologie - Obstétrique', desc: 'Suivi de la santé de la femme et accompagnement global à la maternité.', effectif: '10 Praticiens', icone: ShieldCheck },
  { id: 'imagerie', titre: 'Imagerie Médicale', desc: 'Radiologie et diagnostics de pointe par exploration visuelle.', effectif: '9 Praticiens', icone: FileText }
];

// Liste des praticiens par spécialité
const PRATICIENS = {
  cardio: [
    { id: 1, nom: 'Dr. Rabe Harilala', role: 'Chef de service Cardiologie', experience: '15 ans d\'expérience', consultation: 'Lundi, Mercredi, Vendredi' },
    { id: 2, nom: 'Dr. Andrianaivo Mamy', role: 'Cardiologue Interventionnel', experience: '10 ans d\'expérience', consultation: 'Mardi, Jeudi' }
  ],
  pediatrie: [
    { id: 3, nom: 'Dr. Rasoanandrasana Soa', role: 'Pédiatre Néonatologiste', experience: '12 ans d\'expérience', consultation: 'Tous les jours' },
    { id: 4, nom: 'Dr. Rakoto Jean', role: 'Pédiatre Généraliste', experience: '8 ans d\'expérience', consultation: 'Lundi au Vendredi' }
  ],
  neuro: [
    { id: 5, nom: 'Dr. Randriamanantsoa Tiana', role: 'Neurologue Senior', experience: '18 ans d\'expérience', consultation: 'Mardi et Vendredi' }
  ],
  gyneco: [
    { id: 6, nom: 'Dr. Razafindrakoto Lova', role: 'Gynécologue Obstétricien', experience: '14 ans d\'expérience', consultation: 'Lundi, Mardi, Jeudi' }
  ],
  imagerie: [
    { id: 7, nom: 'Dr. Koto Befania', role: 'Radiologue et Imagerie Médicale', experience: '11 ans d\'expérience', consultation: 'Tous les jours' }
  ]
};

// Créneaux horaires disponibles
const CRENEAUX_MATIN = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const CRENEAUX_APRES_MIDI = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];

export default function GestionRendezVousCenhosoa({ onBackToHome }) {
  // Etats de navigation et de sélection
  const [etape, setEtape] = useState(1); // 1: Specialite, 2: Praticien, 3: Date/Heure, 4: Motif, 5: Confirmation
  const [ongletActif, setongletActif] = useState('reserver'); // 'reserver' ou 'mes-rdv'
  
  // Données du rendez-vous en cours de création
  const [specialiteSelectionnee, setSpecialiteSelectionnee] = useState(null);
  const [praticienSelectionne, setPraticienSelectionne] = useState(null);
  const [dateSelectionnee, setDateSelectionnee] = useState('');
  const [creneauSelectionne, setCreneauSelectionne] = useState('');
  const [motifConsultation, setMotifConsultation] = useState('');
  const [typeVisite, setTypeVisite] = useState('Première consultation');

  // Liste des rendez-vous du patient (mock initial)
  const [mesRendezVous, setMesRendezVous] = useState([
    {
      id: 101,
      specialite: 'Cardiologie',
      praticien: 'Dr. Rabe Harilala',
      date: '2026-09-15',
      heure: '09:00',
      type: 'Suivi médical',
      statut: 'Confirmé'
    }
  ]);

  // Gestion de la soumission de la réservation
  const handleConfirmerRendezVous = (e) => {
    e.preventDefault();
    const nouveauRdv = {
      id: Date.now(),
      specialite: SPECIALITES.find(s => s.id === specialiteSelectionnee)?.titre || 'Général',
      praticien: praticienSelectionne?.nom || 'Praticien CENHOSOA',
      date: dateSelectionnee,
      heure: creneauSelectionne,
      type: typeVisite,
      statut: 'En attente'
    };

    setMesRendezVous([nouveauRdv, ...mesRendezVous]);
    setEtape(5); // Etape de succès
  };

  // Annulation d'un rendez-vous
  const handleAnnulerRdv = (id) => {
    setMesRendezVous(mesRendezVous.filter(rdv => rdv.id !== id));
  };

  // Réinitialisation du formulaire
  const resetFormulaire = () => {
    setSpecialiteSelectionnee(null);
    setPraticienSelectionne(null);
    setDateSelectionnee('');
    setCreneauSelectionne('');
    setMotifConsultation('');
    setEtape(1);
    setongletActif('reserver');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FD] text-[#1E2333] font-body antialiased selection:bg-[#3457DC] selection:text-white pb-20">
      
      {/* En-tête de la page de gestion */}
      <header className="bg-white/85 backdrop-blur-xl border-b border-[#3457DC]/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onBackToHome}>
            <div className="w-12 h-12 rounded-2xl bg-[#0B1440] p-2 flex items-center justify-center text-white font-display font-black text-xl shadow-md">
              C
            </div>
            <div>
              <span className="text-lg font-display font-black text-[#0B1440] block">CENHOSOA</span>
              <span className="text-[10px] text-[#3457DC] font-mono font-semibold tracking-widest uppercase">Espace Rendez-vous Patient</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setongletActif('reserver')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${ongletActif === 'reserver' ? 'bg-[#3457DC] text-white shadow-md shadow-[#3457DC]/20' : 'bg-[#F5F7FD] text-[#0B1440] hover:bg-[#E9EEFC]'}`}
            >
              Prendre un RDV
            </button>
            <button
              onClick={() => setongletActif('mes-rdv')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${ongletActif === 'mes-rdv' ? 'bg-[#3457DC] text-white shadow-md shadow-[#3457DC]/20' : 'bg-[#F5F7FD] text-[#0B1440] hover:bg-[#E9EEFC]'}`}
            >
              <span>Mes Rendez-vous</span>
              {mesRendezVous.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {mesRendezVous.length}
                </span>
              )}
            </button>
            <button
              onClick={onBackToHome}
              className="text-xs text-slate-500 hover:text-[#0B1440] px-3 py-2 font-semibold"
            >
              Quitter
            </button>
          </div>
        </div>
      </header>

      {/* Contenu Principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {/* SECTION 1 : Prise de rendez-vous interactive */}
        {ongletActif === 'reserver' && (
          <div>
            {/* Barre de progression des étapes */}
            {etape < 5 && (
              <div className="mb-10 bg-white p-6 rounded-3xl border border-[#3457DC]/10 shadow-sm">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                  {[
                    { num: 1, label: 'Spécialité' },
                    { num: 2, label: 'Praticien' },
                    { num: 3, label: 'Date & Heure' },
                    { num: 4, label: 'Motif' }
                  ].map((s) => (
                    <div key={s.num} className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${etape >= s.num ? 'bg-[#3457DC] text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                        {s.num}
                      </div>
                      <span className={`text-xs font-bold hidden sm:inline ${etape >= s.num ? 'text-[#0B1440]' : 'text-slate-400'}`}>{s.label}</span>
                      {s.num < 4 && <div className="w-8 sm:w-16 h-px bg-slate-200 mx-2" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ETAPE 1 : Choix de la spécialité */}
            {etape === 1 && (
              <div className="space-y-6">
                <div className="text-center max-w-xl mx-auto mb-8">
                  <h2 className="text-2xl sm:text-3xl font-display font-black text-[#0B1440] mb-2">Choisissez une spécialité</h2>
                  <p className="text-slate-600 text-sm">Sélectionnez le pôle médical adapté à votre besoin de consultation.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {SPECIALITES.map((spec) => {
                    const IconeComp = spec.icone;
                    const estSelectionne = specialiteSelectionnee === spec.id;
                    return (
                      <div
                        key={spec.id}
                        onClick={() => setSpecialiteSelectionnee(spec.id)}
                        className={`cursor-pointer bg-white p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 ${estSelectionne ? 'border-[#3457DC] ring-2 ring-[#3457DC]/20 shadow-xl' : 'border-[#3457DC]/10 hover:shadow-lg'}`}
                      >
                        <div>
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${estSelectionne ? 'bg-[#3457DC] text-white' : 'bg-[#F5F7FD] text-[#3457DC] group-hover:bg-[#3457DC] group-hover:text-white'}`}>
                            <IconeComp className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-[#3457DC] uppercase tracking-wider">{spec.effectif}</span>
                          <h3 className="text-base font-display font-bold text-[#0B1440] mt-1 mb-2">{spec.titre}</h3>
                          <p className="text-xs text-slate-600 leading-relaxed mb-4">{spec.desc}</p>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <span className="text-xs font-bold text-[#3457DC]">Sélectionner</span>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${estSelectionne ? 'bg-[#3457DC] text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-6">
                  <button
                    disabled={!specialiteSelectionnee}
                    onClick={() => setEtape(2)}
                    className={`px-7 py-3.5 rounded-2xl font-bold text-sm tracking-wide flex items-center space-x-2 shadow-lg transition-all ${specialiteSelectionnee ? 'bg-[#3457DC] text-white hover:bg-[#2c48c2] shadow-[#3457DC]/25' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    <span>Continuer vers le praticien</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ETAPE 2 : Choix du praticien */}
            {etape === 2 && (
              <div className="space-y-6">
                <div className="text-center max-w-xl mx-auto mb-8">
                  <h2 className="text-2xl sm:text-3xl font-display font-black text-[#0B1440] mb-2">Sélectionnez un praticien</h2>
                  <p className="text-slate-600 text-sm">Choisissez le médecin expert pour votre consultation dans cette spécialité.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  {PRATICIENS[specialiteSelectionnee]?.map((prat) => {
                    const estSelectionne = praticienSelectionne?.id === prat.id;
                    return (
                      <div
                        key={prat.id}
                        onClick={() => setPraticienSelectionne(prat)}
                        className={`cursor-pointer bg-white p-6 rounded-3xl border transition-all duration-300 flex items-start space-x-4 ${estSelectionne ? 'border-[#3457DC] ring-2 ring-[#3457DC]/20 shadow-xl' : 'border-[#3457DC]/10 hover:shadow-lg'}`}
                      >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3457DC] to-[#1B2E7A] text-white flex items-center justify-center font-bold text-lg shrink-0">
                          {prat.nom.charAt(4)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-display font-bold text-[#0B1440]">{prat.nom}</h3>
                          <p className="text-xs text-[#3457DC] font-semibold mb-1">{prat.role}</p>
                          <p className="text-[11px] text-slate-500 mb-2">{prat.experience} • {prat.consultation}</p>
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold ${estSelectionne ? 'bg-[#3457DC] text-white' : 'bg-[#F5F7FD] text-[#0B1440]'}`}>
                            {estSelectionne ? 'Sélectionné' : 'Choisir ce médecin'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-6 max-w-3xl mx-auto">
                  <button
                    onClick={() => setEtape(1)}
                    className="px-6 py-3 rounded-2xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Retour
                  </button>
                  <button
                    disabled={!praticienSelectionne}
                    onClick={() => setEtape(3)}
                    className={`px-7 py-3.5 rounded-2xl font-bold text-sm tracking-wide flex items-center space-x-2 shadow-lg transition-all ${praticienSelectionne ? 'bg-[#3457DC] text-white hover:bg-[#2c48c2] shadow-[#3457DC]/25' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    <span>Continuer vers la date</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ETAPE 3 : Choix de la date et de l'heure */}
            {etape === 3 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-display font-black text-[#0B1440] mb-2">Date et créneau horaire</h2>
                  <p className="text-slate-600 text-sm">Sélectionnez le jour et l'heure qui vous conviennent le mieux.</p>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-[#3457DC]/10 shadow-sm space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-[#0B1440] uppercase tracking-wider mb-2">Date de consultation</label>
                    <input
                      type="date"
                      value={dateSelectionnee}
                      onChange={(e) => setDateSelectionnee(e.target.value)}
                      className="w-full bg-[#F5F7FD] border border-[#3457DC]/15 rounded-2xl px-4 py-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3457DC]/30 font-medium"
                    />
                  </div>

                  {dateSelectionnee && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Matin</h4>
                        <div className="grid grid-cols-4 gap-2.5">
                          {CRENEAUX_MATIN.map((heure) => (
                            <button
                              key={heure}
                              type="button"
                              onClick={() => setCreneauSelectionne(heure)}
                              className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${creneauSelectionne === heure ? 'bg-[#3457DC] text-white border-[#3457DC] shadow-md' : 'bg-[#F5F7FD] text-slate-700 border-slate-200 hover:border-[#3457DC]/40'}`}
                            >
                              {heure}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Après-midi</h4>
                        <div className="grid grid-cols-4 gap-2.5">
                          {CRENEAUX_APRES_MIDI.map((heure) => (
                            <button
                              key={heure}
                              type="button"
                              onClick={() => setCreneauSelectionne(heure)}
                              className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${creneauSelectionne === heure ? 'bg-[#3457DC] text-white border-[#3457DC] shadow-md' : 'bg-[#F5F7FD] text-slate-700 border-slate-200 hover:border-[#3457DC]/40'}`}
                            >
                              {heure}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setEtape(2)}
                    className="px-6 py-3 rounded-2xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Retour
                  </button>
                  <button
                    disabled={!dateSelectionnee || !creneauSelectionne}
                    onClick={() => setEtape(4)}
                    className={`px-7 py-3.5 rounded-2xl font-bold text-sm tracking-wide flex items-center space-x-2 shadow-lg transition-all ${dateSelectionnee && creneauSelectionne ? 'bg-[#3457DC] text-white hover:bg-[#2c48c2] shadow-[#3457DC]/25' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    <span>Continuer vers le motif</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ETAPE 4 : Motif de consultation & Validation */}
            {etape === 4 && (
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-display font-black text-[#0B1440] mb-2">Détails de la consultation</h2>
                  <p className="text-slate-600 text-sm">Précisez le type de visite et décrivez brièvement vos symptômes.</p>
                </div>

                <form onSubmit={handleConfirmerRendezVous} className="bg-white p-8 rounded-3xl border border-[#3457DC]/10 shadow-sm space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-[#0B1440] uppercase tracking-wider mb-2">Type de visite</label>
                    <select
                      value={typeVisite}
                      onChange={(e) => setTypeVisite(e.target.value)}
                      className="w-full bg-[#F5F7FD] border border-[#3457DC]/15 rounded-2xl px-4 py-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3457DC]/30 font-medium"
                    >
                      <option value="Première consultation">Première consultation</option>
                      <option value="Suivi médical">Suivi médical régulier</option>
                      <option value="Renouvellement d'ordonnance">Renouvellement d'ordonnance</option>
                      <option value="Avis spécialisé">Avis spécialisé</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0B1440] uppercase tracking-wider mb-2">Motif ou description des symptômes</label>
                    <textarea
                      rows="4"
                      value={motifConsultation}
                      onChange={(e) => setMotifConsultation(e.target.value)}
                      placeholder="Décrivez brièvement la raison de votre visite..."
                      className="w-full bg-[#F5F7FD] border border-[#3457DC]/15 rounded-2xl p-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3457DC]/30 font-medium resize-none"
                    ></textarea>
                  </div>

                  <div className="bg-[#F5F7FD] p-4 rounded-2xl border border-[#3457DC]/10 space-y-2">
                    <div className="text-xs font-bold text-[#0B1440]">Récapitulatif de votre réservation :</div>
                    <div className="text-xs text-slate-600 grid grid-cols-2 gap-2">
                      <div>• Spécialité : <span className="font-semibold text-slate-800">{SPECIALITES.find(s => s.id === specialiteSelectionnee)?.titre}</span></div>
                      <div>• Médecin : <span className="font-semibold text-slate-800">{praticienSelectionne?.nom}</span></div>
                      <div>• Date : <span className="font-semibold text-slate-800">{dateSelectionnee}</span></div>
                      <div>• Heure : <span className="font-semibold text-slate-800">{creneauSelectionne}</span></div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setEtape(3)}
                      className="px-6 py-3 rounded-2xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      className="bg-[#3457DC] hover:bg-[#2c48c2] text-white px-7 py-3.5 rounded-2xl font-bold text-sm tracking-wide shadow-lg shadow-[#3457DC]/25 transition-all flex items-center space-x-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Confirmer le rendez-vous</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ETAPE 5 : Succès de la réservation */}
            {etape === 5 && (
              <div className="max-w-xl mx-auto text-center bg-white p-10 rounded-3xl border border-[#3457DC]/10 shadow-xl space-y-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl mx-auto flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-black text-[#0B1440] mb-2">Rendez-vous enregistré !</h2>
                  <p className="text-slate-600 text-sm">Votre demande a été transmise au service concerné du CENHOSOA. Un rappel vous sera envoyé.</p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setongletActif('mes-rdv')}
                    className="bg-[#3457DC] text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md"
                  >
                    Voir mes rendez-vous
                  </button>
                  <button
                    onClick={resetFormulaire}
                    className="bg-[#F5F7FD] text-[#0B1440] border border-[#3457DC]/15 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider"
                  >
                    Prendre un autre RDV
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 2 : Liste des rendez-vous du patient */}
        {ongletActif === 'mes-rdv' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-[#0B1440]">Mes Rendez-vous</h2>
                <p className="text-slate-600 text-sm">Consultez, modifiez ou annulez vos consultations à venir au CENHOSOA.</p>
              </div>
              <button
                onClick={() => setongletActif('reserver')}
                className="bg-[#3457DC] hover:bg-[#2c48c2] text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#3457DC]/20 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau rendez-vous</span>
              </button>
            </div>

            {mesRendezVous.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-[#3457DC]/10 text-center space-y-4">
                <div className="w-16 h-16 bg-[#F5F7FD] text-[#3457DC] rounded-2xl mx-auto flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#0B1440]">Aucun rendez-vous planifié</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">Vous n'avez actuellement aucune consultation enregistrée dans votre espace patient.</p>
                <button
                  onClick={() => setongletActif('reserver')}
                  className="bg-[#3457DC] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Prendre un rendez-vous
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {mesRendezVous.map((rdv) => (
                  <div key={rdv.id} className="bg-white p-6 rounded-3xl border border-[#3457DC]/10 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#3457DC]/10 text-[#3457DC] flex items-center justify-center shrink-0">
                        <CalendarIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-bold text-[#3457DC] uppercase tracking-wider">{rdv.specialite}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rdv.statut === 'Confirmé' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {rdv.statut}
                          </span>
                        </div>
                        <h4 className="text-base font-display font-bold text-[#0B1440]">{rdv.praticien}</h4>
                        <p className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
                          <span className="flex items-center space-x-1"><CalendarIcon className="w-3.5 h-3.5 text-slate-400" /><span>{rdv.date}</span></span>
                          <span className="flex items-center space-x-1"><Clock className="w-3.5 h-3.5 text-slate-400" /><span>{rdv.heure}</span></span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">Type : {rdv.type}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      <button
                        onClick={() => handleAnnulerRdv(rdv.id)}
                        className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-bold flex items-center space-x-1"
                        title="Annuler le rendez-vous"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Annuler</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}