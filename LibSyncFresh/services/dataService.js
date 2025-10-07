import { authService } from './authService';
import { apiConfig } from '../config/apiConfig';

class DataService {
  
  // ===== BOOKS API =====
  
  async getBooks(params = {}) {
    try {
      // Use the apiService which now supports pagination
      const { apiService } = await import('./apiService');
      return await apiService.getBooks(params);
    } catch (error) {
      console.error('Failed to fetch books:', error);
      throw error;
    }
  }
  
  async getAllBooks() {
    try {
      const { apiService } = await import('./apiService');
      return await apiService.getAllBooks();
    } catch (error) {
      console.error('Failed to fetch all books:', error);
      throw error;
    }
  }
  
  async searchBooks(query) {
    try {
      const { apiService } = await import('./apiService');
      return await apiService.searchBooks(query);
    } catch (error) {
      console.error('Failed to search books:', error);
      throw error;
    }
  }

  async getBookById(bookId) {
    try {
      return await authService.makeAuthenticatedRequest('GET', `/api/managebooks/${bookId}`);
    } catch (error) {
      console.error('Failed to fetch book:', error);
      throw error;
    }
  }

  async getNewArrivals() {
    try {
      return await authService.makeAuthenticatedRequest('GET', '/api/managebooks/new-arrivals');
    } catch (error) {
      console.error('Failed to fetch new arrivals:', error);
      throw error;
    }
  }

  async searchBooksByISBN(isbn) {
    try {
      return await authService.makeAuthenticatedRequest('GET', `/api/managebooks/isbn/${isbn}`);
    } catch (error) {
      console.error('Failed to search by ISBN:', error);
      throw error;
    }
  }

  // ===== RESERVATIONS API =====
  
  async getMyReservations() {
    try {
      return await authService.makeAuthenticatedRequest('GET', '/api/reservations/my-reservations');
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
      throw error;
    }
  }

  async createReservation(bookId) {
    try {
      return await authService.makeAuthenticatedRequest('POST', '/api/reservations', { bookId });
    } catch (error) {
      console.error('Failed to create reservation:', error);
      throw error;
    }
  }

  async cancelReservation(reservationId) {
    try {
      return await authService.makeAuthenticatedRequest('DELETE', `/api/reservations/${reservationId}`);
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
      throw error;
    }
  }

  async updateReservation(reservationId, data) {
    try {
      return await authService.makeAuthenticatedRequest('PUT', `/api/reservations/${reservationId}`, data);
    } catch (error) {
      console.error('Failed to update reservation:', error);
      throw error;
    }
  }

  // ===== LOANS API =====
  
  async getMyLoans() {
    try {
      return await authService.makeAuthenticatedRequest('GET', '/api/loans/my-loans');
    } catch (error) {
      console.error('Failed to fetch loans:', error);
      throw error;
    }
  }

  async getLoanHistory() {
    try {
      return await authService.makeAuthenticatedRequest('GET', '/api/loans/history');
    } catch (error) {
      console.error('Failed to fetch loan history:', error);
      throw error;
    }
  }

  async renewLoan(loanId) {
    try {
      return await authService.makeAuthenticatedRequest('POST', `/api/loans/${loanId}/renew`);
    } catch (error) {
      console.error('Failed to renew loan:', error);
      throw error;
    }
  }

  // ===== ATTENDANCE API =====
  
  async markAttendance(data) {
    try {
      return await authService.makeAuthenticatedRequest('POST', '/api/attendance/scan', data);
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      throw error;
    }
  }

  async getMyAttendance() {
    try {
      return await authService.makeAuthenticatedRequest('GET', '/api/attendance/my-attendance');
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      throw error;
    }
  }

  async getAttendanceHistory() {
    try {
      return await authService.makeAuthenticatedRequest('GET', '/api/attendance/history');
    } catch (error) {
      console.error('Failed to fetch attendance history:', error);
      throw error;
    }
  }

  // ===== PROFILE/USER API =====
  
  async getUserProfile() {
    try {
      return await authService.makeAuthenticatedRequest('GET', '/api/users/profile');
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(profileData) {
    try {
      return await authService.makeAuthenticatedRequest('PUT', '/api/users/profile', profileData);
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  }

  // ===== DASHBOARD/STATS API =====
  
  async getDashboardStats() {
    try {
      return await authService.makeAuthenticatedRequest('GET', '/api/stats/dashboard');
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw error;
    }
  }

  // ===== GENERIC API HELPER =====
  
  async makeRequest(method, endpoint, data = null, useAuth = true) {
    try {
      if (useAuth) {
        return await authService.makeAuthenticatedRequest(method, endpoint, data);
      } else {
        const fullURL = await apiConfig.getEndpoint(endpoint);
        
        const config = {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        };

        if (data) {
          config.body = JSON.stringify(data);
        }

        const response = await fetch(fullURL, config);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      }
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dataService = new DataService();