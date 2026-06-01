import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, TouchableOpacity } from 'react-native';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import FeedScreen from '../screens/main/FeedScreen';
import NewConfessionScreen from '../screens/main/NewConfessionScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import UserProfileScreen from '../screens/main/UserProfileScreen';
import CommentsScreen from '../screens/main/CommentsScreen';
import { useAuthStore } from '../store/authStore';

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
        options={{ tabBarLabel: 'Inicio', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text> }}
      />
      <Tab.Screen
        name="Explore"
        component={FeedScreen}
        options={{ tabBarLabel: 'Explorar', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔍</Text> }}
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
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, isLoading, loadFromStorage } = useAuthStore();

  useEffect(() => { loadFromStorage(); }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="rgba(255,255,255,0.3)" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!token ? (
          <>
            <Stack.Screen name="Welcome"  component={WelcomeScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Login"    component={LoginScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
        <Stack.Screen name="NewConfession" component={NewConfessionScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="Comments" component={CommentsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
