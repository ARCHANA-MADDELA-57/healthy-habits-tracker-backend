const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); 
const supabase = require('../config/supabase');

// GET ALL HABITS
router.get('/my-habits', auth, async (req, res) => {
  // req.user is now available here because 'auth' ran first
  const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', req.user.userId); 

  if (error) return res.status(400).json(error);
  res.json(data);
});

// POST: Add a habit
router.post('/add', auth, async (req, res) => {
  // Destructure is_everyday from the body sent by useHabits.js
  const { title, description, target, category, is_everyday, unit } = req.body;
  
  const { data, error } = await supabase
    .from('habits')
    .insert([{
      user_id: req.user.userId,
      title,
      description,
      target,
      category,
      is_everyday, // Ensure this variable name matches the destructured one above
      unit
    }])
    .select();
  
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data[0]);
});

//INCREMENT PROCESS
router.patch('/increment/:id', auth, async (req, res) => {
  try {
    // 1. Get the current status first
    const { data: habit, error: fetchError } = await supabase
      .from('habits')
      .select('current, target, streak')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !habit) return res.status(404).json({ error: "Habit not found" });

    const newCount = habit.current + 1;
    // Check if the habit is finished now
    const isNowComplete = newCount >= habit.target;

    const { data, error } = await supabase
      .from('habits')
      .update({ 
        current: newCount, 
        completed_today: isNowComplete, // This updates the DB boolean
        // If it just became complete, increment streak
        streak: (isNowComplete && habit.current < habit.target) ? habit.streak + 1 : habit.streak,
        last_updated: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DECREMENT PROCESS
router.patch('/decrement/:id', auth, async (req, res) => {
  const { data: habit } = await supabase.from('habits').select('current, target, streak').eq('id', req.params.id).single();
  
  if (habit.current > 0) {
    const newCount = habit.current - 1;
    const isNowIncomplete = newCount < habit.target;

    const { data, error } = await supabase
      .from('habits')
      .update({ 
        current: newCount, 
        completed_today: newCount >= habit.target,
        // If they "un-complete" a habit, you might want to lower the streak
        streak: (habit.current >= habit.target && isNowIncomplete) ? Math.max(0, habit.streak - 1) : habit.streak
      })
      .eq('id', req.params.id)
      .select();
      
    return res.json(data[0]);
  }
  res.status(400).json({ error: "Cannot decrement below zero" });
});

// EDIT
router.put('/update/:id', auth, async (req, res) => {
  const { title, description, target, category, is_everyday, unit } = req.body;
  const newTarget = parseInt(target);

  try {
    // 1. Fetch current progress and existing streak
    const { data: habit, error: fetchError } = await supabase
      .from('habits')
      .select('current, streak, completed_today')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Logic: Is it still completed?
    const wasCompleted = habit.completed_today;
    const isNowCompleted = habit.current >= newTarget;

    // 3. Streak Logic: 
    // If it was completed, but the new target makes it INCOMPLETE, 
    // we should remove the streak point they just earned.
    let updatedStreak = habit.streak;
    if (wasCompleted && !isNowCompleted) {
      updatedStreak = Math.max(0, habit.streak - 1);
    } 
    // If it wasn't completed, but the new target is so low it's NOW complete
    else if (!wasCompleted && isNowCompleted) {
      updatedStreak = habit.streak + 1;
    }

    // 4. Update the database
    const { data, error: updateError } = await supabase
      .from('habits')
      .update({ 
        title, 
        description, 
        target: newTarget, 
        category, 
        is_everyday, 
        unit,
        completed_today: isNowCompleted,
        streak: updatedStreak
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .select();

    if (updateError) throw updateError;
    res.json(data[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.userId);

  if (error) return res.status(400).json(error);
  res.json({ message: "Deleted successfully" });
});

module.exports = router;