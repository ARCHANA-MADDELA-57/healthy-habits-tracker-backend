const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');

// 1. Updated Stats Route
router.get('/stats', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { month, year } = req.query;

        const { data: habits, error: habitError } = await supabase
            .from('habits')
            .select('*')
            .eq('user_id', userId)
            .eq('is_archived', false); // <--- ADD THIS FILTER

        let historyQuery = supabase
            .from('habit_history')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (year && year !== 'All') {
            historyQuery = historyQuery.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
        }
        
        if (month && month !== 'All') {
            const monthsMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', 
                                Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
            const monthNum = monthsMap[month];
            historyQuery = historyQuery.like('date', `%-${monthNum}-%`);
        }

        const { data: history, error: historyError } = await historyQuery;
        if (habitError || historyError) throw (habitError || historyError);

        res.status(200).json({ habits: habits || [], history: history || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Updated Daily Analytics Route
router.get('/daily', auth, async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: habits, error: habitError } = await supabase
            .from('habits')
            .select('id, title, category, current, target') 
            .eq('user_id', userId)
            .eq('is_archived', false); // <--- ADD THIS FILTER

        if (habitError) throw habitError;

        res.status(200).json({ habits: habits || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;