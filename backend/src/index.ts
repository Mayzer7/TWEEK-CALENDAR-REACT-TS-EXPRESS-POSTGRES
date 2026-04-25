import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDatabase } from "./db/pool.js";
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";
import somedayRoutes from "./routes/someday.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
  process.exit(1);
}

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/someday", somedayRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

async function start() {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
