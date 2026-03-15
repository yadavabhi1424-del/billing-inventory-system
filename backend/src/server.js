require("dotenv").config();
const app                  = require("./app");
const { connectDB }        = require("./config/database");
const { verifyEmailConnection } = require("./config/email");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MySQL
    await connectDB();

    // Connect to Email (optional — won't crash if not set up)
    await verifyEmailConnection();

    // Start server
    app.listen(PORT, () => {
      console.log("\n🚀 ──────────────────────────────────────────");
      console.log("   StockSense Pro Backend is running!");
      console.log(`   Server  : http://localhost:${PORT}`);
      console.log(`   API     : http://localhost:${PORT}/api`);
      console.log(`   Health  : http://localhost:${PORT}/api/health`);
      console.log(`   Env     : ${process.env.NODE_ENV}`);
      console.log("─────────────────────────────────────────────\n");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Server shutting down...");
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});