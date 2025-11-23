import axios from 'axios';
import { apiConfig } from '../config/apiConfig';

class ApiService {
  constructor() {
    this.baseURL = null;
  }

  // Initialize base URL
  async initialize() {
    // Always refresh base URL to ensure we have the latest (production/local)
    this.baseURL = await apiConfig.getBaseURL();
    
    // Handle both HTTP (local) and HTTPS (production) URLs
    let fullBaseURL;
    if (this.baseURL.startsWith('http://') || this.baseURL.startsWith('https://')) {
      // Full URL already includes protocol
      fullBaseURL = this.baseURL + '/api';
    } else {
      // Legacy IP address format
      fullBaseURL = `http://${this.baseURL}/api`;
    }
    
    axios.defaults.baseURL = fullBaseURL;
    console.log('API Service initialized with base URL:', fullBaseURL);
    return this.baseURL;
  }

  // Generic GET request
  async get(endpoint, params = {}) {
    await this.initialize();
    try {
      const response = await axios.get(endpoint, { params });
      return response.data;
    } catch (error) {
      console.error('GET request failed:', { endpoint, error: error.message });
      throw this.handleError(error);
    }
  }

  // Generic POST request
  async post(endpoint, data = {}) {
    await this.initialize();
    try {
      const response = await axios.post(endpoint, data);
      return response.data;
    } catch (error) {
      console.error('POST request failed:', { endpoint, error: error.message });
      throw this.handleError(error);
    }
  }

  // Generic PUT request
  async put(endpoint, data = {}) {
    await this.initialize();
    try {
      const response = await axios.put(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generic DELETE request
  async delete(endpoint) {
    await this.initialize();
    try {
      const response = await axios.delete(endpoint);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Handle API errors
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.statusText;
      return new Error(`Server Error (${error.response.status}): ${message}`);
    } else if (error.request) {
      // Request made but no response received
      return new Error('Network error. Please check your connection and server status.');
    } else {
      // Something else happened
      return new Error(`Request failed: ${error.message}`);
    }
  }

  // Specific API methods for LibSync

  // Books API
  async getBooks(params = {}) {
    // Support pagination and filtering
    const defaultParams = {
      page: 1,
      limit: 20,
      sortBy: 'accessionNumber',
      sortOrder: 'asc'
    };
    
    const queryParams = { ...defaultParams, ...params };
    
    try {
      const response = await this.get('/books', queryParams);
      
      // Validate response structure
      if (!response) {
        throw new Error('No response received from server');
      }
      
      // Log response structure for debugging
      console.log('API Response structure:', {
        hasBooks: !!response.books,
        isArray: Array.isArray(response),
        hasPagination: !!response.pagination,
        type: typeof response
      });
      
      return response;
    } catch (error) {
      console.error('Error in getBooks:', error);
      throw error;
    }
  }
  
  async getAllBooks() {
    // For cases where we need all books (use with caution)
    return await this.get('/books', { limit: 50000, page: 1 });
  }

  async searchBooks(query) {
    // Check if query looks like an accession number (6 digits)
    const isAccessionNumber = /^\d{6}$/.test(query.trim());
    
    const params = { q: query };
    
    // For accession numbers, we want exact matches to be prioritized
    if (isAccessionNumber) {
      params.exactMatch = 'true';
      params.field = 'accessionNumber';
    }
    
    return await this.get('/books/search', params);
  }
  
  // Get book statistics for dashboard
  async getBookStatistics() {
    return await this.get('/books/statistics');
  }

  // Get book filters (titles and editions) for advanced search
  async getBookFilters() {
    return await this.get('/books/filters');
  }

  // Reservations API
  async getReservations(studentId) {
    // Use the new student-accessible endpoint
    return await this.get('/reservations/my-reservations');
  }

  async createReservation(studentId, bookId) {
    return await this.post('/reservations', { studentId, bookId });
  }

  async cancelReservation(reservationId) {
    return await this.put(`/reservations/cancel/${reservationId}`);
  }

  // Loans API
  async getLoans(studentId) {
    // Use the new student-accessible endpoint
    return await this.get('/loans/my-loans');
  }

  // Auth API (these don't need tokens)
  async login(email, password) {
    return await this.post('/auth/login', { email, password });
  }

  async register(userData) {
    return await this.post('/auth/register', userData);
  }

  // Notifications API
  async getNotifications(userId) {
    // Use the correct student endpoint for getting notifications
    return await this.get('/notifications/my-notifications');
  }

  async markNotificationAsRead(notificationId) {
    return await this.put(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead(userId) {
    // Use the correct student endpoint for marking all as read
    return await this.put('/notifications/mark-all-read');
  }

  async getUnreadNotificationCount() {
    // Add method to get unread notification count
    return await this.get('/notifications/unread-count');
  }

  // Dashboard counters API
  async getDashboardCounters() {
    return await this.get('/dashboard/counters');
  }

  // Library Updates API
  async getLibraryUpdates(params = {}) {
    return await this.get('/library-updates', params);
  }

  async searchLibraryUpdates(query, params = {}) {
    return await this.get('/library-updates', { search: query, ...params });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;