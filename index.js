const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const cron = require('node-cron');
const express = require('express');
const cors = require('cors');
const supabase = require('./src/config/supabase'); // Ensure supabase is imported for the cron reset
require('dotenv').config();

// 1. IMPORT the function from your worker file
const { runNotificationCheck } = require('./src/workers/notificationWorker'); 

const authRoutes = require('./src/routes/authRoutes');
const habitRoutes = require('./src/routes/habitRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');

const app = express();

// 2. SCHEDULE the Notification Check (Runs every 30 minutes)
cron.schedule('*/30 * * * *', () => { 
    console.log("Cron trigger: Starting notification check...");
    runNotificationCheck(); 
});

// 3. SCHEDULE Midnight Habit Reset (Runs every day at 00:00)
cron.schedule('0 0 * * *', async () => {
  console.log("🕛 Midnight Reset Triggered...");
  try {
      const { error } = await supabase.rpc('reset_daily_habits');
      if (error) throw error;
      console.log("✅ Reset successful");
  } catch (err) {
      console.error("❌ Reset failed:", err);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata" // Ensure this is exactly "Asia/Kolkata"
});

app.use(cors({
  origin: "*"
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/analytics', analyticsRoutes);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});


server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;