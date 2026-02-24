const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');

router.get('/stats', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { month, year } = req.query;

        // 1. Fetch Active Habits (for charts)
        const { data: habits, error: habitError } = await supabase
            .from('habits')
            .select('*')
            .eq('user_id', userId);

        // 2. Build History Query
        let historyQuery = supabase
            .from('habit_history')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        // Backend Filtering by Year
        if (year && year !== 'All') {
            historyQuery = historyQuery.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
        }
        
        // Backend Filtering by Month
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

module.exports = router;