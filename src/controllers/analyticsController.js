const Habit = require("../models/Habit");
const ActivityLog = require("../models/ActivityLog");

exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Create a "Today" date range (00:00:00 to 23:59:59)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 2. Fetch all habits for the user
    const userHabits = await Habit.find({ userId });

    // 3. Aggregate logs ONLY for today
    const stats = await ActivityLog.aggregate([
      { 
        $match: { 
          userId: req.user._id, // Ensure type matches (ObjectId vs String)
          date: { $gte: startOfToday, $lte: endOfToday } 
        } 
      },
      { 
        $group: { 
          _id: "$habitId", 
          dailyTotal: { $sum: "$value" } 
        } 
      }
    ]);

    // 4. Map data: Use today's progress vs the daily target
    const habitsWithProgress = userHabits.map(habit => {
      const log = stats.find(s => s._id.toString() === habit._id.toString());
      return {
        id: habit._id,
        title: habit.title,
        category: habit.category,
        target: habit.target, // Use the daily target from your model
        current: log ? log.dailyTotal : 0
      };
    });

    res.json({ 
      habits: habitsWithProgress,
      date: startOfToday // Optional: Send date back for UI confirmation
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMonthlyTrend = async (req, res) => {
  try {
    const userId = req.user.id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const habits = await Habit.find({ 
      user: userId,
      "logs.date": { $gte: thirtyDaysAgo } 
    });

    // Create a map of date strings to completion percentages
    const trendMap = {};

    habits.forEach(habit => {
      habit.logs.forEach(log => {
        if (log.date >= thirtyDaysAgo) {
          const dateStr = log.date.toISOString().split('T')[0];
          if (!trendMap[dateStr]) {
            trendMap[dateStr] = { totalItems: 0, completedItems: 0 };
          }
          trendMap[dateStr].totalItems += habit.target;
          trendMap[dateStr].completedItems += log.count;
        }
      });
    });

    // Generate the last 30 days to ensure no gaps in the chart
    const finalTrend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayData = trendMap[dateStr];
      const percentage = dayData ? Math.round((dayData.completedItems / dayData.totalItems) * 100) : 0;

      finalTrend.push({
        dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        percentage: percentage
      });
    }

    res.json(finalTrend);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};