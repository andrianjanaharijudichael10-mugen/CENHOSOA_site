import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Empty, Field, Notice, Page, SelectList } from '../components/ui';
import {
  creerConsultation, creerCreneau, creneaux as chargerCreneaux, dossierComplet,
  listerPatientsPourCreneau, modifierRendezVous,
  rendezVous as chargerRendezVous, services as chargerServices,
} from '../services/api';
import { colors } from '../theme';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';

const formatDate = (value) => new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

export default function StaffScreen({ profile }) {
  const isDoctor = profile?.role === 'medecin';
  const [appointments, setAppointments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [services, setServices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [slotMotif, setSlotMotif] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const staffService = profile?.personnel?.service;
  const service = useMemo(
    () => services.find((item) => item.nom === staffService),
    [services, staffService],
  );

  const refresh = useCallback(async () => {
    try {
      const [rdvs, allServices] = await Promise.all([chargerRendezVous(), chargerServices()]);
      setAppointments(rdvs);
      setServices(allServices);
      if (!selectedService) {
        const ownService = allServices.find((item) => item.nom === staffService);
        if (ownService) setSelectedService(ownService.id);
      }
      if (isDoctor) setPatients(await listerPatientsPourCreneau());
      setError('');
    } catch (cause) {
      setError(cause.message || 'Impossible de charger le planning.');
    } finally {
      setLoading(false);
    }
  }, [isDoctor, selectedService, staffService]);

  useEffect(() => { void refresh(); }, [refresh]);
  useRealtimeRefresh(['dossiers', 'patients', 'rendez-vous', 'services'], refresh);

  const refreshSlots = useCallback(async () => {
    if (!selectedService) {
      setSlots([]);
      return;
    }
    try {
      setSlots(await chargerCreneaux(selectedService));
    } catch (cause) {
      setError(cause.message || 'Impossible de charger les créneaux.');
    }
  }, [selectedService]);
  useEffect(() => { void refreshSlots(); }, [refreshSlots]);
  useRealtimeRefresh(['rendez-vous'], refreshSlots);

  const createSlot = async () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!service || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      setError('Le service ou les dates du créneau sont invalides.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = {
        service_id: service.id,
        date_heure: start.toISOString(),
        date_fin: end.toISOString(),
        ...(selectedPatient && { patient_id: selectedPatient, motif: slotMotif.trim() }),
      };
      await creerCreneau(data);
      setSuccess('Créneau ajouté au planning.');
      setStartDate('');
      setEndDate('');
      setSelectedPatient('');
      setSlotMotif('');
      await Promise.all([refresh(), refreshSlots()]);
    } catch (cause) {
      setError(cause.message || 'Impossible de créer ce créneau.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (appointment, status) => {
    setError('');
    try {
      await modifierRendezVous(appointment.id, {
        statut: status,
        ...(status === 'confirme' && { date_confirmee: appointment.date_confirmee || appointment.date_souhaitee }),
      });
      await refresh();
    } catch (cause) {
      setError(cause.message || 'Impossible de mettre à jour le rendez-vous.');
    }
  };

  const saveConsultation = async () => {
    if (!selectedAppointment || !consultationNotes.trim()) {
      setError('Sélectionnez un rendez-vous et saisissez les notes de consultation.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await creerConsultation(selectedAppointment, { remarques: consultationNotes.trim() });
      setConsultationNotes('');
      setSelectedAppointment('');
      setSuccess('Compte rendu enregistré dans le dossier médical.');
      await refresh();
    } catch (cause) {
      setError(cause.message || 'Impossible d’enregistrer la consultation.');
    } finally {
      setSaving(false);
    }
  };

  const slotOptions = slots.filter((slot) => slot.est_ouvert).map((slot) => ({
    value: slot.id,
    label: `${formatDate(slot.date_heure)} · jusqu’à ${formatDate(slot.date_fin)}`,
  }));
  const patientOptions = patients.map((patient) => ({
    value: patient.id, label: `${patient.prenoms} ${patient.nom} · ${patient.telephone}`,
  }));

  return (
    <Page title="Planning médical" subtitle={`${staffService || 'Service'} · rendez-vous et créneaux`} loading={loading} onRefresh={() => { setLoading(true); void refresh(); }}>
      <Notice>{error}</Notice>
      <Notice type="success">{success}</Notice>
      <Card title={isDoctor ? 'Mes rendez-vous' : 'Demandes de rendez-vous'}>
        {appointments.length ? appointments.map((item) => (
          <View key={item.id} style={{ gap: 7, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ color: colors.ink, fontWeight: '800' }}>{item.patient_prenoms} {item.patient_nom}</Text>
            <Text style={{ color: colors.teal, fontWeight: '700' }}>{item.service_nom} · {item.statut.replaceAll('_', ' ')}</Text>
            <Text style={{ color: colors.muted }}>{formatDate(item.date_confirmee || item.date_souhaitee)}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{item.motif}</Text>
            {item.statut === 'en_attente' ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title="Confirmer" onPress={() => updateStatus(item, 'confirme')} style={{ flex: 1 }} />
                <Button title="Refuser" variant="danger" onPress={() => updateStatus(item, 'refuse')} style={{ flex: 1 }} />
              </View>
            ) : null}
            {isDoctor && item.statut === 'confirme' ? (
              <Button title="Rédiger le compte rendu" variant="secondary" onPress={() => setSelectedAppointment(item.id)} />
            ) : null}
          </View>
        )) : <Empty>Aucun rendez-vous à afficher.</Empty>}
      </Card>
      {isDoctor && selectedAppointment ? (
        <Card title="Compte rendu médical">
          <Field label="Observations" value={consultationNotes} onChangeText={setConsultationNotes} multiline placeholder="Notes de consultation" />
          <Button title="Enregistrer dans le dossier" onPress={saveConsultation} loading={saving} />
          <Button title="Annuler" variant="secondary" onPress={() => setSelectedAppointment('')} />
        </Card>
      ) : null}
      <Card title="Créneaux de consultation">
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          Service attribué : {service?.nom || 'Aucun service correspondant au compte.'}
        </Text>
        {slotOptions.length ? slotOptions.map((slot) => (
          <Text key={slot.value} style={{ color: colors.ink, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>{slot.label}</Text>
        )) : <Empty>Aucun créneau ouvert.</Empty>}
        <Field label="Début (AAAA-MM-JJ HH:MM)" value={startDate} onChangeText={setStartDate} placeholder="2026-11-15 09:00" />
        <Field label="Fin (AAAA-MM-JJ HH:MM)" value={endDate} onChangeText={setEndDate} placeholder="2026-11-15 10:00" />
        {isDoctor ? <SelectList label="Ajouter un patient (facultatif)" value={selectedPatient} options={patientOptions} onChange={setSelectedPatient} emptyLabel="Aucun patient chargé." /> : null}
        {selectedPatient ? <Field label="Motif du rendez-vous" value={slotMotif} onChangeText={setSlotMotif} /> : null}
        <Button title="Créer le créneau" onPress={createSlot} loading={saving} disabled={!service} />
      </Card>
    </Page>
  );
}

export function RecordsScreen() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const result = await listerPatientsPourCreneau();
      setPatients(result);
      if (!selectedPatient && result.length) setSelectedPatient(result[0].id);
    } catch (cause) {
      setError(cause.message || 'Impossible de charger la liste des patients.');
    } finally {
      setLoading(false);
    }
  }, [selectedPatient]);
  useEffect(() => { void refresh(); }, [refresh]);
  useRealtimeRefresh(['dossiers', 'patients', 'rendez-vous'], refresh);
  useEffect(() => {
    if (!selectedPatient) return undefined;
    let actif = true;
    dossierComplet(selectedPatient)
      .then((data) => { if (actif) setRecord(data); })
      .catch((cause) => { if (actif) setError(cause.message || 'Impossible de charger le dossier médical.'); });
    return () => { actif = false; };
  }, [selectedPatient]);

  return (
    <Page title="Dossiers patients" subtitle="Consultation des informations médicales pour votre service." loading={loading} onRefresh={() => { setLoading(true); void refresh(); }}>
      <Notice>{error}</Notice>
      <SelectList label="Patient" value={selectedPatient} options={patients.map((patient) => ({
        value: patient.id, label: `${patient.prenoms} ${patient.nom}`,
      }))} onChange={setSelectedPatient} />
      {record ? <Card title={`${record.patient_prenoms} ${record.patient_nom}`}>
        <Text style={{ color: colors.muted }}>Téléphone · {record.patient_telephone || 'Non renseigné'}</Text>
        <Text style={{ color: colors.ink, fontWeight: '800', marginTop: 10 }}>Historique médical</Text>
        {record.rendez_vous?.length ? record.rendez_vous.map((item) => (
          <View key={item.id} style={{ gap: 4, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>{item.service_nom} · {item.statut}</Text>
            <Text style={{ color: colors.muted }}>{formatDate(item.date_confirmee || item.date_souhaitee)}</Text>
            <Text style={{ color: colors.muted }}>{item.consultation?.remarques || item.motif}</Text>
          </View>
        )) : <Empty>Aucun historique disponible.</Empty>}
      </Card> : null}
    </Page>
  );
}
