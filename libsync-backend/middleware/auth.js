const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(403).send("No token provided");
    }

    // Extract token whether it's "Bearer token" or just "token"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      return res.status(403).send("No token provided");
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).send("Server configuration error");
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).send("Invalid or expired token");
    }
  } catch (err) {
    return res.status(500).send("Internal server error");
  }
};

module.exports = verifyToken;
