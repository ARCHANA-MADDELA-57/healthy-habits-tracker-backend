const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const habitRoutes = require('./routes/habitRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/analytics', analyticsRoutes);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// Add this for Node v24 stability with Supabase
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;