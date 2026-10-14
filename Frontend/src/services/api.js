const URL_BASE_API = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
let requeteRafraichissement = null;

export function obtenirUrlTempsReel() {
  const url = new URL(URL_BASE_API, window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/temps-reel`;
  return url.toString();
}

export function obtenirTokenStocke(nom = "access_token") {
  return localStorage.getItem(nom) || sessionStorage.getItem(nom);
}

export function enregistrerTokens(tokens, seSouvenirDeMoi) {
  const stockage = seSouvenirDeMoi ? localStorage : sessionStorage;
  const autreStockage = seSouvenirDeMoi ? sessionStorage : localStorage;
  autreStockage.removeItem("access_token");
  autreStockage.removeItem("refresh_token");
  stockage.setItem("access_token", tokens.access_token);
  stockage.setItem("refresh_token", tokens.refresh_token);
}

export function effacerTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");
}

async function requeteApi(chemin, options = {}) {
  const envoyerRequete = (entetes = options.headers || {}) => {
    const corpsFormulaire = options.body instanceof FormData;
    return fetch(`${URL_BASE_API}${chemin}`, {
      ...options,
      headers: {
        ...(!corpsFormulaire && { "Content-Type": "application/json" }),
        ...entetes,
      },
    });
  };

  let reponse = await envoyerRequete();
  const autorisation = options.headers?.Authorization;
  const routeAuthentification = chemin.startsWith("/auth/connexion")
    || chemin.startsWith("/auth/inscription-patient")
    || chemin.startsWith("/auth/rafraichir");

  if (reponse.status === 401 && autorisation && !routeAuthentification) {
    const tokenInitial = autorisation.replace(/^Bearer\s+/i, "");
    let accessToken = obtenirTokenStocke("access_token");
    if (!accessToken || accessToken === tokenInitial) {
      if (!requeteRafraichissement) {
        requeteRafraichissement = (async () => {
          const refreshTokenLocal = localStorage.getItem("refresh_token");
          const refreshTokenSession = sessionStorage.getItem("refresh_token");
          const refreshToken = refreshTokenLocal || refreshTokenSession;
          if (!refreshToken) {
            effacerTokens();
            window.dispatchEvent(new Event("session-expiree"));
            return null;
          }

          const reponseRafraichissement = await fetch(`${URL_BASE_API}/auth/rafraichir`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          const tokens = await reponseRafraichissement.json().catch(() => null);
          if (!reponseRafraichissement.ok || !tokens?.access_token || !tokens?.refresh_token) {
            effacerTokens();
            window.dispatchEvent(new Event("session-expiree"));
            return null;
          }

          enregistrerTokens(tokens, Boolean(refreshTokenLocal));
          return tokens.access_token;
        })().finally(() => {
          requeteRafraichissement = null;
        });
      }
      accessToken = await requeteRafraichissement;
    }

    if (accessToken) {
      reponse = await envoyerRequete({
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      });
    }
  }

  const donnees = await reponse.json().catch(() => null);

  if (!reponse.ok) {
    const detail = donnees?.detail;
    const message = Array.isArray(detail)
      ? detail.map((erreur) => {
        const champ = Array.isArray(erreur.loc) ? erreur.loc.slice(1).join(".") : "";
        return [champ, erreur.msg].filter(Boolean).join(": ");
      }).join(" · ") || "Les données envoyées sont invalides."
      : typeof detail === "string" ? detail : "Une erreur est survenue.";
    const erreur = new Error(message);
    erreur.status = reponse.status;
    throw erreur;
  }

  return donnees;
}

function enTeteAuth(token) {
  return { Authorization: `Bearer ${token}` };
}

export function inscrirePatient(donnees) {
  return requeteApi("/auth/inscription-patient", {
    method: "POST",
    body: JSON.stringify(donnees),
  });
}

export function seConnecter(identifiant, motDePasse) {
  return requeteApi("/auth/connexion", {
    method: "POST",
    body: JSON.stringify({ identifiant, mot_de_passe: motDePasse }),
  });
}

export function obtenirProfil(accessToken) {
  return requeteApi("/auth/moi", {
    headers: enTeteAuth(accessToken),
  });
}

export function modifierProfilPatient(token, donnees) {
  return requeteApi("/auth/profil-patient", {
    method: "PUT",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function modifierPhotoProfilPatient(token, photo) {
  const formulaire = new FormData();
  formulaire.append("photo", photo);
  return requeteApi("/auth/profil-patient/photo", {
    method: "PUT",
    headers: enTeteAuth(token),
    body: formulaire,
  });
}

export async function obtenirPhotoProfilPatient(token, patientId) {
  const reponse = await fetch(`${URL_BASE_API}/auth/patients/${patientId}/photo`, {
    headers: enTeteAuth(token),
  });
  if (reponse.status === 404) return null;
  if (!reponse.ok) {
    const donnees = await reponse.json().catch(() => null);
    const erreur = new Error(donnees?.detail || "Impossible de charger la photo du patient.");
    erreur.status = reponse.status;
    throw erreur;
  }
  return reponse.blob();
}

export function supprimerPhotoProfilPatient(token) {
  return requeteApi("/auth/profil-patient/photo", {
    method: "DELETE",
    headers: enTeteAuth(token),
  });
}

export function modifierMotDePasse(token, donnees) {
  return requeteApi("/auth/mot-de-passe", {
    method: "PUT",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function listerServices() {
  return requeteApi("/services");
}

export function listerTousServices(token) {
  return requeteApi("/services/admin/tous", { headers: enTeteAuth(token) });
}

export function creerService(token, donnees) {
  return requeteApi("/services", {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function modifierService(token, serviceId, donnees) {
  return requeteApi(`/services/${serviceId}`, {
    method: "PUT",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function televerserPhotoResponsableService(token, serviceId, fichier) {
  const formulaire = new FormData();
  formulaire.append("fichier", fichier);
  return requeteApi(`/services/${serviceId}/photo-responsable`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: formulaire,
  });
}

export function supprimerService(token, serviceId) {
  return requeteApi(`/services/${serviceId}`, {
    method: "DELETE",
    headers: enTeteAuth(token),
  });
}

export function obtenirInfosCentre() {
  return requeteApi("/informations-centre");
}

export function listerRendezVous(token) {
  return requeteApi("/rendez-vous", { headers: enTeteAuth(token) });
}

export function obtenirStatistiquesRendezVous(token) {
  return requeteApi("/rendez-vous/statistiques", { headers: enTeteAuth(token) });
}

export function creerRendezVous(token, donnees) {
  return requeteApi("/rendez-vous", {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function modifierRendezVous(token, rendezVousId, donnees) {
  return requeteApi(`/rendez-vous/${rendezVousId}`, {
    method: "PATCH",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function marquerNotificationRendezVousLue(token, rendezVousId) {
  return requeteApi(`/rendez-vous/${rendezVousId}/notification-lue`, {
    method: "POST",
    headers: enTeteAuth(token),
  });
}

export function listerCreneaux(token, serviceId) {
  const filtreService = serviceId ? `?service_id=${encodeURIComponent(serviceId)}` : "";
  return requeteApi(`/rendez-vous/creneaux${filtreService}`, { headers: enTeteAuth(token) });
}

export function creerCreneau(token, donnees) {
  return requeteApi("/rendez-vous/creneaux", {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function modifierCreneau(token, creneauId, modifications) {
  return requeteApi(`/rendez-vous/creneaux/${creneauId}`, {
    method: "PATCH",
    headers: enTeteAuth(token),
    body: JSON.stringify(modifications),
  });
}

export function reserverCreneau(token, creneauId, motif) {
  return requeteApi(`/rendez-vous/creneaux/${creneauId}/reservations`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify({ motif }),
  });
}

export function ajouterPatientCreneau(token, creneauId, donnees) {
  return requeteApi(`/rendez-vous/creneaux/${creneauId}/patients`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function listerPatientsPourCreneau(token) {
  return requeteApi("/rendez-vous/patients", { headers: enTeteAuth(token) });
}

export function obtenirDossierMedical(token, patientId) {
  return requeteApi(`/dossiers-medicaux/patients/${patientId}`, {
    headers: enTeteAuth(token),
  });
}

export function obtenirDossierCompletPatient(token, patientId) {
  return requeteApi(`/dossiers-medicaux/patients/${patientId}/complet`, {
    headers: enTeteAuth(token),
  });
}

export function creerConsultation(token, rendezVousId, donnees) {
  return requeteApi(`/dossiers-medicaux/rendez-vous/${rendezVousId}/consultations`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function listerLits(token) {
  return requeteApi("/lits", { headers: enTeteAuth(token) });
}

export function obtenirResumeLits(token) {
  return requeteApi("/lits/resume", { headers: enTeteAuth(token) });
}

export function creerCategorieLit(token, donnees) {
  return requeteApi("/lits/categories", {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function creerLit(token, donnees) {
  return requeteApi("/lits", {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function occuperLit(token, litId, donnees) {
  return requeteApi(`/lits/${litId}/occuper`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function admettreUrgenceVitale(token, litId, donnees = {}) {
  return requeteApi(`/lits/${litId}/urgence-vitale`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function completerIdentiteLit(token, litId, donnees) {
  return requeteApi(`/lits/${litId}/identite`, {
    method: "PATCH",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function reserverTransfertLit(token, litSourceId, donnees) {
  return requeteApi(`/lits/${litSourceId}/reserver-transfert`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function confirmerTransfertLit(token, litDestinationId, litSourceId) {
  return requeteApi(`/lits/${litDestinationId}/confirmer-transfert`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify({ lit_source_id: litSourceId }),
  });
}

export function annulerReservationTransfertLit(token, litDestinationId, litSourceId) {
  return requeteApi(`/lits/${litDestinationId}/annuler-reservation`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify({ lit_source_id: litSourceId }),
  });
}

export function libererLit(token, litId) {
  return requeteApi(`/lits/${litId}/liberer`, {
    method: "POST",
    headers: enTeteAuth(token),
  });
}

// ---------- Ambulances ----------

export function listerAmbulances(token) {
  if (!token) return requeteApi("/ambulances/public/ambulances-disponibles");
  return requeteApi("/ambulances", { headers: enTeteAuth(token) });
}

export function creerAmbulance(token, donnees) {
  return requeteApi("/ambulances", {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function supprimerAmbulance(token, ambulanceId) {
  return requeteApi(`/ambulances/${ambulanceId}`, {
    method: "DELETE",
    headers: enTeteAuth(token),
  });
}

export function listerMissionsAmbulances(token) {
  return requeteApi("/ambulances/missions", { headers: enTeteAuth(token) });
}

export function listerDemandesAmbulanceEnAttente(token) {
  return requeteApi("/ambulances/missions/demandes-en-attente", { headers: enTeteAuth(token) });
}

export function confirmerDemandeAmbulance(token, missionId, ambulanceId) {
  return requeteApi(`/ambulances/missions/${missionId}/confirmer`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify({ ambulance_id: ambulanceId }),
  });
}

export function listerPatientsPourRattachementAmbulance(token) {
  return requeteApi("/ambulances/patients-pour-rattachement", { headers: enTeteAuth(token) });
}

export function rattacherMissionAmbulanceAuPatient(token, missionId, patientId) {
  return requeteApi(`/ambulances/missions/${missionId}/rattacher-patient`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify({
      patient_id: patientId,
      identite_verifiee: true,
    }),
  });
}

export function listerUtilisateurs(token) {
  return requeteApi("/utilisateurs", { headers: enTeteAuth(token) });
}

export function supprimerComptePersonnel(token, utilisateurId) {
  return requeteApi(`/utilisateurs/${utilisateurId}`, {
    method: "DELETE",
    headers: enTeteAuth(token),
  });
}

export function creerComptePersonnel(token, donnees) {
  return requeteApi("/utilisateurs/personnel", {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function modifierStatutCompte(token, utilisateurId, estActif) {
  return requeteApi(`/utilisateurs/${utilisateurId}/statut`, {
    method: "PATCH",
    headers: enTeteAuth(token),
    body: JSON.stringify({ est_actif: estActif }),
  });
}

export function reinitialiserMotDePassePersonnel(token, utilisateurId, nouveauMotDePasse) {
  return requeteApi(`/utilisateurs/${utilisateurId}/mot-de-passe`, {
    method: "PUT",
    headers: enTeteAuth(token),
    body: JSON.stringify({ nouveau_mot_de_passe: nouveauMotDePasse }),
  });
}

export function listerLitsUrgenceDisponibles(token) {
  if (!token) return requeteApi("/ambulances/public/lits-urgence-disponibles");
  return requeteApi("/ambulances/lits-urgence-disponibles", { headers: enTeteAuth(token) });
}

export function listerLieuxTana(token) {
  if (!token) return requeteApi("/ambulances/public/lieux-tana");
  return requeteApi("/ambulances/lieux-tana", { headers: enTeteAuth(token) });
}

export function simulerTrajetAmbulance(token, destination, lieu = null) {
  return requeteApi(token ? "/ambulances/simuler-trajet" : "/ambulances/public/simuler-trajet", {
    method: "POST",
    headers: token ? enTeteAuth(token) : {},
    body: JSON.stringify({
      destination,
      ...(lieu && {
        latitude_destination: lieu.latitude,
        longitude_destination: lieu.longitude,
      }),
    }),
  });
}

export function creerMissionAmbulance(token, donnees) {
  if (!token) {
    return requeteApi("/ambulances/public/missions", {
      method: "POST",
      body: JSON.stringify(donnees),
    });
  }
  return requeteApi("/ambulances/missions", {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function creerMissionAmbulancePatient(token, donnees) {
  return requeteApi("/ambulances/missions/patient", {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function creerMissionAmbulanceUrgente(token, donnees) {
  if (!token) {
    return requeteApi("/ambulances/public/missions/urgence", {
      method: "POST",
      body: JSON.stringify(donnees),
    });
  }
  return requeteApi("/ambulances/missions/patient/urgence", {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify(donnees),
  });
}

export function listerMissionsAmbulancePatient(token) {
  return requeteApi("/ambulances/missions/moi", { headers: enTeteAuth(token) });
}

export function suivreMissionAmbulanceInvite(missionId, jeton) {
  return requeteApi(`/ambulances/public/missions/${missionId}/suivi`, {
    headers: { "X-Suivi-Ambulance": jeton },
  });
}

export function completerMissionAmbulanceInvite(missionId, jeton, donnees) {
  return requeteApi(`/ambulances/public/missions/${missionId}/completer`, {
    method: "PATCH",
    headers: { "X-Suivi-Ambulance": jeton },
    body: JSON.stringify(donnees),
  });
}

export function enregistrerArriveeAmbulance(token, missionId) {
  return requeteApi(`/ambulances/missions/${missionId}/arrivee`, {
    method: "POST",
    headers: enTeteAuth(token),
  });
}

export function enregistrerPriseEnChargeAmbulance(token, missionId, minutesSurPlace) {
  return requeteApi(`/ambulances/missions/${missionId}/prise-en-charge`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify({ minutes_sur_place: minutesSurPlace }),
  });
}

export function terminerMissionAmbulance(token, missionId, minutesSurPlace, litId = null) {
  return requeteApi(`/ambulances/missions/${missionId}/terminer`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify({ minutes_sur_place: minutesSurPlace, lit_id: litId }),
  });
}

export function transitionnerMissionAmbulance(token, missionId, statut, litId = null) {
  return requeteApi(`/ambulances/missions/${missionId}/transition`, {
    method: "POST",
    headers: enTeteAuth(token),
    body: JSON.stringify({ statut, lit_id: litId }),
  });
}

export function listerCourses(token) {
  return listerMissionsAmbulances(token);
}

export function demanderCourse(token, donnees) {
  return creerMissionAmbulance(token, donnees);
}

export function marquerArriveeSurLieux(token, courseId) {
  return enregistrerArriveeAmbulance(token, courseId);
}

export function terminerCourse(token, courseId, minutesSurPlace, litId = null) {
  return terminerMissionAmbulance(token, courseId, minutesSurPlace, litId);
}

export function annulerCourse(token, courseId) {
  return requeteApi(`/ambulances/missions/${courseId}/annuler`, {
    method: "POST",
    headers: enTeteAuth(token),
  });
}