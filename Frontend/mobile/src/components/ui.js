import React from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { colors, radii } from '../theme';

export function Page({ title, subtitle, children, loading, refreshing, onRefresh }) {
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.teal} /> : undefined}
    >
      <View style={styles.pageHeading}>
        <Text style={styles.kicker}>CENHOSOA · SOAVINANDRIANA</Text>
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {onRefresh ? (
        <Pressable accessibilityRole="button" onPress={onRefresh} style={styles.refresh}>
          <Text style={styles.refreshText}>Actualiser</Text>
        </Pressable>
      ) : null}
      {loading ? <ActivityIndicator color={colors.teal} style={styles.spinner} /> : children}
    </ScrollView>
  );
}

export function Card({ title, children, style }) {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType, secureTextEntry, editable = true }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        editable={editable}
        style={[styles.input, multiline && styles.multiline, !editable && styles.disabled]}
      />
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style }) {
  const secondary = variant === 'secondary';
  const danger = variant === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.buttonSecondary : danger ? styles.buttonDanger : styles.buttonPrimary,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={secondary ? colors.teal : colors.white} /> : <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText, danger && styles.buttonDangerText]}>{title}</Text>}
    </Pressable>
  );
}

export function Notice({ children, type = 'error' }) {
  if (!children) return null;
  const success = type === 'success';
  return (
    <View style={[styles.notice, success ? styles.noticeSuccess : styles.noticeError]}>
      <Text style={[styles.noticeText, success && styles.noticeSuccessText]}>{children}</Text>
    </View>
  );
}

export function Empty({ children = 'Aucune donnée à afficher.' }) {
  return <Text style={styles.empty}>{children}</Text>;
}

export function SelectList({ label, value, options, onChange, emptyLabel = 'Choisir une option' }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {options.length ? options.map((option) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: value === option.value }}
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[styles.option, value === option.value && styles.optionSelected]}
        >
          <Text style={[styles.optionText, value === option.value && styles.optionSelectedText]}>{option.label}</Text>
        </Pressable>
      )) : <Text style={styles.empty}>{emptyLabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 48, gap: 16 },
  pageHeading: { gap: 6, paddingVertical: 8 },
  kicker: { color: colors.teal, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  pageTitle: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  refresh: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: colors.pale },
  refreshText: { color: colors.teal, fontWeight: '700', fontSize: 12 },
  spinner: { margin: 30 },
  card: { backgroundColor: colors.white, borderRadius: radii.card, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 12, shadowColor: colors.ink, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  field: { gap: 7, width: '100%' },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.control, paddingHorizontal: 13, paddingVertical: 12, color: colors.ink, backgroundColor: colors.white, fontSize: 15, minHeight: 48 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  button: { minHeight: 48, borderRadius: radii.control, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: colors.teal },
  buttonSecondary: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1 },
  buttonDanger: { backgroundColor: colors.dangerPale, borderColor: '#FECDCA', borderWidth: 1 },
  buttonText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  buttonSecondaryText: { color: colors.teal },
  buttonDangerText: { color: colors.danger },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
  notice: { padding: 13, borderRadius: 13, backgroundColor: colors.dangerPale, borderWidth: 1, borderColor: '#FECDCA' },
  noticeError: { backgroundColor: colors.dangerPale, borderColor: '#FECDCA' },
  noticeSuccess: { backgroundColor: colors.successPale, borderColor: '#ABEFC6' },
  noticeText: { color: colors.danger, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  noticeSuccessText: { color: colors.success },
  empty: { color: colors.muted, fontSize: 13, lineHeight: 20, paddingVertical: 6 },
  option: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },
  optionSelected: { borderColor: colors.teal, backgroundColor: colors.pale },
  optionText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  optionSelectedText: { color: colors.teal },
});
