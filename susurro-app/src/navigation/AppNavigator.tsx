import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DarkTheme, NavigationContainerRef } from '@react-navigation/native';
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
import LegalScreen from '../screens/main/LegalScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import ChatScreen from '../screens/main/ChatScreen';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { useAuthStore } from '../store/authStore';
import { useNotifications } from '../hooks/useNotifications';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TransparentTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#080808' },
};

function withBg<T extends object>(Comp: React.ComponentType<T>): React.ComponentType<T> {
  return function WrappedWithBg(props: T) {
    return (
      <View style={{ flex: 1, backgroundColor: '#080808' }}>
        <AnimatedBackground />
        <Comp {...props} />
      </View>
    );
  };
}

const OnboardingWithBg      = withBg(OnboardingScreen);
const WelcomeWithBg         = withBg(WelcomeScreen);
const RegisterWithBg        = withBg(RegisterScreen);
const LoginWithBg           = withBg(LoginScreen);
const ForgotPasswordWithBg  = withBg(ForgotPasswordScreen);
const FeedWithBg            = withBg(FeedScreen);
const ExploreWithBg         = withBg(ExploreScreen);
const BookmarksWithBg       = withBg(BookmarksScreen);
const ProfileWithBg         = withBg(ProfileScreen);
const UserProfileWithBg     = withBg(UserProfileScreen);
const CommentsWithBg        = withBg(CommentsScreen);
const RepliesWithBg         = withBg(RepliesScreen);
const ConfessionDetailWithBg = withBg(ConfessionDetailScreen);
const NotificationsWithBg   = withBg(NotificationsScreen);
const LegalWithBg           = withBg(LegalScreen);
const NewConfessionWithBg   = withBg(NewConfessionScreen);
const MessagesWithBg        = withBg(MessagesScreen);
const ChatWithBg            = withBg(ChatScreen);

function MainTabs({ navigation }: any) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneContainerStyle: { backgroundColor: 'transparent' },
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
        component={FeedWithBg}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreWithBg}
        options={{
          tabBarLabel: 'Explorar',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="NewTab"
        component={FeedWithBg}
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
        component={BookmarksWithBg}
        options={{
          tabBarLabel: 'Guardados',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'bookmark' : 'bookmark-outline'} size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileWithBg}
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
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    loadFromStorage();
    AsyncStorage.getItem('onboarded').then(v => setOnboarded(v === 'true'));
  }, []);
  useNotifications(!!token);

  // Handle tap on push notification → navigate to correct screen
  useEffect(() => {
    let sub: any;
    import('expo-notifications').then(Notifications => {
      sub = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data as any;
        if (!navigationRef.current?.isReady()) return;
        if (data?.type === 'message' && data?.conversationId) {
          navigationRef.current.navigate('Chat', {
            conversationId: data.conversationId,
            alias: data.alias ?? '',
          });
        } else if (data?.confessionId) {
          navigationRef.current.navigate('ConfessionDetail', {
            confessionId: data.confessionId,
          });
        }
      });
    }).catch(() => {});
    return () => sub?.remove();
  }, []);

  if (isLoading || onboarded === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' }}>
        <AnimatedBackground />
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
    <NavigationContainer ref={navigationRef} theme={TransparentTheme} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}>
        {!token ? (
          <>
            {!onboarded && <Stack.Screen name="Onboarding" component={OnboardingWithBg} />}
            <Stack.Screen name="Welcome"        component={WelcomeWithBg} />
            <Stack.Screen name="Register"       component={RegisterWithBg} />
            <Stack.Screen name="Login"          component={LoginWithBg} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordWithBg} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
        <Stack.Screen name="NewConfession"    component={NewConfessionWithBg} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="UserProfile"      component={UserProfileWithBg} />
        <Stack.Screen name="Comments"         component={CommentsWithBg} />
        <Stack.Screen name="Replies"          component={RepliesWithBg} />
        <Stack.Screen name="ConfessionDetail" component={ConfessionDetailWithBg} />
        <Stack.Screen name="Notifications"    component={NotificationsWithBg} />
        <Stack.Screen name="Messages"         component={MessagesWithBg} />
        <Stack.Screen name="Chat"             component={ChatWithBg} />
        <Stack.Screen name="Legal"            component={LegalWithBg} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
