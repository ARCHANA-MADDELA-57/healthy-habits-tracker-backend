const supabase = require('../config/supabase');
const webpush = require('web-push');

// ADD THIS HERE to ensure the worker has the keys
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const runNotificationCheck = async () => {
  console.log("--- Starting Notification Check ---");

  try {
    // 1. Fetch habits that are ACTIVE
    // We remove the .filter() here to avoid the "syntax error"
    const { data: habits, error: habitError } = await supabase
      .from('habits')
      .select('id, title, user_id, current, target, last_notified_at')
      .eq('is_archived', false);

    if (habitError) throw habitError;
    if (!habits || habits.length === 0) {
      console.log("No active habits found in database.");
      return;
    }

    const now = new Date();
    const usersToNotify = {};

    // 2. Filter logic in JavaScript (Fixes the syntax error)
    for (const habit of habits) {
      const isComplete = habit.current >= habit.target;
      const progress = habit.target > 0 ? (habit.current / habit.target) * 100 : 0;
      const lastNotified = habit.last_notified_at ? new Date(habit.last_notified_at) : null;
      
      // LOGIC:
      // - Must be incomplete (current < target)
      // - Progress must be low (< 30%)
      // - Cooldown must have passed (30 mins = 1,800,000ms)
      const cooldownPassed = !lastNotified || (now - lastNotified) > 1800000;

      if (!isComplete && progress < 30 && cooldownPassed) {
        if (!usersToNotify[habit.user_id]) usersToNotify[habit.user_id] = [];
        usersToNotify[habit.user_id].push(habit);
      }
    }

    const userIds = Object.keys(usersToNotify);
    if (userIds.length === 0) {
      console.log("No users met the criteria for a reminder (either progress is >30% or cooldown active).");
      return;
    }

    // 3. Send Notifications
    for (const userId of userIds) {
      const { data: subs, error: subError } = await supabase
        .from('push_subscriptions')
        .select('subscription_json')
        .eq('user_id', userId);

      if (subError) {
        console.error(`Error fetching subscriptions for user ${userId}:`, subError.message);
        continue;
      }

      if (subs && subs.length > 0) {
        const userHabits = usersToNotify[userId];
        const payload = JSON.stringify({
          title: "Habit Reminder 🎯",
          body: `You have ${userHabits.length} habits with low progress. Keep moving!`
        });

        console.log(`Sending push to User: ${userId} for ${userHabits.length} habits.`);

        await Promise.all(subs.map(sub => 
          webpush.sendNotification(sub.subscription_json, payload)
            .catch(e => console.log("Individual Push Device failed (likely expired)."))
        ));

        // 4. Update timestamp to start the 30-min cooldown
        await supabase
          .from('habits')
          .update({ last_notified_at: now.toISOString() })
          .in('id', userHabits.map(h => h.id));
      }
    }
    
    console.log("--- Notification Check Finished ---");
  } catch (err) {
    console.error("Worker Error:", err.message);
  }
};

module.exports = { runNotificationCheck };