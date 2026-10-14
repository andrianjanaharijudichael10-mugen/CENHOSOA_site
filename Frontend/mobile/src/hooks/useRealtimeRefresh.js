import { useEffect } from 'react';
import { AppState } from 'react-native';
import { API_URL } from '../services/api';

const listeners = new Set();

function diffuserChangement(domaine) {
  listeners.forEach((listener) => listener({ domaine }));
}

export function demarrerTempsReel() {
  let actif = true;
  let socket;
  let timer;
  let tentative = 0;
  let ping;

  const connecter = () => {
    if (!actif) return;
    const url = new URL(API_URL);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/temps-reel`;
    try {
      socket = new WebSocket(url.toString());
    } catch (error) {
      console.error('Connexion temps réel impossible :', error);
      planifier();
      return;
    }
    socket.onopen = () => {
      tentative = 0;
      ping = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) socket.send('ping');
      }, 25000);
    };
    socket.onmessage = ({ data }) => {
      if (data === 'pong') return;
      try {
        const message = JSON.parse(data);
        if (message.type === 'donnees_modifiees') {
          diffuserChangement(message.domaine);
        }
      } catch (error) {
        console.error('Notification temps réel invalide :', error);
      }
    };
    socket.onclose = () => {
      clearInterval(ping);
      planifier();
    };
    socket.onerror = () => socket?.close();
  };

  const planifier = () => {
    if (!actif || timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      connecter();
    }, Math.min(1000 * (2 ** tentative++), 30000));
  };

  const onAppState = AppState.addEventListener('change', (state) => {
    if (state === 'active' && socket?.readyState !== WebSocket.OPEN) {
      clearTimeout(timer);
      timer = undefined;
      connecter();
    }
  });
  connecter();

  return () => {
    actif = false;
    clearTimeout(timer);
    clearInterval(ping);
    onAppState.remove();
    socket?.close();
  };
}

export function useRealtimeRefresh(domains, refresh) {
  useEffect(() => {
    const listener = (event) => {
      if (!domains || domains.includes(event.domaine)) void refresh();
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, [domains, refresh]);
}
