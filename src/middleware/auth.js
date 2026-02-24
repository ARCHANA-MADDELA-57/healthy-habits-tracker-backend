const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log("Auth Denied: No Bearer Token");
            return res.status(401).json({ error: "No token, authorization denied" });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify token using the same secret from your login route
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // IMPORTANT: This attaches the data to the request
        req.user = decoded; 
        
        console.log("Auth Success: User ID", req.user.userId);
        next();
    } catch (err) {
        console.log("Auth Error:", err.message);
        res.status(401).json({ error: "Token is not valid" });
    }
};

module.exports = auth;