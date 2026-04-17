import { Router, Response } from "express";
import { pool } from "../db/pool.js";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    let query = `SELECT id, user_id, TO_CHAR(date, 'YYYY-MM-DD') as date, text, completed, position, created_at, updated_at FROM tasks WHERE user_id = $1`;
    const params: (string | undefined)[] = [req.user!.id];

    if (startDate && endDate) {
      query += " AND date >= $2 AND date <= $3";
      params.push(startDate as string, endDate as string);
    }

    query += " ORDER BY date ASC, position ASC";

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { date, text, completed = false } = req.body;

    if (!date || !text) {
      res.status(400).json({ error: "Date and text are required" });
      return;
    }

    const maxPositionResult = await pool.query(
      "SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM tasks WHERE user_id = $1 AND date = $2",
      [req.user!.id, date]
    );

    const nextPosition = maxPositionResult.rows[0].next_position;

    const result = await pool.query(
      `INSERT INTO tasks (user_id, date, text, completed, position) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, user_id, TO_CHAR(date, 'YYYY-MM-DD') as date, text, completed, position, created_at, updated_at`,
      [req.user!.id, date, text, completed, nextPosition]
    );

    res.status(201).json({ task: result.rows[0] });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reorder", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { updates } = req.body as {
      updates?: Array<{ id: string; date: string; position: number }>;
    };

    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ error: "Updates are required" });
      return;
    }

    const hasInvalidUpdate = updates.some(
      (update) =>
        !update?.id ||
        !update?.date ||
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
      // Phase 1: move to temporary negative positions to avoid UNIQUE conflicts.
      for (let index = 0; index < updates.length; index += 1) {
        const update = updates[index];
        await pool.query(
          `UPDATE tasks
           SET date = $1, position = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3 AND user_id = $4`,
          [update.date, -(index + 1), update.id, req.user!.id]
        );
      }

      // Phase 2: set the final target positions.
      for (const update of updates) {
        await pool.query(
          `UPDATE tasks
           SET date = $1, position = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3 AND user_id = $4`,
          [update.date, update.position, update.id, req.user!.id]
        );
      }

      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }

    res.json({ message: "Tasks reordered successfully" });
  } catch (error) {
    console.error("Reorder tasks error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { text, completed, position, date } = req.body;
    const userId = req.user!.id as string;

    const existingTaskResult = await pool.query(
      "SELECT id, TO_CHAR(date, 'YYYY-MM-DD') as date, position FROM tasks WHERE id = $1 AND user_id = $2",
      [id as string, userId]
    );

    if (existingTaskResult.rows.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const existingTask = existingTaskResult.rows[0] as { date: string; position: number };

    const updateFields: string[] = [];
    const values: (string | boolean | number)[] = [];
    let paramIndex = 1;

    if (text !== undefined) {
      updateFields.push(`text = $${paramIndex++}`);
      values.push(text);
    }
    if (completed !== undefined) {
      updateFields.push(`completed = $${paramIndex++}`);
      values.push(completed);
    }
    if (position !== undefined) {
      updateFields.push(`position = $${paramIndex++}`);
      values.push(position);
    }
    if (date !== undefined) {
      // If task moves to another day without explicit position, place it at end
      // to avoid UNIQUE(user_id, date, position) conflicts.
      if (position === undefined && date !== existingTask.date) {
        const maxPositionResult = await pool.query(
          "SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM tasks WHERE user_id = $1 AND date = $2 AND id <> $3",
          [userId, date, id as string]
        );
        const nextPosition = Number(maxPositionResult.rows[0].next_position);
        updateFields.push(`position = $${paramIndex++}`);
        values.push(nextPosition);
      }
      updateFields.push(`date = $${paramIndex++}`);
      values.push(date);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updateFields.length === 1) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    values.push(id as string, userId);

    const result = await pool.query(
      `UPDATE tasks SET ${updateFields.join(", ")} 
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex} 
       RETURNING id, user_id, TO_CHAR(date, 'YYYY-MM-DD') as date, text, completed, position, created_at, updated_at`,
      values
    );

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id",
      [id as string, req.user!.id as string]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/by-date/:date", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.params;

    const result = await pool.query(
      "SELECT id, user_id, TO_CHAR(date, 'YYYY-MM-DD') as date, text, completed, position, created_at, updated_at FROM tasks WHERE user_id = $1 AND date = $2 ORDER BY position ASC",
      [req.user!.id as string, date as string]
    );

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error("Get tasks by date error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/search", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== "string" || q.trim().length === 0) {
      res.json({ tasks: [] });
      return;
    }

    const searchQuery = q.toLowerCase().trim();
    
    const result = await pool.query(
      `SELECT id, user_id, TO_CHAR(date, 'YYYY-MM-DD') as date, text, completed, position, created_at, updated_at 
       FROM tasks 
       WHERE user_id = $1 AND LOWER(text) LIKE $2
       ORDER BY date ASC, position ASC`,
      [req.user!.id, `%${searchQuery}%`]
    );

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error("Search tasks error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
