import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Empty, Field, Notice, Page } from '../components/ui';
import { ambulanceDisponibles, completerMissionInvite, litsUrgenceDisponibles, missionAmbulanceInvite, missionAmbulancePatient, missionUrgenteInvite, missionUrgentePatient, missionsAmbulancesPatient, simulerTrajet, suivreMissionInvite } from '../services/api';
import { colors } from '../theme';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';

export default function AmbulanceScreen({ profile }) {
  const [missions, setMissions] = useState([]);
  const [availability, setAvailability] = useState(0);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [name, setName] = useState(profile?.patient ? `${profile.patient.prenoms} ${profile.patient.nom}` : '');
  const [phone, setPhone] = useState(profile?.patient?.telephone || '');
  const [destination, setDestination] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteSuivi, setInviteSuivi] = useState(null);
  const [detailsSuivi, setDetailsSuivi] = useState(null);
  const [suiviPatient, setSuiviPatient] = useState('');
  const [suiviTelephone, setSuiviTelephone] = useState('');
  const [suiviMedical, setSuiviMedical] = useState('');
  const [savingSuivi, setSavingSuivi] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [fleet, beds, current] = await Promise.all([
        ambulanceDisponibles(), litsUrgenceDisponibles(),
        profile?.role === 'patient' ? missionsAmbulancesPatient() : Promise.resolve([]),
      ]);
      setAvailability(fleet.nombre_disponibles || 0);
      setAvailableBeds(beds);
      setMissions(current);
      setError('');
    } catch (cause) {
      setError(cause.message || 'Impossible de charger le suivi ambulance.');
    } finally {
      setLoading(false);
    }
  }, [profile?.role]);

  useEffect(() => { void refresh(); }, [refresh]);
  useRealtimeRefresh(['ambulances', 'lits'], refresh);

  const demander = async () => {
    setError('');
    setSuccess('');
    if (!destination.trim()) {
      setError('Indiquez l’adresse où se trouve le patient.');
      return;
    }
    if (!urgent && !profile && (!name.trim() || !phone.trim())) {
      setError('Pour une demande non urgente, renseignez le nom du patient et un numéro de contact.');
      return;
    }
    setSaving(true);
    try {
      let donnees = {
        destination: destination.trim(),
        urgence_vitale: urgent,
        patient_infectieux: false,
      };
      if (urgent) {
        const result = profile
          ? await missionUrgentePatient(donnees)
          : await missionUrgenteInvite(donnees);
        if (!profile) {
          setInviteSuivi({ missionId: result.mission.id, jeton: result.jeton_suivi });
          setDetailsSuivi(result.mission);
        }
        setSuccess(profile
          ? `Demande urgente transmise · ${result.statut.replaceAll('_', ' ')}`
          : `Demande urgente transmise. Code de suivi à conserver : ${result.jeton_suivi}`);
      } else {
        const route = simulation || await simulerTrajet(destination.trim());
        const recommended = route.itineraires[0];
        donnees = {
          ...donnees,
          patient: profile?.patient ? `${profile.patient.prenoms} ${profile.patient.nom}` : name.trim(),
          telephone_contact: phone.trim(),
          distance_km: recommended.distance_km,
          itineraire_index: recommended.index,
          distance_aller_km: recommended.distance_aller_km,
          distance_retour_km: recommended.distance_retour_km,
        };
        if (!profile) delete donnees.telephone_contact;
        if (!profile) {
          const result = await missionAmbulanceInvite({ ...donnees, telephone_contact: phone.trim() });
          setInviteSuivi({ missionId: result.mission.id, jeton: result.jeton_suivi });
          setDetailsSuivi(result.mission);
          setSuiviPatient(name.trim());
          setSuiviTelephone(phone.trim());
          setSuccess(`Demande transmise. Code de suivi à conserver : ${result.jeton_suivi}`);
        } else {
          const result = await missionAmbulancePatient(donnees);
          setSuccess(`Demande transmise · ${result.statut.replaceAll('_', ' ')}`);
        }
      }
      setDestination('');
      setSimulation(null);
      await refresh();
    } catch (cause) {
      setError(cause.message || 'La demande ambulance n’a pas pu être transmise.');
    } finally {
      setSaving(false);
    }
  };

  const calculerItineraire = async () => {
    setError('');
    setSaving(true);
    try {
      setSimulation(await simulerTrajet(destination.trim()));
    } catch (cause) {
      setError(cause.message || 'Impossible de calculer le trajet.');
    } finally {
      setSaving(false);
    }
  };

  const actualiserSuiviInvite = async () => {
    if (!inviteSuivi) return;
    setError('');
    try {
      setDetailsSuivi(await suivreMissionInvite(inviteSuivi.missionId, inviteSuivi.jeton));
    } catch (cause) {
      setError(cause.message || 'Impossible de charger le suivi de la demande.');
    }
  };

  const completerSuiviInvite = async () => {
    if (!inviteSuivi) return;
    const donnees = {
      patient: suiviPatient.trim() || undefined,
      telephone_contact: suiviTelephone.trim() || undefined,
      informations_medicales: suiviMedical.trim() || undefined,
    };
    if (!donnees.patient && !donnees.telephone_contact && !donnees.informations_medicales) {
      setError('Renseignez au moins une information à ajouter au suivi.');
      return;
    }
    setSavingSuivi(true);
    setError('');
    setSuccess('');
    try {
      setDetailsSuivi(await completerMissionInvite(inviteSuivi.missionId, inviteSuivi.jeton, donnees));
      setSuiviMedical('');
      setSuccess('Les informations ont été ajoutées au suivi de la demande.');
    } catch (cause) {
      setError(cause.message || 'Impossible de compléter le suivi.');
    } finally {
      setSavingSuivi(false);
    }
  };

  return (
    <Page title="Ambulance" subtitle="Demande rapide et suivi des missions." loading={loading} onRefresh={() => { setLoading(true); void refresh(); }}>
      <Notice>{error}</Notice>
      <Notice type="success">{success}</Notice>
      <Card title="Disponibilités">
        <Text style={{ color: colors.ink, fontSize: 15 }}>Ambulances disponibles · <Text style={{ color: colors.teal, fontWeight: '900' }}>{availability}</Text></Text>
        <Text style={{ color: colors.muted }}>Lits d’urgence disponibles · {availableBeds.length}</Text>
      </Card>
      <Card title="Demander une ambulance">
        <Text style={{ color: colors.muted, lineHeight: 20 }}>En urgence vitale, appelez aussi le standard. Cette demande ne remplace pas un appel d’urgence.</Text>
        {!profile ? <>
          <Field label="Nom du patient" value={name} onChangeText={setName} placeholder="Nom complet" />
          <Field label="Téléphone de contact" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+261..." />
        </> : <Text style={{ color: colors.ink, fontWeight: '700' }}>Patient · {profile.patient?.prenoms} {profile.patient?.nom}</Text>}
        <Field label="Adresse de prise en charge" value={destination} onChangeText={(text) => { setDestination(text); setSimulation(null); }} placeholder="Quartier, rue, point de repère" />
        <Button title="Calculer le trajet" variant="secondary" onPress={calculerItineraire} loading={saving} disabled={!destination.trim()} />
        {simulation ? <Text style={{ color: colors.teal, fontWeight: '700' }}>Itinéraire · {simulation.distance_km} km · {simulation.duree_estimee_minutes} min · {simulation.cout_base.toLocaleString('fr-FR')} Ar</Text> : null}
        <Button title="Transmettre ma demande" onPress={demander} loading={saving} disabled={!urgent && !simulation} />
        <Button title={urgent ? 'Désactiver le mode urgence vitale' : 'Activer le mode urgence vitale'} variant="danger" onPress={() => setUrgent(!urgent)} />
      </Card>
      {profile ? <Card title="Mes demandes">
        {missions.length ? missions.map((mission) => (
          <Text key={mission.id} style={{ color: colors.ink, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
            {mission.destination} · {mission.statut.replaceAll('_', ' ')}
          </Text>
        )) : <Empty>Aucune demande ambulance récente.</Empty>}
      </Card> : null}
      {inviteSuivi ? <Card title="Compléter / suivre ma demande">
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          Vous pouvez ajouter les informations du patient dès que vous les avez. Le code de suivi permet de retrouver cette demande.
        </Text>
        <Text selectable style={{ color: colors.ink, fontSize: 12, lineHeight: 19 }}>
          Identifiant de mission · {inviteSuivi.missionId}{'\n'}
          Code de suivi · {inviteSuivi.jeton}
        </Text>
        <Text style={{ color: colors.ink, fontWeight: '800' }}>Statut · {detailsSuivi?.statut?.replaceAll('_', ' ') || 'en attente'}</Text>
        <Field label="Nom du patient (facultatif)" value={suiviPatient} onChangeText={setSuiviPatient} placeholder="Nom complet" />
        <Field label="Téléphone de contact (facultatif)" value={suiviTelephone} onChangeText={setSuiviTelephone} keyboardType="phone-pad" placeholder="+261..." />
        <Field label="Informations médicales utiles (facultatif)" value={suiviMedical} onChangeText={setSuiviMedical} multiline placeholder="Mobilité, symptômes ou informations utiles" />
        <Button title="Ajouter les informations" onPress={completerSuiviInvite} loading={savingSuivi} />
        <Button title="Actualiser le statut" variant="secondary" onPress={actualiserSuiviInvite} />
      </Card> : null}
    </Page>
  );
}
