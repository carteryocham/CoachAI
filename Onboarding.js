import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, TextInput,
} from 'react-native';

const TOTAL_STEPS = 10;

const HEIGHTS = (() => {
  const h = [];
  for (let ft = 4; ft <= 7; ft++) {
    const max = ft === 7 ? 2 : 11;
    for (let inch = 0; inch <= max; inch++) h.push(`${ft}'${inch}"`);
  }
  return h;
})();

const WEIGHTS = (() => {
  const w = [];
  for (let i = 80; i <= 500; i++) w.push(`${i} lbs`);
  return w;
})();

// ─── OPTION CARD ──────────────────────────────────────────────────────────────
function OptionCard({ label, sub, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[s.card, selected && s.cardSel]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[s.cardLabel, selected && s.cardLabelSel]}>{label}</Text>
      {sub ? <Text style={[s.cardSub, selected && s.cardSubSel]}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

// ─── SCROLL PICKER ────────────────────────────────────────────────────────────
function PickerWheel({ label, options, selected, onSelect }) {
  return (
    <View>
      {label ? <Text style={s.statLabel}>{label}</Text> : null}
      <View style={s.pickerWrap}>
        {/* Top bracket line */}
        <View style={s.bracketTop}>
          <View style={s.bracketCornerTL} />
          <View style={s.bracketCornerTR} />
        </View>

        <ScrollView style={s.picker} showsVerticalScrollIndicator={false}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[s.pickerItem, selected === opt && s.pickerItemSel]}
              onPress={() => onSelect(opt)}
            >
              <Text style={[s.pickerText, selected === opt && s.pickerTextSel]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bottom bracket line */}
        <View style={s.bracketBot}>
          <View style={s.bracketCornerBL} />
          <View style={s.bracketCornerBR} />
        </View>
      </View>
      {selected
        ? <Text style={s.selLabel}>{selected} selected</Text>
        : <Text style={s.selLabel}>Scroll and tap to select</Text>
      }
    </View>
  );
}

// ─── STEP SHELL ───────────────────────────────────────────────────────────────
function Shell({ step, onBack, children }) {
  const progress = step / TOTAL_STEPS;
  return (
    <SafeAreaView style={s.shell}>
      <View style={s.topBar}>
        {step > 1 ? (
          <TouchableOpacity style={s.backBtn} onPress={onBack}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.backBtn} />
        )}
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    goal:        null,
    gender:      null,
    age:         null,
    height:      '',
    weight:      '',
    goalWeight:  '',
    bodyFat:     null,
    trainingDays:null,
    sleep:       null,
    blockers:    [],
    injuries:    '',
  });

  const sel = (key, val) => setData(prev => ({ ...prev, [key]: val }));
  const tog = (key, val) => setData(prev => ({
    ...prev,
    [key]: prev[key].includes(val)
      ? prev[key].filter(x => x !== val)
      : [...prev[key], val],
  }));

  const canNext = () => {
    if (step === 1)  return !!data.goal;
    if (step === 2)  return !!data.gender;
    if (step === 3)  return !!data.age;
    if (step === 4)  return !!data.height;
    if (step === 5)  return !!data.weight;
    if (step === 6)  return !!data.goalWeight;
    if (step === 7)  return !!data.bodyFat;
    if (step === 8)  return !!data.trainingDays;
    if (step === 9)  return !!data.sleep;
    if (step === 10) return data.blockers.length > 0;
    return true;
  };

  const next = () => {
    if (step < TOTAL_STEPS) { setStep(s => s + 1); return; }
    onComplete(data);
  };

  const renderStep = () => {
    switch (step) {

      // 1 — Goal
      case 1: return (
        <>
          <Text style={s.eyebrow}>WELCOME</Text>
          <Text style={s.heading}>What's your{'\n'}main goal?</Text>
          <Text style={s.sub}>Your coach builds everything around this.</Text>
          <View style={s.cards}>
            {[
              { v: 'Lose fat',            sub: 'Cut, lean out, stay athletic' },
              { v: 'Build muscle',        sub: 'Lean bulk, strength, size' },
              { v: 'Recomposition',       sub: 'Build muscle while losing fat' },
              { v: 'Improve performance', sub: 'Athletic performance and energy' },
              { v: 'Maintain & tone',     sub: 'Keep what I have, get sharper' },
            ].map(o => (
              <OptionCard key={o.v} label={o.v} sub={o.sub}
                selected={data.goal === o.v} onPress={() => sel('goal', o.v)} />
            ))}
          </View>
        </>
      );

      // 2 — Gender
      case 2: return (
        <>
          <Text style={s.heading}>Biological{'\n'}sex?</Text>
          <Text style={s.sub}>Used to calibrate calorie and hormone targets.</Text>
          <View style={s.cards}>
            {['Male', 'Female', 'Other / Prefer not to say'].map(o => (
              <OptionCard key={o} label={o}
                selected={data.gender === o} onPress={() => sel('gender', o)} />
            ))}
          </View>
        </>
      );

      // 3 — Age
      case 3: return (
        <>
          <Text style={s.heading}>How old{'\n'}are you?</Text>
          <Text style={s.sub}>Metabolism and recovery targets{'\n'}are age-dependent.</Text>
          <View style={s.cards}>
            {[
              { v: '18–24', label: '18–24' },
              { v: '25–34', label: '25–34' },
              { v: '35–44', label: '35–44' },
              { v: '45+',   label: '45+' },
            ].map(o => (
              <OptionCard key={o.v} label={o.label}
                selected={data.age === o.v} onPress={() => sel('age', o.v)} />
            ))}
          </View>
        </>
      );

      // 4 — Height
      case 4: return (
        <>
          <Text style={s.heading}>Your height.</Text>
          <Text style={s.sub}>Used to calculate your maintenance{'\n'}calories and macro targets.</Text>
          <PickerWheel
            label="HEIGHT"
            options={HEIGHTS}
            selected={data.height}
            onSelect={v => sel('height', v)}
          />
        </>
      );

      // 5 — Current weight
      case 5: return (
        <>
          <Text style={s.heading}>Current{'\n'}weight?</Text>
          <Text style={s.sub}>In pounds. We'll use this to set your starting baseline.</Text>
          <PickerWheel
            label="WEIGHT"
            options={WEIGHTS}
            selected={data.weight}
            onSelect={v => sel('weight', v)}
          />
        </>
      );

      // 6 — Goal weight
      case 6: return (
        <>
          <Text style={s.heading}>Goal{'\n'}weight?</Text>
          <Text style={s.sub}>Where do you want to be? Your coach tracks this.</Text>
          <PickerWheel
            label="GOAL WEIGHT"
            options={WEIGHTS}
            selected={data.goalWeight}
            onSelect={v => sel('goalWeight', v)}
          />
        </>
      );

      // 7 — Body fat
      case 7: return (
        <>
          <Text style={s.heading}>Approximate{'\n'}body fat?</Text>
          <Text style={s.sub}>A rough estimate is fine. Helps calibrate your targets.</Text>
          <View style={s.cards}>
            {[
              { v: 'Very lean (<10%)',        sub: 'Visible abs, vascular' },
              { v: 'Lean (10–15%)',           sub: 'Some definition' },
              { v: 'Average (15–25%)',        sub: 'Soft but not overweight' },
              { v: 'Carrying extra (25–35%)', sub: 'Want to lose significant fat' },
              { v: 'Higher (35%+)',           sub: 'Just getting started' },
            ].map(o => (
              <OptionCard key={o.v} label={o.v} sub={o.sub}
                selected={data.bodyFat === o.v} onPress={() => sel('bodyFat', o.v)} />
            ))}
          </View>
        </>
      );

      // 8 — Training days
      case 8: return (
        <>
          <Text style={s.heading}>How often{'\n'}do you train?</Text>
          <Text style={s.sub}>Your coach adjusts carbs and calories to your schedule.</Text>
          <View style={s.cards}>
            {[
              { v: '0–1', sub: 'Rarely or just starting' },
              { v: '2–3', sub: 'A few days a week' },
              { v: '4–5', sub: 'Consistent athlete' },
              { v: '6–7', sub: 'Daily training' },
            ].map(o => (
              <OptionCard key={o.v} label={`${o.v} days/week`} sub={o.sub}
                selected={data.trainingDays === o.v} onPress={() => sel('trainingDays', o.v)} />
            ))}
          </View>
        </>
      );

      // 9 — Sleep
      case 9: return (
        <>
          <Text style={s.heading}>How much{'\n'}do you sleep?</Text>
          <Text style={s.sub}>Sleep directly affects hunger hormones and recovery speed.</Text>
          <View style={s.cards}>
            {[
              { v: '< 5 hrs', sub: 'Frequently sleep deprived' },
              { v: '5–6 hrs', sub: 'Often under-recovered' },
              { v: '6–7 hrs', sub: 'Average — room to improve' },
              { v: '7–8 hrs', sub: 'Good baseline' },
              { v: '8+ hrs',  sub: 'Well rested' },
            ].map(o => (
              <OptionCard key={o.v} label={o.v} sub={o.sub}
                selected={data.sleep === o.v} onPress={() => sel('sleep', o.v)} />
            ))}
          </View>
        </>
      );

      // 10 — Blockers
      case 10: return (
        <>
          <Text style={s.heading}>What's been{'\n'}holding you back?</Text>
          <Text style={s.sub}>Select all that apply. Your coach will address these directly.</Text>
          <View style={s.cards}>
            {[
              { v: 'Consistency',           sub: 'Starting strong, falling off' },
              { v: 'Late night eating',      sub: 'Cravings after 9pm' },
              { v: 'Not knowing what to eat',sub: 'Guessing all the time' },
              { v: 'No accountability',      sub: 'Need someone to answer to' },
              { v: 'Busy schedule',          sub: 'Hard to meal prep or train' },
              { v: 'Recovery issues',        sub: 'Always sore, always tired' },
              { v: 'Stress eating',          sub: 'Food as emotional outlet' },
            ].map(o => (
              <OptionCard key={o.v} label={o.v} sub={o.sub}
                selected={data.blockers.includes(o.v)} onPress={() => tog('blockers', o.v)} />
            ))}
          </View>
        </>
      );
    }
  };

  return (
    <View style={s.root}>
      <Shell step={step} onBack={() => setStep(s => s - 1)}>
        {renderStep()}
      </Shell>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.continueBtn, !canNext() && s.continueBtnOff]}
          onPress={next}
          disabled={!canNext()}
        >
          <Text style={[s.continueTxt, !canNext() && s.continueTxtOff]}>
            {step === TOTAL_STEPS ? 'Meet Your Coach →' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#0a0a0a' },
  shell:         { flex: 1 },
  topBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 },
  backBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  backArrow:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  progressTrack: { flex: 1, height: 3, backgroundColor: '#1a1a1a', borderRadius: 2 },
  progressFill:  { height: 3, backgroundColor: '#fff', borderRadius: 2 },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },

  eyebrow:  { fontSize: 11, fontWeight: '700', color: '#555', letterSpacing: 3, marginBottom: 12 },
  heading:  { fontSize: 38, fontWeight: '800', color: '#fff', lineHeight: 44, letterSpacing: -0.5, marginBottom: 10 },
  sub:      { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 28 },

  cards:        { gap: 10 },
  card:         { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#2a2a2a' },
  cardSel:      { backgroundColor: '#fff', borderColor: '#fff' },
  cardLabel:    { fontSize: 16, fontWeight: '600', color: '#fff' },
  cardLabelSel: { color: '#0a0a0a' },
  cardSub:      { fontSize: 13, color: '#555', marginTop: 3 },
  cardSubSel:   { color: '#444' },

  statLabel:     { fontSize: 11, fontWeight: '700', color: '#555', letterSpacing: 2, marginBottom: 10, textAlign: 'center' },
  pickerWrap:    { position: 'relative', marginBottom: 8 },
  picker:        { height: 160, backgroundColor: '#1a1a1a', borderRadius: 14 },
  pickerItem:    { paddingVertical: 10, alignItems: 'center', marginHorizontal: 8, borderRadius: 8 },
pickerItemSel: { backgroundColor: '#F5A623' },
pickerText:    { fontSize: 17, color: '#555', fontWeight: '500' },
pickerTextSel: { color: '#0a0a0a', fontWeight: '800', fontSize: 17 },
  bracketTop:    { position: 'absolute', top: 57, left: 16, right: 16, height: 2, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  bracketBot:    { position: 'absolute', top: 101, left: 16, right: 16, height: 2, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  bracketCornerTL: { width: 14, height: 10, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#F5A623', borderTopLeftRadius: 3 },
  bracketCornerTR: { width: 14, height: 10, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#F5A623', borderTopRightRadius: 3 },
  bracketCornerBL: { width: 14, height: 10, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#F5A623', borderBottomLeftRadius: 3 },
  bracketCornerBR: { width: 14, height: 10, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#F5A623', borderBottomRightRadius: 3 },
  pickerCenterHighlight: {},
  selLabel:      { textAlign: 'center', marginTop: 10, fontSize: 13, color: '#555', fontWeight: '500' },

  footer:         { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12, backgroundColor: '#0a0a0a' },
  continueBtn:    { backgroundColor: '#fff', borderRadius: 100, paddingVertical: 17, alignItems: 'center' },
  continueBtnOff: { backgroundColor: '#1a1a1a' },
  continueTxt:    { fontSize: 16, fontWeight: '700', color: '#0a0a0a' },
  continueTxtOff: { color: '#333' },
});