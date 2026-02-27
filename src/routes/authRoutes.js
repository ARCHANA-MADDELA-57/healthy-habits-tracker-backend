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

// UPDATE USER PROFILE
router.put('/update-profile', authMiddleware, async (req, res) => {
  const { fullName } = req.body;

  if (!fullName) {
    return res.status(400).json({ error: "Full name is required." });
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', req.user.userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      user: {
        id: data.id,
        email: data.email,
        fullName: data.full_name
      }
    });
  } catch (err) {
    console.error("Profile Update Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 1. Send the Public Key to Frontend
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// 2. Receiving and Saving Subscription (ON Toggle)
router.post('/subscribe', authMiddleware, async (req, res) => {
  const { subscription } = req.body;
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { 
        user_id: req.user.userId, 
        subscription_json: subscription 
      }, 
      { onConflict: 'user_id' } // Resolves conflict based on your SQL unique constraint
    );

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true });
});

// 3. Remove subscription (OFF Toggle)
router.delete('/unsubscribe', authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', req.user.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send(); 
});

// TEMPORARY: Manual Test Route
router.post('/send-test-push', authMiddleware, async (req, res) => {
  const webpush = require('web-push');
  
  // Set details again inside the route if you aren't sure they are set globally
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const { data: sub, error } = await supabase
  .from('push_subscriptions')
  .select('*')
  .eq('user_id', req.user.userId)
  .order('created_at', { ascending: false }) // Always get the most recent registration
  .limit(1)
  .maybeSingle(); // Prevents crashing if the table is empty

  if (error || !sub) return res.status(404).json({ error: "Subscription not found" });

  try {
    await webpush.sendNotification(sub.subscription_json, JSON.stringify({
      title: "Test Alert",
      body: "Working!"
    }));
    res.json({ success: true });
  } catch (err) {
    // THIS LOG IS CRITICAL: Check your Node terminal for this output
    console.error("WEB PUSH ERROR DETAILS:", err.statusCode, err.body);
    res.status(500).json({ error: err.message, details: err.body });
  }
});

// 1. REQUEST PASSWORD RESET CODE
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) return res.status(400).json({ error: error.message });
  
  res.json({ message: "Password reset code sent to your email." });
});

// 2. VERIFY CODE AND UPDATE PASSWORD
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  // Verify the OTP (the code sent to email)
  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'recovery'
  });

  if (verifyError) return res.status(400).json({ error: "Invalid or expired code" });

  // If code is valid, update the password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updateError) return res.status(400).json({ error: updateError.message });

  res.json({ success: true, message: "Password updated successfully!" });
});

module.exports = router;