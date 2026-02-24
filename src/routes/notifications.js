router.post('/subscribe', authMiddleware, async (req, res) => {
    const { subscription } = req.body;
    
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert([{ 
        user_id: req.user.userId, 
        subscription_json: subscription 
      }]);
  
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ success: true });
  });