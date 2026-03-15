const jwt = require("jsonwebtoken");

const JWT_SECRET          = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN      || "15m";
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

const generateTokenPair = (user) => {
  const payload = {
    id:    user.user_id,
    email: user.email,
    role:  user.role,
    name:  user.name,
  };
  return {
    accessToken:  generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

module.exports = {
  generateTokenPair,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};