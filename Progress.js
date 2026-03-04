import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const C = {
  bgPrimary:     '#1C1C1E',
  bgCard:        '#2C2C2E',
  bgElevated:    '#3A3A3C',
  textPrimary:   '#F5F0E8',
  textSecondary: '#A09A8E',
  textMuted:     '#6B6560',
  accent:        '#F5A623',
  accentGreen:   '#4CAF7D',
  accentRed:     '#E05C5C',
  accentBlue:    '#7B9FD4',
  border:        '#3A3A3C',
};

const COACHES = {
  alex:   { name: 'Alex',   emoji: '🤝', accentColor: '#F5A623' },
  marcus: { name: 'Marcus', emoji: '🔥', accentColor: '#E05C5C' },
  morgan: { name: 'Morgan', emoji: '📊', accentColor: '#4CAF7D' },
  sam:    { name: 'Sam',    emoji: '🌿', accentColor: '#7B9FD4' },
};

const getDateKey  = () => new Date().toISOString().slice(0, 10);
const formatDate  = (iso) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
const formatFull  = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Mini sparkline using View bars
function Sparkline({ data, color, height = 40 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 3 }}>
      {data.map((val, i) => {
        const pct = (val - min) / range;
        const barH = Math.max(4, pct * (height - 4));
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: barH,
              backgroundColor: i === data.length - 1 ? color : color + '50',
              borderRadius: 2,
            }}
          />
        );
      })}
    </View>
  );
}

// Single stat card with sparkline
function StatCard({ label, value, unit, delta, deltaLabel, chartData, color, onPress }) {
  const up = delta > 0;
  const isWeight = label.toLowerCase().includes('weight');
  // For weight, down is good if goal is cut, but let's keep it neutral
  return (
    <TouchableOpacity style={pStyles.statCard} onPress={onPress} activeOpacity={0.8}>
      <View style={pStyles.statTop}>
        <View>
          <Text style={pStyles.statLabel}>{label}</Text>
          <View style={pStyles.statValueRow}>
            <Text style={[pStyles.statValue, { color }]}>{value ?? '—'}</Text>
            <Text style={pStyles.statUnit}>{unit}</Text>
          </View>
        </View>
        {delta !== null && delta !== undefined && (
          <View style={[pStyles.deltaBadge, { backgroundColor: up ? C.accentGreen + '20' : C.accentRed + '20' }]}>
            <Text style={[pStyles.deltaText, { color: up ? C.accentGreen : C.accentRed }]}>
              {up ? '+' : ''}{delta}{unit} {deltaLabel}
            </Text>
          </View>
        )}
      </View>
      {chartData && chartData.length > 1 && (
        <View style={{ marginTop: 12 }}>
          <Sparkline data={chartData} color={color} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const pStyles = StyleSheet.create({
  statCard:      { backgroundColor: C.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, flex: 1 },
  statTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statLabel:     { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 2, marginBottom: 4 },
  statValueRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statValue:     { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  statUnit:      { fontSize: 14, color: C.textMuted, fontWeight: '500' },
  deltaBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  deltaText:     { fontSize: 12, fontWeight: '700' },
});

// Log entry modal
function LogModal({ visible, onClose, onSave, accentColor }) {
  const [weight,  setWeight]  = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes,   setNotes]   = useState('');

  const handleSave = () => {
    if (!weight.trim()) { Alert.alert('Add your weight', 'Weight is required to log progress.'); return; }
    onSave({ weight: parseFloat(weight), bodyFat: bodyFat ? parseFloat(bodyFat) : null, notes: notes.trim(), date: getDateKey() });
    setWeight(''); setBodyFat(''); setNotes('');
    onClose();
  };

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      style={StyleSheet.absoluteFill}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Log Today</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={modalStyles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={modalStyles.fieldLabel}>WEIGHT (lbs)</Text>
          <TextInput
            style={modalStyles.input}
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g. 192"
            placeholderTextColor={C.textMuted}
            keyboardType="decimal-pad"
            autoFocus
          />

          <Text style={modalStyles.fieldLabel}>BODY FAT % (optional)</Text>
          <TextInput
            style={modalStyles.input}
            value={bodyFat}
            onChangeText={setBodyFat}
            placeholder="e.g. 15.5"
            placeholderTextColor={C.textMuted}
            keyboardType="decimal-pad"
          />

          <Text style={modalStyles.fieldLabel}>NOTES (optional)</Text>
          <TextInput
            style={[modalStyles.input, { minHeight: 72 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="How are you feeling? Any observations..."
            placeholderTextColor={C.textMuted}
            multiline
          />

          <TouchableOpacity
            style={[modalStyles.saveBtn, { backgroundColor: accentColor }]}
            onPress={handleSave}
          >
            <Text style={modalStyles.saveBtnText}>Save Entry ✓</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const modalStyles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: C.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:      { fontSize: 20, fontWeight: '800', color: C.textPrimary },
  close:      { fontSize: 20, color: C.textMuted },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 2, marginBottom: 8, marginTop: 16 },
  input:      { backgroundColor: C.bgCard, borderRadius: 12, padding: 14, color: C.textPrimary, fontSize: 16, borderWidth: 1, borderColor: C.border },
  saveBtn:    { marginTop: 24, paddingVertical: 16, borderRadius: 100, alignItems: 'center' },
  saveBtnText:{ color: C.bgPrimary, fontSize: 16, fontWeight: '700' },
});

export default function ProgressScreen({ navigation, userData, coachId }) {
  const coach = COACHES[coachId] || COACHES.alex;

  const [entries,    setEntries]    = useState([]);
  const [logVisible, setLogVisible] = useState(false);

  const startWeight = parseFloat(userData?.weight) || null;

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const raw = await AsyncStorage.getItem('progress_entries');
      if (raw) setEntries(JSON.parse(raw));
    } catch (e) { console.warn(e); }
  };

  const saveEntry = async (entry) => {
    // Replace today's entry if one exists
    const filtered = entries.filter(e => e.date !== entry.date);
    const next = [entry, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    setEntries(next);
    await AsyncStorage.setItem('progress_entries', JSON.stringify(next));
  };

  const deleteEntry = (date) => {
    Alert.alert('Delete entry?', formatFull(date), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const next = entries.filter(e => e.date !== date);
          setEntries(next);
          await AsyncStorage.setItem('progress_entries', JSON.stringify(next));
        }
      }
    ]);
  };

  // Stats
  const latest     = entries[0];
  const oldest     = entries[entries.length - 1];
  const weightData = [...entries].reverse().map(e => e.weight).filter(Boolean);
  const bfData     = [...entries].reverse().map(e => e.bodyFat).filter(Boolean);

  const weightDelta = entries.length > 1
    ? Math.round((latest.weight - oldest.weight) * 10) / 10
    : null;

  const bfDelta = bfData.length > 1
    ? Math.round((bfData[bfData.length - 1] - bfData[0]) * 10) / 10
    : null;

  const totalFromStart = startWeight && latest
    ? Math.round((latest.weight - startWeight) * 10) / 10
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <LogModal
        visible={logVisible}
        onClose={() => setLogVisible(false)}
        onSave={saveEntry}
        accentColor={coach.accentColor}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Home</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{coach.emoji}</Text>
          <View>
            <Text style={[styles.headerName, { color: coach.accentColor }]}>Progress</Text>
            <Text style={styles.headerSub}>Track your body over time</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.logBtn, { borderColor: coach.accentColor }]}
          onPress={() => setLogVisible(true)}
        >
          <Text style={[styles.logBtnText, { color: coach.accentColor }]}>+ Log</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Empty state */}
        {entries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📈</Text>
            <Text style={styles.emptyTitle}>No entries yet.</Text>
            <Text style={styles.emptySubtitle}>
              Log your weight daily or weekly. Over time you'll see your trend and {coach.name} can use it to adjust your plan.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: coach.accentColor }]}
              onPress={() => setLogVisible(true)}
            >
              <Text style={styles.emptyBtnText}>Log Today →</Text>
            </TouchableOpacity>
          </View>
        )}

        {entries.length > 0 && (
          <>
            {/* Stat cards */}
            <View style={styles.statsRow}>
              <StatCard
                label="CURRENT"
                value={latest?.weight}
                unit="lbs"
                delta={weightDelta}
                deltaLabel="total"
                chartData={weightData}
                color={coach.accentColor}
              />
              {latest?.bodyFat && (
                <StatCard
                  label="BODY FAT"
                  value={latest?.bodyFat}
                  unit="%"
                  delta={bfDelta}
                  deltaLabel="total"
                  chartData={bfData}
                  color={C.accentBlue}
                />
              )}
            </View>

            {/* From start */}
            {totalFromStart !== null && (
              <View style={styles.startCard}>
                <Text style={styles.startLabel}>FROM STARTING WEIGHT</Text>
                <Text style={styles.startWeight}>{startWeight} lbs → {latest.weight} lbs</Text>
                <Text style={[
                  styles.startDelta,
                  { color: totalFromStart > 0 ? C.accentGreen : C.accentRed }
                ]}>
                  {totalFromStart > 0 ? '+' : ''}{totalFromStart} lbs since you started
                </Text>
              </View>
            )}

            {/* Entries list */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>ALL ENTRIES</Text>
              {entries.map((entry, i) => (
                <TouchableOpacity
                  key={entry.date}
                  style={[styles.entryRow, i < entries.length - 1 && styles.entryBorder]}
                  onLongPress={() => deleteEntry(entry.date)}
                  activeOpacity={0.7}
                >
                  <View style={styles.entryLeft}>
                    <Text style={styles.entryDate}>{formatFull(entry.date)}</Text>
                    {entry.notes ? <Text style={styles.entryNotes} numberOfLines={1}>{entry.notes}</Text> : null}
                  </View>
                  <View style={styles.entryRight}>
                    <Text style={[styles.entryWeight, { color: coach.accentColor }]}>{entry.weight}</Text>
                    <Text style={styles.entryWeightUnit}>lbs</Text>
                    {entry.bodyFat && <Text style={styles.entryBF}>{entry.bodyFat}% bf</Text>}
                  </View>
                </TouchableOpacity>
              ))}
              <Text style={styles.deleteHint}>Long press an entry to delete</Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bgPrimary },
  header:         { paddingTop: 8, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn:        { paddingVertical: 4, paddingRight: 4 },
  backText:       { fontSize: 14, fontWeight: '600', color: C.textMuted },
  headerCenter:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerEmoji:    { fontSize: 22 },
  headerName:     { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  headerSub:      { fontSize: 12, color: C.textMuted, marginTop: 1 },
  logBtn:         { borderWidth: 1.5, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  logBtnText:     { fontSize: 13, fontWeight: '700' },
  scroll:         { padding: 16 },
  statsRow:       { flexDirection: 'row', gap: 10, marginBottom: 12 },
  startCard:      { backgroundColor: C.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  startLabel:     { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 2, marginBottom: 8 },
  startWeight:    { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  startDelta:     { fontSize: 14, fontWeight: '600' },
  card:           { backgroundColor: C.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  sectionTitle:   { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 3, marginBottom: 14 },
  entryRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  entryBorder:    { borderBottomWidth: 1, borderBottomColor: C.border },
  entryLeft:      { flex: 1 },
  entryDate:      { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  entryNotes:     { fontSize: 12, color: C.textMuted, marginTop: 2 },
  entryRight:     { alignItems: 'flex-end' },
  entryWeight:    { fontSize: 22, fontWeight: '800' },
  entryWeightUnit:{ fontSize: 11, color: C.textMuted },
  entryBF:        { fontSize: 12, color: C.accentBlue, marginTop: 2 },
  deleteHint:     { fontSize: 11, color: C.textMuted, textAlign: 'center', marginTop: 12 },
  emptyState:     { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyEmoji:     { fontSize: 48 },
  emptyTitle:     { fontSize: 22, fontWeight: '800', color: C.textPrimary, textAlign: 'center' },
  emptySubtitle:  { fontSize: 15, color: C.textSecondary, textAlign: 'center', lineHeight: 23 },
  emptyBtn:       { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 100, marginTop: 8 },
  emptyBtnText:   { color: C.bgPrimary, fontSize: 15, fontWeight: '700' },
});