import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Empty, Field, Notice, Page, SelectList } from '../components/ui';
import {
  confirmerMissionAmbulance, demandesAmbulance, flotteAmbulances,
  lits as chargerLits, libererLit, missionsAmbulances, occuperLit,
  statistiquesRendezVous, transitionMissionAmbulance, utilisateurs,
} from '../services/api';
import { colors } from '../theme';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';

function useChargeur(loader, domains) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setData(await loader());
      setError('');
    } catch (cause) {
      setError(cause.message || 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, [loader]);
  useEffect(() => { void refresh(); }, [refresh]);
  useRealtimeRefresh(domains, refresh);
  return { data, setData, loading, setLoading, error, setError, refresh };
}

export function BedsScreen() {
  const { data: beds, loading, setLoading, error, setError, refresh } = useChargeur(chargerLits, ['ambulances', 'lits']);
  const [selected, setSelected] = useState('');
  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [motif, setMotif] = useState('');
  const [busy, setBusy] = useState(false);
  const available = useMemo(() => beds.filter((bed) => bed.statut === 'libre'), [beds]);
  const selectedBed = beds.find((bed) => bed.id === selected);

  const admit = async () => {
    if (!selectedBed || !surname.trim() || !givenName.trim()) {
      setError('Choisissez un lit libre et renseignez le nom complet du patient.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await occuperLit(selected, {
        nom_patient: surname.trim(),
        prenoms_patient: givenName.trim(),
        motif_admission: motif.trim() || null,
        motif_infectieux: null,
        facturation_vip_validee: false,
      });
      setSurname('');
      setGivenName('');
      setMotif('');
      await refresh();
    } catch (cause) {
      setError(cause.message || 'Impossible d’admettre le patient dans ce lit.');
    } finally {
      setBusy(false);
    }
  };

  const release = async (bed) => {
    setError('');
    try {
      await libererLit(bed.id);
      await refresh();
    } catch (cause) {
      setError(cause.message || 'Impossible de libérer le lit.');
    }
  };

  return (
    <Page title="Lits d’urgence" subtitle="État des lits et admissions en temps réel." loading={loading} onRefresh={() => { setLoading(true); void refresh(); }}>
      <Notice>{error}</Notice>
      <Card title={`Occupation · ${beds.filter((bed) => bed.statut === 'occupe').length}/${beds.length}`}>
        {beds.length ? beds.map((bed) => (
          <View key={bed.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.ink, fontWeight: '800' }}>{bed.numero} · {bed.categorie.replaceAll('_', ' ')}</Text>
              <Text style={{ color: bed.statut === 'libre' ? colors.success : colors.warning, fontWeight: '700' }}>{bed.statut.replaceAll('_', ' ')}</Text>
              {bed.nom_patient_actuel ? <Text style={{ color: colors.muted }}>{bed.prenoms_patient_actuel} {bed.nom_patient_actuel}</Text> : null}
            </View>
            {bed.statut === 'occupe' ? <Button title="Libérer" variant="secondary" onPress={() => release(bed)} /> : null}
          </View>
        )) : <Empty>Aucun lit trouvé.</Empty>}
      </Card>
      <Card title="Admission">
        <SelectList label="Lit libre" value={selected} options={available.map((bed) => ({
          value: bed.id, label: `${bed.numero} · ${bed.categorie.replaceAll('_', ' ')}`,
        }))} onChange={setSelected} emptyLabel="Aucun lit libre." />
        <Field label="Nom du patient" value={surname} onChangeText={setSurname} />
        <Field label="Prénoms" value={givenName} onChangeText={setGivenName} />
        <Field label="Motif d’admission (facultatif)" value={motif} onChangeText={setMotif} multiline />
        <Button title="Admettre dans le lit" onPress={admit} loading={busy} disabled={!available.length} />
      </Card>
    </Page>
  );
}

export function RegulatorScreen() {
  const { data: missions, loading, setLoading, error, setError, refresh } = useChargeur(missionsAmbulances, ['ambulances', 'lits']);
  const [pending, setPending] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [busy, setBusy] = useState('');

  const chargerDemandes = useCallback(async () => {
    try {
      const [requests, ambulances] = await Promise.all([demandesAmbulance(), flotteAmbulances()]);
      setPending(requests);
      setFleet(ambulances.filter((item) => item.statut === 'disponible'));
    } catch (cause) {
      setError(cause.message || 'Impossible de charger les demandes en attente.');
    }
  }, [setError]);
  useEffect(() => { void chargerDemandes(); }, [chargerDemandes]);
  useRealtimeRefresh(['ambulances'], chargerDemandes);

  const confirm = async (mission) => {
    if (!fleet[0]) {
      setError('Aucune ambulance disponible pour confirmer cette demande.');
      return;
    }
    setBusy(mission.id);
    setError('');
    try {
      await confirmerMissionAmbulance(mission.id, fleet[0].id);
      await Promise.all([refresh(), chargerDemandes()]);
    } catch (cause) {
      setError(cause.message || 'Impossible de confirmer cette mission.');
    } finally {
      setBusy('');
    }
  };

  const advance = async (mission) => {
    const target = next[mission.statut];
    if (!target) return;
    setBusy(mission.id);
    setError('');
    try {
      await transitionMissionAmbulance(mission.id, target, target === 'arrive_urgences' ? mission.lit_id : null);
      await refresh();
    } catch (cause) {
      setError(cause.message || 'Impossible de faire avancer cette mission.');
    } finally {
      setBusy('');
    }
  };

  const next = {
    assigne: 'sur_les_lieux',
    sur_les_lieux: 'en_transport',
    en_transport: 'arrive_urgences',
    arrive_urgences: 'en_bionettoyage',
    en_bionettoyage: 'terminee',
  };
  const active = missions.filter((mission) => next[mission.statut]);

  return (
    <Page title="Régulation ambulance" subtitle="Demandes, flotte et progression des missions." loading={loading} onRefresh={() => { setLoading(true); void Promise.all([refresh(), chargerDemandes()]); }}>
      <Notice>{error}</Notice>
      <Card title={`Demandes à confirmer · ${pending.length}`}>
        {pending.length ? pending.map((mission) => (
          <View key={mission.id} style={{ gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
            <Text style={{ color: colors.ink, fontWeight: '800' }}>{mission.patient} · {mission.destination}</Text>
            <Text style={{ color: colors.muted }}>{mission.telephone_contact || 'Téléphone non renseigné'}</Text>
            <Button title="Affecter une ambulance disponible" onPress={() => confirm(mission)} loading={busy === mission.id} disabled={!fleet.length} />
          </View>
        )) : <Empty>Aucune demande en attente.</Empty>}
      </Card>
      <Card title="Missions actives">
        {active.length ? active.map((mission) => (
          <View key={mission.id} style={{ gap: 7, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
            <Text style={{ color: colors.ink, fontWeight: '800' }}>{mission.patient} · {mission.statut.replaceAll('_', ' ')}</Text>
            <Text style={{ color: colors.muted }}>{mission.destination} · {mission.ambulance_nom || mission.ambulance_code || 'Ambulance'}</Text>
            <Text style={{ color: colors.muted }}>{mission.telephone_contact || ''}</Text>
            <Button
              title={`Passer à l’étape suivante · ${(next[mission.statut] || '').replaceAll('_', ' ')}`}
              onPress={() => advance(mission)}
              loading={busy === mission.id}
            />
          </View>
        )) : <Empty>Aucune mission active.</Empty>}
      </Card>
    </Page>
  );
}

export function AdminScreen() {
  const { data: users, loading, setLoading, error, refresh } = useChargeur(utilisateurs, ['administration']);
  const [stats, setStats] = useState(null);
  useEffect(() => {
    statistiquesRendezVous().then(setStats).catch(() => setStats(null));
  }, [users]);
  return (
    <Page title="Administration" subtitle="Vue d’ensemble des comptes et de l’activité." loading={loading} onRefresh={() => { setLoading(true); void refresh(); }}>
      <Notice>{error}</Notice>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1 }}><Text style={{ color: colors.muted }}>Comptes</Text><Text style={{ color: colors.ink, fontSize: 26, fontWeight: '900' }}>{users.length}</Text></Card>
        <Card style={{ flex: 1 }}><Text style={{ color: colors.muted }}>Rendez-vous</Text><Text style={{ color: colors.ink, fontSize: 26, fontWeight: '900' }}>{stats?.total ?? '—'}</Text></Card>
      </View>
      <Card title="Comptes utilisateurs">
        {users.length ? users.map((user) => (
          <View key={user.id} style={{ gap: 4, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ color: colors.ink, fontWeight: '800' }}>{user.patient ? `${user.patient.prenoms} ${user.patient.nom}` : user.personnel ? `${user.personnel.prenoms} ${user.personnel.nom}` : user.identifiant}</Text>
            <Text style={{ color: colors.muted }}>{user.role.replaceAll('_', ' ')} · {user.est_actif ? 'actif' : 'désactivé'}</Text>
          </View>
        )) : <Empty>Aucun compte à afficher.</Empty>}
      </Card>
    </Page>
  );
}
