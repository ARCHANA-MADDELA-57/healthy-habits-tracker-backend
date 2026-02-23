const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // <--- Importing your pasted code
const supabase = require('../config/supabase');

// Notice 'auth' is passed as the second argument here
router.get('/my-habits', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', req.user.userId); // req.user comes from your auth.js logic

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;