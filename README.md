# CoachAI

A personalized AI fitness coaching app built with React Native (Expo), Supabase, and GPT-4.

Users complete a detailed onboarding, pick a coach persona, and get real coaching conversations — with automatic macro tracking that updates a live dashboard on the home screen.

---

## What it does

- **4 coach personas** — Alex (warm), Marcus (tough love), Morgan (data-driven), Sam (holistic)
- **10-step onboarding** — age, height, weight, goal weight, body fat, goal, training days, sleep, blockers
- **Coach chat** — GPT-4 powered, fully personalized from onboarding data. Remembers conversation history.
- **Auto macro extraction** — when the coach breaks down food, it silently extracts macros and shows a "Log it" banner
- **Home screen macro rings** — animated SVG rings for Calories, Protein, Carbs, Fats that fill as you log meals
- **Meals log** — swipe-to-delete meal entries, full macro breakdown per meal
- **Settings** — update current weight/goal, switch coaches, sign out
- **Auth** — email/password + Google OAuth via Supabase

---

## Tech stack

| Layer | Tool |
|---|---|
| Mobile framework | React Native + Expo SDK 54 |
| Backend / Auth / DB | Supabase |
| AI | OpenAI GPT-4 via Supabase Edge Functions |
| Navigation | React Navigation (native stack) |
| Storage | AsyncStorage (local) + Supabase (cloud) |
| Charts | react-native-svg |

---

## Project structure

```
CoachAI/
├── App.js              # Root — auth state, navigation
├── Auth.js             # Email + Google sign in
├── Onboarding.js       # 10-step onboarding flow
├── CoachSelect.js      # Coach selection screen
├── Home.js             # Home screen with macro rings
├── Chat.js             # Coach chat screen
├── Meals.js            # Daily meal log with swipe-delete
├── Settings.js         # Profile, coach switch, account
├── env.js              # ← NOT committed (see setup)
├── services/
│   └── supabase.js     # Supabase client
└── supabase/
    └── functions/
        └── chat/
            └── index.ts  # Edge function — GPT-4 proxy + macro extraction
```

---

## Getting started

### 1. Clone the repo
```bash
git clone https://github.com/carteryocham/CoachAI.git
cd CoachAI
npm install
```

### 2. Create env.js
Create a file called `env.js` in the root (this is gitignored):

```js
export const SUPABASE_URL      = 'your-supabase-url';
export const SUPABASE_ANON_KEY = 'your-supabase-anon-key';
```

Get these from: supabase.com → your project → Settings → API

### 3. Set up Supabase

Run these in Supabase → SQL Editor:

```sql
-- Chat message history
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own messages" ON chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily food log
CREATE TABLE IF NOT EXISTS daily_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  calories numeric DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fats numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own logs" ON daily_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON daily_logs FOR DELETE USING (auth.uid() = user_id);
```

### 4. Add OpenAI key to Supabase
Supabase → Edge Functions → Manage secrets → Add:
- Name: `OPENAI_API_KEY`
- Value: your OpenAI key (starts with `sk-`)

### 5. Deploy the edge function
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy chat --no-verify-jwt
```

### 6. Start the app
```bash
npx expo start
```

---

## Current status

MVP is functional and running on iOS via Expo Go. Not yet submitted to App Store.

**Working:**
- Auth (email + Google OAuth)
- Onboarding
- Coach chat with GPT-4
- Persistent chat history
- Auto macro logging from chat
- Home screen macro rings
- Meal log with swipe-delete
- Settings (weight update, coach switch)

**Not yet built:**
- Subscription / paywall (Stripe)
- Apple sign-in
- Push notifications
- Progress tracking over time
- App Store submission

---

## Contributing

This is an open source project. PRs welcome for bug fixes and features on the roadmap.

If you want to collaborate more closely — co-build, co-found, or contribute significantly — reach out directly.

## Contact

**Carter Yocham**
- GitHub: [@carteryocham](https://github.com/carteryocham)
- Email: carteryocham@gmail.com
- Twitter/X: @carteryocham

If you're a developer, designer, or fitness industry person who wants to help build this into a real product — send me a message. Looking for someone who wants to go from MVP to App Store and beyond.