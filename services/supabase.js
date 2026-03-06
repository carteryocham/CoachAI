import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const SUPABASE_URL =
  Constants.expoConfig?.extra?.SUPABASE_URL ||
  'https://wwwkfjnfmxudplcrplzt.supabase.co';

const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d2tmam5mbXh1ZHBsY3JwbHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTU5OTUsImV4cCI6MjA4NzU3MTk5NX0.VpeTcP6RHxdXuXhyvOuQTKlC4NcaUcBJGJCIRv3uPjI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});