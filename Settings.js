import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, ScrollView, TextInput, Alert, Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './services/supabase';

const C = {
  bg:        '#1C1C1E',
  card:      '#2C2C2E',
  elevated:  '#3A3A3C',
  text:      '#F5F0E8',
  secondary: '#A09A8E',
  muted:     '#6B6560',
  accent:    '#F5A623',
  accentRed: '#E05C5C',
  border:    '#3A3A3C',
};

const COACHES = [
  { id: 'alex',   name: 'Alex',   emoji: '🤝', tagline: 'Warm, honest, knows you well.',           color: '#F5A623' },
  { id: 'marcus', name: 'Marcus', emoji: '🔥', tagline: 'Tough love. No excuses.',                 color: '#E05C5C' },
  { id: 'morgan', name: 'Morgan', emoji: '📊', tagline: 'Data-driven. Every decision has a why.',  color: '#4CAF7D' },
  { id: 'sam',    name: 'Sam',    emoji: '🌿', tagline: 'Sleep, stress, body — all connected.',    color: '#7B9FD4' },
];

export default function Settings({ navigation, userData, coachId, onUpdateUser, onUpdateCoach }) {
  const rawW  = userData?.weight?.toString().replace(/[^0-9]/g, '') || '';
  const rawGW = userData?.goalWeight?.toString().replace(/[^0-9]/g, '') || '';

  const [weight,     setWeight]     = useState(rawW);
  const [goalWeight, setGoalWeight] = useState(rawGW);
  const [saved,      setSaved]      = useState(false);

  const saveProfile = async () => {
    try {
      const updated = { ...userData, weight: weight + ' lbs', goalWeight: goalWeight + ' lbs' };
      await AsyncStorage.setItem('user_data', JSON.stringify(updated));
      onUpdateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      Alert.alert('Error', 'Could not save. Try again.');
    }
  };

  const confirmSwitchCoach = (id) => {
    if (id === coachId) return;
    Alert.alert(
      `Switch to ${COACHES.find(c => c.id === id)?.name}?`,
      'Your conversation history will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', onPress: () => switchCoach(id) },
      ]
    );
  };

  const switchCoach = async (id) => {
    try {
      await AsyncStorage.setItem('coach_id', id);
      onUpdateCoach(id);
      const { data: { user } } = await supabase.auth.getUser();
    } catch (e) {}
  };

  const signOut = () => {
    Alert.alert('Sign out?', "You'll need to sign back in.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          await AsyncStorage.multiRemove(['user_data', 'coach_id', 'onboarded', 'streak', 'last_open_date']);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Progress */}
        <Text style={s.sectionLabel}>YOUR PROGRESS</Text>
        <View style={s.card}>
          <Text style={s.cardNote}>Update as you make progress — this recalculates your macro targets.</Text>
          <View style={s.inputRow}>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>CURRENT WEIGHT</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={C.muted}
                  maxLength={3}
                />
                <Text style={s.inputUnit}>lbs</Text>
              </View>
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>GOAL WEIGHT</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  value={goalWeight}
                  onChangeText={setGoalWeight}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={C.muted}
                  maxLength={3}
                />
                <Text style={s.inputUnit}>lbs</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={[s.saveBtn, saved && s.saveBtnDone]} onPress={saveProfile}>
            <Text style={s.saveBtnText}>{saved ? '✓ Saved' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>

        {/* Coach */}
        <Text style={s.sectionLabel}>YOUR COACH</Text>
        <View style={s.card}>
          {COACHES.map((coach, i) => (
            <View key={coach.id}>
              <TouchableOpacity
                style={s.coachRow}
                onPress={() => confirmSwitchCoach(coach.id)}
                activeOpacity={0.8}
              >
                <Text style={s.coachEmoji}>{coach.emoji}</Text>
                <View style={s.coachInfo}>
                  <Text style={[s.coachName, coachId === coach.id && { color: coach.color }]}>{coach.name}</Text>
                  <Text style={s.coachTagline}>{coach.tagline}</Text>
                </View>
                {coachId === coach.id && (
                  <View style={[s.activeBadge, { backgroundColor: coach.color + '22', borderColor: coach.color }]}>
                    <Text style={[s.activeBadgeText, { color: coach.color }]}>Active</Text>
                  </View>
                )}
              </TouchableOpacity>
              {i < COACHES.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>

        {/* Account */}
        <Text style={s.sectionLabel}>ACCOUNT</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={() => Alert.alert('Coming soon', 'Subscription management coming in the next update.')}>
            <Text style={s.rowText}>Subscription</Text>
            <Text style={s.rowMeta}>Free plan  →</Text>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <Text style={s.sectionLabel}>LEGAL</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={() => Linking.openURL('https://yourapp.com/privacy')}>
            <Text style={s.rowText}>Privacy Policy</Text>
            <Text style={s.rowArrow}>→</Text>
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={s.row} onPress={() => Linking.openURL('https://yourapp.com/terms')}>
            <Text style={s.rowText}>Terms of Service</Text>
            <Text style={s.rowArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backText:       { fontSize: 15, color: C.secondary, fontWeight: '600', width: 60 },
  title:          { fontSize: 17, fontWeight: '800', color: C.text },
  scroll:         { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel:   { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 3, marginBottom: 10, marginLeft: 4 },
  card:           { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 28, borderWidth: 1, borderColor: C.border },
  cardNote:       { fontSize: 13, color: C.muted, lineHeight: 20, marginBottom: 16 },
  inputRow:       { flexDirection: 'row', gap: 12, marginBottom: 14 },
  inputGroup:     { flex: 1 },
  inputLabel:     { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 2, marginBottom: 8 },
  inputWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.elevated, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
  input:          { flex: 1, fontSize: 20, fontWeight: '700', color: C.text },
  inputUnit:      { fontSize: 13, color: C.muted, fontWeight: '600' },
  saveBtn:        { backgroundColor: C.accent, borderRadius: 100, paddingVertical: 13, alignItems: 'center' },
  saveBtnDone:    { backgroundColor: '#4CAF7D' },
  saveBtnText:    { fontSize: 15, fontWeight: '700', color: '#0a0a0a' },
  coachRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  coachEmoji:     { fontSize: 24, width: 32, textAlign: 'center' },
  coachInfo:      { flex: 1 },
  coachName:      { fontSize: 16, fontWeight: '700', color: C.text },
  coachTagline:   { fontSize: 12, color: C.muted, marginTop: 1 },
  activeBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  activeBadgeText:{ fontSize: 11, fontWeight: '700' },
  row:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowText:        { fontSize: 15, color: C.text },
  rowMeta:        { fontSize: 13, color: C.muted },
  rowArrow:       { fontSize: 15, color: C.muted },
  divider:        { height: 1, backgroundColor: C.border, marginVertical: 8 },
  signOutBtn:     { alignItems: 'center', paddingVertical: 16, borderRadius: 100, borderWidth: 1, borderColor: C.accentRed + '60', marginBottom: 12 },
  signOutText:    { fontSize: 15, fontWeight: '600', color: C.accentRed },
});