// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: 'CoachAI',
    slug: 'coachai',
    // add/keep any other config you use here (icon, bundle id, etc.)
    extra: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    },
  },
};