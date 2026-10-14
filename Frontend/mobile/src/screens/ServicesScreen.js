import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Button, Card, Empty, Notice, Page } from '../components/ui';
import { services as chargerServices } from '../services/api';
import { colors } from '../theme';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';

export default function ServicesScreen({
  navigation,
  authenticated = false,
  canBookAppointments = false,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setItems(await chargerServices());
      setError('');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useRealtimeRefresh(['services'], refresh);

  return (
    <Page
      title="Nos spécialités"
      subtitle="Découvrez les services de soins du CENHOSOA."
      loading={loading}
      onRefresh={() => { setLoading(true); void refresh(); }}
    >
      <Notice>{error}</Notice>
      {items.length === 0 && !loading ? <Empty>Aucun service n’est actuellement disponible.</Empty> : null}
      {items.map((service) => (
        <Card key={service.id}>
          <Text style={{ color: colors.teal, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>{service.horaires || 'SERVICE HOSPITALIER'}</Text>
          <Text style={{ color: colors.ink, fontSize: 21, fontWeight: '800' }}>{service.nom}</Text>
          {service.description ? <Text style={{ color: colors.muted, lineHeight: 21 }}>{service.description}</Text> : null}
          {service.responsable ? <Text style={{ color: colors.ink, fontSize: 13 }}>Responsable · {service.responsable}</Text> : null}
          {service.localisation ? <Text style={{ color: colors.muted, fontSize: 13 }}>📍 {service.localisation}</Text> : null}
          {service.telephone ? (
            <Pressable onPress={() => Linking.openURL(`tel:${service.telephone}`)}>
              <Text style={{ color: colors.teal, fontWeight: '700' }}>☎ {service.telephone}</Text>
            </Pressable>
          ) : null}
          {!authenticated || canBookAppointments ? (
            <Button
              title="Demander un rendez-vous"
              onPress={() => canBookAppointments
                ? navigation.navigate('Mes rendez-vous', { serviceId: service.id })
                : navigation.navigate('Connexion')}
            />
          ) : null}
        </Card>
      ))}
    </Page>
  );
}
