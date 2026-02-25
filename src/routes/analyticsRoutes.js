const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');

// 1. Stats Route (Filtered for Active Habits)
router.get('/stats', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { data: habits, error: habitError } = await supabase
            .from('habits')
            .select('*')
            .eq('user_id', userId)
            .eq('is_archived', false); 

        const { data: history, error: historyError } = await supabase
            .from('habit_history')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (habitError || historyError) throw (habitError || historyError);
        res.status(200).json({ habits: habits || [], history: history || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Daily Analytics Route (Active Only)
router.get('/daily', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { data: habits, error: habitError } = await supabase
            .from('habits')
            .select('id, title, category, current, target') 
            .eq('user_id', userId)
            .eq('is_archived', false);

        if (habitError) throw habitError;
        res.status(200).json({ habits: habits || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Weekly Trend (Pulls everything from History)
router.get('/history-trend', auth, async (req, res) => {
    try {
      const userId = req.user.userId;
      const { data, error } = await supabase
        .from('habit_history')
        .select('date, achieved_value, target_value')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .limit(100);
  
      if (error) throw error;
  
      const trendData = data.reduce((acc, entry) => {
        if (!acc[entry.date]) acc[entry.date] = { date: entry.date, total: 0, achieved: 0 };
        acc[entry.date].total += entry.target_value;
        acc[entry.date].achieved += entry.achieved_value;
        return acc;
      }, {});
  
      const formattedData = Object.values(trendData).map(day => ({
        date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
        percentage: Math.round((day.achieved / day.total) * 100) || 0
      }));
  
      res.json(formattedData);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});

module.exports = router;