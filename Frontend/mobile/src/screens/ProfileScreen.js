import React, { useState } from 'react';
import { Button, Card, Field, Notice, Page } from '../components/ui';
import { modifierProfilPatient, supprimerTokens } from '../services/api';
import { colors } from '../theme';

export default function ProfileScreen({ profile, onLogout, onProfileUpdated }) {
  const [firstName, setFirstName] = useState(profile?.patient?.prenoms || '');
  const [lastName, setLastName] = useState(profile?.patient?.nom || '');
  const [birthDate, setBirthDate] = useState(profile?.patient?.date_naissance || '');
  const [address, setAddress] = useState(profile?.patient?.adresse || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const patient = profile?.role === 'patient';

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await modifierProfilPatient({
        prenoms: firstName.trim(),
        nom: lastName.trim(),
        date_naissance: birthDate || null,
        lieu_naissance: profile.patient.lieu_naissance || null,
        adresse: address.trim() || null,
      });
      onProfileUpdated({ ...profile, patient: { ...profile.patient, ...updated } });
      setSuccess('Profil mis à jour.');
    } catch (cause) {
      setError(cause.message || 'Impossible d’enregistrer le profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Mon espace" subtitle="Profil et paramètres de compte.">
      <Notice>{error}</Notice>
      <Notice type="success">{success}</Notice>
      <Card title={patient ? `${profile.patient?.prenoms || ''} ${profile.patient?.nom || ''}` : `${profile.personnel?.prenoms || ''} ${profile.personnel?.nom || ''}`}>
        <Field label="Rôle" value={profile.role.replaceAll('_', ' ')} editable={false} />
        <Field label="Identifiant" value={profile.identifiant} editable={false} />
        {patient ? (
          <>
            <Field label="Téléphone" value={profile.patient?.telephone || ''} editable={false} keyboardType="phone-pad" />
            <Field label="Prénoms" value={firstName} onChangeText={setFirstName} />
            <Field label="Nom" value={lastName} onChangeText={setLastName} />
            <Field label="Date de naissance (AAAA-MM-JJ)" value={birthDate} onChangeText={setBirthDate} placeholder="1990-01-31" />
            <Field label="Adresse" value={address} onChangeText={setAddress} multiline />
            <Button title="Enregistrer le profil" onPress={save} loading={saving} />
          </>
        ) : (
          <>
            <Field label="Matricule" value={profile.personnel?.matricule || '—'} editable={false} />
            <Field label="Service" value={profile.personnel?.service || '—'} editable={false} />
          </>
        )}
      </Card>
      <Button
        title="Se déconnecter"
        variant="danger"
        onPress={async () => {
          await supprimerTokens();
          onLogout();
        }}
      />
      <Card>
        <Notice type="success">Connexion sécurisée · les sessions sont stockées dans SecureStore sur iOS et Android.</Notice>
        <Field label="Identité de l’établissement" value="Centre Hospitalier de Soavinandriana · CENHOSOA" editable={false} />
      </Card>
    </Page>
  );
}
