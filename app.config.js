import 'dotenv/config';

export default {
  expo: {
    name: 'CoachAI',
    slug: 'coachai',
    version: '1.0.0',
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
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    extra: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      eas: {
        projectId: '429ba28d-3c11-4f56-b906-d516065f6b96',
      },
    },
  },
};