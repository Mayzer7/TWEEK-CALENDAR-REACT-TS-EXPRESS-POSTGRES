import { Router, Response } from "express";
import { pool } from "../db/pool.js";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, text, completed, position, created_at, updated_at
       FROM someday_items
       WHERE user_id = $1
       ORDER BY position ASC, created_at ASC`,
      [req.user!.id]
    );

    res.json({ items: result.rows });
  } catch (error) {
    console.error("Get someday items error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { text, completed = false } = req.body as {
      text?: string;
      completed?: boolean;
    };

    const normalizedText = String(text || "").trim();
    if (!normalizedText) {
      res.status(400).json({ error: "Text is required" });
      return;
    }

    const maxPositionResult = await pool.query(
      "SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM someday_items WHERE user_id = $1",
      [req.user!.id]
    );

    const nextPosition = Number(maxPositionResult.rows[0].next_position);

    const result = await pool.query(
      `INSERT INTO someday_items (user_id, text, completed, position)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, text, completed, position, created_at, updated_at`,
      [req.user!.id, normalizedText, completed, nextPosition]
    );

    res.status(201).json({ item: result.rows[0] });
  } catch (error) {
    console.error("Create someday item error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reorder", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { updates } = req.body as {
      updates?: Array<{ id: string; position: number }>;
    };

    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ error: "Updates are required" });
      return;
    }

    const hasInvalidUpdate = updates.some(
      (update) =>
        !update?.id ||
        typeof update.position !== "number" ||
        !Number.isInteger(update.position) ||
        update.position < 0
    );

    if (hasInvalidUpdate) {
      res.status(400).json({ error: "Invalid reorder payload" });
      return;
    }

    await pool.query("BEGIN");
    try {
      for (let index = 0; index < updates.length; index += 1) {
        const update = updates[index];
        await pool.query(
          `UPDATE someday_items
           SET position = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND user_id = $3`,
          [-(index + 1), update.id, req.user!.id]
        );
      }

      for (const update of updates) {
        await pool.query(
          `UPDATE someday_items
           SET position = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND user_id = $3`,
          [update.position, update.id, req.user!.id]
        );
      }

      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }

    res.json({ message: "Someday items reordered successfully" });
  } catch (error) {
    console.error("Reorder someday items error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { text, completed, position } = req.body as {
      text?: string;
      completed?: boolean;
      position?: number;
    };

    const updateFields: string[] = [];
    const values: (string | boolean | number)[] = [];
    let paramIndex = 1;

    if (text !== undefined) {
      const normalizedText = String(text).trim();
      if (!normalizedText) {
        res.status(400).json({ error: "Text is required" });
        return;
      }
      updateFields.push(`text = $${paramIndex++}`);
      values.push(normalizedText);
    }

    if (completed !== undefined) {
      updateFields.push(`completed = $${paramIndex++}`);
      values.push(completed);
    }

    if (position !== undefined) {
      if (!Number.isInteger(position) || position < 0) {
        res.status(400).json({ error: "Position must be a non-negative integer" });
        return;
      }
      updateFields.push(`position = $${paramIndex++}`);
      values.push(position);
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");

    if (updateFields.length === 1) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    values.push(id, req.user!.id);

    const result = await pool.query(
      `UPDATE someday_items
       SET ${updateFields.join(", ")}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING id, user_id, text, completed, position, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Someday item not found" });
      return;
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error("Update someday item error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const result = await pool.query(
      "DELETE FROM someday_items WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Someday item not found" });
      return;
    }

    res.json({ message: "Someday item deleted successfully" });
  } catch (error) {
    console.error("Delete someday item error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
