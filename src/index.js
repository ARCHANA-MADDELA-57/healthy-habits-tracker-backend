const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import the routes
const authRoutes = require('./routes/authRoutes');
const habitRoutes = require('./routes/habitRoutes');
const app = express();

app.use(cors());
app.use(express.json());

// --- ROUTES ---

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`✅ Ready to accept Frontend requests`);
    console.log(`=================================`);
});