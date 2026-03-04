import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, ScrollView, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from './services/supabase';

const { width } = Dimensions.get('window');

const C = {
  bg:         '#1C1C1E',
  card:       '#2C2C2E',
  elevated:   '#3A3A3C',
  text:       '#F5F0E8',
  secondary:  '#A09A8E',
  muted:      '#6B6560',
  accent:     '#F5A623',
  accentGreen:'#4CAF7D',
  accentBlue: '#7B9FD4',
  accentRed:  '#E05C5C',
  border:     '#3A3A3C',
};

const COACHES = {
  alex:   { name: 'Alex',   emoji: '🤝', color: '#F5A623' },
  marcus: { name: 'Marcus', emoji: '🔥', color: '#E05C5C' },
  morgan: { name: 'Morgan', emoji: '📊', color: '#4CAF7D' },
  sam:    { name: 'Sam',    emoji: '🌿', color: '#7B9FD4' },
};

const getDateString = () => new Date().toISOString().slice(0, 10);

// ─── MACRO RING ───────────────────────────────────────────────────────────────
function MacroRing({ label, consumed, goal, color, unit = 'g' }) {
  const size       = (width / 2) - 40;
  const radius     = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct        = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const offset     = circumference - pct * circumference;
  const remaining  = Math.max(0, goal - consumed);

  return (
    <View style={[ring.wrap, { width: size, height: size + 40 }]}>
      <View style={ring.svgWrap}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          {/* Track */}
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={C.elevated} strokeWidth={10} fill="none"
          />
          {/* Fill */}
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={color} strokeWidth={10} fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={ring.center}>
          <Text style={[ring.num, { color }]}>
            {Math.round(consumed)}
          </Text>
          <Text style={ring.unit}>{unit === 'kcal' ? 'kcal' : 'g'}</Text>
        </View>
      </View>
      <Text style={ring.label}>{label}</Text>
      <Text style={ring.remaining}>
        {Math.round(remaining)}{unit === 'kcal' ? ' kcal' : 'g'} left
      </Text>
    </View>
  );
}

const ring = StyleSheet.create({
  wrap:      { alignItems: 'center', marginBottom: 8 },
  svgWrap:   { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  center:    { position: 'absolute', alignItems: 'center' },
  num:       { fontSize: 24, fontWeight: '800', letterSpacing: -1 },
  unit:      { fontSize: 11, color: C.muted, fontWeight: '600', marginTop: -2 },
  label:     { fontSize: 13, fontWeight: '700', color: C.text, marginTop: 8 },
  remaining: { fontSize: 11, color: C.muted, marginTop: 2 },
});

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Home({ navigation, userData, coachId }) {
  const coach = COACHES[coachId] || COACHES.alex;

  const [streak,  setStreak]  = useState(1);
  const [totals,  setTotals]  = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [meals,   setMeals]   = useState([]);

  // Calculate goals from userData
  const gw      = parseInt(userData?.goalWeight) || parseInt(userData?.weight) || 180;
  const cw      = parseInt(userData?.weight) || 190;
  const goal    = (userData?.goal || '').toLowerCase();
  const isLose  = goal.includes('lose') || goal.includes('fat');
  const isBuild = goal.includes('build') || goal.includes('muscle');

  const calGoal     = isLose ? Math.round(cw * 12) : isBuild ? Math.round(cw * 16) : Math.round(cw * 14);
  const proteinGoal = Math.round(gw * 0.9);
  const fatGoal     = Math.round(cw * 0.35);
  const carbGoal    = Math.max(100, Math.round((calGoal - proteinGoal * 4 - fatGoal * 9) / 4));

  const goals = { calories: calGoal, protein: proteinGoal, carbs: carbGoal, fats: fatGoal };

  // Load data on focus (refreshes when coming back from Chat)
  useFocusEffect(
    useCallback(() => {
      loadTodayData();
      initStreak();
    }, [])
  );

  const initStreak = async () => {
    try {
      const today       = getDateString();
      const lastOpen    = await AsyncStorage.getItem('last_open_date');
      const savedStreak = await AsyncStorage.getItem('streak');
      let s = parseInt(savedStreak || '1');
      if (lastOpen && lastOpen !== today) {
        const diff = Math.floor((new Date(today) - new Date(lastOpen)) / 86400000);
        s = diff === 1 ? s + 1 : 1;
        await AsyncStorage.setItem('streak', String(s));
      }
      setStreak(s);
      await AsyncStorage.setItem('last_open_date', today);
    } catch (e) {}
  };

  const loadTodayData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
  .from('daily_logs')
  .select('*')
  .eq('user_id', user.id)
  .eq('log_date', today)
  .order('created_at', { ascending: true });

console.log('meals data:', JSON.stringify(data));
console.log('meals error:', JSON.stringify(error));

if (!error && data) setMeals(data);

      setMeals(data);
      const t = data.reduce((acc, m) => ({
        calories: acc.calories + (m.calories || 0),
        protein:  acc.protein  + (m.protein  || 0),
        carbs:    acc.carbs    + (m.carbs    || 0),
        fats:     acc.fats     + (m.fats     || 0),
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
      setTotals(t);
    } catch (e) {}
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting}</Text>
            <View style={s.streakRow}>
              <Text style={s.streakFire}>🔥</Text>
              <Text style={s.streakText}>{streak} day streak</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.menuBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={s.menuDots}>···</Text>
          </TouchableOpacity>
        </View>

        {/* Macro rings 2x2 */}
        <View style={s.ringCard}>
          <Text style={s.sectionLabel}>TODAY'S NUTRITION</Text>
          <View style={s.ringGrid}>
            <MacroRing label="Calories" consumed={totals.calories} goal={goals.calories} color={C.text}    unit="kcal" />
            <MacroRing label="Protein"  consumed={totals.protein}  goal={goals.protein}  color={C.accent} />
            <MacroRing label="Carbs"    consumed={totals.carbs}    goal={goals.carbs}    color={C.accentGreen} />
            <MacroRing label="Fats"     consumed={totals.fats}     goal={goals.fats}     color={C.accentBlue} />
          </View>
        </View>

        {/* Chat button */}
        <TouchableOpacity
          style={[s.chatBtn, { backgroundColor: coach.color }]}
          onPress={() => navigation.navigate('Chat')}
          activeOpacity={0.85}
        >
          <Text style={s.chatBtnEmoji}>{coach.emoji}</Text>
          <View>
            <Text style={s.chatBtnTitle}>Chat with {coach.name}</Text>
            <Text style={s.chatBtnSub}>Log food · Get coaching · Ask anything</Text>
          </View>
          <Text style={s.chatBtnArrow}>→</Text>
        </TouchableOpacity>

        {/* Today's meals */}
        {meals.length > 0 && (
          <View style={s.mealsCard}>
            <View style={s.mealsCardHeader}>
              <Text style={s.sectionLabel}>LOGGED TODAY</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Meals')}>
                <Text style={s.viewAll}>View all →</Text>
              </TouchableOpacity>
            </View>
            {meals.slice(0, 3).map((m, i) => (
              <View key={m.id} style={[s.mealRow, i < Math.min(meals.length, 3) - 1 && s.mealBorder]}>
                <Text style={s.mealDesc} numberOfLines={2}>{m.description}</Text>
                <Text style={s.mealMacros}>
                  {Math.round(m.calories)} kcal · {Math.round(m.protein)}g protein
                </Text>
              </View>
            ))}
            {meals.length > 3 && (
              <TouchableOpacity onPress={() => navigation.navigate('Meals')} style={s.moreMeals}>
                <Text style={s.moreMealsText}>+{meals.length - 3} more meals</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {meals.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>
              Tell {coach.name} what you ate and it'll show up here automatically.
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  scroll:       { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting:     { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  streakRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  streakFire:   { fontSize: 13 },
  streakText:   { fontSize: 13, color: C.muted, fontWeight: '500' },
  menuBtn:      { width: 40, height: 36, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  menuDots:     { fontSize: 18, color: C.secondary, fontWeight: '700', letterSpacing: 1, marginTop: -4 },

  ringCard:     { backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 3, marginBottom: 16 },
  ringGrid:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  chatBtn:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 18, marginBottom: 14 },
  chatBtnEmoji: { fontSize: 28 },
  chatBtnTitle: { fontSize: 16, fontWeight: '800', color: '#0a0a0a' },
  chatBtnSub:   { fontSize: 12, color: '#0a0a0a', opacity: 0.7, marginTop: 2 },
  chatBtnArrow: { marginLeft: 'auto', fontSize: 20, color: '#0a0a0a', fontWeight: '700' },

  mealsCard:       { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  mealsCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  viewAll:         { fontSize: 12, color: C.accent, fontWeight: '600' },
  mealRow:         { paddingVertical: 10 },
  mealBorder:      { borderBottomWidth: 1, borderBottomColor: C.border },
  mealDesc:        { fontSize: 14, color: C.text, lineHeight: 20 },
  mealMacros:      { fontSize: 12, color: C.muted, marginTop: 3 },
  moreMeals:       { paddingTop: 10, alignItems: 'center' },
  moreMealsText:   { fontSize: 13, color: C.muted, fontWeight: '500' },

  emptyCard:    { backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  emptyText:    { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21 },
});