import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, ScrollView, Animated, PanResponder,
  Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform,
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

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
const MEAL_EMOJIS = { Breakfast: '🍳', Lunch: '🍚', Snack: '🍎', Dinner: '🥩', Meal: '🍽️' };

const getDateString = () => new Date().toISOString().slice(0, 10);

const inferMealType = (meal) => {
  if (meal.meal_type && MEAL_TYPES.includes(meal.meal_type)) return meal.meal_type;
  const desc = (meal.description || '').toLowerCase();
  if (/breakfast|morning|eggs|oatmeal|toast|coffee/.test(desc)) return 'Breakfast';
  if (/lunch|midday|sandwich|wrap/.test(desc)) return 'Lunch';
  if (/dinner|evening|steak|chicken|salmon/.test(desc)) return 'Dinner';
  if (/snack|bar|shake|fruit|nuts/.test(desc)) return 'Snack';
  // Fallback to time of day
  const hour = new Date(meal.created_at).getHours();
  if (hour < 10) return 'Breakfast';
  if (hour < 14) return 'Lunch';
  if (hour < 17) return 'Snack';
  return 'Dinner';
};

// ─── SWIPEABLE ROW ────────────────────────────────────────────────────────────
function SwipeRow({ meal, onDelete, onEdit }) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) translateX.setValue(Math.max(g.dx, -80));
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -50) {
        Animated.spring(translateX, { toValue: -80, useNativeDriver: true }).start();
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  })).current;

  const closeRow = () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();

  const confirmDelete = () => {
    Alert.alert('Remove meal?', 'This will update your macro rings.',
      [
        { text: 'Cancel', onPress: closeRow, style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onDelete(meal.id) },
      ]
    );
  };

  return (
    <View style={sw.container}>
      <View style={sw.deleteBtn}>
        <TouchableOpacity style={sw.deleteTap} onPress={confirmDelete}>
          <Text style={sw.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={[sw.row, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <TouchableOpacity style={sw.rowInner} onPress={() => { closeRow(); onEdit(meal); }} activeOpacity={0.8}>
          <View style={sw.rowTop}>
            <Text style={sw.desc} numberOfLines={2}>{meal.description}</Text>
            <Text style={sw.editHint}>Edit →</Text>
          </View>
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
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const sw = StyleSheet.create({
  container:  { marginBottom: 8, borderRadius: 14, overflow: 'hidden' },
  deleteBtn:  { position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, backgroundColor: C.accentRed, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  deleteTap:  { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  row:        { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  rowInner:   { padding: 14 },
  rowTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  desc:       { fontSize: 14, color: C.text, fontWeight: '600', lineHeight: 20, flex: 1, marginRight: 8 },
  editHint:   { fontSize: 11, color: C.muted },
  macroRow:   { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginBottom: 4 },
  macro:      { fontSize: 12, fontWeight: '600' },
  dot:        { fontSize: 12, color: C.muted },
  time:       { fontSize: 11, color: C.muted },
});

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditModal({ meal, visible, onSave, onClose }) {
  const [desc,     setDesc]     = useState('');
  const [calories, setCalories] = useState('');
  const [protein,  setProtein]  = useState('');
  const [carbs,    setCarbs]    = useState('');
  const [fats,     setFats]     = useState('');
  const [mealType, setMealType] = useState('Meal');

  React.useEffect(() => {
    if (meal) {
      setDesc(meal.description || '');
      setCalories(String(Math.round(meal.calories || 0)));
      setProtein(String(Math.round(meal.protein || 0)));
      setCarbs(String(Math.round(meal.carbs || 0)));
      setFats(String(Math.round(meal.fats || 0)));
      setMealType(inferMealType(meal));
    }
  }, [meal]);

  const handleSave = () => {
    onSave({
      ...meal,
      description: desc,
      meal_type:   mealType,
      calories:    parseFloat(calories) || 0,
      protein:     parseFloat(protein)  || 0,
      carbs:       parseFloat(carbs)    || 0,
      fats:        parseFloat(fats)     || 0,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={em.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={em.sheet}>
          <View style={em.handle} />
          <Text style={em.title}>{meal?.id ? 'Edit Meal' : 'Add Meal'}</Text>

          <Text style={em.label}>DESCRIPTION</Text>
          <TextInput style={em.input} value={desc} onChangeText={setDesc} placeholder="What did you eat?" placeholderTextColor={C.muted} multiline />

          <Text style={em.label}>MEAL TYPE</Text>
          <View style={em.typeRow}>
            {MEAL_TYPES.map(t => (
              <TouchableOpacity key={t} style={[em.typeBtn, mealType === t && em.typeBtnSel]} onPress={() => setMealType(t)}>
                <Text style={[em.typeText, mealType === t && em.typeTextSel]}>{MEAL_EMOJIS[t]} {t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={em.macroGrid}>
            {[
              { label: 'CALORIES', val: calories, set: setCalories, color: C.text },
              { label: 'PROTEIN (g)', val: protein, set: setProtein, color: C.accent },
              { label: 'CARBS (g)', val: carbs, set: setCarbs, color: C.accentGreen },
              { label: 'FATS (g)', val: fats, set: setFats, color: C.accentBlue },
            ].map(({ label, val, set, color }) => (
              <View key={label} style={em.macroCell}>
                <Text style={[em.macroLabel, { color }]}>{label}</Text>
                <TextInput
                  style={em.macroInput}
                  value={val}
                  onChangeText={set}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.muted}
                />
              </View>
            ))}
          </View>

          <View style={em.btnRow}>
            <TouchableOpacity style={em.cancelBtn} onPress={onClose}>
              <Text style={em.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={em.saveBtn} onPress={handleSave}>
              <Text style={em.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const em = StyleSheet.create({
  overlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:       { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  handle:      { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:       { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 16 },
  label:       { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 2, marginBottom: 8 },
  input:       { backgroundColor: C.elevated, borderRadius: 12, padding: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16, minHeight: 52 },
  typeRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeBtn:     { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: C.border, backgroundColor: C.elevated },
  typeBtnSel:  { backgroundColor: C.accent, borderColor: C.accent },
  typeText:    { fontSize: 13, color: C.muted, fontWeight: '600' },
  typeTextSel: { color: '#0a0a0a' },
  macroGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  macroCell:   { width: '47%' },
  macroLabel:  { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  macroInput:  { backgroundColor: C.elevated, borderRadius: 12, padding: 14, color: C.text, fontSize: 16, fontWeight: '700', borderWidth: 1, borderColor: C.border },
  btnRow:      { flexDirection: 'row', gap: 10 },
  cancelBtn:   { flex: 1, paddingVertical: 16, borderRadius: 100, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  cancelText:  { fontSize: 15, color: C.muted, fontWeight: '600' },
  saveBtn:     { flex: 2, paddingVertical: 16, borderRadius: 100, backgroundColor: C.accent, alignItems: 'center' },
  saveText:    { fontSize: 15, color: '#0a0a0a', fontWeight: '700' },
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
        {[
          { val: Math.round(t.calories), unit: 'kcal',    color: C.text },
          { val: Math.round(t.protein),  unit: 'protein', color: C.accent },
          { val: Math.round(t.carbs),    unit: 'carbs',   color: C.accentGreen },
          { val: Math.round(t.fats),     unit: 'fat',     color: C.accentBlue },
        ].map(({ val, unit, color }, i, arr) => (
          <React.Fragment key={unit}>
            <View style={tb.item}>
              <Text style={[tb.val, { color }]}>{val}{unit !== 'kcal' ? 'g' : ''}</Text>
              <Text style={tb.unit}>{unit}</Text>
            </View>
            {i < arr.length - 1 && <View style={tb.divider} />}
          </React.Fragment>
        ))}
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
  const [meals,       setMeals]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [userId,      setUserId]      = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);
  const [showModal,   setShowModal]   = useState(false);

  useFocusEffect(useCallback(() => { loadMeals(); }, []));

  const loadMeals = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data, error } = await supabase
        .from('daily_logs').select('*')
        .eq('user_id', user.id)
        .eq('log_date', getDateString())
        .order('created_at', { ascending: true });
      if (!error && data) setMeals(data);
    } catch (e) {
    } finally { setLoading(false); }
  };

  const deleteMeal = async (id) => {
    await supabase.from('daily_logs').delete().eq('id', id);
    setMeals(prev => prev.filter(m => m.id !== id));
  };

  const openEdit = (meal) => { setEditingMeal(meal); setShowModal(true); };

  const openAdd = () => {
    setEditingMeal({
      description: '', meal_type: 'Meal',
      calories: 0, protein: 0, carbs: 0, fats: 0,
    });
    setShowModal(true);
  };

  const handleSave = async (updated) => {
    setShowModal(false);
    try {
      if (updated.id) {
        await supabase.from('daily_logs').update({
          description: updated.description,
          meal_type:   updated.meal_type,
          calories:    updated.calories,
          protein:     updated.protein,
          carbs:       updated.carbs,
          fats:        updated.fats,
        }).eq('id', updated.id);
        setMeals(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
      } else {
        const { data, error } = await supabase.from('daily_logs').insert({
          user_id:     userId,
          log_date:    getDateString(),
          description: updated.description,
          meal_type:   updated.meal_type,
          calories:    updated.calories,
          protein:     updated.protein,
          carbs:       updated.carbs,
          fats:        updated.fats,
        }).select().single();
        if (!error && data) setMeals(prev => [...prev, data]);
      }
    } catch (e) { Alert.alert('Error', 'Could not save. Try again.'); }
  };

  // Group meals by type in chronological order
  const grouped = MEAL_TYPES.reduce((acc, type) => {
    const group = meals.filter(m => inferMealType(m) === type);
    if (group.length > 0) acc.push({ type, meals: group });
    return acc;
  }, []);

  // Any meals that don't fit a type
  const ungrouped = meals.filter(m => !MEAL_TYPES.includes(inferMealType(m)));
  if (ungrouped.length > 0) grouped.push({ type: 'Meal', meals: ungrouped });

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Today's Log</Text>
        <TouchableOpacity onPress={openAdd}>
          <Text style={s.addBtn}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {meals.length > 0 ? (
            <>
              <TotalsBar meals={meals} />
              <Text style={s.hint}>Tap to edit · Swipe left to delete</Text>
              {grouped.map(({ type, meals: group }) => (
                <View key={type} style={s.group}>
                  <Text style={s.groupLabel}>{MEAL_EMOJIS[type]} {type.toUpperCase()}</Text>
                  {group.map(meal => (
                    <SwipeRow key={meal.id} meal={meal} onDelete={deleteMeal} onEdit={openEdit} />
                  ))}
                </View>
              ))}
            </>
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🍽️</Text>
              <Text style={s.emptyTitle}>Nothing logged yet</Text>
              <Text style={s.emptySub}>Tell your coach what you ate and tap "Log it" — or add a meal manually.</Text>
              <TouchableOpacity style={s.emptyAdd} onPress={openAdd}>
                <Text style={s.emptyAddText}>+ Add manually</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <EditModal
        meal={editingMeal}
        visible={showModal}
        onSave={handleSave}
        onClose={() => setShowModal(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backText:     { fontSize: 15, color: C.secondary, fontWeight: '600', width: 60 },
  title:        { fontSize: 17, fontWeight: '800', color: C.text },
  addBtn:       { fontSize: 15, color: C.accent, fontWeight: '700', width: 60, textAlign: 'right' },
  scroll:       { paddingHorizontal: 20, paddingTop: 20 },
  hint:         { fontSize: 11, color: C.muted, textAlign: 'center', marginBottom: 16 },
  group:        { marginBottom: 16 },
  groupLabel:   { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 2, marginBottom: 8 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:        { alignItems: 'center', paddingTop: 80 },
  emptyEmoji:   { fontSize: 48, marginBottom: 16 },
  emptyTitle:   { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 8 },
  emptySub:     { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 24 },
  emptyAdd:     { backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 100 },
  emptyAddText: { fontSize: 15, color: '#0a0a0a', fontWeight: '700' },
});