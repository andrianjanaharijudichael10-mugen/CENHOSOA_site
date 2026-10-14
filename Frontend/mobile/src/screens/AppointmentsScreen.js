import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Empty, Field, Notice, Page, SelectList } from '../components/ui';
import { colors } from '../theme';
import {
  creneaux as chargerCreneaux,
  creerRendezVous,
  modifierRendezVous,
  rendezVous as chargerRendezVous,
  reserverCreneau,
  services as chargerServices,
} from '../services/api';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';

const formatDate = (value) => new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

export default function AppointmentsScreen({ route }) {
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [serviceId, setServiceId] = useState(route?.params?.serviceId || '');
  const [slotId, setSlotId] = useState('');
  const [motif, setMotif] = useState('');
  const [mode, setMode] = useState('creneau');
  const [dateSouhaitee, setDateSouhaitee] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (route?.params?.serviceId) setServiceId(route.params.serviceId);
  }, [route?.params?.serviceId]);

  const refresh = useCallback(async () => {
    try {
      const [rdvs, listeServices] = await Promise.all([chargerRendezVous(), chargerServices()]);
      setAppointments(rdvs);
      setServices(listeServices);
      if (!serviceId && listeServices.length) setServiceId(listeServices[0].id);
      setError('');
    } catch (cause) {
      setError(cause.message || 'Impossible de charger vos rendez-vous.');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useRealtimeRefresh(['rendez-vous', 'services'], refresh);

  useEffect(() => {
    let actif = true;
    chargerCreneaux(serviceId || undefined)
      .then((data) => {
        if (actif) setSlots(data.filter((slot) => slot.est_ouvert));
      })
      .catch((cause) => {
        if (actif) setError(cause.message || 'Impossible de charger les créneaux.');
      });
    return () => { actif = false; };
  }, [serviceId]);

  const serviceOptions = useMemo(() => services.map((service) => ({
    value: service.id, label: service.nom,
  })), [services]);
  const slotsForService = useMemo(() => slots
    .filter((slot) => slot.service_id === serviceId && slot.est_ouvert)
    .map((slot) => ({
      value: slot.id,
      label: `${formatDate(slot.date_heure)} · ${slot.service_nom} · ${slot.nombre_patients} patient(s)`,
    })), [serviceId, slots]);

  const submit = async () => {
    setError('');
    setSuccess('');
    if (!serviceId || !motif.trim()) {
      setError('Choisissez un service et renseignez le motif du rendez-vous.');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'creneau') {
        if (!slotId) throw new Error('Sélectionnez un créneau disponible.');
        await reserverCreneau(slotId, motif.trim());
      } else {
        const parsedDate = new Date(dateSouhaitee);
        if (!Number.isFinite(parsedDate.getTime())) throw new Error('Saisissez une date au format AAAA-MM-JJ HH:MM.');
        await creerRendezVous({
          service_id: serviceId,
          date_souhaitee: parsedDate.toISOString(),
          motif: motif.trim(),
        });
      }
      setMotif('');
      setSlotId('');
      setSuccess('Votre demande de rendez-vous a été enregistrée.');
      await refresh();
    } catch (cause) {
      setError(cause.message || 'La demande de rendez-vous a échoué.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (appointment) => {
    setError('');
    try {
      await modifierRendezVous(appointment.id, { statut: 'annule' });
      await refresh();
    } catch (cause) {
      setError(cause.message || 'Impossible d’annuler ce rendez-vous.');
    }
  };

  return (
    <Page title="Mes rendez-vous" subtitle="Réservez et suivez vos demandes." loading={loading} onRefresh={() => { setLoading(true); void refresh(); }}>
      <Notice>{error}</Notice>
      <Notice type="success">{success}</Notice>
      <Card title="Faire une demande">
        <SelectList label="Spécialité" value={serviceId} options={serviceOptions} onChange={(value) => { setServiceId(value); setSlotId(''); }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Créneau disponible" variant={mode === 'creneau' ? 'primary' : 'secondary'} onPress={() => setMode('creneau')} style={{ flex: 1 }} />
          <Button title="Date souhaitée" variant={mode === 'date' ? 'primary' : 'secondary'} onPress={() => setMode('date')} style={{ flex: 1 }} />
        </View>
        {mode === 'creneau'
          ? <SelectList label="Créneau" value={slotId} options={slotsForService} onChange={setSlotId} emptyLabel="Aucun créneau ouvert pour ce service." />
          : <Field label="Date souhaitée (AAAA-MM-JJ HH:MM)" value={dateSouhaitee} onChangeText={setDateSouhaitee} placeholder="2026-11-15 09:30" />}
        <Field label="Motif" value={motif} onChangeText={setMotif} multiline placeholder="Décrivez brièvement votre demande" />
        <Button title="Envoyer la demande" onPress={submit} loading={saving} />
      </Card>
      <Card title={`Historique · ${appointments.length}`}>
        {appointments.length ? appointments.map((item) => (
          <View key={item.id} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 }}>
            <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>{item.service_nom}</Text>
            <Text style={{ color: colors.muted }}>{formatDate(item.date_confirmee || item.date_souhaitee)}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{item.motif}</Text>
            <Text style={{ color: item.statut === 'confirme' ? colors.success : colors.teal, fontWeight: '800' }}>Statut · {item.statut.replaceAll('_', ' ')}</Text>
            {['en_attente', 'confirme'].includes(item.statut)
              ? <Button title="Annuler ce rendez-vous" variant="danger" onPress={() => cancel(item)} />
              : null}
          </View>
        )) : <Empty>Vous n’avez pas encore de rendez-vous.</Empty>}
      </Card>
    </Page>
  );
}
