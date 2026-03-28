import jwt from "jsonwebtoken";

const JWT_SECRET          = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN         || "15m";
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const generateAccessToken  = (payload) => jwt.sign(payload, JWT_SECRET,         { expiresIn: JWT_EXPIRES_IN      });
const generateRefreshToken = (payload) => jwt.sign(payload, JWT_REFRESH_SECRET,  { expiresIn: JWT_REFRESH_EXPIRES });
const verifyAccessToken    = (token)   => jwt.verify(token, JWT_SECRET);
const verifyRefreshToken   = (token)   => jwt.verify(token, JWT_REFRESH_SECRET);

const generateTokenPair = (user) => {
  const payload = {
    id:       user.user_id,
    email:    user.email,
    role:     user.role.toLowerCase(),
    name:     user.name,
    dbName:   user.dbName   || null,
    userType: user.userType || 'shop',
  };
  return {
    accessToken:  generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

export {
  generateTokenPair,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
