const jwt = require('jsonwebtoken');

// Attaches req.user if a valid token is present, but never blocks the request.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // ignore invalid token — treat as anonymous
    }
  }
  next();
}

module.exports = optionalAuth;
