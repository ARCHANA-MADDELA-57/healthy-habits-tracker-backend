const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const cron = require('node-cron');
const express = require('express');
const cors = require('cors');
const supabase = require('./config/supabase'); // Ensure supabase is imported for the cron reset
require('dotenv').config();

// 1. IMPORT the function from your worker file
const { runNotificationCheck } = require('./workers/notificationWorker'); 

const authRoutes = require('./routes/authRoutes');
const habitRoutes = require('./routes/habitRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// 2. SCHEDULE the Notification Check (Runs every 30 minutes)
cron.schedule('*/30 * * * *', () => { 
    console.log("Cron trigger: Starting notification check...");
    runNotificationCheck(); 
});

// 3. SCHEDULE Midnight Habit Reset (Runs every day at 00:00)
cron.schedule('0 0 * * *', async () => {
    console.log('Running Midnight Habit Reset...');
    try {
      // Reset daily progress/streaks using your stored procedure
      await supabase.rpc('reset_daily_habits'); 
  
      // Archive non-recurring habits
      await supabase
        .from('habits')
        .update({ is_archived: true })
        .eq('is_everyday', false);
  
      console.log('Daily reset complete.');
    } catch (err) {
      console.error('Reset failed:', err);
    }
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/analytics', analyticsRoutes);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    runNotificationCheck();
});


server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;