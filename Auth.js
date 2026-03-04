import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from './services/supabase';

WebBrowser.maybeCompleteAuthSession();

const C = {
  bg:        '#1C1C1E',
  card:      '#2C2C2E',
  text:      '#F5F0E8',
  secondary: '#A09A8E',
  muted:     '#6B6560',
  accent:    '#F5A623',
  accentRed: '#E05C5C',
  border:    '#3A3A3C',
};

export default function AuthScreen({ onAuthed }) {
  const [mode,          setMode]          = useState('login');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,         setError]         = useState('');

  const handleEmailAuth = async () => {
    if (!email.trim() || (mode !== 'reset' && !password)) {
      setError('Please fill in all fields.'); return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    setLoading(true); setError('');

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      onAuthed();
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      Alert.alert(
        'Check your email ✉️',
        'We sent a confirmation link. Tap it then come back and log in.',
        [{ text: 'OK', onPress: () => setMode('login') }]
      );
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) { setError(error.message); setLoading(false); return; }
      Alert.alert('Email sent ✉️', 'Check your inbox for a reset link.');
      setMode('login');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setError('');
    try {
      const redirectUrl = makeRedirectUri({ scheme: 'coachai' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options:  { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success') {
        const url    = new URL(result.url);
        const params = new URLSearchParams(url.hash.slice(1));
        const access_token  = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          onAuthed();
        }
      }
    } catch (e) {
      setError(e.message || 'Google sign in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logo}>
            <Text style={s.logoEmoji}>🏋️</Text>
            <Text style={s.logoText}>Coach AI</Text>
            <Text style={s.logoSub}>Your personal nutrition and training coach.</Text>
          </View>

          {/* Tabs */}
          <View style={s.tabs}>
            {[['login', 'Log In'], ['signup', 'Sign Up']].map(([m, label]) => (
              <TouchableOpacity
                key={m}
                style={[s.tab, mode === m && { borderBottomColor: C.accent, borderBottomWidth: 2 }]}
                onPress={() => { setMode(m); setError(''); }}
              >
                <Text style={[s.tabText, mode === m && { color: C.accent }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Email form */}
          <View style={s.form}>
            <Text style={s.label}>EMAIL</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={C.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
            />

            {mode !== 'reset' && (
              <>
                <Text style={s.label}>PASSWORD</Text>
                <TextInput
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={C.muted}
                  secureTextEntry
                />
              </>
            )}

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.submitBtn, loading && { opacity: 0.5 }]}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={C.bg} />
                : <Text style={s.submitBtnText}>
                    {mode === 'login' ? 'Log In →' : mode === 'signup' ? 'Create Account →' : 'Send Reset Link →'}
                  </Text>
              }
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity onPress={() => { setMode('reset'); setError(''); }}>
                <Text style={s.forgot}>Forgot password?</Text>
              </TouchableOpacity>
            )}
            {mode === 'reset' && (
              <TouchableOpacity onPress={() => { setMode('login'); setError(''); }}>
                <Text style={s.forgot}>← Back to login</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Google button — below email form */}
          <TouchableOpacity
            style={s.googleBtn}
            onPress={handleGoogle}
            disabled={googleLoading}
            activeOpacity={0.85}
          >
            {googleLoading
              ? <ActivityIndicator color={C.bg} />
              : <>
                  <Text style={s.googleIcon}>G</Text>
                  <Text style={s.googleText}>Continue with Google</Text>
                </>
            }
          </TouchableOpacity>

          <Text style={s.legal}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  scroll:       { padding: 28, paddingTop: 120, flexGrow: 1 },

  logo:         { alignItems: 'center', marginBottom: 36 },
  logoEmoji:    { fontSize: 52, marginBottom: 10 },
  logoText:     { fontSize: 34, fontWeight: '800', color: C.text, letterSpacing: -1 },
  logoSub:      { fontSize: 14, color: C.secondary, marginTop: 6, textAlign: 'center' },

  tabs:         { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  tab:          { flex: 1, paddingBottom: 12, alignItems: 'center' },
  tabText:      { fontSize: 15, fontWeight: '700', color: C.muted },

  form:         { gap: 4, marginBottom: 24 },
  label:        { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 2, marginBottom: 8, marginTop: 14 },
  input:        { backgroundColor: C.card, borderRadius: 14, padding: 16, color: C.text, fontSize: 16, borderWidth: 1, borderColor: C.border },
  error:        { color: C.accentRed, fontSize: 13, marginTop: 6 },
  submitBtn:    { backgroundColor: C.accent, paddingVertical: 17, borderRadius: 100, alignItems: 'center', marginTop: 20 },
  submitBtnText:{ color: C.bg, fontSize: 17, fontWeight: '700' },
  forgot:       { color: C.muted, fontSize: 14, textAlign: 'center', marginTop: 14, fontWeight: '500' },

  divider:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: C.border },
  dividerText:  { fontSize: 13, color: C.muted, fontWeight: '500' },

  googleBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.text, borderRadius: 100, height: 52, marginBottom: 24 },
  googleIcon:   { fontSize: 18, fontWeight: '800', color: C.bg },
  googleText:   { fontSize: 16, fontWeight: '600', color: C.bg },

  legal:        { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 'auto', paddingTop: 16, lineHeight: 17 },
});