import { Platform } from 'react-native';
import { lireAccessToken, lireRefreshToken, enregistrerTokens, supprimerTokens } from './storage';

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL
  || (Platform.OS === 'android' ? 'http://10.0.2.2:8000/api/v1' : 'http://localhost:8000/api/v1')
).replace(/\/+$/, '');

let rafraichissementEnCours;

async function decoderReponse(response) {
  if (response.status === 204) return null;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).filter(Boolean).join(' · ')
      : typeof detail === 'string' ? detail : `Erreur serveur (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return body;
}

async function rafraichirTokens() {
  if (!rafraichissementEnCours) {
    rafraichissementEnCours = (async () => {
      const refreshToken = await lireRefreshToken();
      if (!refreshToken) return null;
      const response = await fetch(`${API_URL}/auth/rafraichir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) {
        await supprimerTokens();
        return null;
      }
      const tokens = await response.json();
      await enregistrerTokens(tokens);
      return tokens.access_token;
    })().finally(() => {
      rafraichissementEnCours = null;
    });
  }
  return rafraichissementEnCours;
}

export async function api(path, options = {}) {
  const { auth = true, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers || {});
  if (requestOptions.body && !(requestOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (auth) {
    const token = await lireAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const execute = () => fetch(`${API_URL}${path}`, { ...requestOptions, headers });
  let response = await execute();
  if (response.status === 401 && auth && !path.startsWith('/auth/')) {
    const newToken = await rafraichirTokens();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await execute();
    }
  }
  return decoderReponse(response);
}

export const connexion = (identifiant, motDePasse) => api('/auth/connexion', {
  method: 'POST',
  auth: false,
  body: JSON.stringify({ identifiant, mot_de_passe: motDePasse }),
});
export const inscription = (donnees) => api('/auth/inscription-patient', {
  method: 'POST', auth: false, body: JSON.stringify(donnees),
});
export const profilCourant = () => api('/auth/moi');
export const services = () => api('/services', { auth: false });
export const rendezVous = () => api('/rendez-vous');
export const creneaux = (serviceId) => api(`/rendez-vous/creneaux${serviceId ? `?service_id=${encodeURIComponent(serviceId)}` : ''}`);
export const reserverCreneau = (id, motif) => api(`/rendez-vous/creneaux/${id}/reservations`, {
  method: 'POST', body: JSON.stringify({ motif }),
});
export const creerCreneau = (donnees) => api('/rendez-vous/creneaux', {
  method: 'POST', body: JSON.stringify(donnees),
});
export const patientsRendezVous = () => api('/rendez-vous/patients');
export const creerConsultation = (rendezVousId, donnees) => api(`/dossiers-medicaux/rendez-vous/${rendezVousId}/consultations`, {
  method: 'POST', body: JSON.stringify(donnees),
});
export const creerRendezVous = (donnees) => api('/rendez-vous', {
  method: 'POST', body: JSON.stringify(donnees),
});
export const modifierRendezVous = (id, donnees) => api(`/rendez-vous/${id}`, {
  method: 'PATCH', body: JSON.stringify(donnees),
});
export const lits = () => api('/lits');
export const occuperLit = (id, donnees) => api(`/lits/${id}/occuper`, {
  method: 'POST', body: JSON.stringify(donnees),
});
export const libererLit = (id) => api(`/lits/${id}/liberer`, { method: 'POST' });
export const ambulanceDisponibles = () => api('/ambulances/public/ambulances-disponibles', { auth: false });
export const litsUrgenceDisponibles = () => api('/ambulances/public/lits-urgence-disponibles', { auth: false });
export const flotteAmbulances = () => api('/ambulances');
export const simulerTrajet = (destination) => api('/ambulances/public/simuler-trajet', {
  method: 'POST', auth: false, body: JSON.stringify({ destination }),
});
export const missionAmbulanceInvite = (donnees) => api('/ambulances/public/missions', {
  method: 'POST', auth: false, body: JSON.stringify(donnees),
});
export const missionUrgenteInvite = (donnees) => api('/ambulances/public/missions/urgence', {
  method: 'POST', auth: false, body: JSON.stringify(donnees),
});
export const missionAmbulancePatient = (donnees) => api('/ambulances/missions/patient', {
  method: 'POST', body: JSON.stringify(donnees),
});
export const missionUrgentePatient = (donnees) => api('/ambulances/missions/patient/urgence', {
  method: 'POST', body: JSON.stringify(donnees),
});
export const completerMissionInvite = (missionId, jeton, donnees) => api(`/ambulances/public/missions/${missionId}/completer`, {
  method: 'PATCH',
  auth: false,
  headers: { 'X-Suivi-Ambulance': jeton },
  body: JSON.stringify(donnees),
});
export const suivreMissionInvite = (missionId, jeton) => api(`/ambulances/public/missions/${missionId}/suivi`, {
  auth: false,
  headers: { 'X-Suivi-Ambulance': jeton },
});
export const missionsAmbulances = () => api('/ambulances/missions');
export const demandesAmbulance = () => api('/ambulances/missions/demandes-en-attente');
export const confirmerMissionAmbulance = (id, ambulanceId) => api(`/ambulances/missions/${id}/confirmer`, {
  method: 'POST', body: JSON.stringify({ ambulance_id: ambulanceId }),
});
export const annulerMissionAmbulance = (id) => api(`/ambulances/missions/${id}/annuler`, { method: 'POST' });
export const transitionMissionAmbulance = (id, statut, litId = null) => api(`/ambulances/missions/${id}/transition`, {
  method: 'POST', body: JSON.stringify({ statut, lit_id: litId }),
});
export const missionsAmbulancesPatient = () => api('/ambulances/missions/moi');
export const utilisateurs = () => api('/utilisateurs');
export const litsUrgence = () => api('/ambulances/lits-urgence-disponibles');
export const statistiquesRendezVous = () => api('/rendez-vous/statistiques');
export const dossiersMedicaux = (patientId) => api(`/dossiers-medicaux/patients/${patientId}`);
export const dossierComplet = (patientId) => api(`/dossiers-medicaux/patients/${patientId}/complet`);
export const creerComptePersonnel = (donnees) => api('/utilisateurs/personnel', {
  method: 'POST', body: JSON.stringify(donnees),
});
export const modifierStatutCompte = (id, estActif) => api(`/utilisateurs/${id}/statut`, {
  method: 'PATCH', body: JSON.stringify({ est_actif: estActif }),
});
export const modifierProfilPatient = (donnees) => api('/auth/profil-patient', {
  method: 'PUT', body: JSON.stringify(donnees),
});
export { lireAccessToken, enregistrerTokens, supprimerTokens };
