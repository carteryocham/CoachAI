import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OPENAI_API_KEY } from './env';

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

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const getDateKey = () => new Date().toISOString().slice(0, 10);
const getTodayName = () => DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

const buildTrainingPrompt = (userData, coachId) => {
  const coachVoices = {
    alex:   `You're Alex, a warm coach. Your exercise notes are encouraging, conversational, and explain the why briefly.`,
    marcus: `You're Marcus, tough love. Notes are short, intense, no fluff. Push them.`,
    morgan: `You're Morgan, science-driven. Notes explain the physiological purpose — muscle recruitment, progressive overload, recovery.`,
    sam:    `You're Sam, holistic. Notes connect the exercise to energy, recovery, and long-term sustainability.`,
  };

  return `
${coachVoices[coachId] || coachVoices.alex}

Build a 7-day training split for this person:
- Weight: ${userData?.weight || 190} lbs
- Goal: ${userData?.goal || 'build muscle'}
- Training days per week: ${userData?.trainingDays || 4}

Rules:
- Match the number of training days to their preference
- Fill remaining days with active recovery or rest
- Each training day has a clear focus (e.g. Upper Push, Lower Pull, Full Body)
- 4-6 exercises per training day
- Each exercise has: sets, reps (or duration), a short coach note
- Rest days have 1-2 light recovery suggestions (walk, stretch, etc.)
- Keep exercises practical — barbells, dumbbells, bodyweight, cables

Respond ONLY with valid JSON, no markdown. Structure:
{
  "split": "Upper/Lower 4-Day Split",
  "days": [
    {
      "day": "Monday",
      "type": "Training",
      "focus": "Upper Push",
      "exercises": [
        {
          "name": "Bench Press",
          "sets": 4,
          "reps": "6-8",
          "note": "Drive through your chest, not your shoulders."
        }
      ]
    },
    {
      "day": "Tuesday",
      "type": "Rest",
      "focus": "Recovery",
      "exercises": [
        {
          "name": "20-min walk",
          "sets": 1,
          "reps": "20 min",
          "note": "Keep it easy. This is active recovery, not cardio."
        }
      ]
    }
  ]
}
`;
};

function ExerciseRow({ exercise, accentColor, index }) {
  return (
    <View style={[exStyles.row, index > 0 && exStyles.rowBorder]}>
      <View style={exStyles.left}>
        <Text style={exStyles.name}>{exercise.name}</Text>
        <Text style={exStyles.note}>{exercise.note}</Text>
      </View>
      <View style={exStyles.right}>
        <Text style={[exStyles.sets, { color: accentColor }]}>{exercise.sets}×</Text>
        <Text style={exStyles.reps}>{exercise.reps}</Text>
      </View>
    </View>
  );
}

const exStyles = StyleSheet.create({
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  left:      { flex: 1, paddingRight: 12 },
  name:      { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 3 },
  note:      { fontSize: 12, color: C.textMuted, lineHeight: 18, fontStyle: 'italic' },
  right:     { alignItems: 'flex-end', minWidth: 52 },
  sets:      { fontSize: 20, fontWeight: '800' },
  reps:      { fontSize: 11, color: C.textMuted, marginTop: 1 },
});

function DayCard({ day, accentColor, isToday, isCompleted, onToggleComplete }) {
  const [expanded, setExpanded] = useState(isToday);
  const isTraining = day.type === 'Training';

  return (
    <View style={[
      dayStyles.card,
      isToday && { borderColor: accentColor },
      isCompleted && { borderColor: C.accentGreen + '80', backgroundColor: '#1A231E' },
    ]}>
      <TouchableOpacity
        style={dayStyles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View style={dayStyles.headerLeft}>
          {isToday && <View style={[dayStyles.todayDot, { backgroundColor: accentColor }]} />}
          <View>
            <Text style={[dayStyles.dayName, isToday && { color: accentColor }]}>{day.day}</Text>
            <View style={[dayStyles.typeBadge, { backgroundColor: isTraining ? accentColor + '20' : C.bgElevated }]}>
              <Text style={[dayStyles.typeText, { color: isTraining ? accentColor : C.textMuted }]}>
                {isTraining ? `💪 ${day.focus}` : `😴 ${day.focus}`}
              </Text>
            </View>
          </View>
        </View>
        <View style={dayStyles.headerRight}>
          {isTraining && (
            <Text style={dayStyles.exerciseCount}>{day.exercises?.length} exercises</Text>
          )}
          <Text style={dayStyles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={dayStyles.body}>
          {day.exercises?.map((ex, i) => (
            <ExerciseRow key={i} exercise={ex} accentColor={accentColor} index={i} />
          ))}
          {isTraining && (
            <TouchableOpacity
              style={[
                dayStyles.completeBtn,
                isCompleted
                  ? { backgroundColor: C.accentGreen, borderColor: C.accentGreen }
                  : { borderColor: accentColor },
              ]}
              onPress={() => onToggleComplete(day.day)}
            >
              <Text style={[dayStyles.completeBtnText, { color: isCompleted ? C.bgPrimary : accentColor }]}>
                {isCompleted ? '✓ Completed' : 'Mark Complete'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const dayStyles = StyleSheet.create({
  card:          { backgroundColor: C.bgCard, borderRadius: 16, marginBottom: 10, borderWidth: 1.5, borderColor: C.border, overflow: 'hidden' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  todayDot:      { width: 8, height: 8, borderRadius: 4 },
  dayName:       { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  typeBadge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, alignSelf: 'flex-start' },
  typeText:      { fontSize: 12, fontWeight: '700' },
  headerRight:   { alignItems: 'flex-end', gap: 4 },
  exerciseCount: { fontSize: 12, color: C.textMuted },
  chevron:       { fontSize: 11, color: C.textMuted },
  body:          { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: C.border },
  completeBtn:   { marginTop: 14, paddingVertical: 11, borderRadius: 100, alignItems: 'center', borderWidth: 1.5 },
  completeBtnText: { fontSize: 14, fontWeight: '700' },
});

export default function TrainingScreen({ navigation, userData, coachId }) {
  const coach = COACHES[coachId] || COACHES.alex;

  const [plan,       setPlan]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [completed,  setCompleted]  = useState(new Set());
  const today = getTodayName();

  // Load saved plan and completions
  useEffect(() => {
    const load = async () => {
      try {
        const [savedPlan, savedCompleted] = await Promise.all([
          AsyncStorage.getItem('training_plan'),
          AsyncStorage.getItem(`training_completed_${getDateKey()}`),
        ]);
        if (savedPlan)      setPlan(JSON.parse(savedPlan));
        if (savedCompleted) setCompleted(new Set(JSON.parse(savedCompleted)));
      } catch (e) { console.warn(e); }
    };
    load();
  }, []);

  const generate = async () => {
    setLoading(true);
    setPlan(null);
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer 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` },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a strength and conditioning coach that outputs only valid JSON training plans. No markdown. No explanation outside the JSON.' },
            { role: 'user',   content: buildTrainingPrompt(userData, coachId) },
          ],
          max_tokens: 2500, temperature: 0.7,
        }),
      });
      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const data   = await resp.json();
      const raw    = data.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw);
      setPlan(parsed);
      await AsyncStorage.setItem('training_plan', JSON.stringify(parsed));
    } catch (e) {
      Alert.alert('Generation failed', e.message || 'Check your connection and try again.');
    } finally { setLoading(false); }
  };

  const toggleComplete = async (dayName) => {
    const next = new Set(completed);
    next.has(dayName) ? next.delete(dayName) : next.add(dayName);
    setCompleted(next);
    await AsyncStorage.setItem(`training_completed_${getDateKey()}`, JSON.stringify([...next]));
  };

  const weekCompleted = plan?.days?.filter(d => d.type === 'Training' && completed.has(d.day)).length || 0;
  const weekTotal     = plan?.days?.filter(d => d.type === 'Training').length || 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Home</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{coach.emoji}</Text>
          <View>
            <Text style={[styles.headerName, { color: coach.accentColor }]}>{coach.name}'s Training Plan</Text>
            <Text style={styles.headerSub}>Built for your goal</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: coach.accentColor }, loading && { opacity: 0.5 }]}
          onPress={generate}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={C.bgPrimary} />
            : <Text style={styles.generateBtnText}>{plan ? 'Regenerate Plan ↺' : 'Generate My Plan ↗'}</Text>
          }
        </TouchableOpacity>

        {/* Week progress */}
        {plan && (
          <View style={styles.progressCard}>
            <Text style={styles.progressLabel}>THIS WEEK</Text>
            <View style={styles.progressRow}>
              <Text style={[styles.progressNum, { color: coach.accentColor }]}>{weekCompleted}</Text>
              <Text style={styles.progressOf}>/ {weekTotal} sessions done</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[
                styles.progressFill,
                { width: weekTotal > 0 ? `${(weekCompleted / weekTotal) * 100}%` : '0%', backgroundColor: coach.accentColor }
              ]} />
            </View>
            {plan.split && <Text style={styles.splitLabel}>{plan.split}</Text>}
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={coach.accentColor} size="large" />
            <Text style={[styles.loadingText, { color: coach.accentColor }]}>
              {coach.name} is building your plan...
            </Text>
          </View>
        )}

        {/* Empty state */}
        {!plan && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{coach.emoji}</Text>
            <Text style={styles.emptyTitle}>No training plan yet.</Text>
            <Text style={styles.emptySubtitle}>
              {coach.name} will build a full week split based on your {userData?.trainingDays || 4} training days and {userData?.goal?.toLowerCase()} goal.
            </Text>
          </View>
        )}

        {/* Plan */}
        {plan?.days?.map((day, i) => (
          <DayCard
            key={i}
            day={day}
            accentColor={coach.accentColor}
            isToday={day.day === today}
            isCompleted={completed.has(day.day)}
            onToggleComplete={toggleComplete}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bgPrimary },
  header:          { paddingTop: 8, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn:         { paddingVertical: 4, paddingRight: 8 },
  backText:        { fontSize: 14, fontWeight: '600', color: C.textMuted },
  headerCenter:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerEmoji:     { fontSize: 24 },
  headerName:      { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  headerSub:       { fontSize: 12, color: C.textMuted, marginTop: 1 },
  scroll:          { padding: 16 },
  generateBtn:     { paddingVertical: 16, borderRadius: 100, alignItems: 'center', marginBottom: 16 },
  generateBtnText: { color: C.bgPrimary, fontSize: 16, fontWeight: '700' },
  progressCard:    { backgroundColor: C.bgCard, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  progressLabel:   { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 3, marginBottom: 10 },
  progressRow:     { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  progressNum:     { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  progressOf:      { fontSize: 16, color: C.textSecondary, fontWeight: '500' },
  progressTrack:   { height: 6, backgroundColor: C.bgElevated, borderRadius: 3, marginBottom: 10 },
  progressFill:    { height: 6, borderRadius: 3 },
  splitLabel:      { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },
  loadingState:    { alignItems: 'center', paddingVertical: 60, gap: 16 },
  loadingText:     { fontSize: 18, fontWeight: '700' },
  emptyState:      { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyEmoji:      { fontSize: 48 },
  emptyTitle:      { fontSize: 22, fontWeight: '800', color: C.textPrimary, textAlign: 'center' },
  emptySubtitle:   { fontSize: 15, color: C.textSecondary, textAlign: 'center', lineHeight: 23 },
});