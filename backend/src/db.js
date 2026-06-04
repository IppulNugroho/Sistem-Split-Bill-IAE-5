import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";

dotenv.config();

// Force Node.js to use Google DNS (bypass Cloudflare WARP SRV issue)
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/splitbill";

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB connected → ${MONGODB_URI}`);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}
