const supabase = require('../config/supabase');

exports.getAnalyticsStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // We fetch habits directly to ensure the "Current/Target" bars are live
    const { data: habits, error: habitError } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId);

    const { data: history, error: historyError } = await supabase
      .from('habit_history')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (habitError || historyError) throw habitError || historyError;

    // Log this to your terminal to see if the new habit is actually in the array
    console.log("Analytics Data Sent:", habits.length, "habits found");

    res.json({ habits: habits || [], history: history || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};