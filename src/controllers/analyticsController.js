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