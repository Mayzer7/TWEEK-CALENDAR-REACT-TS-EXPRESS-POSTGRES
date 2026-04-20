import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { pool } from "../db/pool.js";
import { sendPasswordResetEmail } from "../services/mailer.js";

const router = Router();

router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: "Username, email and password are required" });
      return;
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (normalizedUsername.length < 3) {
      res.status(400).json({ error: "Username must be at least 3 characters" });
      return;
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [normalizedEmail, normalizedUsername]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: "Email or username already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, avatar, created_at",
      [normalizedUsername, normalizedEmail, hashedPassword]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const normalizedUsername = String(username).trim().toLowerCase();

    const result = await pool.query(
      "SELECT id, username, email, avatar, password, created_at FROM users WHERE username = $1",
      [normalizedUsername]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { id: string; email?: string; username?: string };

    const result = await pool.query(
      "SELECT id, username, email, avatar, created_at FROM users WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

router.post("/forgot-password", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      res.status(400).json({ error: "Введите email" });
      return;
    }

    const userResult = await pool.query(
      "SELECT id, email, username FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "Такой почты нет" });
      return;
    }

    const user = userResult.rows[0] as { id: string; email: string; username?: string };
    const token = randomToken();
    const tokenHash = sha256Hex(token);
    const expiresMinutes = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || "30");

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
      [user.id, tokenHash, String(expiresMinutes)]
    );

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      username: user.username,
    });

    res.json({ message: "Письмо для восстановления отправлено" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Не удалось отправить письмо" });
  }
});

router.post("/reset-password", async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };

    const normalizedToken = String(token || "").trim();
    const password = String(newPassword || "");

    if (!normalizedToken) {
      res.status(400).json({ error: "Токен восстановления обязателен" });
      return;
    }
    if (!password) {
      res.status(400).json({ error: "Введите новый пароль" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Пароль должен быть минимум 6 символов" });
      return;
    }

    const tokenHash = sha256Hex(normalizedToken);
    const tokenRow = await pool.query(
      `SELECT id, user_id, used_at, (expires_at > NOW()) AS is_valid
       FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    if (tokenRow.rows.length === 0) {
      res.status(400).json({ error: "Ссылка для восстановления недействительна" });
      return;
    }

    const row = tokenRow.rows[0] as {
      id: string;
      user_id: string;
      used_at: string | null;
      is_valid: boolean;
    };

    if (row.used_at) {
      res.status(400).json({ error: "Ссылка для восстановления уже использована" });
      return;
    }

    if (!row.is_valid) {
      res.status(400).json({ error: "Ссылка для восстановления истекла" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query("BEGIN");
    try {
      const updated = await pool.query(
        "UPDATE users SET password = $1 WHERE id = $2 RETURNING id",
        [hashedPassword, row.user_id]
      );
      if (updated.rows.length === 0) {
        await pool.query("ROLLBACK");
        res.status(404).json({ error: "Пользователь не найден" });
        return;
      }

      await pool.query(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1",
        [row.id]
      );
      await pool.query("COMMIT");
    } catch (e) {
      await pool.query("ROLLBACK");
      throw e;
    }

    res.json({ message: "Пароль обновлён" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Не удалось обновить пароль" });
  }
});

router.patch("/me/avatar", async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { id: string };

    const { avatar } = req.body;

    if (avatar === undefined) {
      res.status(400).json({ error: "Avatar is required" });
      return;
    }

    await pool.query(
      "UPDATE users SET avatar = $1 WHERE id = $2",
      [avatar, decoded.id]
    );

    res.json({ message: "Avatar updated successfully" });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
