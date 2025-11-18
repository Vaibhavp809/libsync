const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const { scheduleCleanup } = require('./utils/qrCodeGenerator');
const cron = require('node-cron');

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// Register routes BEFORE listen()
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);


// Sample route
app.get('/', (req, res) => {
  res.send('LibSync API is running...');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'LibSync API is healthy' });
});

const bookRoutes = require("./routes/books");
app.use("/api/books", bookRoutes);

const reservationRoutes = require("./routes/reservations");
app.use("/api/reservations", reservationRoutes);

const loanRoutes = require("./routes/loans");
app.use("/api/loans", loanRoutes);

const attendanceRoutes = require("./routes/attendance");
app.use("/api/attendance", attendanceRoutes);

const userRoutes = require("./routes/users");
app.use("/api/users", userRoutes);

const reportRoutes = require("./routes/reports");
app.use("/api/reports", reportRoutes);

const notificationRoutes = require("./routes/notifications");
app.use("/api/notifications", notificationRoutes);

const settingsRoutes = require("./routes/settings");
app.use("/api/settings", settingsRoutes);

const eResourceRoutes = require("./routes/eresources");
app.use("/api/eresources", eResourceRoutes);

const placementNewsRoutes = require("./routes/placementNews");
app.use("/api/placement-news", placementNewsRoutes);

const libraryUpdateRoutes = require("./routes/libraryUpdates");
app.use("/api/library-updates", libraryUpdateRoutes);

const stockRoutes = require("./routes/stock");
app.use("/api/stock", stockRoutes);

const departmentRoutes = require("./routes/departments");
app.use("/api/departments", departmentRoutes);

const dashboardRoutes = require("./routes/dashboard");
app.use("/api/dashboard", dashboardRoutes);

// Schedule daily cleanup of expired QR codes
scheduleCleanup();

// Schedule weekly cleanup of expired library updates
const { scheduleLibraryUpdateCleanup } = require('./utils/libraryUpdateCleanup');
scheduleLibraryUpdateCleanup();

// Improved overdue reminder job with smart scheduling (in-app notifications only)
const { getOverdueLoans, sendOverdueReminder } = require('./controllers/loanController');
cron.schedule('0 9 * * *', async () => {
  try {
    const Loan = require('./models/Loan');
    const Setting = require('./models/Setting');
    
    const settings = await Setting.findOne() || {};
    const finePerDay = settings.finePerDay || 10;
    const now = new Date();
    
    // Get all overdue loans
    const overdue = await Loan.find({ 
      status: 'Issued', 
      dueDate: { $lt: now } 
    }).populate('book').populate('student');
    
    for (const loan of overdue) {
      if (!loan.student?._id) continue;
      
      const daysLate = Math.ceil((now - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const fine = Math.max(0, daysLate * finePerDay);
      
      // Determine if we should send a reminder based on the schedule
      let shouldSendReminder = false;
      
      if (daysLate <= 15) {
        // Daily reminders for first 15 days
        shouldSendReminder = true;
      } else {
        // Every 15 days after the first 15 days
        const daysSinceLastReminder = loan.lastReminderSentAt 
          ? Math.ceil((now - new Date(loan.lastReminderSentAt).getTime()) / (1000 * 60 * 60 * 24))
          : daysLate;
        
        shouldSendReminder = daysSinceLastReminder >= 15;
      }
      
      if (shouldSendReminder) {
        try {
          // Create in-app notification for the student
          const Notification = require('./models/Notification');
          const notification = new Notification({
            title: `Book Overdue: ${loan.book?.title}`,
            message: `Your book "${loan.book?.title}" (Accession No.: ${loan.book?.accessionNumber}) is ${daysLate} day${daysLate > 1 ? 's' : ''} overdue. Current fine: ₹${fine}. Please return it as soon as possible.`,
            type: 'due_date',
            priority: 'high',
            recipient: loan.student._id,
            broadcast: false,
            recipients: 'specific', // Legacy compatibility
            targetUsers: [loan.student._id], // Legacy compatibility
            data: {
              loanId: loan._id,
              bookId: loan.book?._id,
              dueDate: loan.dueDate
            },
            createdBy: loan.student._id, // System-generated notification
            status: 'active'
          });
          await notification.save();
          
          loan.lastReminderSentAt = now;
          await loan.save();
          
          console.log(`Created overdue reminder notification for ${loan.student.name || loan.student.studentID} for book: ${loan.book?.title}`);
        } catch (e) {
          console.error(`Failed to create overdue reminder notification:`, e.message);
        }
      }
    }
    
    console.log(`Overdue reminder job processed ${overdue.length} loans`);
  } catch (err) {
    console.error('Overdue cron failed:', err.message);
  }
}, {
  timezone: "Asia/Kolkata"
});

// Due today reminder job - sends notifications for books due today
cron.schedule('0 8 * * *', async () => {
  try {
    const Loan = require('./models/Loan');
    const Notification = require('./models/Notification');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get loans due today (not overdue, but due today)
    const dueToday = await Loan.find({ 
      status: 'Issued', 
      dueDate: { 
        $gte: today,
        $lt: tomorrow
      }
    }).populate('book').populate('student');
    
    for (const loan of dueToday) {
      if (!loan.student?._id) continue;
      
      try {
        // Create in-app notification for the student
        const notification = new Notification({
          title: `Book Due Today: ${loan.book?.title}`,
          message: `Your book "${loan.book?.title}" (Accession No.: ${loan.book?.accessionNumber}) is due today. Please return it to avoid fines.`,
          type: 'due_date',
          priority: 'high',
          recipient: loan.student._id,
          broadcast: false,
          recipients: 'specific', // Legacy compatibility
          targetUsers: [loan.student._id], // Legacy compatibility
          data: {
            loanId: loan._id,
            bookId: loan.book?._id,
            dueDate: loan.dueDate
          },
          createdBy: loan.student._id, // System-generated notification
          status: 'active'
        });
        await notification.save();
        
        console.log(`Created due today notification for ${loan.student.name || loan.student.studentID} for book: ${loan.book?.title}`);
      } catch (e) {
        console.error(`Failed to create due today notification:`, e.message);
      }
    }
    
    console.log(`Due today reminder job processed ${dueToday.length} loans`);
  } catch (err) {
    console.error('Due today cron failed:', err.message);
  }
}, {
  timezone: "Asia/Kolkata"
});

// Force logout all students at 6 PM IST (if they forgot to logout)
cron.schedule('0 18 * * *', async () => {
  try {
    const Attendance = require('./models/Attendance');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find all active sessions (logged in but not logged out) for today
    const activeSessions = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow
      },
      logoutTime: null // Only sessions that haven't been logged out
    });
    
    // Force logout all active sessions
    const updateResult = await Attendance.updateMany(
      {
        date: {
          $gte: today,
          $lt: tomorrow
        },
        logoutTime: null
      },
      {
        $set: {
          logoutTime: now,
          status: 'left'
        }
      }
    );
    
    console.log(`Force logout at 6 PM IST: ${updateResult.modifiedCount} active sessions logged out`);
  } catch (err) {
    console.error('Force logout cron job failed:', err.message);
  }
}, {
  timezone: "Asia/Kolkata"
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log('📱 Daily QR Attendance System initialized');
  console.log('🔄 QR code cleanup scheduled');
});
