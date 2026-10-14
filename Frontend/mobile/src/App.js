import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import AuthScreen from './screens/AuthScreen';
import ServicesScreen from './screens/ServicesScreen';
import AppointmentsScreen from './screens/AppointmentsScreen';
import AmbulanceScreen from './screens/AmbulanceScreen';
import PublicHomeScreen from './screens/PublicHomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import StaffScreen, { RecordsScreen } from './screens/StaffScreen';
import { AdminScreen, BedsScreen, RegulatorScreen } from './screens/OperationsScreen';
import { demarrerTempsReel } from './hooks/useRealtimeRefresh';
import { profilCourant, lireAccessToken, supprimerTokens } from './services/api';
import { colors } from './theme';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const TITLES = {
  Accueil: 'Accueil',
  Ambulance: 'Ambulance',
  Dossiers: 'Dossiers',
  Lits: 'Lits',
  Missions: 'Missions',
  'Mes rendez-vous': 'Rendez-vous',
  'Mon espace': 'Profil',
  Planning: 'Planning',
  'Spécialités': 'Services',
  Administration: 'Admin',
};

function TabsConnectes({ profile, onLogout, onProfileUpdated }) {
  const role = profile?.role;
  let screens = [];

  if (role === 'patient') {
    screens = [
      ['Accueil', ServicesScreen, { authenticated: true, canBookAppointments: true }],
      ['Mes rendez-vous', AppointmentsScreen, {}],
      ['Ambulance', AmbulanceScreen, { profile }],
      ['Mon espace', ProfileScreen, { profile, onLogout, onProfileUpdated }],
    ];
  } else if (['secretaire', 'medecin'].includes(role)) {
    screens = [
      ['Planning', StaffScreen, { profile }],
      ['Spécialités', ServicesScreen, { authenticated: true }],
      ...(role === 'medecin' ? [['Dossiers', RecordsScreen, {}]] : []),
      ['Mon espace', ProfileScreen, { profile, onLogout, onProfileUpdated }],
    ];
  } else if (role === 'major_de_garde') {
    screens = [
      ['Lits', BedsScreen, {}],
      ['Spécialités', ServicesScreen, { authenticated: true }],
      ['Mon espace', ProfileScreen, { profile, onLogout, onProfileUpdated }],
    ];
  } else if (role === 'superadmin') {
    screens = [
      ['Administration', AdminScreen, {}],
      ['Lits', BedsScreen, {}],
      ['Spécialités', ServicesScreen, { authenticated: true }],
      ['Mon espace', ProfileScreen, { profile, onLogout, onProfileUpdated }],
    ];
  } else if (['major', 'regulateur_ambulance', 'chef_division_auto', 'chef_sim'].includes(role)) {
    screens = [
      ['Missions', RegulatorScreen, {}],
      ['Mon espace', ProfileScreen, { profile, onLogout, onProfileUpdated }],
    ];
  }

  if (!screens.length) {
    screens = [['Mon espace', ProfileScreen, { profile, onLogout, onProfileUpdated }]];
  }

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabel: TITLES[route.name] || route.name,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 66,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 26 : 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      })}
    >
      {screens.map(([name, ScreenComponent, props]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ title: TITLES[name] || name }}
        >
          {(screenProps) => <ScreenComponent {...screenProps} {...props} />}
        </Tabs.Screen>
      ))}
    </Tabs.Navigator>
  );
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadError, setLoadError] = useState('');

  const chargerProfil = useCallback(async () => {
    try {
      setLoadError('');
      setProfile(await profilCourant());
    } catch (error) {
      await supprimerTokens();
      setProfile(null);
      if (error.status !== 401) setLoadError(error.message || 'Impossible de vérifier la session.');
    } finally {
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (await lireAccessToken()) await chargerProfil();
        else setCheckingSession(false);
      } catch (error) {
        setLoadError(error.message || 'Impossible de lire la session sécurisée.');
        setCheckingSession(false);
      }
    })();
  }, [chargerProfil]);

  useEffect(() => demarrerTempsReel(), []);

  const logout = () => setProfile(null);

  if (checkingSession) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.teal} />
        <Text style={styles.loadingText}>Connexion aux services CENHOSOA…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={profile ? 'dark' : 'dark'} />
      {profile ? (
        <TabsConnectes
          profile={profile}
          onLogout={logout}
          onProfileUpdated={setProfile}
        />
      ) : (
        <Stack.Navigator
          initialRouteName="Accueil"
          screenOptions={{
            headerStyle: { backgroundColor: colors.ink },
            headerTintColor: colors.white,
            headerTitleStyle: { fontWeight: '800' },
            contentStyle: { backgroundColor: colors.canvas },
          }}
        >
          <Stack.Screen name="Accueil" component={PublicHomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Connexion" options={{ title: 'Compte CENHOSOA' }}>
            {() => <AuthScreen onConnect={chargerProfil} />}
          </Stack.Screen>
          <Stack.Screen name="Spécialités" options={{ title: 'Nos spécialités' }}>
            {(props) => <ServicesScreen {...props} />}
          </Stack.Screen>
          <Stack.Screen name="Ambulance" options={{ title: 'Demande d’ambulance' }}>
            {() => <AmbulanceScreen profile={null} />}
          </Stack.Screen>
        </Stack.Navigator>
      )}
      {loadError ? <View style={styles.error}><Text style={styles.errorText}>{loadError}</Text></View> : null}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, gap: 14 },
  loadingText: { color: colors.ink, fontWeight: '700' },
  error: { position: 'absolute', top: 50, left: 16, right: 16, backgroundColor: colors.dangerPale, padding: 12, borderRadius: 12 },
  errorText: { color: colors.danger, fontSize: 13 },
});
