// Mock API configuration for testing without backend
export class MockApiConfig {
  constructor() {
    this.mockData = {
      users: [
        {
          _id: 'user1',
          username: 'testuser',
          password: 'password123',
          email: 'test@example.com',
          name: 'Test User',
          studentID: 'STU001',
          department: 'Computer Science'
        }
      ],
      books: [
        {
          _id: 'book1',
          title: 'React Native Development',
          author: 'John Doe',
          isbn: '9781234567890',
          category: 'Technology',
          status: 'Available'
        },
        {
          _id: 'book2',
          title: 'JavaScript Fundamentals',
          author: 'Jane Smith',
          isbn: '9780987654321',
          category: 'Programming',
          status: 'Borrowed'
        },
        {
          _id: 'book3',
          title: 'Mobile App Design',
          author: 'Mike Johnson',
          isbn: '9781122334455',
          category: 'Design',
          status: 'Available'
        }
      ],
      loans: [],
      reservations: []
    };
  }

  // Mock login
  async login(username, password) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = this.mockData.users.find(u => 
      u.username === username && u.password === password
    );
    
    if (user) {
      return {
        success: true,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
          studentID: user.studentID,
          department: user.department
        },
        token: 'mock-jwt-token-12345'
      };
    } else {
      throw new Error('Invalid credentials');
    }
  }

  // Mock register
  async register(userData) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if username already exists
    const existingUser = this.mockData.users.find(u => 
      u.username === userData.username
    );
    
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    const newUser = {
      _id: 'user' + (this.mockData.users.length + 1),
      ...userData
    };
    
    this.mockData.users.push(newUser);
    
    return {
      success: true,
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name
      },
      token: 'mock-jwt-token-12345'
    };
  }

  // Mock get books
  async getBooks() {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      books: this.mockData.books
    };
  }

  // Mock search book by ISBN
  async searchBookByISBN(isbn) {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const book = this.mockData.books.find(b => b.isbn === isbn);
    if (book) {
      return book;
    } else {
      throw new Error('Book not found');
    }
  }

  // Mock attendance scan
  async scanAttendance(token, studentId) {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const user = this.mockData.users.find(u => u._id === studentId);
    if (!user) {
      throw new Error('Student not found');
    }
    
    // Mock attendance logic
    const now = new Date();
    const action = Math.random() > 0.5 ? 'check-in' : 'check-out';
    
    return {
      success: true,
      data: {
        action,
        studentName: user.name,
        time: now.toISOString()
      }
    };
  }

  // Mock get endpoint (compatibility with original apiConfig)
  async getEndpoint(path) {
    return `mock://api${path}`;
  }
}

// Create mock instance
export const mockApi = new MockApiConfig();
