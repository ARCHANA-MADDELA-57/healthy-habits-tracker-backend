const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');

// Helper function: Strong Password & Email check
const validateSignup = (email, password) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    
    if (!emailRegex.test(email)) return "Please provide a valid email address.";
    if (!passwordRegex.test(password)) return "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character.";
    return null;
};

// NEW: GET CURRENT USER PROFILE FROM DATABASE
router.get('/me', authMiddleware, async (req, res) => {
  try {
      const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', req.user.userId)
          .single();

      if (error || !profile) {
          return res.status(404).json({ error: "Profile not found" });
      }

      res.json({
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name // Mapping snake_case to camelCase for frontend
      });
  } catch (err) {
      res.status(500).json({ error: "Server error" });
  }
});

// SIGNUP ROUTE
router.post('/signup', async (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
      return res.status(400).json({ error: "All fields are required." });
  }

  try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
      });

      if (authError) {
          console.error("Supabase Auth Error:", authError.message);
          return res.status(400).json({ error: authError.message });
      }

      if (!authData?.user) {
          return res.status(400).json({ error: "Signup failed - no user data returned." });
      }

      const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ 
              id: authData.user.id, 
              full_name: fullName, 
              email: email 
          }]);

      if (profileError) console.error("Profile DB Error:", profileError);

      res.status(201).json({ success: true, user: authData.user });

  } catch (err) {
      console.error("Signup Crash:", err);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// LOGIN ROUTE
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.user) {
        return res.status(401).json({ error: "Invalid email or password!" });
    }

    const token = jwt.sign(
      { userId: data.user.id, email: data.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ 
      success: true,
      token, 
      user: { 
        id: data.user.id, 
        email: data.user.email, 
        fullName: data.user.user_metadata?.full_name || "User" 
      } 
    });
  } catch (err) {
    res.status(500).json({ error: "Server error during login" });
  }
});

module.exports = router;