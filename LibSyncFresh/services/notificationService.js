import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './apiService';

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

    // Step 4: Configure Android notification channel (required for Android 8.0+)
    if (Platform.OS === 'android') {
      // Main default channel - MAX importance for lock screen visibility
      await Notifications.setNotificationChannelAsync('default', {
        name: 'LibSync Notifications',
        description: 'General library notifications',
        importance: Notifications.AndroidImportance.MAX, // Highest priority - shows on lock screen
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Show on lock screen
      });
      console.log('✅ Android notification channel configured with lock screen visibility');
    }

    // Step 5: Get Expo push token
    // Use projectId from app.json extra.eas.projectId
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.error('❌ Project ID not found in app.json. Please ensure extra.eas.projectId is set.');
      return null;
    }

    console.log('📱 Registering for push notifications with projectId:', projectId);
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    const token = tokenData.data;
    console.log('✅ Expo push token obtained:', token);
    
    return token;

  } catch (error) {
    // Catch any errors and log them without crashing the app
    console.error('❌ Error registering for push notifications:', error);
    console.warn('⚠️ App will continue without push notifications');
    return null;
  }
}

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
        // Always show notifications, even when app is in foreground
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          // For Android: ensure notification appears in system tray
          priority: Notifications.AndroidNotificationPriority.MAX,
        };
      },
    });
  }

  // Initialize notification service
  async initialize() {
    try {
      this.configure();
      
      // Request permissions and get push token
      const token = await this.registerForPushNotificationsAsync();
      if (token) {
        this.expoPushToken = token;
        await this.savePushTokenToStorage(token);
        console.log('✅ Push token obtained:', token.substring(0, 20) + '...');
        
        // Send token to server (will retry if user not logged in yet)
        try {
          await this.sendPushTokenToServer(token);
        } catch (error) {
          console.warn('⚠️ Could not send push token to server (user may not be logged in yet):', error.message);
          // Don't fail initialization - token will be sent after login
        }
      } else {
        console.warn('⚠️ No push token obtained - notifications may not work');
      }

      // Set up notification listeners
      this.setupNotificationListeners();
      
      this.isInitialized = true;
      console.log('✅ Notification service initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      this.isInitialized = false;
      // Don't throw - app should continue even if notifications fail
    }
  }

  // Register for push notifications
  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      // Main default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'LibSync Notifications',
        description: 'General library notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Show on lock screen
      });

      // Create specific channels for different notification types
      await Notifications.setNotificationChannelAsync('reservations', {
        name: 'Book Reservations',
        description: 'Notifications about book reservations',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007bff',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      await Notifications.setNotificationChannelAsync('due_dates', {
        name: 'Due Date Reminders',
        description: 'Reminders about book due dates',
        importance: Notifications.AndroidImportance.MAX, // MAX for urgent due dates
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ffc107',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      await Notifications.setNotificationChannelAsync('announcements', {
        name: 'Library Announcements',
        description: 'Important library announcements',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#28a745',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      await Notifications.setNotificationChannelAsync('urgent', {
        name: 'Urgent Alerts',
        description: 'Urgent and critical notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 100, 100, 100, 100, 100],
        lightColor: '#dc3545',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Push Notifications',
          'Failed to get push token for push notification!',
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
        return;
      }

      // Get the token that identifies this installation
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;

    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
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

      // Send token to your backend
      const response = await apiService.post('/users/push-token', {
        pushToken: token,
        platform: Platform.OS
      });

      console.log('✅ Push token sent to server successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to send push token to server:', error.message);
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