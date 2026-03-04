import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const C = {
  bg:        '#1C1C1E',
  card:      '#2C2C2E',
  elevated:  '#3A3A3C',
  text:      '#F5F0E8',
  secondary: '#A09A8E',
  muted:     '#6B6560',
  accent:    '#F5A623',
  border:    '#3A3A3C',
};

const COACHES = {
  alex: {
    id: 'alex', name: 'Alex', emoji: '🤝', accentColor: '#F5A623',
    tagline: 'Warm, honest, straight-talking.',
    description: 'Feels like a gym best friend who actually knows what they\'re doing. Explains the why, calls out patterns, never judges.',
    preview: "Hey — good to have you here. I'll ask you a few questions first to understand where you're at, then we'll build a clear picture of what you need. Honesty beats perfection here.",
  },
  marcus: {
    id: 'marcus', name: 'Marcus', emoji: '🔥', accentColor: '#E05C5C',
    tagline: 'Direct. High standards. No fluff.',
    description: 'Tough love with real substance. Holds you to your word and cuts through excuses fast.',
    preview: "Let's skip the small talk. I'll ask what I need to know, then give you a plan. You follow it, you get results. You don't, we fix it. Simple.",
  },
  morgan: {
    id: 'morgan', name: 'Morgan', emoji: '📊', accentColor: '#4CAF7D',
    tagline: 'Evidence-based. Always explains the why.',
    description: 'Methodical and precise. Connects every recommendation to the physiology behind it.',
    preview: "Before I give you anything, I want to understand your full picture. Every recommendation I make will have a clear reason behind it — no guesswork, no dogma.",
  },
  sam: {
    id: 'sam', name: 'Sam', emoji: '🌿', accentColor: '#7B9FD4',
    tagline: 'Whole-person coaching. Body and life together.',
    description: 'Coaches sleep, stress, mindset, and food as one system — not separate boxes.',
    preview: "Before we talk food and training, I want to know how you\'re actually doing. Energy, sleep, stress — those shape everything else. Let's start there.",
  },
};

export default function CoachSelect({ onCoachSelected }) {
  const [selected, setSelected] = useState('alex');
  const coach = COACHES[selected];

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.eyebrow}>ONE LAST THING</Text>
        <Text style={s.title}>Choose your coach.</Text>
        <Text style={s.subtitle}>Same knowledge. Different relationship.{'\n'}You can switch anytime in settings.</Text>

        {/* Coach cards */}
        {Object.values(COACHES).map(c => {
          const active = selected === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[s.card, active && { borderColor: c.accentColor }]}
              onPress={() => setSelected(c.id)}
              activeOpacity={0.8}
            >
              <View style={s.cardRow}>
                <Text style={s.emoji}>{c.emoji}</Text>
                <View style={s.cardMid}>
                  <Text style={[s.coachName, active && { color: c.accentColor }]}>{c.name}</Text>
                  <Text style={s.tagline}>{c.tagline}</Text>
                </View>
                <View style={[s.radio, active && { borderColor: c.accentColor, backgroundColor: c.accentColor }]}>
                  {active && <View style={s.radioDot} />}
                </View>
              </View>

              {active && (
                <>
                  <View style={s.divider} />
                  <Text style={s.desc}>{c.description}</Text>
                  <View style={s.previewBox}>
                    <Text style={s.previewLabel}>HOW THEY OPEN</Text>
                    <Text style={s.previewText}>"{c.preview}"</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[s.cta, { backgroundColor: coach.accentColor }]}
          onPress={() => onCoachSelected(selected)}
        >
          <Text style={s.ctaText}>Start with {coach.name} →</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  scroll:      { padding: 24, paddingTop: 20 },
  eyebrow:     { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 4, marginBottom: 10 },
  title:       { fontSize: 34, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 8 },
  subtitle:    { fontSize: 15, color: C.secondary, lineHeight: 23, marginBottom: 28 },
  card:        { backgroundColor: C.card, borderRadius: 16, padding: 18, marginBottom: 10, borderWidth: 1.5, borderColor: C.border },
  cardRow:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emoji:       { fontSize: 28 },
  cardMid:     { flex: 1 },
  coachName:   { fontSize: 19, fontWeight: '800', color: C.text },
  tagline:     { fontSize: 13, color: C.muted, marginTop: 2, fontWeight: '500' },
  radio:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.muted, alignItems: 'center', justifyContent: 'center' },
  radioDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: C.bg },
  divider:     { height: 1, backgroundColor: C.border, marginVertical: 14 },
  desc:        { fontSize: 14, color: C.secondary, lineHeight: 22, marginBottom: 14 },
  previewBox:  { backgroundColor: C.elevated, borderRadius: 12, padding: 14 },
  previewLabel:{ fontSize: 9, fontWeight: '700', color: C.muted, letterSpacing: 2, marginBottom: 6 },
  previewText: { fontSize: 13, color: C.secondary, lineHeight: 20, fontStyle: 'italic' },
  cta:         { paddingVertical: 18, borderRadius: 100, alignItems: 'center', marginTop: 12 },
  ctaText:     { color: C.bg, fontSize: 17, fontWeight: '700' },
});