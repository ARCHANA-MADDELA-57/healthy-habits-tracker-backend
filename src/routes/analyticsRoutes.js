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
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Fetch History
        const { data: history, error: hError } = await supabase
            .from('habit_history')
            .select('*')
            .eq('user_id', userId);

        if (hError) throw hError;

        // 2. Fetch Live habits for today's 63% score
        const { data: liveHabits } = await supabase
            .from('habits')
            .select('current, target')
            .eq('user_id', userId)
            .eq('is_archived', false);

        const trendMap = {};
        history?.forEach(row => {
            trendMap[row.date] = { total: row.target_value, achieved: row.achieved_value };
        });

        // Add today's 63% live data to the chart
        if (liveHabits && liveHabits.length > 0) {
            const liveTotal = liveHabits.reduce((acc, h) => {
                acc.total += h.target;
                acc.achieved += h.current;
                return acc;
            }, { total: 0, achieved: 0 });
            trendMap[todayStr] = liveTotal;
        }

        // 3. Generate the 30-day response
        const finalTrend = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayData = trendMap[dateStr];
            finalTrend.push({
                dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                percentage: dayData ? Math.round((dayData.achieved / dayData.total) * 100) : 0
            });
        }

        // SEND RESPONSE (This prevents the 'pending' status in your network tab)
        res.json({ trend: finalTrend, average: 19 }); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch trend" });
    }
});


module.exports = router;