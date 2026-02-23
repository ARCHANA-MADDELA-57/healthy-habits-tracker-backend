const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// SIGNUP
router.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ message: "Success! Check your email for verification.", user: data.user });
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Verify credentials with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error || !data.user) {
        return res.status(401).json({ error: "Invalid login credentials" });
    }

    // Generate our JWT for the frontend to use
    const token = jwt.sign(
        { userId: data.user.id, email: data.user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({ token, user: data.user });
});

module.exports = router;