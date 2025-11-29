import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { apiConfig } from '../config/apiConfig';

/**
 * Standalone function to register for push notifications
 * This function can be called directly from App.js for EAS dev-client setup
 * 
 * Steps:
 * 1. Check if running on a physical device (Device.isDevice)
 * 2. Request notification permissions from the user
 * 3. Configure Android notification channel with MAX importance
 * 4. Get Expo push token using projectId from app.json
 * 5. Return the token or null on failure
 * 
 * @returns {Promise<string|null>} Expo push token or null if registration fails
 */
export async function registerForPushNotificationsAsync() {
  try {
    // Step 1: Check if running on a physical device
    // Push notifications only work on physical devices, not simulators/emulators
    if (!Device.isDevice) {
      console.warn('⚠️ Push notifications require a physical device. Cannot register on simulator/emulator.');
      return null;
    }

    // Step 2: Check if running inside Expo Go (which doesn't support custom dev clients)
    // Constants.appOwnership will be 'expo' in Expo Go, 'standalone' in dev builds
    if (Constants.appOwnership === 'expo') {
      console.warn('⚠️ Push notifications are not fully supported in Expo Go.');
      console.warn('⚠️ Please use a development build (EAS dev-client) for push notifications.');
      console.warn('⚠️ Run: eas build --profile development --platform android');
      // Still try to register, but warn the user
    }

    // Step 3: Request notification permissions
    // For Android 13+ (API 33+), explicitly request POST_NOTIFICATIONS permission
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        if (!hasPermission) {
          const status = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Allow notifications',
              message: 'LibSync would like to send you notifications',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            }
          );

          if (status !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('❌ POST_NOTIFICATIONS permission denied on Android 13+');
            console.warn('❌ Permission status:', status);
            Alert.alert(
              'Notification Permission Required',
              'LibSync needs notification permission to send you important updates. Please enable it in Settings.',
              [{ text: 'OK' }]
            );
            return null;
          }
          console.log('✅ POST_NOTIFICATIONS permission granted on Android 13+');
        }
      } catch (error) {
        console.error('Error requesting POST_NOTIFICATIONS permission:', error);
        // Continue with expo-notifications permission request as fallback
      }
    }

    // Request notification permissions via expo-notifications
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // If permissions not granted, request them
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // If user denied permissions, return null
    if (finalStatus !== 'granted') {
      console.warn('❌ Notification permissions denied by user');
      Alert.alert(
        'Push Notifications',
        'Failed to get push token! Notification permissions were denied.',
        [
          {
            text: 'Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Notifications.openSettingsAsync();
              }
            }
          },
          { text: 'OK' }
        ]
      );
      return null;
    }

    // Step 4: Configure Android notification channels (required for Android 8.0+)
    if (Platform.OS === 'android') {
      // Main default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General Notifications',
        description: 'General library notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // Reservations channel
      await Notifications.setNotificationChannelAsync('reservations', {
        name: 'Reservations',
        description: 'Notifications about your book reservations',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // Due Dates channel
      await Notifications.setNotificationChannelAsync('due_dates', {
        name: 'Due Dates',
        description: 'Reminders about book due dates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500], // Distinct vibration
        lightColor: '#FFCC0000', // Red light
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // Announcements channel
      await Notifications.setNotificationChannelAsync('announcements', {
        name: 'Announcements',
        description: 'Library announcements and news',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // Urgent channel
      await Notifications.setNotificationChannelAsync('urgent', {
        name: 'Urgent',
        description: 'Urgent notifications and alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 500, 500], // Long vibration
        lightColor: '#FFFF0000', // Red light
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      console.log('✅ Android notification channels configured with lock screen visibility');
    }

    // Step 5: Get Expo push token
    let projectId = null;

    // Method 1: Try Constants.expoConfig (works in Expo Go and some builds)
    if (Constants.expoConfig?.extra?.eas?.projectId) {
      projectId = Constants.expoConfig.extra.eas.projectId;
      console.log('📱 Found projectId from Constants.expoConfig:', projectId);
    }
    // Method 2: Try Constants.manifest (works in some builds)
    else if (Constants.manifest?.extra?.eas?.projectId) {
      projectId = Constants.manifest.extra.eas.projectId;
      console.log('📱 Found projectId from Constants.manifest:', projectId);
    }
    // Method 3: Try Constants.manifest2 (works in EAS builds)
    else if (Constants.manifest2?.extra?.eas?.projectId) {
      projectId = Constants.manifest2.extra.eas.projectId;
      console.log('📱 Found projectId from Constants.manifest2:', projectId);
    }
    // Method 4: Try the direct access
    else if (Constants.manifest?.extra?.expoClient?.extra?.eas?.projectId) {
      projectId = Constants.manifest.extra.expoClient.extra.eas.projectId;
      console.log('📱 Found projectId from Constants.manifest.extra.expoClient:', projectId);
    }
    // Method 5: Hardcode as fallback (from app.json)
    else {
      projectId = '0d387a65-833c-4eb2-b131-5896a3437bfb';
      console.log('📱 Using hardcoded projectId (fallback):', projectId);
    }

    // Debug: Log all available Constants data
    console.log('🔍 Debug Constants:', {
      appOwnership: Constants.appOwnership,
      executionEnvironment: Constants.executionEnvironment,
      hasExpoConfig: !!Constants.expoConfig,
      hasManifest: !!Constants.manifest,
      hasManifest2: !!Constants.manifest2,
      projectId: projectId
    });

    if (!projectId) {
      console.error('❌ Project ID not found anywhere. Please ensure extra.eas.projectId is set in app.json.');
      console.error('❌ Available Constants:', {
        expoConfig: Constants.expoConfig ? 'exists' : 'missing',
        manifest: Constants.manifest ? 'exists' : 'missing',
        manifest2: Constants.manifest2 ? 'exists' : 'missing'
      });
      return null;
    }

    console.log('📱 Registering for push notifications with projectId:', projectId);

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      const token = tokenData.data;
      console.log('✅ Expo push token obtained:', token);

      return token;
    } catch (tokenError) {
      console.error('❌ Error getting Expo push token:', tokenError);
      console.error('❌ Token error details:', {
        message: tokenError.message,
        code: tokenError.code,
        stack: tokenError.stack
      });
      return null;
    }

  } catch (error) {
    // Catch any errors and log them without crashing the app
    console.error('❌ Error registering for push notifications:', error);
    console.warn('⚠️ App will continue without push notifications');
    return null;
  }
}

// Store reference to the standalone function for use in the class
const _registerForPushNotificationsAsync = registerForPushNotificationsAsync;

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
  }

  // Configure notification behavior
  configure() {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('📬 Notification received in handler:', {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data
        });

        // Always show notifications, even when app is in foreground
        // This ensures notifications appear in the system tray
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          // For Android: ensure notification appears in system tray and lock screen
          priority: Notifications.AndroidNotificationPriority.MAX,
        };
      },
    });

    console.log('✅ Notification handler configured - notifications will appear in tray');
  }

  // Initialize notification service (setup only, no permission requests)
  // Permissions will be requested after login
  async initialize() {
    try {
      // Always configure notification handler first
      this.configure();

      // Set up notification listeners (for receiving notifications)
      this.setupNotificationListeners();

      // Check if we already have a saved token (from previous session)
      const savedToken = await this.getSavedPushToken();
      if (savedToken) {
        this.expoPushToken = savedToken;
        console.log('📱 Found saved push token:', savedToken.substring(0, 20) + '...');
        console.log('ℹ️ Token will be sent to server after user logs in');
      } else {
        console.log('ℹ️ No saved push token - will request after login');
      }

      // DO NOT request permissions here - wait until after login
      // This prevents permission requests before user understands the app

      this.isInitialized = true;
      console.log('✅ Notification service initialized (permissions will be requested after login)');

    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      // Still set up listeners even if initialization fails
      try {
        this.setupNotificationListeners();
      } catch (listenerError) {
        console.error('Failed to set up notification listeners:', listenerError);
      }
      this.isInitialized = false;
      // Don't throw - app should continue even if notifications fail
    }
  }

  // Register for push notifications
  // This method now delegates to the standalone function for consistency
  // The standalone function has better production build support with fallback projectId resolution
  async registerForPushNotificationsAsync() {
    console.log('📱 [Class Method] Delegating to standalone registerForPushNotificationsAsync function');
    // Call the standalone function via stored reference to avoid recursion
    // It has better production build support with multiple projectId fallbacks
    return await _registerForPushNotificationsAsync();
  }

  // Set up notification listeners
  setupNotificationListeners() {
    // This listener is fired whenever a notification is received while the app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  // Handle notification received while app is in foreground
  handleNotificationReceived(notification) {
    const { title, body, data } = notification.request.content;

    // You can customize behavior based on notification type
    const notificationType = data?.type || 'general';

    // Update badge count
    this.updateBadgeCount();

    // Log for debugging
    console.log(`Received ${notificationType} notification:`, { title, body, data });
  }

  // Handle notification tap/interaction
  handleNotificationResponse(response) {
    const { notification } = response;
    const { data } = notification.request.content;

    console.log('User interacted with notification:', data);

    // Navigate to specific screen based on notification type
    this.handleNotificationNavigation(data);
  }

  // Handle navigation based on notification data
  handleNotificationNavigation(data) {
    if (!data) return;

    const { type, navigationTarget, bookId, reservationId } = data;

    // This would typically integrate with your navigation system
    // For now, we'll just log the intended navigation
    console.log(`Should navigate to: ${navigationTarget || type}`, { bookId, reservationId });

    // Example navigation logic:
    switch (type) {
      case 'reservation':
        // Navigate to reservations screen
        // navigation.navigate('MyReservations');
        break;
      case 'due_date':
        // Navigate to loan history or specific book
        // navigation.navigate('LoanHistory');
        break;
      case 'placement':
      case 'library_update':
        // Navigate to library updates
        // navigation.navigate('LibraryUpdates');
        break;
      case 'announcement':
        // Navigate to notifications or specific announcement
        // navigation.navigate('Notifications');
        break;
      default:
        // Navigate to home or notifications
        // navigation.navigate('Notifications');
        break;
    }
  }

  // Send push token to your server
  async sendPushTokenToServer(token) {
    try {
      if (!token) {
        console.warn('⚠️ No push token provided');
        return;
      }

      // Get user data to associate token with user
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        console.log('ℹ️ No user data found, cannot send push token to server (user not logged in)');
        throw new Error('User not logged in');
      }

      console.log('📤 Sending push token to server...');
      console.log('📤 Token:', token.substring(0, 30) + '...');
      console.log('📤 Platform:', Platform.OS);

      // Get auth token from AsyncStorage for the request
      const authToken = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('auth_token');

      if (!authToken) {
        console.error('❌ No auth token found - cannot send push token to server');
        throw new Error('User not authenticated - please log in again');
      }

      // Get base URL
      const baseURL = await apiConfig.getBaseURL();
      let fullBaseURL;
      if (baseURL.startsWith('http://') || baseURL.startsWith('https://')) {
        fullBaseURL = `${baseURL}/api`;
      } else {
        fullBaseURL = `http://${baseURL}/api`;
      }

      console.log('📤 Making push token request to:', `${fullBaseURL}/users/push-token`);
      console.log('📤 Auth token present:', !!authToken);
      console.log('📤 Auth token preview:', authToken.substring(0, 20) + '...');

      // Send token to your backend using axios directly with auth header
      const response = await axios.post(
        `${fullBaseURL}/users/push-token`,
        {
          pushToken: token,
          platform: Platform.OS
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Push token sent to server successfully');
      console.log('✅ Response status:', response.status);
      console.log('✅ Server response:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.success) {
        console.log('✅ Push token saved in database');
        console.log('✅ User:', response.data.user?.name || response.data.user?.studentID || 'Unknown');
        console.log('✅ Has push token:', response.data.user?.hasPushToken);
      }

      return response.data;
    } catch (error) {
      console.error('❌ Failed to send push token to server:', error.message);

      // Log detailed error information
      if (error.response) {
        console.error('❌ Server error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('❌ No response received from server');
        console.error('❌ Request config:', {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        });
      } else {
        console.error('❌ Error setting up request:', error.message);
        console.error('❌ Error stack:', error.stack);
      }

      // Re-throw so caller knows it failed
      throw error;
    }
  }

  // Save push token to local storage
  async savePushTokenToStorage(token) {
    try {
      await AsyncStorage.setItem('expo_push_token', token);
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  // Get saved push token from local storage
  async getSavedPushToken() {
    try {
      return await AsyncStorage.getItem('expo_push_token');
    } catch (error) {
      console.error('Failed to get saved push token:', error);
      return null;
    }
  }

  // Update badge count
  async updateBadgeCount() {
    if (!this.isInitialized) {
      console.log('Notification service not initialized, skipping badge update');
      return;
    }

    try {
      // Get unread notification count from API
      const response = await apiService.getUnreadNotificationCount();
      const unreadCount = response.unreadCount || 0;

      // Set badge count
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error('Failed to update badge count:', error);
    }
  }

  // Clear badge count
  async clearBadgeCount() {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Failed to clear badge count:', error);
    }
  }

  // Schedule local notification (for testing or offline scenarios)
  async scheduleLocalNotification(title, body, data = {}, delaySeconds = 0) {
    try {
      const schedulingOptions = delaySeconds > 0
        ? { seconds: delaySeconds }
        : undefined;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: schedulingOptions,
      });

      console.log('Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
      return null;
    }
  }

  // Cancel local notification
  async cancelLocalNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Local notification cancelled:', notificationId);
    } catch (error) {
      console.error('Failed to cancel local notification:', error);
    }
  }

  // Cancel all local notifications
  async cancelAllLocalNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All local notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel all local notifications:', error);
    }
  }

  // Get notification settings
  async getNotificationSettings() {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return settings;
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      return null;
    }
  }

  // Open notification settings
  async openNotificationSettings() {
    try {
      await Notifications.openSettingsAsync();
    } catch (error) {
      console.error('Failed to open notification settings:', error);
    }
  }

  // Cleanup listeners
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;