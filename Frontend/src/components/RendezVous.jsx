import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle, Ambulance, ArrowLeft, Bell, Calendar, Camera, CheckCircle2, ChevronLeft,
  ChevronRight, ClipboardList, Clock, LogOut, Menu, Plus, Search,
  Stethoscope, UserPlus, UserRound, X, XCircle,
} from 'lucide-react';
import {
  ajouterPatientCreneau,
  creerCreneau,
  listerCreneaux,
  listerPatientsPourCreneau,
  obtenirTokenStocke,
  listerRendezVous,
  marquerNotificationRendezVousLue,
  modifierProfilPatient,
  modifierPhotoProfilPatient,
  modifierCreneau,
  modifierRendezVous,
  obtenirPhotoProfilPatient,
  supprimerPhotoProfilPatient,
  reserverCreneau,
} from '../services/api';
import logoCenhosoa from '../assets/logo/logo.jpeg';
import { StylesEspace, Compteur, BandeauPage, BTN_CLAIR, BTN_VERRE } from './StylesEspace';
import CarteRendezVous from './CarteRendezVous';
import StatutBadge from './StatutBadge';
import { ecouterDonneesModifiees } from '../services/tempsReel';
import FenetreFormulaire from './FenetreFormulaire';
import {
  cleDateLocale,
  formaterRendezVous,
  obtenirNomUtilisateur,
  versDateLocaleInput,
} from './rendezVousUtils';


function CalendrierCreneaux({
  creneaux,
  creneauSelectionne,
  onSelectionner,
  patientMode = false,
  onDateSelectionnee,
}) {
  const [moisAffiche, setMoisAffiche] = useState(() => {
    const maintenant = new Date();
    return new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  });
  const debut = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), 1);
  debut.setDate(debut.getDate() - ((debut.getDay() + 6) % 7));
  const jours = Array.from({ length: 42 }, (_, index) => {
    const jour = new Date(debut);
    jour.setDate(debut.getDate() + index);
    return jour;
  }).filter((jour) => jour.getDay() !== 0);
  const creneauxParJour = creneaux.reduce((groupes, creneau) => {
    const cle = cleDateLocale(new Date(creneau.date_heure));
    groupes[cle] = [...(groupes[cle] || []), creneau];
    return groupes;
  }, {});
  const titreMois = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(moisAffiche);

  return (
    <section aria-label="Calendrier des créneaux médicaux" className="apparition overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#5B7480]">Calendrier médical</p>
          <h2 className="mt-1 text-xl font-bold capitalize text-[#0A2233]">{titreMois}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Mois précédent"
            onClick={() => setMoisAffiche(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() - 1, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              const maintenant = new Date();
              setMoisAffiche(new Date(maintenant.getFullYear(), maintenant.getMonth(), 1));
            }}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Aujourd’hui
          </button>
          <button
            type="button"
            aria-label="Mois suivant"
            onClick={() => setMoisAffiche(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto p-3 sm:p-5">
        <div className="min-w-[680px] md:min-w-[760px]">
          <div className="grid grid-cols-6 border-b border-slate-100 pb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((jour) => <div key={jour} className="py-2">{jour}</div>)}
          </div>
          <div className="grid grid-cols-6">
            {jours.map((jour) => {
              const cle = cleDateLocale(jour);
              const duMoisAffiche = jour.getMonth() === moisAffiche.getMonth();
              const creneauxJour = creneauxParJour[cle] || [];
              return (
                <div key={cle} className={`min-h-[128px] border-b border-r border-slate-100 p-2 ${duMoisAffiche ? 'bg-white' : 'bg-slate-50/70'}`}>
                  <div className="mb-2 flex h-7 items-center">
                    {onDateSelectionnee ? (
                      <button
                        type="button"
                        disabled={jour < new Date(new Date().setHours(0, 0, 0, 0))}
                        onClick={() => onDateSelectionnee(cle)}
                        aria-label={`Ajouter un créneau le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(jour)}`}
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${cle === cleDateLocale(new Date()) ? 'bg-[#0A2233] !text-white' : ''} transition ${
                          duMoisAffiche ? 'text-slate-700 hover:bg-[#1F7A8C] hover:text-white' : 'text-slate-300 hover:bg-[#1F7A8C] hover:text-white'
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {jour.getDate()}
                      </button>
                    ) : (
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${cle === cleDateLocale(new Date()) ? 'bg-[#0A2233] !text-white' : ''} ${duMoisAffiche ? 'text-slate-700' : 'text-slate-300'}`}>
                        {jour.getDate()}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {creneauxJour.map((creneau) => {
                      const estSelectionne = creneauSelectionne?.id === creneau.id;
                      const maintenant = new Date();
                      const estPasse = creneau.date_fin
                        ? new Date(creneau.date_fin).getTime() + 60000 <= maintenant.getTime()
                        : new Date(creneau.date_heure) <= maintenant;
                      const reservable = creneau.est_ouvert && !estPasse;
                      return (
                        <button
                          key={creneau.id}
                          type="button"
                          disabled={patientMode && !reservable}
                          onClick={() => onSelectionner(creneau)}
                          className={`flex w-full items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-left text-[11px] font-bold transition ${
                            estSelectionne ? 'bg-[#1F7A8C] text-white shadow-md ring-2 ring-[#7FD1CB]'
                              : reservable ? 'bg-[#1F7A8C]/10 text-[#0F3D52] hover:scale-[1.03] hover:bg-[#1F7A8C]/20'
                                : 'bg-slate-100 text-slate-400'
                          } disabled:cursor-not-allowed`}
                          title={`${creneau.est_ouvert ? 'Ouvert' : 'Fermé'} · ${creneau.nombre_patients} patient(s) sur ce créneau · ${creneau.nombre_patients_jour}/${creneau.quota_journalier || 'sans limite'} pour le jour`}
                        >
                          <span>
                            {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(creneau.date_heure))}
                            {creneau.date_fin && `–${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(creneau.date_fin))}`}
                          </span>
                          <span className="truncate font-medium">{creneau.est_ouvert ? `${creneau.nombre_patients_jour}/${creneau.quota_journalier || '∞'} jour` : 'Fermé'}</span>
                        </button>
                      );
                    })}
                    {creneauxJour.length === 0 && duMoisAffiche && patientMode && <span className="px-1 text-[10px] text-slate-300">Aucun créneau</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 px-5 py-3 text-xs font-medium text-slate-600 sm:px-7">
        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Créneau ouvert</span>
        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Fermé ou passé</span>
        {!patientMode && <span>Les créneaux ouverts acceptent des réservations jusqu’à leur fermeture.</span>}
      </div>
    </section>
  );
}

export default function GestionRendezVous({
  onBackToHome,
  onDeconnexion,
  onProfilMisAJour,
  onDemandeAmbulance,
  profil,
  services = [],
  serviceInitial = null,
}) {
  const estSecretaire = profil?.role === 'secretaire';
  const estMedecin = profil?.role === 'medecin';
  const estGestionnaireRdv = estSecretaire || estMedecin;
  const [rendezVous, setRendezVous] = useState([]);
  const [actualisationTempsReel, setActualisationTempsReel] = useState(0);
  const [notificationsOuvertes, setNotificationsOuvertes] = useState(false);
  const [profilOuvert, setProfilOuvert] = useState(false);
  const [photoProfil, setPhotoProfil] = useState('');
  const photoProfilUrl = useRef('');
  const [erreurPhoto, setErreurPhoto] = useState('');
  const [enregistrementPhoto, setEnregistrementPhoto] = useState(false);
  const [profilPatient, setProfilPatient] = useState({
    nom: profil?.patient?.nom || '',
    prenoms: profil?.patient?.prenoms || '',
    date_naissance: profil?.patient?.date_naissance || '',
    lieu_naissance: profil?.patient?.lieu_naissance || '',
    adresse: profil?.patient?.adresse || '',
  });
  const [enregistrementProfil, setEnregistrementProfil] = useState(false);
  const [erreurProfil, setErreurProfil] = useState('');
  const [succesProfil, setSuccesProfil] = useState('');
  const [datesConfirmation, setDatesConfirmation] = useState({});
  const [listeRendezVous, setListeRendezVous] = useState('aujourdhui');
  const [pagePersonnel, setPagePersonnel] = useState('accueil');
  const [navigationPersonnelOuverte, setNavigationPersonnelOuverte] = useState(false);
  const [recherchePatient, setRecherchePatient] = useState('');
  const [rechercheAnnuairePatients, setRechercheAnnuairePatients] = useState('');
  const [chargement, setChargement] = useState(true);
  const [chargementCreneaux, setChargementCreneaux] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [creneaux, setCreneaux] = useState([]);
  const [patients, setPatients] = useState([]);
  const [chargementPatients, setChargementPatients] = useState(false);
  const [erreurPatients, setErreurPatients] = useState('');
  const [creneauSelectionneId, setCreneauSelectionneId] = useState('');
  const [dateFormulaireCreneau, setDateFormulaireCreneau] = useState('');
  const [formulaireCreneauOuvert, setFormulaireCreneauOuvert] = useState(false);
  const [modificationHorairesCreneau, setModificationHorairesCreneau] = useState(null);
  const [patientAffecteId, setPatientAffecteId] = useState('');
  const [modePatientAffecte, setModePatientAffecte] = useState('existant');
  const [nouveauPatientAffecte, setNouveauPatientAffecte] = useState({ nom: '', prenoms: '', telephone: '' });
  const [quotaJournalierModif, setQuotaJournalierModif] = useState('20');
  const [ajoutPatientOuvert, setAjoutPatientOuvert] = useState(false);
  const [modificationQuotaOuverte, setModificationQuotaOuverte] = useState(false);
  const [motifFile, setMotifFile] = useState('');
  const [filtreMesRdv, setFiltreMesRdv] = useState('a_venir');
  const [nouveauCreneau, setNouveauCreneau] = useState({
    heureDebut: '09:00',
    heureFin: '10:00',
    quota_journalier: '20',
    patient_id: '',
    motif: '',
  });
  const [nouveauRdv, setNouveauRdv] = useState({
    service_id: serviceInitial?.id || '',
    motif: '',
  });
  const nomUtilisateur = obtenirNomUtilisateur(profil);
  const serviceSecretaire = profil?.personnel?.service || 'Aucun service attribué';
  const token = obtenirTokenStocke();
  const servicesDisponibles = estGestionnaireRdv
    ? services.filter((service) => service.nom === serviceSecretaire)
    : services;
  const serviceCalendrier = estGestionnaireRdv
    ? servicesDisponibles[0]
    : servicesDisponibles.find((service) => service.id === nouveauRdv.service_id);
  const creneauSelectionne = creneaux.find((creneau) => creneau.id === creneauSelectionneId) || null;

  useEffect(() => ecouterDonneesModifiees(
    ['patients', 'rendez-vous', 'services'],
    () => setActualisationTempsReel((precedent) => precedent + 1),
  ), []);

  useEffect(() => {
    if (profil?.role !== 'patient' || !profil.patient?.id) {
      photoProfilUrl.current = '';
      return undefined;
    }
    let actif = true;
    const chargerPhoto = async () => {
      try {
        let photo = await obtenirPhotoProfilPatient(token, profil.patient.id);
        const clePhotoLocale = `photo-profil-patient:${profil.patient.id}`;
        if (!photo) {
          const anciennePhotoLocale = localStorage.getItem(clePhotoLocale);
          if (anciennePhotoLocale) {
            const blob = await fetch(anciennePhotoLocale).then((reponse) => reponse.blob());
            await modifierPhotoProfilPatient(token, blob);
            localStorage.removeItem(clePhotoLocale);
            photo = await obtenirPhotoProfilPatient(token, profil.patient.id);
          }
        }
        if (actif && photo) {
          const url = URL.createObjectURL(photo);
          photoProfilUrl.current = url;
          setPhotoProfil(url);
        }
      } catch (err) {
        if (actif) setErreurPhoto(err.message || 'Impossible de charger votre photo de profil.');
      }
    };
    void chargerPhoto();
    return () => {
      actif = false;
      if (photoProfilUrl.current) URL.revokeObjectURL(photoProfilUrl.current);
      photoProfilUrl.current = '';
    };
  }, [profil?.patient?.id, profil?.role, token]);

  const choisirPhotoProfil = async (evenement) => {
    const fichier = evenement.target.files?.[0];
    evenement.target.value = '';
    if (!fichier) return;
    setErreurPhoto('');
    if (!fichier.type.startsWith('image/')) {
      setErreurPhoto('Choisissez un fichier image.');
      return;
    }
    if (fichier.size > 2 * 1024 * 1024) {
      setErreurPhoto('La photo ne doit pas dépasser 2 Mo.');
      return;
    }
    setEnregistrementPhoto(true);
    try {
      await modifierPhotoProfilPatient(token, fichier);
      const photo = await obtenirPhotoProfilPatient(token, profil.patient.id);
      if (photo) {
        if (photoProfilUrl.current) URL.revokeObjectURL(photoProfilUrl.current);
        photoProfilUrl.current = URL.createObjectURL(photo);
        setPhotoProfil(photoProfilUrl.current);
      }
    } catch (err) {
      setErreurPhoto(err.message || 'La photo n’a pas pu être enregistrée.');
    } finally {
      setEnregistrementPhoto(false);
    }
  };

  const supprimerPhotoProfil = async () => {
    if (!profil?.patient?.id) return;
    setErreurPhoto('');
    setEnregistrementPhoto(true);
    try {
      await supprimerPhotoProfilPatient(token);
      if (photoProfilUrl.current) URL.revokeObjectURL(photoProfilUrl.current);
      photoProfilUrl.current = '';
      setPhotoProfil('');
    } catch (err) {
      setErreurPhoto(err.message || 'Impossible de supprimer la photo de profil.');
    } finally {
      setEnregistrementPhoto(false);
    }
  };

  const enregistrerProfilPatient = async (evenement) => {
    evenement.preventDefault();
    setErreurProfil('');
    setSuccesProfil('');
    setEnregistrementProfil(true);
    try {
      const patient = await modifierProfilPatient(token, {
        ...profilPatient,
        date_naissance: profilPatient.date_naissance || null,
        lieu_naissance: profilPatient.lieu_naissance.trim() || null,
        adresse: profilPatient.adresse.trim() || null,
      });
      setProfilPatient({
        nom: patient.nom,
        prenoms: patient.prenoms,
        date_naissance: patient.date_naissance || '',
        lieu_naissance: patient.lieu_naissance || '',
        adresse: patient.adresse || '',
      });
      onProfilMisAJour?.({ ...profil, patient: { ...profil.patient, ...patient } });
      setSuccesProfil('Votre profil a été mis à jour.');
    } catch (err) {
      setErreurProfil(err.message || 'Impossible de mettre à jour votre profil.');
    } finally {
      setEnregistrementProfil(false);
    }
  };

  const actualiserRendezVous = async () => {
    const donnees = await listerRendezVous(token);
    setRendezVous(donnees.map(formaterRendezVous));
  };

  const basculerNotifications = async () => {
    setProfilOuvert(false);
    if (!notificationsOuvertes) {
      try {
        await actualiserRendezVous();
      } catch (err) {
        setErreur(err.message || 'Impossible d’actualiser les notifications.');
      }
    }
    setNotificationsOuvertes((ouvertes) => !ouvertes);
  };

  const marquerNotificationLue = async (rdv) => {
    if (rdv.date_confirmee_vue === rdv.date_confirmee) return;
    try {
      const misAJour = await marquerNotificationRendezVousLue(token, rdv.id);
      setRendezVous((precedents) => precedents.map((element) => (
        element.id === rdv.id ? formaterRendezVous(misAJour) : element
      )));
    } catch (err) {
      setErreur(err.message || 'Impossible de marquer cette notification comme lue.');
    }
  };

  const actualiserCreneaux = async () => {
    if (!serviceCalendrier?.id) {
      setCreneaux([]);
      setCreneauSelectionneId('');
      return;
    }
    const donnees = await listerCreneaux(token, serviceCalendrier.id);
    setCreneaux(donnees);
  };

  useEffect(() => {
    let actif = true;
    listerRendezVous(token)
      .then((donnees) => {
        if (actif) setRendezVous(donnees.map(formaterRendezVous));
      })
      .catch((err) => {
        if (actif) setErreur(err.message || 'Impossible de charger les rendez-vous.');
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => { actif = false; };
  }, [actualisationTempsReel, token]);

  useEffect(() => {
    if (estGestionnaireRdv) return undefined;
    let actif = true;
    const actualiserNotifications = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const donnees = await listerRendezVous(token);
        if (actif) setRendezVous(donnees.map(formaterRendezVous));
      } catch (err) {
        if (actif) setErreur(err.message || 'Impossible d’actualiser les notifications.');
      }
    };
    const intervalle = window.setInterval(actualiserNotifications, 10000);
    const actualiserAuRetour = () => { void actualiserNotifications(); };
    window.addEventListener('focus', actualiserAuRetour);
    document.addEventListener('visibilitychange', actualiserAuRetour);
    return () => {
      actif = false;
      window.clearInterval(intervalle);
      window.removeEventListener('focus', actualiserAuRetour);
      document.removeEventListener('visibilitychange', actualiserAuRetour);
    };
  }, [estGestionnaireRdv, token]);

  useEffect(() => {
    let actif = true;
    if (!serviceCalendrier?.id) {
      return () => { actif = false; };
    }
    Promise.resolve().then(() => {
      if (actif) setChargementCreneaux(true);
    });
    const actualiser = async () => {
      try {
        const donnees = await listerCreneaux(token, serviceCalendrier.id);
        if (actif) setCreneaux(donnees);
      } catch (err) {
        if (actif) setErreur(err.message || 'Impossible de charger le calendrier.');
      } finally {
        if (actif) setChargementCreneaux(false);
      }
    };
    void actualiser();
    const intervalle = window.setInterval(() => {
      if (document.visibilityState === 'visible') void actualiser();
    }, 10000);
    return () => {
      actif = false;
      window.clearInterval(intervalle);
    };
  }, [actualisationTempsReel, serviceCalendrier?.id, token]);

  const chargerPatientsDisponibles = useCallback(async () => {
    setChargementPatients(true);
    setErreurPatients('');
    try {
      const donnees = await listerPatientsPourCreneau(token);
      if (!Array.isArray(donnees)) {
        throw new Error('La réponse du serveur pour la liste des patients est invalide.');
      }
      setPatients(donnees);
    } catch (err) {
      setErreurPatients(err.message || 'Impossible de charger les patients.');
    } finally {
      setChargementPatients(false);
    }
  }, [token]);

  useEffect(() => {
    if (!estGestionnaireRdv) return undefined;
    return ecouterDonneesModifiees(['administration', 'patients'], () => {
      void chargerPatientsDisponibles();
    });
  }, [chargerPatientsDisponibles, estGestionnaireRdv]);

  const handleSubmit = async (evenement) => {
    evenement.preventDefault();
    setErreur('');
    setSucces('');
    setEnregistrement(true);
    try {
      if (!creneauSelectionne || !creneauSelectionne.est_ouvert) {
        throw new Error('Choisissez un créneau ouvert dans le calendrier.');
      }
      const cree = await reserverCreneau(token, creneauSelectionne.id, nouveauRdv.motif);
      setRendezVous((precedents) => [formaterRendezVous(cree), ...precedents]);
      setNouveauRdv((precedent) => ({ ...precedent, motif: '' }));
      setCreneauSelectionneId('');
      await actualiserCreneaux();
      setSucces(`Votre réservation est enregistrée. Votre numéro de file est le ${cree.numero_file}.`);
    } catch (err) {
      setErreur(err.message || 'Impossible de réserver ce créneau.');
    } finally {
      setEnregistrement(false);
    }
  };

  const enregistrerCreneau = async (evenement) => {
    evenement.preventDefault();
    if (nouveauCreneau.heureFin <= nouveauCreneau.heureDebut) {
      setErreur('L’heure de fermeture doit être après l’heure de début.');
      return;
    }
    setErreur('');
    setSucces('');
    setEnregistrement(true);
    try {
      const cree = await creerCreneau(token, {
        service_id: serviceCalendrier.id,
        date_jour: dateFormulaireCreneau,
        date_heure: new Date(`${dateFormulaireCreneau}T${nouveauCreneau.heureDebut}`).toISOString(),
        date_fin: new Date(`${dateFormulaireCreneau}T${nouveauCreneau.heureFin}`).toISOString(),
        quota_journalier: Number(nouveauCreneau.quota_journalier),
        ...(nouveauCreneau.patient_id && {
          patient_id: nouveauCreneau.patient_id,
          motif: nouveauCreneau.motif,
        }),
      });
      await actualiserCreneaux();
      await actualiserRendezVous();
      setNouveauCreneau({ heureDebut: '09:00', heureFin: '10:00', quota_journalier: '20', patient_id: '', motif: '' });
      setFormulaireCreneauOuvert(false);
      setSucces(nouveauCreneau.patient_id
        ? `Créneau créé et patient ajouté à la file numéro 1.`
        : 'Le créneau médical a été ajouté au calendrier.');
      setCreneauSelectionneId(cree.id);
    } catch (err) {
      setErreur(err.message || 'Impossible de créer le créneau médical.');
    } finally {
      setEnregistrement(false);
    }
  };

  const ajouterPatientAuCreneau = async (evenement) => {
    evenement.preventDefault();
    if (!creneauSelectionne) return;
    if (modePatientAffecte === 'existant' && !patientAffecteId) {
      setErreur('Choisissez un patient existant.');
      return;
    }
    if (modePatientAffecte === 'nouveau' && !Object.values(nouveauPatientAffecte).every((valeur) => valeur.trim())) {
      setErreur('Renseignez le nom, les prénoms et le téléphone du patient.');
      return;
    }
    setErreur('');
    setSucces('');
    setEnregistrement(true);
    try {
      const cree = await ajouterPatientCreneau(token, creneauSelectionne.id, {
        ...(modePatientAffecte === 'existant'
          ? { patient_id: patientAffecteId }
          : { nouveau_patient: nouveauPatientAffecte }),
        motif: motifFile,
      });
      await actualiserRendezVous();
      await actualiserCreneaux();
      setPatientAffecteId('');
      setNouveauPatientAffecte({ nom: '', prenoms: '', telephone: '' });
      setMotifFile('');
      setAjoutPatientOuvert(false);
      setSucces(`Patient ajouté à la file avec le numéro ${cree.numero_file}.`);
    } catch (err) {
      setErreur(err.message || 'Impossible d’ajouter le patient à la file.');
    } finally {
      setEnregistrement(false);
    }
  };

  const modifierQuotaJournalier = async (evenement) => {
    evenement.preventDefault();
    if (!creneauSelectionne) return;
    const limite = Number(quotaJournalierModif);
    if (!Number.isInteger(limite) || limite < 1 || limite > 10000) {
      setErreur('Le quota doit être un nombre entier entre 1 et 10 000.');
      return;
    }
    setErreur('');
    setSucces('');
    setEnregistrement(true);
    try {
      await modifierCreneau(token, creneauSelectionne.id, { quota_journalier: limite });
      await actualiserCreneaux();
      setModificationQuotaOuverte(false);
      setSucces('Le quota journalier du service a été mis à jour.');
    } catch (err) {
      setErreur(err.message || 'Impossible de modifier le quota journalier.');
    } finally {
      setEnregistrement(false);
    }
  };

  const basculerOuvertureCreneau = async (creneau) => {
    setErreur('');
    setSucces('');
    setEnregistrement(true);
    try {
      const actualise = await modifierCreneau(token, creneau.id, { est_ouvert: !creneau.est_ouvert });
      setCreneaux((precedents) => precedents.map((item) => item.id === actualise.id ? actualise : item));
      setSucces(actualise.est_ouvert ? 'Le créneau est de nouveau ouvert.' : 'Le créneau a été fermé aux nouvelles réservations.');
    } catch (err) {
      setErreur(err.message || 'Impossible de modifier la disponibilité du créneau.');
    } finally {
      setEnregistrement(false);
    }
  };

  const enregistrerModificationHorairesCreneau = async (evenement) => {
    evenement.preventDefault();
    if (!creneauSelectionne || !modificationHorairesCreneau) return;
    const dateHeure = new Date(modificationHorairesCreneau.dateHeure);
    const dateFin = new Date(modificationHorairesCreneau.dateFin);
    if (dateHeure <= new Date() || dateFin <= dateHeure) {
      setErreur('Choisissez un début futur et une heure de fin après le début.');
      return;
    }
    setErreur('');
    setSucces('');
    setEnregistrement(true);
    try {
      const actualise = await modifierCreneau(token, creneauSelectionne.id, {
        date_heure: dateHeure.toISOString(),
        date_fin: dateFin.toISOString(),
        date_jour: modificationHorairesCreneau.dateHeure.slice(0, 10),
      });
      setCreneaux((precedents) => precedents.map((item) => item.id === actualise.id ? actualise : item));
      setModificationHorairesCreneau(null);
      await actualiserRendezVous();
      setModificationHorairesCreneau(null);
      setSucces('Les horaires du créneau et les rendez-vous qui y sont associés ont été déplacés.');
    } catch (err) {
      setErreur(err.message || 'Impossible de modifier les horaires du créneau.');
    } finally {
      setEnregistrement(false);
    }
  };

  const changerStatut = async (rdv, statut, dateConfirmee = null) => {
    setErreur('');
    setSucces('');
    setEnregistrement(true);
    try {
      await modifierRendezVous(token, rdv.id, {
        statut,
        ...(dateConfirmee && { date_confirmee: new Date(dateConfirmee).toISOString() }),
      });
      await actualiserRendezVous();
      setSucces(statut === 'confirme'
        ? 'Le rendez-vous est confirmé. Le patient peut consulter l’horaire dans son espace.'
        : 'Le rendez-vous a été mis à jour.');
    } catch (err) {
      let messageErreur = err.message || 'Impossible de mettre à jour le rendez-vous.';
      if (err.status === 409) {
        try {
          await actualiserRendezVous();
          messageErreur = `${messageErreur} La liste a été actualisée avec le statut le plus récent.`;
        } catch (erreurActualisation) {
          messageErreur = `${messageErreur} Impossible d’actualiser la liste : ${erreurActualisation.message}`;
        }
      }
      setErreur(messageErreur);
    } finally {
      setEnregistrement(false);
    }
  };

  const nombreEnAttente = rendezVous.filter((rdv) => rdv.statutApi === 'en_attente').length;
  const dateDuJour = cleDateLocale(new Date());
  const rendezVousAujourdhui = rendezVous.filter((rdv) => (
    rdv.statutApi !== 'termine'
    && cleDateLocale(new Date(rdv.date_confirmee || rdv.date_souhaitee)) === dateDuJour
  ));
  const rendezVousTermines = rendezVous.filter((rdv) => rdv.statutApi === 'termine');
  const rendezVousAVenir = rendezVous.filter((rdv) => (
    rdv.statutApi === 'confirme'
    && cleDateLocale(new Date(rdv.date_confirmee || rdv.date_souhaitee)) !== dateDuJour
    && new Date(rdv.date_confirmee || rdv.date_souhaitee) > new Date()
  ));
  const statistiquesStatuts = [
    { label: 'En attente', statut: 'en_attente', couleur: 'bg-amber-500', couleurGraphique: '#f59e0b' },
    { label: 'Confirmés', statut: 'confirme', couleur: 'bg-blue-500', couleurGraphique: '#3b82f6' },
    { label: 'Arrivés', statut: 'arrive', couleur: 'bg-violet-500', couleurGraphique: '#8b5cf6' },
    { label: 'Terminés', statut: 'termine', couleur: 'bg-emerald-500', couleurGraphique: '#10b981' },
    { label: 'Autres', statuts: ['refuse', 'annule', 'absent'], couleur: 'bg-slate-400', couleurGraphique: '#94a3b8' },
  ].map((statut) => ({
    ...statut,
    valeur: statut.statut
      ? rendezVous.filter((rdv) => rdv.statutApi === statut.statut).length
      : rendezVous.filter((rdv) => statut.statuts.includes(rdv.statutApi)).length,
  }));
  let cumulStatuts = 0;
  const gradientStatuts = statistiquesStatuts.map((statut) => {
    const debut = cumulStatuts;
    cumulStatuts += rendezVous.length ? (statut.valeur / rendezVous.length) * 100 : 0;
    return `${statut.couleurGraphique} ${debut}% ${cumulStatuts}%`;
  }).join(', ');
  const debutPeriodeStatistiques = new Date();
  debutPeriodeStatistiques.setDate(1);
  debutPeriodeStatistiques.setHours(0, 0, 0, 0);
  debutPeriodeStatistiques.setMonth(debutPeriodeStatistiques.getMonth() - 5);
  const statistiquesMensuelles = Array.from({ length: 6 }, (_, index) => {
    const mois = new Date(
      debutPeriodeStatistiques.getFullYear(),
      debutPeriodeStatistiques.getMonth() + index,
      1,
    );
    const cleMois = `${mois.getFullYear()}-${String(mois.getMonth() + 1).padStart(2, '0')}`;
    const valeur = rendezVous.filter((rdv) => {
      const date = new Date(rdv.date_confirmee || rdv.date_souhaitee);
      return !Number.isNaN(date.getTime())
        && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === cleMois;
    }).length;
    return {
      cle: cleMois,
      label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(mois).replace('.', ''),
      valeur,
    };
  });
  const maximumMensuel = Math.max(1, ...statistiquesMensuelles.map((mois) => mois.valeur));
  const rendezVousAffiches = rendezVous.filter((rdv) => {
    if (creneauSelectionneId) return rdv.creneau_id === creneauSelectionneId;
    if (listeRendezVous === 'historique') return rdv.statutApi === 'termine';
    if (listeRendezVous === 'a-venir') return rendezVousAVenir.some((element) => element.id === rdv.id);
    return rendezVousAujourdhui.some((element) => element.id === rdv.id);
  }).filter((rdv) => {
    const recherche = recherchePatient.trim().toLocaleLowerCase('fr-FR');
    if (!recherche) return true;
    return [
      rdv.patient,
      rdv.patient_telephone,
      rdv.motif,
    ].some((valeur) => valeur?.toLocaleLowerCase('fr-FR').includes(recherche));
  });
  const groupesRendezVousMap = new Map();
  rendezVousAffiches.forEach((rdv) => {
    const groupe = groupesRendezVousMap.get(rdv.patient_id);
    if (groupe) {
      groupe.rendezVous.push(rdv);
    } else {
      groupesRendezVousMap.set(rdv.patient_id, {
        patientId: rdv.patient_id,
        patient: rdv.patient,
        telephone: rdv.patient_telephone,
        rendezVous: [rdv],
      });
    }
  });
  const groupesRendezVous = Array.from(groupesRendezVousMap.values());
  const patientsDuServiceMap = new Map();
  rendezVous.forEach((rdv) => {
    if (!patientsDuServiceMap.has(rdv.patient_id)) {
      patientsDuServiceMap.set(rdv.patient_id, {
        patientId: rdv.patient_id,
        patient: rdv.patient,
        telephone: rdv.patient_telephone,
        nombreRendezVous: 1,
      });
    } else {
      patientsDuServiceMap.get(rdv.patient_id).nombreRendezVous += 1;
    }
  });
  const rechercheAnnuaireNormalisee = rechercheAnnuairePatients.trim().toLocaleLowerCase('fr-FR');
  const patientsDuService = Array.from(patientsDuServiceMap.values())
    .filter((patient) => (
      `${patient.patient} ${patient.telephone}`.toLocaleLowerCase('fr-FR')
        .includes(rechercheAnnuaireNormalisee)
    ))
    .sort((a, b) => a.patient.localeCompare(b.patient, 'fr'));
  const rendezVousEnFile = rendezVous
    .filter((rdv) => rdv.creneau_id && ['en_attente', 'confirme'].includes(rdv.statutApi))
    .sort((a, b) => (
      new Date(a.date_souhaitee) - new Date(b.date_souhaitee)
      || (a.numero_file || 0) - (b.numero_file || 0)
    ));
  const notificationsRendezVous = estGestionnaireRdv
    ? []
    : rendezVous.filter((rdv) =>
      rdv.statutApi === 'confirme' &&
      new Date(rdv.date_confirmee || rdv.date_souhaitee) > new Date(),
    );
  const nombreNotificationsNonLues = notificationsRendezVous.filter((rdv) =>
    !rdv.date_confirmee_vue
    || new Date(rdv.date_confirmee_vue).getTime() !== new Date(rdv.date_confirmee).getTime(),
  ).length;
  const formaterDateNotification = (valeur) => new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(valeur));
  const naviguerPagePersonnel = (page) => {
    setPagePersonnel(page);
    setNavigationPersonnelOuverte(false);
    setCreneauSelectionneId('');
    setFormulaireCreneauOuvert(false);
    setModificationHorairesCreneau(null);
    if (page === 'accueil') setListeRendezVous('aujourdhui');
    if (page === 'rendez-vous' && listeRendezVous === 'aujourdhui') {
      setListeRendezVous('a-venir');
    }
  };

  const dateDuRdv = (rdv) => new Date(rdv.date_confirmee || rdv.date_souhaitee);
  const rdvActif = (rdv) => ['en_attente', 'confirme'].includes(rdv.statutApi);
  const prenomPatient = (profil?.patient?.prenoms || '').split(' ')[0] || nomUtilisateur;
  const prochainRdv = rendezVous
    .filter((rdv) => rdv.statutApi === 'confirme' && dateDuRdv(rdv) > new Date())
    .sort((a, b) => dateDuRdv(a) - dateDuRdv(b))[0] || null;
  const mesRdvFiltres = rendezVous.filter((rdv) => (
    filtreMesRdv === 'tous' ? true : filtreMesRdv === 'a_venir' ? rdvActif(rdv) : !rdvActif(rdv)
  ));
  const etapeReservation = creneauSelectionne ? 3 : serviceCalendrier?.id ? 2 : 1;
  const formatHeure = (valeur) => new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valeur));

  return (
    <div className="espace min-h-screen bg-[#F4F2EE] font-body text-[#1E2333]">
      <StylesEspace />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-[#0A2233] via-[#0F3D52] to-[#0A2233] text-white shadow-lg shadow-[#0A2233]/20 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-6 lg:h-20 lg:flex-nowrap lg:px-8 lg:py-0">
          <div className="group flex min-w-0 max-w-full items-center space-x-2.5 sm:space-x-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-white p-1.5 shadow-md shadow-black/20 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2 sm:h-14 sm:w-14">
              <img src={logoCenhosoa} alt="Logo Centre Hospitalier de Soavinandriana" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <span className="block text-xl font-display font-light tracking-tight text-white">
                CENHOSOA
              </span>
              <h1 className="block truncate text-[10px] font-mono font-semibold uppercase tracking-widest text-[#7FD1CB] sm:text-[11px]">
                {estMedecin ? 'Centre Hospitalier de Soavinandriana' : `${estGestionnaireRdv ? 'Secrétariat médical' : 'Espace patient'} · Rendez-vous`}
              </h1>
            </div>
          </div>

          {estGestionnaireRdv && (
            <nav aria-label={`Navigation ${estMedecin ? 'médecin' : 'secrétariat'}`} className="hidden items-center gap-8 text-sm font-semibold text-white/70 lg:flex">
              {[
                { id: 'accueil', label: 'Accueil' },
                { id: 'rendez-vous', label: 'Rendez-vous' },
                { id: 'patient', label: 'Patient' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => naviguerPagePersonnel(id)}
                  aria-current={pagePersonnel === id ? 'page' : undefined}
                  className={`group relative py-1 font-body transition-colors hover:text-white ${
                    pagePersonnel === id ? 'text-[#7FD1CB]' : 'text-white/70'
                  }`}
                >
                  {label}
                  <span className={`absolute -bottom-1 left-0 h-[2px] bg-gradient-to-r from-[#1F7A8C] to-[#7FD1CB] transition-all duration-300 ${
                    pagePersonnel === id ? 'w-full' : 'w-0 group-hover:w-full'
                  }`} />
                </button>
              ))}
            </nav>
          )}

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {profil?.role === 'patient' && (
              <button
                type="button"
                onClick={onDemandeAmbulance}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#7FD1CB] px-3 text-xs font-bold text-[#0A2233] transition hover:bg-white sm:px-4"
              >
                <Ambulance className="h-4 w-4" />
                <span className="hidden sm:inline">Demander une ambulance</span>
                <span className="sm:hidden">Ambulance</span>
              </button>
            )}
            {estGestionnaireRdv && (
              <button
                type="button"
                onClick={() => setNavigationPersonnelOuverte((ouverte) => !ouverte)}
                aria-label={navigationPersonnelOuverte ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={navigationPersonnelOuverte}
                aria-controls="navigation-personnel-mobile"
                className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-2.5 text-white transition hover:bg-white/20 lg:hidden"
              >
                {navigationPersonnelOuverte ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                <span className="hidden text-xs font-semibold sm:inline">
                  {navigationPersonnelOuverte ? 'Fermer' : 'Menu'}
                </span>
              </button>
            )}
            {!estGestionnaireRdv && (
              <div className="relative">
                <button
                  type="button"
                  onClick={basculerNotifications}
                  aria-label={`Notifications de rendez-vous${nombreNotificationsNonLues ? `, ${nombreNotificationsNonLues} non lue(s)` : ''}`}
                  aria-expanded={notificationsOuvertes}
                  className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#7FD1CB] transition hover:bg-white/20"
                >
                  <Bell className="h-5 w-5" />
                  {nombreNotificationsNonLues > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {nombreNotificationsNonLues}
                    </span>
                  )}
                </button>
                {notificationsOuvertes && (
                  <section
                    aria-label="Notifications de rendez-vous"
                    className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <h2 className="text-sm font-bold">Notifications</h2>
                      <button
                        type="button"
                        onClick={() => setNotificationsOuvertes(false)}
                        aria-label="Fermer les notifications"
                        className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                    {notificationsRendezVous.length ? (
                      <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                        {notificationsRendezVous.map((rdv) => {
                          const heureDemandee = new Date(rdv.date_souhaitee).getTime();
                          const heureConfirmee = new Date(rdv.date_confirmee || rdv.date_souhaitee).getTime();
                          const heureModifiee = heureDemandee !== heureConfirmee;
                          const notificationNonLue = !rdv.date_confirmee_vue
                            || new Date(rdv.date_confirmee_vue).getTime() !== heureConfirmee;
                          return (
                            <li key={rdv.id}>
                              <button
                                type="button"
                                onClick={() => marquerNotificationLue(rdv)}
                                aria-label={`${notificationNonLue ? 'Marquer comme lue : ' : ''}${heureModifiee ? 'Horaire modifié' : 'Rendez-vous confirmé'} pour ${rdv.service_nom}`}
                                className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${notificationNonLue ? 'bg-blue-50/60' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-xs font-bold text-[#0A2233]">
                                    {heureModifiee
                                      ? 'Horaire modifié par le médecin'
                                      : 'Rendez-vous confirmé par le médecin'}
                                  </p>
                                  {notificationNonLue && (
                                    <span className="shrink-0 rounded-full bg-[#1F7A8C] px-2 py-0.5 text-[10px] font-bold text-white">
                                      Nouveau
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-slate-600">{rdv.service_nom}</p>
                                {heureModifiee && (
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    Horaire demandé : {formaterDateNotification(rdv.date_souhaitee)}
                                  </p>
                                )}
                                <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                                  {heureModifiee ? 'Nouvel horaire' : 'Rendez-vous'} : {formaterDateNotification(rdv.date_confirmee || rdv.date_souhaitee)}
                                </p>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="px-4 py-5 text-xs text-slate-500">Aucun rendez-vous accordé à venir.</p>
                    )}
                  </section>
                )}
              </div>
            )}
            {!estGestionnaireRdv && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOuvertes(false);
                    setProfilOuvert((ouvert) => !ouvert);
                  }}
                  aria-label="Ouvrir mon profil"
                  aria-expanded={profilOuvert}
                  aria-controls="panneau-profil-patient"
                  className="flex h-10 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-2 text-white transition hover:bg-white/20"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                    {photoProfil
                      ? <img src={photoProfil} alt="" className="h-full w-full object-cover" />
                      : <UserRound className="h-4 w-4" />}
                  </span>
                  <span className="hidden min-w-0 text-left sm:block">
                    <span className="block max-w-36 truncate text-xs font-bold">{nomUtilisateur}</span>
                    <span className="block text-[10px] font-medium capitalize text-[#7FD1CB]">Patient</span>
                  </span>
                </button>
                {profilOuvert && (
                  <section
                    id="panneau-profil-patient"
                    aria-labelledby="titre-profil-patient"
                    className="absolute right-0 top-12 z-50 max-h-[min(80vh,46rem)] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B7480]">Compte actif</p>
                        <h2 id="titre-profil-patient" className="mt-1 text-base font-bold">Mon profil</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProfilOuvert(false)}
                        aria-label="Fermer mon profil"
                        className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-[#1F7A8C]">
                        {photoProfil
                          ? <img src={photoProfil} alt={`Photo de ${nomUtilisateur}`} className="h-full w-full object-cover" />
                          : <UserRound className="h-8 w-8" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{nomUtilisateur}</p>
                        <p className="mt-0.5 text-xs text-slate-500">Photo sécurisée et accessible au médecin lors du rendez-vous.</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <label className={`inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${enregistrementPhoto ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}>
                            <Camera className="h-3.5 w-3.5" />
                            {enregistrementPhoto ? 'Enregistrement…' : 'Choisir une photo'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={choisirPhotoProfil}
                              disabled={enregistrementPhoto}
                              className="sr-only"
                            />
                          </label>
                          {photoProfil && (
                            <button
                              type="button"
                              onClick={supprimerPhotoProfil}
                              disabled={enregistrementPhoto}
                              className="h-8 rounded-xl px-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                        {erreurPhoto && <p role="alert" className="mt-2 text-xs text-red-700">{erreurPhoto}</p>}
                      </div>
                    </div>
                    <form onSubmit={enregistrerProfilPatient} className="grid gap-3 p-4 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Nom
                        <input
                          required
                          maxLength={100}
                          value={profilPatient.nom}
                          onChange={(event) => setProfilPatient({ ...profilPatient, nom: event.target.value })}
                          className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2.5 text-sm font-normal outline-none focus:border-[#1F7A8C]"
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Prénoms
                        <input
                          required
                          maxLength={150}
                          value={profilPatient.prenoms}
                          onChange={(event) => setProfilPatient({ ...profilPatient, prenoms: event.target.value })}
                          className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2.5 text-sm font-normal outline-none focus:border-[#1F7A8C]"
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Date de naissance
                        <input
                          type="date"
                          value={profilPatient.date_naissance}
                          onChange={(event) => setProfilPatient({ ...profilPatient, date_naissance: event.target.value })}
                          className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2.5 text-sm font-normal outline-none focus:border-[#1F7A8C]"
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Lieu de naissance
                        <input
                          maxLength={150}
                          value={profilPatient.lieu_naissance}
                          onChange={(event) => setProfilPatient({ ...profilPatient, lieu_naissance: event.target.value })}
                          placeholder="Ville ou commune"
                          className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2.5 text-sm font-normal outline-none focus:border-[#1F7A8C]"
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                        Adresse
                        <textarea
                          maxLength={255}
                          rows={2}
                          value={profilPatient.adresse}
                          onChange={(event) => setProfilPatient({ ...profilPatient, adresse: event.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm font-normal outline-none focus:border-[#1F7A8C]"
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                        <button
                          type="submit"
                          disabled={enregistrementProfil}
                          className="h-9 rounded-full bg-[#1F7A8C] px-3 text-xs font-bold text-white transition hover:bg-[#186575] disabled:cursor-wait disabled:opacity-50"
                        >
                          {enregistrementProfil ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                        {erreurProfil && <p role="alert" className="text-xs text-red-700">{erreurProfil}</p>}
                        {succesProfil && <p role="status" className="text-xs text-emerald-700">{succesProfil}</p>}
                      </div>
                    </form>
                  </section>
                )}
              </div>
            )}
            {estGestionnaireRdv && (
            <div className="hidden items-center gap-3 border-r border-white/15 pr-4 sm:flex">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#7FD1CB]">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="text-left">
              <p className="text-sm font-display font-bold leading-tight text-white">{nomUtilisateur}</p>
              <p className="text-[11px] font-medium capitalize text-[#7FD1CB]">
                  {profil?.role?.replaceAll('_', ' ') || 'Patient'}
                </p>
              </div>
            </div>
            )}
            <button
              type="button"
              onClick={estGestionnaireRdv ? onDeconnexion : onBackToHome}
              title={estGestionnaireRdv ? 'Se déconnecter' : 'Retour aux services'}
              aria-label={estGestionnaireRdv ? 'Se déconnecter' : 'Retour aux services'}
              className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-3 transition-all duration-200 ${
                estGestionnaireRdv
                  ? 'border-red-200 bg-red-600 text-white hover:bg-red-700'
                  : 'border-white/15 bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {estGestionnaireRdv ? <LogOut className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
              <span className="hidden text-xs font-semibold sm:inline">
                {estGestionnaireRdv ? 'Déconnexion' : 'Retour aux services'}
              </span>
            </button>
          </div>
        </div>
        {estGestionnaireRdv && navigationPersonnelOuverte && (
          <nav
            id="navigation-personnel-mobile"
            aria-label={`Navigation ${estMedecin ? 'médecin' : 'secrétariat'}`}
            className="border-t border-white/10 bg-[#0A2233] px-4 py-3 shadow-lg lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {[
                { id: 'accueil', label: 'Accueil' },
                { id: 'rendez-vous', label: 'Rendez-vous' },
                { id: 'patient', label: 'Patient' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => naviguerPagePersonnel(id)}
                  aria-current={pagePersonnel === id ? 'page' : undefined}
                  className={`w-full rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                    pagePersonnel === id
                      ? 'bg-white/10 text-[#7FD1CB]'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto min-w-0 max-w-[1440px] space-y-6 px-3 py-5 sm:space-y-7 sm:px-7 sm:py-7 lg:px-10 lg:py-9">
        {estGestionnaireRdv ? (
          <>
            {pagePersonnel === 'accueil' && (
              <>
            <BandeauPage
              etiquette={`${estMedecin ? 'Espace médecin' : 'Secrétariat médical'} · ${serviceSecretaire}`}
              titre={`Bonjour, ${nomUtilisateur}.`}
              accent={estMedecin ? 'Votre planning du jour.' : 'Les demandes du jour.'}
              sousTitre="Suivez l’ordre de passage, confirmez les créneaux et gardez le planning du service à jour."
              actions={<><button type="button" className={BTN_CLAIR} onClick={() => naviguerPagePersonnel('rendez-vous')}><ClipboardList size={17} /> Voir les rendez-vous</button><button type="button" className={BTN_VERRE} onClick={() => naviguerPagePersonnel('patient')}><UserRound size={17} /> Annuaire patients</button></>}
              stats={[
                { libelle: 'Aujourd’hui', valeur: rendezVousAujourdhui.length },
                { libelle: 'En attente', valeur: nombreEnAttente },
                { libelle: 'En file', valeur: rendezVousEnFile.length },
                { libelle: 'À venir', valeur: rendezVousAVenir.length },
              ]}
            />

            {estGestionnaireRdv && (
              <section aria-labelledby="titre-statistiques-rdv" className="apparition space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#5B7480]">Vue d’ensemble</p>
                  <h2 id="titre-statistiques-rdv" className="mt-1 text-xl font-bold text-[#0A2233]">
                    Statistiques des rendez-vous
                  </h2>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <article className="apparition transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1F7A8C]/10 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="text-base font-bold text-[#0A2233]">Rendez-vous par statut</h3>
                    <p className="mt-1 text-xs text-slate-500">Répartition de tous les rendez-vous de votre service.</p>
                    {rendezVous.length ? (
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                        <div
                          className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
                          style={{ background: `conic-gradient(${gradientStatuts})` }}
                          role="img"
                          aria-label={`Répartition des ${rendezVous.length} rendez-vous selon leur statut`}
                        >
                          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                            <span className="text-2xl font-light tabular-nums text-[#0A2233]">{rendezVous.length}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">rendez-vous</span>
                          </div>
                        </div>
                        <div className="w-full max-w-56 space-y-3 text-sm">
                          {statistiquesStatuts.map((statut) => (
                            <p key={statut.label} className="flex items-center gap-2 font-semibold text-slate-700">
                              <span className={`h-3 w-3 shrink-0 rounded-full ${statut.couleur}`} />
                              <span>{statut.label}</span>
                              <span className="ml-auto font-bold tabular-nums text-[#0A2233]">{statut.valeur}</span>
                            </p>
                          ))}
                          <p className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                            Total : {rendezVous.length} rendez-vous
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-6 rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                        Aucune donnée à afficher pour le moment.
                      </p>
                    )}
                  </article>

                  <article className="apparition transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1F7A8C]/10 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="text-base font-bold text-[#0A2233]">Évolution mensuelle</h3>
                    <p className="mt-1 text-xs text-slate-500">Nombre de rendez-vous sur les six derniers mois.</p>
                    {rendezVous.length ? (
                      <div className="mt-4 max-h-56 space-y-4 overflow-y-auto pr-1" role="img" aria-label="Graphique de l'évolution mensuelle des rendez-vous sur six mois">
                        {statistiquesMensuelles.map((mois) => (
                          <div key={mois.cle}>
                            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                              <span className="truncate font-semibold capitalize text-slate-700">{mois.label}</span>
                              <span className="shrink-0 font-bold tabular-nums text-[#0A2233]">{mois.valeur}</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#1F7A8C] to-[#7FD1CB] transition-all"
                                style={{ width: `${(mois.valeur / maximumMensuel) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-6 rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                        Aucune donnée à afficher pour le moment.
                      </p>
                    )}
                  </article>
                </div>
              </section>
            )}

            <section aria-labelledby="titre-file-attente" className="apparition overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#5B7480]">Ordre de passage</p>
                  <h2 id="titre-file-attente" className="mt-1 text-lg font-bold">File d’attente du service</h2>
                </div>
                <span className="rounded-full bg-[#1F7A8C]/10 px-3 py-1 text-xs font-bold text-[#1F7A8C]">
                  {rendezVousEnFile.length} patient(s)
                </span>
              </div>
              {rendezVousEnFile.length ? (
                <ol className="divide-y divide-slate-100">
                  {rendezVousEnFile.map((rdv, positionFile) => {
                    const horaireConfirme = rdv.date_confirmee
                      && new Date(rdv.date_confirmee).getTime() !== new Date(rdv.date_souhaitee).getTime();
                    return (
                      <li key={rdv.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-light transition-transform ${positionFile === 0 ? 'scale-110 bg-[#0A2233] text-white shadow-lg shadow-[#0A2233]/30' : 'bg-[#1F7A8C]/10 text-[#1F7A8C]'}`}>
                            {rdv.numero_file}
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 truncate text-sm font-bold text-slate-800">{rdv.patient}{positionFile === 0 && <span className="rounded-full bg-[#7FD1CB]/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#0F3D52]">Prochain</span>}</p>
                            <p className="text-xs text-slate-500">
                              Créneau demandé : {formaterDateNotification(rdv.date_souhaitee)}
                            </p>
                            {horaireConfirme && (
                              <p className="text-xs font-semibold text-emerald-700">
                                Horaire confirmé : {formaterDateNotification(rdv.date_confirmee)}
                              </p>
                            )}
                          </div>
                        </div>
                        <StatutBadge statut={rdv.statutApi} libelle={rdv.statut} className="text-xs" />
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="px-5 py-6 text-center text-sm text-slate-500 sm:px-6">
                  Aucun patient actuellement dans la file d’attente.
                </p>
              )}
            </section>

            <section className="apparition space-y-4" aria-label="Calendrier des rendez-vous du service">
              {(estSecretaire || estMedecin) && (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                  <Calendar size={17} className="shrink-0 text-[#1F7A8C]" />
                  {`Sélectionnez une date dans le calendrier pour ajouter un créneau à ${serviceCalendrier?.nom || serviceSecretaire}.`}
                </div>
              )}
              {chargementCreneaux ? (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center text-sm text-slate-500">Chargement du calendrier médical…</div>
              ) : (
                <CalendrierCreneaux
                  creneaux={creneaux}
                  creneauSelectionne={creneauSelectionne}
                  onSelectionner={(creneau) => {
                    setCreneauSelectionneId((idActuel) => (
                      idActuel === creneau.id ? '' : creneau.id
                    ));
                    setQuotaJournalierModif(String(creneau.quota_journalier || 20));
                    if (estGestionnaireRdv) void chargerPatientsDisponibles();
                  }}
                  onDateSelectionnee={estSecretaire || estMedecin ? (date) => {
                    setErreur('');
                    void chargerPatientsDisponibles();
                    setDateFormulaireCreneau(date);
                    setNouveauCreneau({ heureDebut: '09:00', heureFin: '10:00', quota_journalier: '20', patient_id: '', motif: '' });
                    setFormulaireCreneauOuvert(true);
                    setModificationHorairesCreneau(null);
                  } : undefined}
                />
              )}
              {creneauSelectionne && (
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5B7480]">Créneau sélectionné</p>
                    <p className="mt-1 font-bold text-[#0A2233]">
                      {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(creneauSelectionne.date_heure))}
                      {' · '}
                      {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(creneauSelectionne.date_heure))}
                      {'–'}
                      {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(creneauSelectionne.date_fin))}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {creneauSelectionne.nombre_patients} patient(s) dans ce créneau · {creneauSelectionne.nombre_patients_jour}/{creneauSelectionne.quota_journalier || 'sans limite'} rendez-vous ce jour · {creneauSelectionne.est_ouvert ? 'Ouvert' : 'Fermé'}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#1F7A8C]">
                      Les rendez-vous de ce créneau sont affichés dans la liste ci-dessous.
                    </p>
                  </div>
                  {estGestionnaireRdv && (
                    <div className="flex flex-col gap-3">
                      <button type="button" onClick={() => { setErreur(''); setAjoutPatientOuvert(true); }} disabled={!creneauSelectionne.est_ouvert} className="h-10 self-start rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50"><UserPlus size={15} className="mr-1 inline" /> Ajouter un patient au créneau</button>
                      <button type="button" onClick={() => { setErreur(''); setModificationQuotaOuverte(true); }} className="h-10 self-start rounded-xl border border-[#1F7A8C]/25 px-4 text-xs font-bold text-[#1F7A8C]">Modifier le quota journalier</button>
                      <button
                        type="button"
                        disabled={enregistrement}
                        onClick={() => basculerOuvertureCreneau(creneauSelectionne)}
                        className={`h-10 rounded-xl border px-3 text-sm font-bold disabled:opacity-50 ${creneauSelectionne.est_ouvert ? 'border-red-200/80 bg-red-50 text-red-700 hover:bg-red-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                      >
                        {creneauSelectionne.est_ouvert ? 'Fermer les réservations' : 'Rouvrir le créneau'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {estGestionnaireRdv && creneauSelectionne && !modificationHorairesCreneau
                && new Date(creneauSelectionne.date_heure) > new Date() && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setErreur('');
                        setModificationHorairesCreneau({
                          dateHeure: versDateLocaleInput(creneauSelectionne.date_heure),
                          dateFin: versDateLocaleInput(creneauSelectionne.date_fin),
                        });
                      }}
                      className="h-10 rounded-xl border border-[#1F7A8C]/25 px-4 text-sm font-bold text-[#1F7A8C] hover:bg-[#1F7A8C]/5"
                    >
                      Modifier les horaires du créneau
                    </button>
                  </div>
                )}
            </section>

            {estGestionnaireRdv && creneauSelectionne && ajoutPatientOuvert && (
              <FenetreFormulaire
                titre="Ajouter un patient au créneau"
                description="Ajoutez un patient existant ou renseignez les coordonnées d’un nouveau patient sans compte."
                erreur={erreur}
                onFermer={() => setAjoutPatientOuvert(false)}
                largeur="max-w-2xl"
              >
                <form onSubmit={ajouterPatientAuCreneau} className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Type de patient
                    <select value={modePatientAffecte} onChange={(event) => setModePatientAffecte(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                      <option value="existant">Patient existant</option>
                      <option value="nouveau">Nouveau patient sans compte</option>
                    </select>
                  </label>
                  {modePatientAffecte === 'existant' ? (
                    <label className="block text-sm font-semibold text-slate-700">
                      Patient
                      <select required value={patientAffecteId} onChange={(event) => setPatientAffecteId(event.target.value)} disabled={chargementPatients || patients.length === 0} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100">
                        <option value="">{chargementPatients ? 'Chargement des patients…' : patients.length ? 'Choisir un patient…' : erreurPatients ? 'Liste des patients indisponible' : 'Aucun patient disponible'}</option>
                        {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.prenoms} {patient.nom} · {patient.telephone}</option>)}
                      </select>
                      {erreurPatients && <button type="button" onClick={() => void chargerPatientsDisponibles()} disabled={chargementPatients} className="mt-2 text-xs font-semibold text-[#1F7A8C] disabled:opacity-50">Réessayer de charger les patients</button>}
                    </label>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-semibold text-slate-700">Nom<input required value={nouveauPatientAffecte.nom} onChange={(event) => setNouveauPatientAffecte({ ...nouveauPatientAffecte, nom: event.target.value })} maxLength={100} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" /></label>
                      <label className="text-sm font-semibold text-slate-700">Prénoms<input required value={nouveauPatientAffecte.prenoms} onChange={(event) => setNouveauPatientAffecte({ ...nouveauPatientAffecte, prenoms: event.target.value })} maxLength={150} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" /></label>
                      <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Téléphone<input required value={nouveauPatientAffecte.telephone} onChange={(event) => setNouveauPatientAffecte({ ...nouveauPatientAffecte, telephone: event.target.value })} maxLength={20} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" /></label>
                    </div>
                  )}
                  <label className="block text-sm font-semibold text-slate-700">Motif du rendez-vous<textarea required value={motifFile} onChange={(event) => setMotifFile(event.target.value)} maxLength={2000} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
                  <div className="flex justify-end border-t border-slate-200 pt-4">
                    <button type="submit" disabled={enregistrement || !creneauSelectionne.est_ouvert || (modePatientAffecte === 'existant' && (chargementPatients || !patientAffecteId))} className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white disabled:opacity-50">
                      <UserPlus size={16} />{enregistrement ? 'Ajout…' : 'Ajouter au créneau'}
                    </button>
                  </div>
                </form>
              </FenetreFormulaire>
            )}

            {estGestionnaireRdv && creneauSelectionne && modificationQuotaOuverte && (
              <FenetreFormulaire titre="Modifier le quota journalier" description="Cette limite est commune aux créneaux du service pour la journée." erreur={erreur} onFermer={() => setModificationQuotaOuverte(false)} largeur="max-w-xl">
                <form onSubmit={modifierQuotaJournalier} className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Quota journalier du service
                    <input type="number" min="1" max="10000" required value={quotaJournalierModif} onChange={(event) => setQuotaJournalierModif(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" />
                  </label>
                  <div className="flex justify-end border-t border-slate-200 pt-4"><button type="submit" disabled={enregistrement} className="h-11 rounded-full bg-[#1F7A8C] px-5 text-sm font-bold text-white disabled:opacity-50">{enregistrement ? 'Enregistrement…' : 'Enregistrer le quota'}</button></div>
                </form>
              </FenetreFormulaire>
            )}

            {estGestionnaireRdv && modificationHorairesCreneau && creneauSelectionne && (
              <FenetreFormulaire titre="Modifier les horaires du créneau" description="Les horaires sont modifiables uniquement avant le début du créneau." erreur={erreur} onFermer={() => { if (!enregistrement) setModificationHorairesCreneau(null); }} largeur="max-w-2xl">
                <form onSubmit={enregistrerModificationHorairesCreneau} className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">Début du créneau<input required type="datetime-local" value={modificationHorairesCreneau.dateHeure} onChange={(event) => setModificationHorairesCreneau((precedent) => ({ ...precedent, dateHeure: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" /></label>
                  <label className="block text-sm font-semibold text-slate-700">Fin du créneau<input required type="datetime-local" value={modificationHorairesCreneau.dateFin} onChange={(event) => setModificationHorairesCreneau((precedent) => ({ ...precedent, dateFin: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" /></label>
                  <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                    <button type="button" disabled={enregistrement} onClick={() => setModificationHorairesCreneau(null)} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 disabled:opacity-50">Annuler</button>
                    <button type="submit" disabled={enregistrement} className="h-11 rounded-full bg-[#1F7A8C] px-5 text-sm font-bold text-white disabled:opacity-50">{enregistrement ? 'Enregistrement…' : 'Enregistrer les horaires'}</button>
                  </div>
                </form>
              </FenetreFormulaire>
            )}

            {estGestionnaireRdv && formulaireCreneauOuvert && (
              <FenetreFormulaire
                titre="Nouveau créneau médical"
                description={`${serviceCalendrier?.nom || 'Service'} · ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(`${dateFormulaireCreneau}T12:00:00`))}`}
                erreur={erreur}
                onFermer={() => { if (!enregistrement) setFormulaireCreneauOuvert(false); }}
                largeur="max-w-2xl"
              >
                  <form onSubmit={enregistrerCreneau} className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-700">
                        Heure de début
                        <input
                          required
                          type="time"
                          value={nouveauCreneau.heureDebut}
                          onChange={(event) => setNouveauCreneau({ ...nouveauCreneau, heureDebut: event.target.value })}
                          className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-[#1F7A8C]"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-700">
                        Heure de fermeture
                        <input
                          required
                          type="time"
                          min={nouveauCreneau.heureDebut}
                          value={nouveauCreneau.heureFin}
                          onChange={(event) => setNouveauCreneau({ ...nouveauCreneau, heureFin: event.target.value })}
                          className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-[#1F7A8C]"
                        />
                      </label>
                    </div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Quota journalier du service
                      <input
                        required
                        type="number"
                        min="1"
                        max="10000"
                        value={nouveauCreneau.quota_journalier}
                        onChange={(event) => setNouveauCreneau({ ...nouveauCreneau, quota_journalier: event.target.value })}
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-[#1F7A8C]"
                      />
                      <span className="mt-1 block text-xs font-normal text-slate-500">Limite commune aux créneaux de ce service pour cette journée.</span>
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      Ajouter un patient (facultatif)
                      <select
                        value={nouveauCreneau.patient_id}
                        onChange={(event) => setNouveauCreneau({ ...nouveauCreneau, patient_id: event.target.value })}
                        disabled={chargementPatients || patients.length === 0}
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-[#1F7A8C]"
                      >
                        <option value="">
                          {chargementPatients
                            ? 'Chargement des patients…'
                            : patients.length
                              ? 'Aucun patient'
                              : erreurPatients
                                ? 'Liste des patients indisponible'
                                : 'Aucun patient disponible'}
                        </option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>{patient.prenoms} {patient.nom} · {patient.telephone}</option>
                        ))}
                      </select>
                    </label>
                    {erreurPatients && (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <span>{erreurPatients}</span>
                        <button
                          type="button"
                          onClick={() => void chargerPatientsDisponibles()}
                          disabled={chargementPatients}
                          className="shrink-0 font-bold underline disabled:opacity-50"
                        >
                          Réessayer
                        </button>
                      </div>
                    )}
                    {nouveauCreneau.patient_id && (
                      <label className="block text-sm font-semibold text-slate-700">
                        Motif du rendez-vous
                        <input
                          required
                          value={nouveauCreneau.motif}
                          onChange={(event) => setNouveauCreneau({ ...nouveauCreneau, motif: event.target.value })}
                          maxLength={2000}
                          className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-[#1F7A8C]"
                        />
                      </label>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        disabled={enregistrement}
                        onClick={() => setFormulaireCreneauOuvert(false)}
                        className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={enregistrement || !serviceCalendrier?.id || nouveauCreneau.heureFin <= nouveauCreneau.heureDebut}
                        className="inline-flex h-11 items-center gap-2 rounded-full bg-[#1F7A8C] px-4 text-sm font-bold text-white hover:bg-[#186575] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus size={16} /> {enregistrement ? 'Enregistrement…' : 'Créer le créneau'}
                      </button>
                    </div>
                  </form>
              </FenetreFormulaire>
            )}
              </>
            )}

            {pagePersonnel === 'patient' && (
              <section aria-labelledby="titre-annuaire-patients" className="apparition scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#5B7480]">Patients du service</p>
                    <h2 id="titre-annuaire-patients" className="mt-1 text-lg font-bold">Liste des patients</h2>
                  </div>
                  <span className="rounded-full bg-[#1F7A8C]/10 px-3 py-1 text-xs font-bold text-[#1F7A8C]">
                    {patientsDuService.length} patient{patientsDuService.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="border-b border-slate-100 px-5 py-3 sm:px-6">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={rechercheAnnuairePatients}
                      onChange={(event) => setRechercheAnnuairePatients(event.target.value)}
                      placeholder="Rechercher un patient par nom ou téléphone…"
                      aria-label="Rechercher dans la liste des patients"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#1F7A8C]"
                    />
                  </label>
                </div>
                {chargement ? (
                  <p className="px-5 py-8 text-center text-sm text-slate-500 sm:px-6">Chargement des patients…</p>
                ) : patientsDuService.length ? (
                  <div className="divide-y divide-slate-100">
                    {patientsDuService.map((patient) => (
                      <article key={patient.patientId} className="apparition flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                        <div>
                          <h3 className="font-bold text-slate-800">{patient.patient}</h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {patient.telephone || 'Téléphone non renseigné'} · {patient.nombreRendezVous} rendez-vous
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="px-5 py-8 text-center text-sm text-slate-500 sm:px-6">
                    {rechercheAnnuairePatients
                      ? 'Aucun patient ne correspond à votre recherche.'
                      : 'Aucun patient associé aux rendez-vous de ce service.'}
                  </p>
                )}
              </section>
            )}

            {(pagePersonnel === 'accueil' || pagePersonnel === 'rendez-vous') && (
            <section aria-labelledby="titre-liste-demandes" className="apparition scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#5B7480]">
                    {pagePersonnel === 'accueil' ? (estMedecin ? 'Planning du jour' : 'Accueil') : 'Suivi des rendez-vous'}
                  </p>
                  <h2 id="titre-liste-demandes" className="mt-1 text-lg font-bold">
                    {pagePersonnel === 'accueil' ? "Rendez-vous aujourd'hui" : 'Rendez-vous du service'}
                  </h2>
                </div>
                <ClipboardList className="text-[#1F7A8C]" size={21} />
              </div>
              {pagePersonnel === 'rendez-vous' && (
                <div role="tablist" aria-label="Listes des rendez-vous" className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3 sm:px-6">
                  {[
                    { id: 'historique', titre: 'Historique de rendez-vous', nombre: rendezVousTermines.length },
                    { id: 'a-venir', titre: 'Rendez-vous à venir', nombre: rendezVousAVenir.length },
                  ].map((onglet) => (
                    <button
                      key={onglet.id}
                      type="button"
                      role="tab"
                      aria-selected={listeRendezVous === onglet.id}
                      onClick={() => setListeRendezVous(onglet.id)}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-bold transition ${
                        listeRendezVous === onglet.id
                          ? 'bg-[#1F7A8C] text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {onglet.titre}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                        listeRendezVous === onglet.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>{onglet.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3 sm:px-6">
                <label className="relative w-full min-w-0 flex-1 sm:min-w-56">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={recherchePatient}
                    onChange={(event) => setRecherchePatient(event.target.value)}
                    placeholder="Rechercher un patient, téléphone ou motif…"
                    aria-label="Rechercher un patient, un téléphone ou un motif"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#1F7A8C]"
                  />
                </label>
                {creneauSelectionneId && (
                  <button
                    type="button"
                    onClick={() => setCreneauSelectionneId('')}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#1F7A8C]/25 px-3 text-xs font-bold text-[#1F7A8C] hover:bg-[#1F7A8C]/5"
                  >
                    Retirer le filtre du créneau
                  </button>
                )}
              </div>
              {creneauSelectionneId && (
                <p className="border-b border-slate-100 bg-[#1F7A8C]/5 px-5 py-2 text-xs font-semibold text-[#1F7A8C] sm:px-6">
                  Filtre actif : {creneauSelectionne?.nombre_patients || 0} réservation(s) du créneau sélectionné.
                </p>
              )}
              {chargement ? (
                <p className="px-5 py-10 text-center text-sm text-slate-500 sm:px-6">Chargement des demandes…</p>
              ) : rendezVousAffiches.length ? (
                <div className="divide-y divide-slate-100">
                  {groupesRendezVous.map((groupe) => (
                    <article key={groupe.patientId} className="apparition px-5 py-4 sm:px-6">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-800">{groupe.patient}</h3>
                          <p className="mt-0.5 text-xs text-slate-500">{groupe.telephone}</p>
                        </div>
                        <span className="rounded-full bg-[#1F7A8C]/10 px-2.5 py-1 text-xs font-bold text-[#1F7A8C]">
                          {groupe.rendezVous.length} rendez-vous
                        </span>
                      </div>
                      <div className="space-y-3">
                        {groupe.rendezVous.map((rdv) => (
                    <article key={rdv.id} className="apparition transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1F7A8C]/10 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="mt-1 text-sm text-slate-600">{rdv.specialite} · {rdv.date} à {rdv.heure}</p>
                        {rdv.numero_file && (
                          <p className="mt-1 inline-flex rounded-full bg-[#1F7A8C]/10 px-2.5 py-1 text-xs font-bold text-[#1F7A8C]">
                            File d’attente · n° {rdv.numero_file}
                          </p>
                        )}
                        <p className="mt-2 text-sm text-slate-500">{rdv.motif}</p>
                      </div>
                      <div className="flex w-full min-w-0 flex-col items-start gap-2 sm:w-auto sm:min-w-[220px] sm:items-end">
                        <StatutBadge statut={rdv.statutApi} libelle={rdv.statut} className="text-xs" />
                        {rdv.statutApi === 'en_attente' && estMedecin && (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <input
                              type="datetime-local"
                              aria-label={`Horaire proposé par le médecin pour ${rdv.patient}`}
                              value={datesConfirmation[rdv.id] || versDateLocaleInput(rdv.date_souhaitee)}
                              onChange={(event) => setDatesConfirmation({ ...datesConfirmation, [rdv.id]: event.target.value })}
                              className="h-9 w-full max-w-full rounded-xl border border-slate-200 px-2 text-xs outline-none focus:border-[#1F7A8C] sm:w-auto"
                            />
                            <button
                              type="button"
                              disabled={enregistrement}
                              onClick={() => changerStatut(rdv, 'confirme', datesConfirmation[rdv.id] || versDateLocaleInput(rdv.date_souhaitee))}
                              className="inline-flex h-9 items-center gap-1 rounded-full bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 size={14} /> Confirmer
                            </button>
                            <button
                              type="button"
                              disabled={enregistrement}
                              onClick={() => changerStatut(rdv, 'refuse')}
                              className="inline-flex h-9 items-center gap-1 rounded-xl border border-red-200/80 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              <XCircle size={14} /> Refuser
                            </button>
                          </div>
                        )}
                        {rdv.statutApi === 'en_attente' && estSecretaire && (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <span className="text-xs text-slate-500">En attente de validation du médecin</span>
                            <button
                              type="button"
                              disabled={enregistrement}
                              onClick={() => changerStatut(rdv, 'refuse')}
                              className="inline-flex h-9 items-center gap-1 rounded-xl border border-red-200/80 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              <XCircle size={14} /> Refuser
                            </button>
                          </div>
                        )}
                        {rdv.statutApi === 'confirme' && estMedecin && (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <input
                              type="datetime-local"
                              aria-label={`Modifier le créneau de ${rdv.patient}`}
                              value={datesConfirmation[rdv.id] || versDateLocaleInput(rdv.date_confirmee)}
                              onChange={(event) => setDatesConfirmation({ ...datesConfirmation, [rdv.id]: event.target.value })}
                              className="h-9 w-full max-w-full rounded-xl border border-slate-200 px-2 text-xs outline-none focus:border-[#1F7A8C] sm:w-auto"
                            />
                            <button
                              type="button"
                              disabled={enregistrement}
                              onClick={() => changerStatut(rdv, 'confirme', datesConfirmation[rdv.id] || versDateLocaleInput(rdv.date_confirmee))}
                              className="inline-flex h-9 items-center gap-1 rounded-full bg-[#1F7A8C] px-3 text-xs font-bold text-white hover:bg-[#186575] disabled:opacity-50"
                            >
                              <Calendar size={14} /> Modifier le créneau
                            </button>
                          </div>
                        )}
                        {rdv.statutApi === 'confirme' && estSecretaire && (
                          <div className="flex flex-wrap justify-end gap-2">
                            <button type="button" disabled={enregistrement} onClick={() => changerStatut(rdv, 'arrive')} className="h-9 rounded-full bg-[#1F7A8C] px-3 text-xs font-bold text-white hover:bg-[#186575] disabled:opacity-50">Marquer arrivé</button>
                            <button type="button" disabled={enregistrement} onClick={() => changerStatut(rdv, 'absent')} className="h-9 rounded-xl border border-red-200/80 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50">Absent</button>
                          </div>
                        )}
                        {rdv.statutApi === 'arrive' && estSecretaire && (
                          <button type="button" disabled={enregistrement} onClick={() => changerStatut(rdv, 'termine')} className="h-9 rounded-full bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Terminer le rendez-vous</button>
                        )}
                      </div>
                    </article>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-12 text-center sm:px-6">
                  <ClipboardList className="mx-auto h-9 w-9 text-slate-300" />
                  <p className="mt-3 font-semibold text-slate-800">
                    {listeRendezVous === 'aujourdhui'
                      ? "Aucun rendez-vous aujourd'hui"
                      : listeRendezVous === 'historique'
                        ? 'Aucun rendez-vous terminé'
                        : 'Aucun rendez-vous à venir'}
                  </p>
                  <p className="mx-auto mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
                    {listeRendezVous === 'aujourdhui'
                      ? 'Les rendez-vous prévus aujourd’hui pour votre service apparaîtront ici.'
                      : listeRendezVous === 'historique'
                        ? 'Les rendez-vous au statut terminé apparaîtront ici.'
                        : 'Les rendez-vous confirmés et planifiés à une date future apparaîtront ici.'}
                  </p>
                </div>
              )}
            </section>
            )}
          </>
        ) : (
          <>
            {/* ───────── BIENVENUE ───────── */}
            <section className="apparition relative overflow-hidden rounded-[2rem] bg-[#0A2233] px-6 py-10 text-white sm:px-12 sm:py-14">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0A2233] via-[#0F3D52]/80 to-[#0A2233]" />
              <div className="absolute -left-20 -top-24 h-72 w-72 animate-pulse rounded-full bg-[#1F7A8C]/50 blur-[90px]" />
              <div className="absolute -bottom-28 right-0 h-72 w-72 animate-pulse rounded-full bg-[#7FD1CB]/30 blur-[90px]" />
              <div className="relative grid items-end gap-10 lg:grid-cols-[1.25fr_1fr]">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Espace patient · CENHOSOA</p>
                  <h2 className="mt-5 text-4xl font-light leading-[1.05] tracking-[-0.04em] text-white sm:text-6xl">
                    Bonjour, {prenomPatient}.<br /><span className="text-white/40">Prenons soin de vous.</span>
                  </h2>
                  <p className="mt-5 max-w-md text-sm font-light leading-relaxed text-white/70 sm:text-base">
                    Réservez un rendez-vous et suivez facilement vos demandes.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <a href="#reservation" className="group inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-[#0A2233] transition hover:bg-[#7FD1CB]">
                      <Calendar size={17} /> Réserver une consultation
                      <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </a>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
                  <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-[#7FD1CB]"><Clock size={14} /> Prochain rendez-vous</p>
                  {prochainRdv ? (
                    <>
                      <p className="mt-4 text-2xl font-light capitalize leading-tight">
                        {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dateDuRdv(prochainRdv))}
                      </p>
                      <p className="mt-1 text-white/70">à {prochainRdv.heure} · {prochainRdv.specialite}</p>
                      {prochainRdv.numero_file && <span className="mt-4 inline-flex rounded-full bg-[#7FD1CB] px-3 py-1 text-xs font-medium text-[#0A2233]">N° dans la file : {prochainRdv.numero_file}</span>}
                    </>
                  ) : (
                    <p className="mt-4 text-sm font-light leading-relaxed text-white/70">Aucun rendez-vous confirmé pour le moment. Choisissez un créneau ci-dessous pour commencer.</p>
                  )}
                  <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/15 pt-5 text-center">
                    {[['En cours', rendezVous.filter(rdvActif).length], ['Total', rendezVous.length]].map(([libelle, valeur]) => (
                      <div key={libelle}>
                        <dd className="text-3xl font-light tabular-nums"><Compteur valeur={valeur} /></dd>
                        <dt className="mt-1 text-[10px] uppercase tracking-widest text-white/50">{libelle}</dt>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </section>

            {/* ───────── ÉTAPES ───────── */}
            <ol id="reservation" aria-label="Étapes de réservation" className="apparition grid scroll-mt-28 grid-cols-3 gap-2 sm:gap-4">
              {[['Service', 'Choisissez le service'], ['Créneau', 'Sélectionnez un horaire'], ['Confirmation', 'Précisez le motif']].map(([titre, aide], index) => {
                const numero = index + 1;
                const fait = etapeReservation > numero;
                const actif = etapeReservation === numero;
                return (
                  <li key={titre} className={`flex items-center gap-3 rounded-2xl border p-3 transition-all duration-500 sm:p-4 ${actif ? 'border-[#1F7A8C] bg-white shadow-lg shadow-[#1F7A8C]/10' : fait ? 'border-[#1F7A8C]/30 bg-[#1F7A8C]/5' : 'border-slate-100 bg-white/60 opacity-70'}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm transition-colors ${fait ? 'bg-[#1F7A8C] text-white' : actif ? 'bg-[#0A2233] text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {fait ? <CheckCircle2 size={18} /> : numero}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-[#0A2233]">{titre}</span>
                      <span className="hidden truncate text-xs text-slate-500 sm:block">{aide}</span>
                    </span>
                  </li>
                );
              })}
            </ol>

            {/* ───────── SERVICE + CALENDRIER ───────── */}
            <section className="apparition space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#5B7480]">Consultations hospitalières</p>
                <h2 className="mt-1 text-2xl sm:text-3xl">Choisir un créneau de consultation</h2>
                <p className="mt-1 text-sm font-light text-slate-500">Choisissez un service, puis un créneau ouvert pour réserver votre place dans la file.</p>
              </div>
              {serviceInitial ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#0A2233] px-5 py-2.5 text-sm text-white shadow-lg shadow-[#0A2233]/20">
                  <Stethoscope size={16} className="text-[#7FD1CB]" /> {serviceInitial.nom}
                </span>
              ) : (
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="group" aria-label="Service hospitalier">
                  {servicesDisponibles.map((service) => {
                    const actif = nouveauRdv.service_id === service.id;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        aria-pressed={actif}
                        onClick={() => {
                          setNouveauRdv({ ...nouveauRdv, service_id: service.id });
                          setCreneauSelectionneId('');
                        }}
                        className={`shrink-0 whitespace-nowrap rounded-full border px-5 py-2.5 text-sm transition-all duration-300 ${actif ? 'border-[#0A2233] bg-[#0A2233] text-white shadow-lg shadow-[#0A2233]/20' : 'border-black/10 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-[#1F7A8C] hover:text-[#1F7A8C]'}`}
                      >
                        {service.nom}
                      </button>
                    );
                  })}
                  {!servicesDisponibles.length && <p className="text-sm text-slate-500">Aucun service disponible pour le moment.</p>}
                </div>
              )}
            </section>

            {serviceCalendrier?.id ? (
              chargementCreneaux ? (
                <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-6" aria-busy="true">
                  <div className="h-6 w-48 animate-pulse rounded-full bg-[#EAF1F1]" />
                  <div className="grid grid-cols-6 gap-2">{[...Array(18)].map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-[#F4F2EE]" />)}</div>
                </div>
              ) : (
                <CalendrierCreneaux
                  creneaux={creneaux}
                  creneauSelectionne={creneauSelectionne}
                  patientMode
                  onSelectionner={(creneau) => setCreneauSelectionneId(creneau.id)}
                />
              )
            ) : (
              <div className="rounded-3xl border border-dashed border-[#1F7A8C]/30 bg-white/60 p-10 text-center">
                <Stethoscope className="mx-auto h-9 w-9 text-[#1F7A8C]/50" strokeWidth={1.5} />
                <p className="mt-3 text-sm font-light text-slate-600">Sélectionnez un service pour afficher son calendrier.</p>
              </div>
            )}

            {/* ───────── RÉSERVATION + MES RENDEZ-VOUS ───────── */}
            <div className="grid min-w-0 grid-cols-1 items-start gap-5 sm:gap-6 xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.4fr)]">
              <section aria-labelledby="titre-formulaire-rdv" className="apparition relative overflow-hidden rounded-3xl bg-[#0A2233] p-6 text-white shadow-xl shadow-[#0A2233]/20 sm:p-7 xl:sticky xl:top-28">
                <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#1F7A8C]/50 blur-[70px]" />
                <div className="relative">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-[#7FD1CB]">Nouvelle demande</p>
                  <h2 id="titre-formulaire-rdv" className="mt-1 text-2xl text-white">Votre réservation</h2>
                  <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div className={`rounded-2xl border p-4 transition-all duration-500 ${creneauSelectionne ? 'border-[#7FD1CB]/50 bg-white/10' : 'border-dashed border-white/20 bg-white/5'}`}>
                      {creneauSelectionne ? (
                        <>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-[#7FD1CB]">Créneau choisi{serviceCalendrier?.nom ? ` · ${serviceCalendrier.nom}` : ''}</p>
                          <p className="mt-1 text-2xl font-light capitalize leading-tight">
                            {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(creneauSelectionne.date_heure))}
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-sm text-white/70">
                            <Clock size={15} /> {formatHeure(creneauSelectionne.date_heure)}{creneauSelectionne.date_fin && ` – ${formatHeure(creneauSelectionne.date_fin)}`}
                          </p>
                        </>
                      ) : (
                        <p className="flex items-center gap-3 text-sm font-light text-white/60"><Calendar size={18} /> Sélectionnez un créneau ouvert dans le calendrier.</p>
                      )}
                    </div>
                    <label className="block text-sm text-white/80">
                      Motif de consultation
                      <textarea
                        required
                        maxLength={2000}
                        rows={4}
                        value={nouveauRdv.motif}
                        onChange={(event) => setNouveauRdv({ ...nouveauRdv, motif: event.target.value })}
                        placeholder="Décrivez brièvement le motif de votre demande"
                        className="mt-2 w-full resize-y rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-light text-white outline-none transition placeholder:text-white/40 focus:border-[#7FD1CB] focus:ring-4 focus:ring-[#7FD1CB]/10"
                      />
                      <span className="mt-1 block text-right text-[11px] text-white/40">{nouveauRdv.motif.length}/2000</span>
                    </label>
                    <button
                      type="submit"
                      disabled={enregistrement || chargement || chargementCreneaux || !creneauSelectionne || !creneauSelectionne.est_ouvert}
                      className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#7FD1CB] px-4 text-sm font-medium text-[#0A2233] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#7FD1CB]/30 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus size={17} className="transition-transform group-hover:rotate-90" />
                      {enregistrement ? 'Réservation…' : 'Réserver ce créneau'}
                    </button>
                    <p className="text-center text-xs font-light text-white/50">Vous pourrez annuler depuis « Mes rendez-vous ».</p>
                  </form>
                </div>
              </section>

              <section aria-labelledby="titre-mes-rdv" className="apparition overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-[#5B7480]">Suivi personnel</p>
                    <h2 id="titre-mes-rdv" className="mt-1 text-2xl">Mes rendez-vous</h2>
                  </div>
                  <div role="tablist" aria-label="Filtrer mes rendez-vous" className="inline-flex rounded-full bg-[#F4F2EE] p-1">
                    {[['a_venir', 'En cours'], ['passes', 'Historique'], ['tous', 'Tous']].map(([valeur, libelle]) => (
                      <button
                        key={valeur}
                        type="button"
                        role="tab"
                        aria-selected={filtreMesRdv === valeur}
                        onClick={() => setFiltreMesRdv(valeur)}
                        className={`rounded-full px-4 py-1.5 text-xs transition-all duration-300 ${filtreMesRdv === valeur ? 'bg-[#0A2233] text-white shadow-md' : 'text-slate-600 hover:text-[#0A2233]'}`}
                      >
                        {libelle}
                      </button>
                    ))}
                  </div>
                </div>
                {chargement ? (
                  <div className="space-y-3 p-6" aria-busy="true">{[...Array(3)].map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-[#F4F2EE]" />)}</div>
                ) : mesRdvFiltres.length ? (
                  <div className="divide-y divide-slate-100">
                    {mesRdvFiltres.map((rdv) => (
                      <CarteRendezVous
                        key={rdv.id}
                        rendezVous={rdv}
                        date={dateDuRdv(rdv)}
                        actif={rdvActif(rdv)}
                        enregistrement={enregistrement}
                        onAnnuler={() => changerStatut(rdv, 'annule')}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-14 text-center sm:px-6">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1F7A8C]/10 text-[#1F7A8C]"><Calendar size={24} strokeWidth={1.5} /></div>
                    <p className="mt-4 text-lg font-light text-[#0A2233]">{rendezVous.length ? 'Rien dans cette liste' : 'Aucune demande pour le moment'}</p>
                    <p className="mt-1 text-sm font-light text-slate-500">{rendezVous.length ? 'Changez de filtre pour voir vos autres rendez-vous.' : 'Vos demandes de consultation apparaîtront ici.'}</p>
                    {rendezVous.length
                      ? <button type="button" onClick={() => setFiltreMesRdv('tous')} className="mt-5 rounded-full border border-[#0A2233]/20 px-5 py-2 text-sm text-[#0A2233] transition hover:bg-[#0A2233] hover:text-white">Tout afficher</button>
                      : <a href="#reservation" className="mt-5 inline-flex rounded-full bg-[#0A2233] px-5 py-2.5 text-sm text-white transition hover:bg-[#0F3D52]">Choisir un créneau</a>}
                  </div>
                )}
              </section>
            </div>
            {/* ───────── DOSSIER MÉDICAL ───────── */}
          </>
        )}
        {erreur && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />{erreur}
          </div>
        )}
        {succes && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{succes}</div>}
      </main>
    </div>
  );
}
