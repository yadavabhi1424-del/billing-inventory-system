import "dotenv/config";
import app                       from "./app.js";
import { connectDB }             from "./config/database.js";
import { verifyEmailConnection } from "./config/email.js";
import { seedMasterData } from "./config/masterDatabase.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await verifyEmailConnection();
    await seedMasterData(); 

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

process.on("SIGTERM", () => {
  console.log("Server shutting down...");
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});