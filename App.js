import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './services/supabase';
import Auth from './Auth';
import Onboarding from './Onboarding';
import CoachSelect from './CoachSelect';
import Home from './Home';
import Chat from './Chat';
import Meals from './Meals';
import Settings from './Settings';

const Stack = createNativeStackNavigator();

export default function App() {
  const [ready,       setReady]       = useState(false);
  const [authed,      setAuthed]      = useState(false);
  const [onboarded,   setOnboarded]   = useState(false);
  const [coachPicked, setCoachPicked] = useState(false);
  const [userData,    setUserData]    = useState(null);
  const [coachId,     setCoachId]     = useState('alex');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });

    const init = async () => {
      try {
        const [{ data: { session } }, savedUser, savedCoach, savedOnboarded] = await Promise.all([
          supabase.auth.getSession(),
          AsyncStorage.getItem('user_data'),
          AsyncStorage.getItem('coach_id'),
          AsyncStorage.getItem('onboarded'),
        ]);
        setAuthed(!!session);
        if (savedUser)      setUserData(JSON.parse(savedUser));
        if (savedCoach)     setCoachId(savedCoach);
        if (savedOnboarded) setOnboarded(true);
        if (savedCoach)     setCoachPicked(true);
      } catch (e) {
        console.warn('init error:', e);
      } finally {
        setReady(true);
      }
    };
    init();
    return () => subscription.unsubscribe();
  }, []);

  const handleOnboardingComplete = async (data) => {
    await AsyncStorage.multiSet([
      ['user_data', JSON.stringify(data)],
      ['onboarded', 'true'],
    ]);
    setUserData(data);
    setOnboarded(true);
  };

  const handleCoachSelected = async (id) => {
    await AsyncStorage.setItem('coach_id', id);
    setCoachId(id);
    setCoachPicked(true);
  };

  if (!ready) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color="#F5A623" size="large" />
      </View>
    );
  }

  if (!authed)    return <Auth onAuthed={() => setAuthed(true)} />;
  if (!onboarded) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        initialRouteName={coachPicked ? 'Home' : 'CoachSelect'}
      >
        <Stack.Screen name="CoachSelect">
          {props => (
            <CoachSelect
              {...props}
              onCoachSelected={(id) => {
                handleCoachSelected(id);
                props.navigation.replace('Home');
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Home">
          {props => (
            <Home
              {...props}
              userData={userData}
              coachId={coachId}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Chat">
          {props => (
            <Chat
              {...props}
              userData={userData}
              coachId={coachId}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Meals">
          {props => <Meals {...props} />}
        </Stack.Screen>

        <Stack.Screen name="Settings" options={{ animation: 'slide_from_bottom' }}>
          {props => (
            <Settings
              {...props}
              userData={userData}
              coachId={coachId}
              onUpdateUser={(updated) => setUserData(updated)}
              onUpdateCoach={(id) => setCoachId(id)}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' },
});