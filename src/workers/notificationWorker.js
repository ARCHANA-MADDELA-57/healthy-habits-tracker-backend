const webpush = require('web-push');
const supabase = require('../config/supabase');

// Configure Web-Push using VAPID details from environment variables
webpush.setVapidDetails(
  process.env.VAPID_EMAIL, // Must start with mailto:
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const runNotificationCheck = async () => {
    console.log("Checking for neglected habits...");
  
    try {
      // 1. Fetch habits and the user's subscriptions separately
      // Note: We are NOT joining here anymore to avoid the relationship error
      const { data: habits, error: habitError } = await supabase
        .from('habits')
        .select('id, title, user_id, current, target, last_notified_at');
  
      if (habitError) throw habitError;
      if (!habits || habits.length === 0) return console.log("No habits found.");
  
      const now = new Date();
  
      for (const habit of habits) {
        const progress = habit.target > 0 ? (habit.current / habit.target) * 100 : 0;
  
        // 2. Only proceed if progress is under 30%
        if (progress < 30) {
          const lastNotified = habit.last_notified_at ? new Date(habit.last_notified_at) : null;
          
          // Check 30-minute cooldown
          if (!lastNotified || (now - lastNotified) > 1800000) {
            
            // 3. FETCH SUBSCRIPTIONS FOR THIS SPECIFIC USER
            const { data: subscriptions, error: subError } = await supabase
              .from('push_subscriptions')
              .select('subscription_json')
              .eq('user_id', habit.user_id);
  
            if (subError) {
              console.error(`Error fetching subs for user ${habit.user_id}:`, subError);
              continue; 
            }
            
            if (subscriptions && subscriptions.length > 0) {
              const payload = JSON.stringify({
                title: "HealthyHabits Alert! 🚨",
                body: `Your "${habit.title}" is only at ${Math.round(progress)}%. Keep it up!`
              });
  
              // 4. Send notifications
              subscriptions.forEach(sub => {
                webpush.sendNotification(sub.subscription_json, payload)
                  .catch(err => console.error(`Push failed:`, err.message));
              });
  
              // 5. Update last_notified_at
              await supabase
                .from('habits')
                .update({ last_notified_at: now.toISOString() })
                .eq('id', habit.id);
              
              console.log(`✅ Notification sent for: ${habit.title}`);
            }
          }
        }
      }
    } catch (err) {
      console.error("Worker Error:", err.message);
    }
  };

module.exports=runNotificationCheck;