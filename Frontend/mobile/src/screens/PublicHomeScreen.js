import React from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Page } from '../components/ui';
import { colors } from '../theme';

export default function PublicHomeScreen({ navigation }) {
  return (
    <Page title="Bienvenue au CENHOSOA" subtitle="Un accompagnement hospitalier de confiance, à chaque étape de votre parcours.">
      <View style={{ backgroundColor: colors.ink, borderRadius: 28, padding: 24, gap: 12 }}>
        <Text style={{ color: colors.mint, fontWeight: '800', letterSpacing: 1 }}>CENTRE HOSPITALIER DE SOAVINANDRIANA</Text>
        <Text style={{ color: colors.white, fontSize: 30, lineHeight: 36, fontWeight: '800' }}>Des soins accessibles, un suivi humain.</Text>
        <Text style={{ color: '#D7E6E8', lineHeight: 22 }}>Consultez nos spécialités, demandez un rendez-vous ou sollicitez une ambulance.</Text>
        <Button title="Se connecter / créer un compte" onPress={() => navigation.navigate('Connexion')} />
      </View>
      <Card title="Accès rapides">
        <Button title="Découvrir les spécialités" variant="secondary" onPress={() => navigation.navigate('Spécialités')} />
        <Button title="Demander une ambulance" onPress={() => navigation.navigate('Ambulance')} />
        <Button title="Connexion patient ou personnel" variant="secondary" onPress={() => navigation.navigate('Connexion')} />
      </Card>
      <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
        Les demandes d’ambulance invitées peuvent être effectuées sans compte. En cas d’urgence vitale, appelez également le standard.
      </Text>
    </Page>
  );
}
