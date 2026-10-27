import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

const URL_SITE = process.env.EXPO_PUBLIC_WEB_URL?.trim() || '';
const AUTORISER_HTTP_LOCAL = process.env.EXPO_PUBLIC_ALLOW_INSECURE_WEBVIEW === 'true';

function estAdresseIpv4Privee(hote) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hote)) return false;

  const octets = hote.split('.').map(Number);
  if (octets.some((octet) => octet > 255)) return false;

  return octets[0] === 10
    || octets[0] === 127
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
}

function validerUrlSite(valeur) {
  if (!valeur) return null;

  try {
    const url = new URL(valeur);
    const estHttpAutorise = AUTORISER_HTTP_LOCAL
      && url.protocol === 'http:'
      && (
        ['localhost', '10.0.2.2'].includes(url.hostname)
        || estAdresseIpv4Privee(url.hostname)
      );
    if (url.protocol !== 'https:' && !estHttpAutorise) return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function ouvrirLienExterne(url) {
  Linking.openURL(url).catch((erreur) => {
    console.warn('Impossible d’ouvrir le lien externe.', erreur);
  });
}

export default function App() {
  const webView = useRef(null);
  const navigation = useRef({ canGoBack: false });
  const chargementInitialTermine = useRef(false);
  const siteUrl = useMemo(() => validerUrlSite(URL_SITE), []);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [progression, setProgression] = useState(0);

  const revenir = useCallback(() => {
    if (navigation.current.canGoBack) {
      webView.current?.goBack();
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const abonnement = BackHandler.addEventListener('hardwareBackPress', revenir);
    return () => abonnement.remove();
  }, [revenir]);

  const recharger = () => {
    setErreur('');
    setChargement(true);
    setProgression(0);
    chargementInitialTermine.current = false;
    webView.current?.reload();
  };

  const verifierNavigation = (requete) => {
    const { url } = requete;
    if (!url) return false;
    if (url === 'about:blank') return true;

    try {
      const cible = new URL(url);
      if (siteUrl && cible.origin === siteUrl.origin) return true;
      if (cible.protocol === 'tel:' || cible.protocol === 'mailto:') {
        ouvrirLienExterne(url);
        return false;
      }
      if (cible.protocol === 'https:') {
        ouvrirLienExterne(url);
        return false;
      }
    } catch {
      return false;
    }
    return false;
  };

  const afficherErreur = (message) => {
    setChargement(false);
    setErreur(message || 'Le site est momentanément inaccessible. Vérifiez votre connexion puis réessayez.');
  };

  const terminerChargement = () => {
    chargementInitialTermine.current = true;
    setProgression(1);
    setChargement(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#0A2233" />

      {siteUrl ? (
        <View style={styles.content}>
          <WebView
            ref={webView}
            source={{ uri: siteUrl.href }}
            style={styles.webView}
            javaScriptEnabled
            domStorageEnabled
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            textZoom={100}
            setBuiltInZoomControls={false}
            setDisplayZoomControls={false}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={verifierNavigation}
            onNavigationStateChange={(etat) => {
              navigation.current.canGoBack = etat.canGoBack;
              if (!etat.loading) terminerChargement();
            }}
            onLoadStart={() => {
              if (!chargementInitialTermine.current) setChargement(true);
              setErreur('');
              if (!chargementInitialTermine.current) setProgression(0);
            }}
            onLoadProgress={({ nativeEvent }) => {
              setProgression(nativeEvent.progress);
              if (nativeEvent.progress >= 1) terminerChargement();
            }}
            onLoadEnd={terminerChargement}
            onError={({ nativeEvent }) => afficherErreur(nativeEvent.description)}
            onHttpError={({ nativeEvent }) => {
              if (nativeEvent.statusCode >= 500) {
                afficherErreur(`Le site a répondu avec une erreur (${nativeEvent.statusCode}).`);
              }
            }}
            onOpenWindow={({ nativeEvent }) => {
              if (nativeEvent.targetUrl) verifierNavigation({ url: nativeEvent.targetUrl });
            }}
            renderLoading={() => null}
            startInLoadingState
            applicationNameForUserAgent="CENHOSOA-Mobile"
            accessible
          />
          {chargement && !erreur && (
            <View style={styles.loading} pointerEvents="none">
              <ActivityIndicator size="large" color="#1F7A8C" />
              <Text style={styles.loadingText}>
                {progression > 0 ? `Chargement du site… ${Math.round(progression * 100)} %` : 'Connexion au site…'}
              </Text>
            </View>
          )}
          {erreur ? (
            <View style={styles.errorPanel}>
              <Text style={styles.errorTitle}>Connexion impossible</Text>
              <Text style={styles.errorText}>{erreur}</Text>
              <Pressable accessibilityRole="button" onPress={recharger} style={styles.retryButton}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.setupPanel}>
          <Text style={styles.setupTitle}>Adresse du site à configurer</Text>
          <Text style={styles.setupText}>
            Définissez EXPO_PUBLIC_WEB_URL avec l’adresse HTTPS du site CENHOSOA, puis redémarrez Expo.
          </Text>
          <Text style={styles.setupHint}>Exemple : EXPO_PUBLIC_WEB_URL=https://votre-site.example</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A2233',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    color: '#0F3D52',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  errorPanel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    color: '#0A2233',
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 10,
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 22,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1F7A8C',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  setupPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#F4F2EE',
  },
  setupTitle: {
    color: '#0A2233',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  setupText: {
    marginTop: 12,
    color: '#334155',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  setupHint: {
    marginTop: 16,
    color: '#1F7A8C',
    fontSize: 13,
    textAlign: 'center',
  },
});
