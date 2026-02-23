const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import the routes
const authRoutes = require('./routes/authRoutes');
// const habitRoutes = require('./routes/habitRoutes'); // Uncomment this after you create the file

const app = express();

// --- MIDDLEWARE ---

// 1. CORS: Allows your React app (usually on port 5173 or 3000) to talk to this server
app.use(cors());

// 2. JSON Parser: Allows the server to read 'req.body' from your frontend fetch calls
app.use(express.json());

// --- ROUTES ---

// Auth Routes: handles http://localhost:5000/api/auth/signup and /login
app.use('/api/auth', authRoutes);

// Habit Routes: handles http://localhost:5000/api/habits
// app.use('/api/habits', habitRoutes); 

// --- SERVER START ---

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`✅ Ready to accept Frontend requests`);
    console.log(`=================================`);
});