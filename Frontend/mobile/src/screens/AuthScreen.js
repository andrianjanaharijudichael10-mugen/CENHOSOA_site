import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Notice, Page } from '../components/ui';
import { colors } from '../theme';
import { connexion, enregistrerTokens, inscription } from '../services/api';

export default function AuthScreen({ onConnect }) {
  const [mode, setMode] = useState('connexion');
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [nom, setNom] = useState('');
  const [prenoms, setPrenoms] = useState('');
  const [telephone, setTelephone] = useState('+261');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [chargement, setChargement] = useState(false);

  const soumettre = async () => {
    setErreur('');
    setSucces('');
    setChargement(true);
    try {
      if (mode === 'inscription') {
        await inscription({ nom: nom.trim(), prenoms: prenoms.trim(), telephone: telephone.replace(/[\s-]/g, ''), mot_de_passe: motDePasse });
        setIdentifiant(telephone.replace(/[\s-]/g, ''));
        setMode('connexion');
        setSucces('Compte créé. Connectez-vous avec votre numéro et votre mot de passe.');
      } else {
        const tokens = await connexion(identifiant.trim(), motDePasse);
        await enregistrerTokens(tokens);
        await onConnect(tokens.access_token);
      }
    } catch (error) {
      setErreur(error.message || 'Connexion impossible.');
    } finally {
      setChargement(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Page title="Bienvenue" subtitle="Votre parcours de soins, simplement et en sécurité.">
        <View style={styles.brand}>
          <View style={styles.logo}><Text style={styles.logoText}>C</Text></View>
          <Text style={styles.brandName}>CENHOSOA</Text>
          <Text style={styles.brandCaption}>CENTRE HOSPITALIER DE SOAVINANDRIANA</Text>
        </View>
        <Card title={mode === 'connexion' ? 'Se connecter' : 'Créer un compte patient'}>
          <Notice>{erreur}</Notice>
          <Notice type="success">{succes}</Notice>
          {mode === 'inscription' ? (
            <>
              <Field label="Nom" value={nom} onChangeText={setNom} placeholder="Votre nom" />
              <Field label="Prénoms" value={prenoms} onChangeText={setPrenoms} placeholder="Vos prénoms" />
              <Field label="Téléphone Malagasy (+261)" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
            </>
          ) : (
            <Field label="Téléphone patient ou matricule personnel" value={identifiant} onChangeText={setIdentifiant} placeholder="Ex. +261..." />
          )}
          <Field label="Mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry />
          <Button title={mode === 'connexion' ? 'Connexion' : 'Créer mon compte'} onPress={soumettre} loading={chargement} />
          <Button
            variant="secondary"
            title={mode === 'connexion' ? 'Créer un compte patient' : 'J’ai déjà un compte'}
            onPress={() => { setErreur(''); setSucces(''); setMode(mode === 'connexion' ? 'inscription' : 'connexion'); }}
          />
        </Card>
        <Text style={styles.privacy}>Vos informations restent protégées. Les mêmes identifiants donnent accès aux services du portail.</Text>
      </Page>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  brand: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  logo: { width: 64, height: 64, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink, borderWidth: 3, borderColor: colors.mint },
  logoText: { color: colors.white, fontSize: 32, fontWeight: '900' },
  brandName: { color: colors.ink, fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  brandCaption: { color: colors.teal, fontSize: 9, letterSpacing: 1.2, fontWeight: '800', textAlign: 'center' },
  privacy: { color: colors.muted, textAlign: 'center', fontSize: 12, lineHeight: 19, paddingHorizontal: 10 },
});
