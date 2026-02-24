const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); 
const supabase = require('../config/supabase');

router.get('/stats', auth, async (req, res) => {
    try {
        const userId = req.user.userId; 

        // 1. Fetch live habits
        const { data: habits, error: habitError } = await supabase
            .from('habits')
            .select('*')
            .eq('user_id', userId);

        if (habitError) throw habitError;

        // 2. Fetch history (Wrapped in a try/catch or checked carefully)
        const { data: history, error: historyError } = await supabase
            .from('habit_history')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        // If history table exists but is empty, history will be []
        // if historyError exists, we log it but still send the habits data
        if (historyError) {
            console.error("History fetch error (table may be missing):", historyError.message);
        }

        res.status(200).json({ 
            habits: habits || [], 
            history: history || [] 
        });

    } catch (err) {
        console.error("Analytics Server Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;