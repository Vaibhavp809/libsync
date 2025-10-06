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
app.use(express.json());
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

// Schedule daily cleanup of expired QR codes
scheduleCleanup();

// Improved overdue reminder job with smart scheduling
const { getOverdueLoans, sendOverdueReminder } = require('./controllers/loanController');
cron.schedule('0 9 * * *', async () => {
  try {
    const Loan = require('./models/Loan');
    const Setting = require('./models/Setting');
    const { sendMail } = require('./utils/mailer');
    
    const settings = await Setting.findOne() || {};
    const finePerDay = settings.finePerDay || 10;
    const now = new Date();
    
    // Get all overdue loans
    const overdue = await Loan.find({ 
      status: 'Issued', 
      dueDate: { $lt: now } 
    }).populate('book').populate('student');
    
    for (const loan of overdue) {
      if (!loan.student?.email) continue;
      
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
        const subject = "Overdue Book Reminder - LibSync";
        const body = `Dear ${loan.student.name},

Your book "${loan.book?.title}" (Accession No.: ${loan.book?.accessionNumber}) is overdue.

Due Date: ${new Date(loan.dueDate).toLocaleDateString()}
Days Overdue: ${daysLate}
Current Fine: ₹${fine}

Please return the book as soon as possible to avoid additional fines.

Fine Policy:
- Fine per day: ₹${finePerDay}
- Maximum fine: ₹500

If you have any questions, please contact the library staff.

Best regards,
LibSync Library Management System`;

        try {
          await sendMail({ 
            to: loan.student.email, 
            subject, 
            text: body 
          });
          
          loan.lastReminderSentAt = now;
          await loan.save();
          
          console.log(`Sent overdue reminder to ${loan.student.email} for book: ${loan.book?.title}`);
        } catch (e) {
          console.error(`Failed to send overdue email to ${loan.student.email}:`, e.message);
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log('📱 Daily QR Attendance System initialized');
  console.log('🔄 QR code cleanup scheduled');
});
