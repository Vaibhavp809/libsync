import axios from 'axios';
import { apiConfig } from '../config/apiConfig';

class ApiService {
  constructor() {
    this.baseURL = null;
  }

  // Initialize base URL
  async initialize() {
    if (!this.baseURL) {
      this.baseURL = await apiConfig.getBaseURL();
      const fullBaseURL = this.baseURL + '/api';
      axios.defaults.baseURL = fullBaseURL;
    }
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
  async getBooks() {
    return await this.get('/books');
  }

  async searchBooks(query) {
    return await this.get('/books/search', { query });
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
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;