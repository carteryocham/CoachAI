import 'dotenv/config';

export default {
  expo: {
    name: 'CoachAI',
    slug: 'coachai',
    version: '1.0.0',
    scheme: 'coachai',
    orientation: 'portrait',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1C1C1E',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.carteryocham.coachai',
      scheme: 'coachai',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      eas: {
        projectId: '429ba28d-3c11-4f56-b906-d516065f6b96',
      },
    },
  },
};