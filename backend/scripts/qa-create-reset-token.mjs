import { Pool } from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:mayzer@localhost:5432/calendar_db";

const pool = new Pool({ connectionString: DATABASE_URL });

const username = `resetqa_${Math.floor(Math.random() * 1e6)}`;
const email = `${username}@example.com`;
const oldPass = "OldPassw0rd!";
const newPass = "NewPassw0rd!";

try {
  const hashed = await bcrypt.hash(oldPass, 10);
  const u = await pool.query(
    "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id",
    [username, email, hashed]
  );

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await pool.query(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + interval '30 minutes')",
    [u.rows[0].id, tokenHash]
  );

  process.stdout.write(JSON.stringify({ username, email, token, newPass }));
} finally {
  await pool.end();
}

