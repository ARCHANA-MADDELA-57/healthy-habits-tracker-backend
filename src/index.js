const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const cron = require('node-cron');
// 1. IMPORT the function from your worker file
const runNotificationCheck = require('./workers/notificationWorker'); 

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const habitRoutes = require('./routes/habitRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// 2. SCHEDULE the imported function
cron.schedule('*/30 * * * *', () => { 
    console.log("Cron trigger: Starting notification check...");
    // This must match the name of the import above
    runNotificationCheck(); 
});

// Runs every day at 00:00 (Midnight)
cron.schedule('0 0 * * *', async () => {
    console.log('Running Midnight Habit Reset...');
    
    try {
      // 1. Reset Everyday Habits
      // If they completed it, streak continues. If not, streak resets to 0.
      // This SQL logic assumes you have a 'streak' and 'completed_today' column
      await supabase.rpc('reset_daily_habits'); // Using a Postgres Function is more efficient
  
      // 2. Archive non-recurring habits that were either completed or are just old
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
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;