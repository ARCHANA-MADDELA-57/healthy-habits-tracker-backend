const cron = require('node-cron');
const supabase = require('./config/supabase');

// Run every day at 00:00 (Midnight)
cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Running Midnight Habit Reset & Archive...');
    
    try {
        // 1. Fetch all habits
        const { data: habits, error } = await supabase.from('habits').select('*');
        if (error) throw error;

        for (const habit of habits) {
            // 2. Save current progress to History table before resetting
            await supabase.from('habit_history').insert([{
                user_id: habit.user_id,
                habit_id: habit.id,
                title: habit.title,
                category: habit.category,
                status: habit.current >= habit.target ? 'completed' : 'failed',
                progress: Math.round((habit.current / habit.target) * 100),
                date: new Date().toISOString().split('T')[0] // Yesterday's date effectively
            }]);

            // 3. Reset or Archive logic
            if (habit.is_everyday) {
                // Reset for the new day
                await supabase.from('habits')
                    .update({ current: 0, completed_today: false })
                    .eq('id', habit.id);
            } else {
                // Not everyday? Archive it (delete from active dashboard)
                await supabase.from('habits').delete().eq('id', habit.id);
            }
        }
        console.log('✅ Reset Complete.');
    } catch (err) {
        console.error('❌ Reset Error:', err.message);
    }
});