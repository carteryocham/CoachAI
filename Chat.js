import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput,
  FlatList, KeyboardAvoidingView, Platform, SafeAreaView,
  ActivityIndicator, Keyboard, Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './services/supabase';
import Constants from 'expo-constants';
const SUPABASE_ANON_KEY = Constants.expoConfig.extra.SUPABASE_ANON_KEY;

const C = {
  bg:        '#1C1C1E',
  card:      '#2C2C2E',
  elevated:  '#3A3A3C',
  text:      '#F5F0E8',
  secondary: '#A09A8E',
  muted:     '#6B6560',
  accent:    '#F5A623',
  accentRed: '#E05C5C',
  accentGreen:'#4CAF7D',
  border:    '#3A3A3C',
};

const COACHES = {
  alex:   { name: 'Alex',   emoji: '🤝', color: '#F5A623' },
  marcus: { name: 'Marcus', emoji: '🔥', color: '#E05C5C' },
  morgan: { name: 'Morgan', emoji: '📊', color: '#4CAF7D' },
  sam:    { name: 'Sam',    emoji: '🌿', color: '#7B9FD4' },
};

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const buildSystemPrompt = (userData, coachId) => {
  const coachVoice = {
    alex:   `Your name is Alex. You coach like a knowledgeable gym best friend — warm, honest, straight-talking. You explain the why briefly, call out patterns without judgment, and always give a clear next step. Never fluff. Never hype. Just real, useful coaching.`,
    marcus: `Your name is Marcus. You coach with high standards and direct communication. Short sentences. No fluff. You acknowledge effort briefly when earned, name excuses when they appear, and redirect fast. Intense but never cruel.`,
    morgan: `Your name is Morgan. You coach with precision and evidence. Every recommendation has a clear physiological reason. You explain mechanisms briefly and connect today's choices to long-term outcomes. Calm and exact.`,
    sam:    `Your name is Sam. You coach the whole person — sleep, stress, energy, mindset, and food are one system. You check in before jumping to advice. Warm, present, curious. People feel understood before they feel instructed.`,
  };

  const hasProfile = userData && userData.age;
  const goalW = parseInt(userData?.goalWeight) || parseInt(userData?.weight) || 180;
  const currW = parseInt(userData?.weight) || 190;
  const protein_target = Math.round(goalW * 0.9);
  const training_cals  = Math.round(currW * 15);
  const rest_cals      = Math.round(currW * 12);

  const profile = hasProfile ? `
YOU ALREADY KNOW EVERYTHING ABOUT THIS PERSON. Do NOT ask questions they already answered.

CLIENT PROFILE:
- Age: ${userData.age}
- Sex: ${userData.gender}
- Height: ${userData.height}
- Current weight: ${userData.weight}
- Goal weight: ${userData.goalWeight}
- Body fat estimate: ${userData.bodyFat}
- Primary goal: ${userData.goal}
- Training: ${userData.trainingDays} days/week
- Sleep: ${userData.sleep}
- Biggest struggles: ${Array.isArray(userData.blockers) ? userData.blockers.join(', ') : userData.blockers}
- Injuries/health: ${userData.injuries || 'none reported'}

THEIR CALCULATED DAILY TARGETS:
- Protein: ~${protein_target}g/day (non-negotiable anchor)
- Training day calories: ~${training_cals}
- Rest day calories: ~${rest_cals}
- Carbs: higher on training days, lower on rest days
- Fat: moderate — avoid stacking high fat + high carbs in same meal
` : `Ask setup questions ONE AT A TIME: Age → Sex → Height → Current weight → Goal weight → Body fat → Primary goal → Training days/week → Sleep → Biggest struggles. Then build their plan immediately.`;

  return `
${coachVoice[coachId] || coachVoice.alex}

${profile}

================================
RESPONSE FORMAT — FOLLOW THIS EXACTLY
================================

When someone logs food or describes what they ate:
1. Break down each meal with emoji headers: 🍳 Breakfast, 🍚 Lunch, 🥩 Dinner, 🍎 Snack
2. Show calories and protein for each item, then a meal subtotal
3. Show a TOTAL at the bottom: total calories + total protein
4. Give a 🧠 section: what the numbers mean for their goals right now
5. Give a 🎯 Bottom line: one clear verdict or next action
6. If relevant, tell them exactly what to eat next or before bed

When recommending options, ALWAYS rank them:
🥇 Best choice — explain why it's best for THEIR specific goals
🥈 Second option
🥉 Third option
❌ What NOT to do — be specific, explain why each is wrong tonight

End responses with an optional offer:
"If you want, I can also tell you: [1–2 specific next questions they might have]"

When giving a daily meal plan, use this exact format:

Calories: [target] | Protein: [target]g

🍳 Breakfast
[food] [amount]

🍚 Lunch
[food] [amount]

🍎 Snack
[food] [amount]

🥩 Dinner
[food] [amount]

🌙 Before Bed
[food] [amount]

Rule: [one simple principle for the day]

================================
NUTRITION RULES
================================

PROTEIN FIRST: ${protein_target}g/day minimum. Non-negotiable anchor. Everything adjusts around this.

CARB TIMING:
- Hard training day → carbs earlier, more pre/post workout
- Recovery day → moderate carbs
- Full rest day → fewer carbs, keep protein high

NIGHT EATING: Late protein always fine. Small carbs at night after hard training lower cortisol and improve sleep.

FAT + CARB STACKING: Avoid combining high fat + high carbs in same meal. Easy to overeat, promotes fat storage.

SORENESS = RECOVERY NEED: Under-eating when sore slows progress. Fuel the repair.

MAINTENANCE DAYS: Not every day should be a deficit. After hard training, maintenance supports hormones and recovery.

ADJUST, DON'T PUNISH: After a high-intake day, correct calmly. Never extreme restriction.

WEEKLY AVERAGES: One pizza night is nothing. Skipping breakfast every day is a pattern. Judge over weeks.

CALORIE MATH: When they describe food, do the math meal by meal. Use exact numbers from food labels when provided.

================================
TONE
================================
- Direct. Honest. Not a yes-man.
- Affirm effort, not excuses.
- Use short closing rules. ("One clean carb. One portion. Done.")
- Never shame. Never over-celebrate. Just coach.
- Talk like a smart friend who knows nutrition cold, not a textbook.
`.trim();
};

// ─── OPENING MESSAGE ─────────────────────────────────────────────────────────
const buildOpeningMessage = (coachId, userData) => {
  const hasProfile = userData && userData.age;
  if (!hasProfile) {
    const cold = {
      alex:   "Hey — good to have you here. I'm Alex, your coach.\n\nBefore I give you anything useful, I need to understand your full picture. Let's start simple: how old are you?",
      marcus: "Marcus here. No small talk. Before I give you a plan, I need the basics. How old are you?",
      morgan: "I'm Morgan. Before any guidance, I need a complete picture. Let's begin: what's your age?",
      sam:    "Hey, I'm Sam. Glad you're here. Let's start simple — how old are you?",
    };
    return cold[coachId] || cold.alex;
  }

  const goal      = userData.goal || 'recomposition';
  const bw        = userData.weight;
  const gw        = userData.goalWeight;
  const days      = userData.trainingDays;
  const protein   = Math.round(parseInt(gw || bw) * 0.9);
  const struggles = Array.isArray(userData.blockers) ? userData.blockers.join(', ').toLowerCase() : '';

  const openers = {
    alex: `Hey — I've got everything I need to get started.\n\nHere's your baseline plan:\n\nGoal: ${goal}\nCurrent → Target: ${bw} → ${gw}\nProtein target: ~${protein}g/day (non-negotiable)\nTraining days: ${days}x/week — more carbs on those days, less on rest days\n\n${struggles ? `You flagged ${struggles} as your biggest struggle${struggles.includes(',') ? 's' : ''} — I'll keep that front of mind.\n\n` : ''}The one rule to lock in first: hit your protein target every single day. Everything else adjusts around that.\n\nTell me what you ate today and we'll get to work.`,
    marcus: `Here's your plan. No fluff.\n\nCurrent → Target: ${bw} → ${gw}\nDaily protein: ${protein}g minimum. Every day.\nCarbs: Earn them on training days. Cut back on rest days.\nTraining: ${days}x/week — show up or the plan doesn't work.\n\n${struggles ? `You said ${struggles} is your struggle. We'll fix that.\n\n` : ''}First rule: protein. Everything else follows. What did you eat today?`,
    morgan: `Profile received. Here's your evidence-based baseline.\n\nGoal: ${goal}\nWeight target: ${bw} → ${gw}\nProtein: ${protein}g/day — ~0.9g per lb of goal bodyweight\nCarb strategy: Higher on ${days} training days, reduced on recovery/rest\n\n${struggles ? `Primary obstacles: ${struggles}. I'll factor these into every recommendation.\n\n` : ''}Start by logging today's intake.`,
    sam: `Hey — I've read through everything you shared.\n\nYour goal: ${goal} — from ${bw} down to ${gw}\nDaily anchor: ~${protein}g of protein\nTraining days (${days}x/week): eat more on those days. Rest days, pull back on carbs.\n\n${struggles ? `You mentioned ${struggles}. I won't give you a plan that fights those realities.\n\n` : ''}Before we go further — how are you feeling right now? Energy, sleep, stress?`,
  };

  return openers[coachId] || openers.alex;
};

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────
function Bubble({ msg, coachColor, coachName }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[bs.wrap, isUser ? bs.wrapUser : bs.wrapCoach]}>
      {!isUser && <Text style={[bs.label, { color: coachColor }]}>{coachName.toUpperCase()}</Text>}
      <View style={[bs.bubble, isUser ? bs.bubbleUser : bs.bubbleCoach]}>
        <Text style={[bs.text, isUser ? bs.textUser : bs.textCoach]}>{msg.content}</Text>
      </View>
    </View>
  );
}

const bs = StyleSheet.create({
  wrap:        { marginBottom: 16 },
  wrapUser:    { alignItems: 'flex-end' },
  wrapCoach:   { alignItems: 'flex-start' },
  label:       { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 5, marginLeft: 2 },
  bubble:      { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleUser:  { backgroundColor: C.text, borderBottomRightRadius: 4 },
  bubbleCoach: { backgroundColor: C.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  text:        { fontSize: 15, lineHeight: 23 },
  textUser:    { color: C.bg },
  textCoach:   { color: C.text },
});

// ─── MACRO CONFIRM BANNER ─────────────────────────────────────────────────────
function MacroBanner({ macros, coachColor, onConfirm, onDismiss }) {
  const slideAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  }, []);

  return (
    <Animated.View style={[mb.banner, { transform: [{ translateY: slideAnim }] }]}>
      <View style={mb.left}>
        <Text style={mb.title}>Log this meal?</Text>
        <Text style={mb.details}>
          {Math.round(macros.calories)} kcal · {Math.round(macros.protein)}g protein
          {macros.carbs ? ` · ${Math.round(macros.carbs)}g carbs` : ''}
          {macros.fats ? ` · ${Math.round(macros.fats)}g fat` : ''}
        </Text>
      </View>
      <View style={mb.btns}>
        <TouchableOpacity style={mb.dismiss} onPress={onDismiss}>
          <Text style={mb.dismissText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[mb.confirm, { backgroundColor: coachColor }]} onPress={onConfirm}>
          <Text style={mb.confirmText}>Log it</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const mb = StyleSheet.create({
  banner:      { backgroundColor: C.elevated, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  left:        { flex: 1 },
  title:       { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
  details:     { fontSize: 12, color: C.muted },
  btns:        { flexDirection: 'row', gap: 8 },
  dismiss:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: C.border },
  dismissText: { fontSize: 13, color: C.muted, fontWeight: '600' },
  confirm:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  confirmText: { fontSize: 13, color: '#0a0a0a', fontWeight: '700' },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function Chat({ navigation, userData, coachId }) {
  const coach   = COACHES[coachId] || COACHES.alex;
  const listRef = useRef(null);

  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [userId,        setUserId]        = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [pendingMacros, setPendingMacros] = useState(null);
  const [pendingDesc,   setPendingDesc]   = useState('');

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('user_id', user.id)
        .eq('coach_id', coachId)
        .order('created_at', { ascending: true });

      if (!error && data?.length > 0) {
        setMessages(data.map(m => ({ role: m.role, content: m.content })));
      } else {
        const opening    = buildOpeningMessage(coachId, userData);
        const openingMsg = { role: 'assistant', content: opening };
        setMessages([openingMsg]);
        await supabase.from('chat_messages').insert({
          user_id: user.id, coach_id: coachId, role: 'assistant', content: opening,
        });
      }
      setHistoryLoaded(true);
    };
    setup();
  }, [coachId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    Keyboard.dismiss();
    setInput('');
    setPendingMacros(null);

    const userMsg = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    if (userId) {
      await supabase.from('chat_messages').insert({
        user_id: userId, coach_id: coachId, role: 'user', content: text,
      });
    }

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          messages:     updated.map(m => ({ role: m.role, content: m.content })),
          systemPrompt: buildSystemPrompt(userData, coachId),
        },
        headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });

      if (error) throw error;

      const reply    = data.content;
      const replyMsg = { role: 'assistant', content: reply };
      setMessages([...updated, replyMsg]);

      if (userId) {
        await supabase.from('chat_messages').insert({
          user_id: userId, coach_id: coachId, role: 'assistant', content: reply,
        });
      }

      // Show confirm banner if macros were detected
      if (data.macros) {
        setPendingMacros(data.macros);
        setPendingDesc(text);
      }

    } catch (e) {
      setMessages([...updated, { role: 'assistant', content: 'Something went wrong. Check your connection and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const confirmLog = async () => {
    if (!pendingMacros || !userId) return;
    try {
      await supabase.from('daily_logs').insert({
        user_id:     userId,
        log_date:    new Date().toISOString().slice(0, 10),
        description: pendingMacros.description || pendingDesc,
        calories:    pendingMacros.calories || 0,
        protein:     pendingMacros.protein  || 0,
        carbs:       pendingMacros.carbs    || 0,
        fats:        pendingMacros.fats     || 0,
      });
    } catch (e) {}
    setPendingMacros(null);
  };

  if (!historyLoaded) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator color={coach.color} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerEmoji}>{coach.emoji}</Text>
        <View style={s.headerText}>
          <Text style={[s.headerName, { color: coach.color }]}>{coach.name}</Text>
          <Text style={s.headerSub}>Your personal coach</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <Bubble msg={item} coachColor={coach.color} coachName={coach.name} />
          )}
          contentContainerStyle={s.messageList}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            loading ? (
              <View style={s.typingWrap}>
                <Text style={[s.typingLabel, { color: coach.color }]}>{coach.name.toUpperCase()}</Text>
                <View style={s.typingBubble}>
                  <ActivityIndicator color={coach.color} size="small" />
                </View>
              </View>
            ) : null
          }
        />

        {/* Macro confirm banner */}
        {pendingMacros && !loading && (
          <MacroBanner
            macros={pendingMacros}
            coachColor={coach.color}
            onConfirm={confirmLog}
            onDismiss={() => setPendingMacros(null)}
          />
        )}

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={`Message ${coach.name}...`}
            placeholderTextColor={C.muted}
            multiline
            maxHeight={120}
            textContentType="none"
          />
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: coach.color }, (!input.trim() || loading) && s.sendBtnOff]}
            onPress={send}
            disabled={!input.trim() || loading}
          >
            <Text style={s.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  loadingScreen:{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:      { padding: 4, marginRight: 2 },
  backBtnText:  { fontSize: 22, color: C.secondary, fontWeight: '600' },
  headerEmoji:  { fontSize: 24 },
  headerText:   { flex: 1 },
  headerName:   { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  headerSub:    { fontSize: 12, color: C.muted, marginTop: 1 },
  messageList:  { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  typingWrap:   { alignItems: 'flex-start', paddingHorizontal: 14, marginBottom: 12 },
  typingLabel:  { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 5, marginLeft: 2 },
  typingBubble: { backgroundColor: C.card, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1, borderColor: C.border },
  inputBar:     { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  input:        { flex: 1, backgroundColor: C.card, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, paddingTop: 10, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, maxHeight: 120 },
  sendBtn:      { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff:   { opacity: 0.3 },
  sendIcon:     { color: C.bg, fontSize: 18, fontWeight: '900', marginTop: -1 },
});