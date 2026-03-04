import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, ScrollView, Animated, PanResponder,
  Alert, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from './services/supabase';

const C = {
  bg:          '#1C1C1E',
  card:        '#2C2C2E',
  elevated:    '#3A3A3C',
  text:        '#F5F0E8',
  secondary:   '#A09A8E',
  muted:       '#6B6560',
  accent:      '#F5A623',
  accentRed:   '#E05C5C',
  accentGreen: '#4CAF7D',
  accentBlue:  '#7B9FD4',
  border:      '#3A3A3C',
};

const getDateString = () => new Date().toISOString().slice(0, 10);

// ─── SWIPEABLE ROW ────────────────────────────────────────────────────────────
function SwipeRow({ meal, onDelete }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const DELETE_THRESHOLD = -80;

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 && Math.abs(g.dy) < 20,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) translateX.setValue(Math.max(g.dx, -100));
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < DELETE_THRESHOLD) {
        // Snap to show delete button
        Animated.spring(translateX, { toValue: -80, useNativeDriver: true }).start();
      } else {
        // Snap back
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  })).current;

  const closeRow = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  };

  const confirmDelete = () => {
    Alert.alert(
      'Remove meal?',
      'This will remove it from today\'s log and update your macro rings.',
      [
        { text: 'Cancel', onPress: closeRow, style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onDelete(meal.id) },
      ]
    );
  };

  return (
    <View style={sw.container}>
      {/* Delete button behind */}
      <View style={sw.deleteBtn}>
        <TouchableOpacity style={sw.deleteTap} onPress={confirmDelete}>
          <Text style={sw.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable row */}
      <Animated.View
        style={[sw.row, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={sw.rowInner}>
          <Text style={sw.desc} numberOfLines={2}>{meal.description}</Text>
          <View style={sw.macroRow}>
            <Text style={[sw.macro, { color: C.text }]}>{Math.round(meal.calories)} kcal</Text>
            <Text style={sw.dot}>·</Text>
            <Text style={[sw.macro, { color: C.accent }]}>{Math.round(meal.protein)}g protein</Text>
            <Text style={sw.dot}>·</Text>
            <Text style={[sw.macro, { color: C.accentGreen }]}>{Math.round(meal.carbs)}g carbs</Text>
            <Text style={sw.dot}>·</Text>
            <Text style={[sw.macro, { color: C.accentBlue }]}>{Math.round(meal.fats)}g fat</Text>
          </View>
          <Text style={sw.time}>
            {new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const sw = StyleSheet.create({
  container:  { marginBottom: 10, borderRadius: 14, overflow: 'hidden' },
  deleteBtn:  { position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, backgroundColor: C.accentRed, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  deleteTap:  { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  row:        { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  rowInner:   { padding: 14 },
  desc:       { fontSize: 14, color: C.text, fontWeight: '600', lineHeight: 20, marginBottom: 6 },
  macroRow:   { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginBottom: 4 },
  macro:      { fontSize: 12, fontWeight: '600' },
  dot:        { fontSize: 12, color: C.muted },
  time:       { fontSize: 11, color: C.muted },
});

// ─── TOTALS BAR ───────────────────────────────────────────────────────────────
function TotalsBar({ meals }) {
  const t = meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein:  acc.protein  + (m.protein  || 0),
    carbs:    acc.carbs    + (m.carbs    || 0),
    fats:     acc.fats     + (m.fats     || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  return (
    <View style={tb.wrap}>
      <Text style={tb.label}>TODAY'S TOTAL</Text>
      <View style={tb.row}>
        <View style={tb.item}>
          <Text style={[tb.val, { color: C.text }]}>{Math.round(t.calories)}</Text>
          <Text style={tb.unit}>kcal</Text>
        </View>
        <View style={tb.divider} />
        <View style={tb.item}>
          <Text style={[tb.val, { color: C.accent }]}>{Math.round(t.protein)}g</Text>
          <Text style={tb.unit}>protein</Text>
        </View>
        <View style={tb.divider} />
        <View style={tb.item}>
          <Text style={[tb.val, { color: C.accentGreen }]}>{Math.round(t.carbs)}g</Text>
          <Text style={tb.unit}>carbs</Text>
        </View>
        <View style={tb.divider} />
        <View style={tb.item}>
          <Text style={[tb.val, { color: C.accentBlue }]}>{Math.round(t.fats)}g</Text>
          <Text style={tb.unit}>fat</Text>
        </View>
      </View>
    </View>
  );
}

const tb = StyleSheet.create({
  wrap:    { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  label:   { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 3, marginBottom: 12 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  item:    { flex: 1, alignItems: 'center' },
  val:     { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  unit:    { fontSize: 11, color: C.muted, marginTop: 2 },
  divider: { width: 1, height: 36, backgroundColor: C.border },
});

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Meals({ navigation }) {
  const [meals,   setMeals]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId,  setUserId]  = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, [])
  );

  const loadMeals = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const today = getDateString();
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .order('created_at', { ascending: true });

      if (!error && data) setMeals(data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const deleteMeal = async (id) => {
    try {
      await supabase.from('daily_logs').delete().eq('id', id);
      setMeals(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      Alert.alert('Error', 'Could not delete. Try again.');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Today's Log</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {meals.length > 0 ? (
            <>
              <TotalsBar meals={meals} />
              <Text style={s.sectionLabel}>MEALS — SWIPE LEFT TO DELETE</Text>
              {meals.map(meal => (
                <SwipeRow key={meal.id} meal={meal} onDelete={deleteMeal} />
              ))}
            </>
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🍽️</Text>
              <Text style={s.emptyTitle}>Nothing logged yet</Text>
              <Text style={s.emptySub}>Tell your coach what you ate and tap "Log it" to track your meals here.</Text>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backText:     { fontSize: 15, color: C.secondary, fontWeight: '600', width: 60 },
  title:        { fontSize: 17, fontWeight: '800', color: C.text },
  scroll:       { paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 3, marginBottom: 12, marginLeft: 2 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:        { alignItems: 'center', paddingTop: 80 },
  emptyEmoji:   { fontSize: 48, marginBottom: 16 },
  emptyTitle:   { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 8 },
  emptySub:     { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
});