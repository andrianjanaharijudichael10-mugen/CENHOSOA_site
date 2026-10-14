import { obtenirUrlTempsReel } from './api';

export const EVENEMENT_DONNEES_MODIFIEES = 'cenhosoa:donnees-modifiees';

export function demarrerConnexionTempsReel() {
  let actif = true;
  let connexion;
  let minuterieReconnexion;
  let minuteriePing;
  let tentatives = 0;

  const connecter = () => {
    if (!actif) return;

    let socket;
    try {
      socket = new WebSocket(obtenirUrlTempsReel());
      connexion = socket;
    } catch (erreur) {
      console.error('Impossible d’ouvrir la connexion temps réel :', erreur);
      programmerReconnexion();
      return;
    }

    socket.addEventListener('open', () => {
      tentatives = 0;
      minuteriePing = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send('ping');
      }, 25000);
    });

    socket.addEventListener('message', (evenement) => {
      if (evenement.data === 'pong') return;
      try {
        const message = JSON.parse(evenement.data);
        if (message.type === 'donnees_modifiees' && typeof message.domaine === 'string') {
          window.dispatchEvent(new CustomEvent(EVENEMENT_DONNEES_MODIFIEES, {
            detail: { domaine: message.domaine },
          }));
        }
      } catch (erreur) {
        console.error('Message temps réel invalide :', erreur);
      }
    });

    socket.addEventListener('close', () => {
      if (connexion === socket) window.clearInterval(minuteriePing);
      if (actif) programmerReconnexion();
    });

    socket.addEventListener('error', () => socket.close());
  };

  function programmerReconnexion() {
    if (!actif || minuterieReconnexion) return;
    const delai = Math.min(1000 * (2 ** tentatives), 30000);
    tentatives += 1;
    minuterieReconnexion = window.setTimeout(() => {
      minuterieReconnexion = null;
      connecter();
    }, delai);
  }

  connecter();

  return () => {
    actif = false;
    window.clearTimeout(minuterieReconnexion);
    window.clearInterval(minuteriePing);
    connexion?.close();
  };
}

export function ecouterDonneesModifiees(domaines, rappel) {
  const ecouteur = (evenement) => {
    if (!domaines || domaines.includes(evenement.detail?.domaine)) rappel();
  };
  window.addEventListener(EVENEMENT_DONNEES_MODIFIEES, ecouteur);
  return () => window.removeEventListener(EVENEMENT_DONNEES_MODIFIEES, ecouteur);
}
