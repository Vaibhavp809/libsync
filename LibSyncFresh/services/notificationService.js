import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './apiService';

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Configure notification behavior
  configure() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
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
        // TODO: Send token to your server
        console.log('Push token registered:', token);
      }

      // Set up notification listeners
      this.setupNotificationListeners();

    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  // Register for push notifications
  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // Create specific channels for different notification types
      await Notifications.setNotificationChannelAsync('reservations', {
        name: 'Book Reservations',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007bff',
      });

      await Notifications.setNotificationChannelAsync('due_dates', {
        name: 'Due Date Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ffc107',
      });

      await Notifications.setNotificationChannelAsync('placements', {
        name: 'Placement News',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#28a745',
      });

      await Notifications.setNotificationChannelAsync('urgent', {
        name: 'Urgent Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 100, 100, 100, 100, 100],
        lightColor: '#dc3545',
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
        // Navigate to placement news
        // navigation.navigate('PlacementNews');
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
      if (!token) return;

      // Get user data to associate token with user
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        console.log('No user data found, cannot send push token to server');
        return;
      }

      const user = JSON.parse(userData);

      // Send token to your backend
      await apiService.post('/users/push-token', {
        userId: user._id || user.id,
        pushToken: token,
        platform: Platform.OS
      });

      console.log('Push token sent to server successfully');
    } catch (error) {
      console.error('Failed to send push token to server:', error);
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
    try {
      // Get unread notification count from API
      const response = await apiService.get('/notifications/unread-count');
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