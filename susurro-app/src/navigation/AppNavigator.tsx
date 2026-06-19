import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import OnboardingScreen from '../screens/auth/OnboardingScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import FeedScreen from '../screens/main/FeedScreen';
import ExploreScreen from '../screens/main/ExploreScreen';
import BookmarksScreen from '../screens/main/BookmarksScreen';
import NewConfessionScreen from '../screens/main/NewConfessionScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import UserProfileScreen from '../screens/main/UserProfileScreen';
import CommentsScreen from '../screens/main/CommentsScreen';
import RepliesScreen from '../screens/main/RepliesScreen';
import ConfessionDetailScreen from '../screens/main/ConfessionDetailScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import { useAuthStore } from '../store/authStore';
import { useNotifications } from '../hooks/useNotifications';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs({ navigation }: any) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0d0d0d',
          borderTopColor: 'rgba(255,255,255,0.06)',
          height: 80,
          paddingBottom: 20,
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.25)',
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: 'Explorar',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="NewTab"
        component={FeedScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: '#fff',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 8,
            }}>
              <Text style={{ color: '#080808', fontSize: 24, fontWeight: '300' }}>+</Text>
            </View>
          ),
          tabBarButton: (props) => (
            <TouchableOpacity {...props} onPress={() => navigation.navigate('NewConfession')} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookmarks"
        component={BookmarksScreen}
        options={{
          tabBarLabel: 'Guardados',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'bookmark' : 'bookmark-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, isLoading, loadFromStorage } = useAuthStore();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    loadFromStorage();
    AsyncStorage.getItem('onboarded').then(v => setOnboarded(v === 'true'));
  }, []);
  useNotifications(!!token);

  if (isLoading || onboarded === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="rgba(255,255,255,0.3)" />
      </View>
    );
  }

  const linking = {
    prefixes: ['susurro://', 'exp://'],
    config: {
      screens: {
        ConfessionDetail: 'confession/:confessionId',
        Main: { screens: { Feed: 'feed', Explore: 'explore' } },
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!token ? (
          <>
            {!onboarded && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
            <Stack.Screen name="Welcome"        component={WelcomeScreen} />
            <Stack.Screen name="Register"       component={RegisterScreen} />
            <Stack.Screen name="Login"          component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
        <Stack.Screen name="NewConfession" component={NewConfessionScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="Comments" component={CommentsScreen} />
        <Stack.Screen name="Replies" component={RepliesScreen} />
        <Stack.Screen name="ConfessionDetail" component={ConfessionDetailScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
