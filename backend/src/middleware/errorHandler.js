const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || "Internal Server Error";

  if (err.code === "ER_DUP_ENTRY") {
    statusCode = 409;
    if      (err.message.includes("email")) message = "Email already registered.";
    else if (err.message.includes("sku"))   message = "SKU already exists.";
    else                                    message = "Duplicate entry. Record already exists.";
  }

  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    statusCode = 400;
    message = "Related record not found. Check your references.";
  }

  if (err.name === "JsonWebTokenError")  { statusCode = 401; message = "Invalid token."; }
  if (err.name === "TokenExpiredError")  { statusCode = 401; message = "Token expired. Please login again."; }

  if (process.env.NODE_ENV === "development") {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${statusCode}: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export { notFound, errorHandler, AppError };