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