const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');

// 1. Daily Analytics (Active Habits Only)
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

// 2. Weekly Trend (Last 7 Days)
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

// GET: Monthly Pulse (Last 30 Days)
router.get('/monthly-trend', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('habit_history')
            .select('date, achieved_value, target_value')
            .eq('user_id', userId)
            .gte('date', startDate)
            .order('date', { ascending: true });

        if (error) throw error;

        // Group by date to handle multiple habits per day
        const trendData = data.reduce((acc, entry) => {
            if (!acc[entry.date]) acc[entry.date] = { date: entry.date, total: 0, achieved: 0 };
            acc[entry.date].total += entry.target_value;
            acc[entry.date].achieved += entry.achieved_value;
            return acc;
        }, {});

        const formattedData = Object.values(trendData).map(day => ({
            // Format date as "MMM DD" (e.g., Feb 25)
            dateLabel: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            percentage: Math.round((day.achieved / day.total) * 100) || 0
        }));

        res.json(formattedData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;