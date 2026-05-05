import { Router } from 'express';
import { query } from '../db';

const router = Router();

// ==========================================
// Категории расходов (ВАЖНО: до /:id роутов!)
// ==========================================

// GET /api/expenses/categories — все категории
router.get('/categories', async (_req, res) => {
    try {
        const result = await query('SELECT * FROM expense_categories ORDER BY name');
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/expenses/categories — создать категорию
router.post('/categories', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Название категории обязательно' });
    }
    try {
        const result = await query(
            'INSERT INTO expense_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
            [name.trim()]
        );
        if (result.rows.length === 0) {
            return res.status(409).json({ error: 'Категория уже существует' });
        }
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/expenses/categories/:id — удалить категорию
router.delete('/categories/:id', async (req, res) => {
    try {
        const result = await query('DELETE FROM expense_categories WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// CRUD для расходов (Expenses)
// ==========================================

// GET /api/expenses — список расходов с фильтрацией по дате
router.get('/', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let sql = 'SELECT * FROM expenses';
        const params: any[] = [];
        const conditions: string[] = [];

        if (start_date) {
            conditions.push(`expense_date >= $${params.length + 1}`);
            params.push(start_date);
        }
        if (end_date) {
            conditions.push(`expense_date <= $${params.length + 1}`);
            params.push(end_date);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY expense_date DESC, created_at DESC';

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/expenses — создать расход
router.post('/', async (req, res) => {
    const { title, category, amount, expense_date } = req.body;

    if (!title || !amount) {
        return res.status(400).json({ error: 'Поля title и amount обязательны' });
    }

    try {
        const result = await query(
            `INSERT INTO expenses (title, category, amount, expense_date)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [title, category || 'Прочее', amount, expense_date || new Date().toISOString().split('T')[0]]
        );
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/expenses/:id — обновить расход
router.put('/:id', async (req, res) => {
    const { title, category, amount, expense_date } = req.body;
    try {
        const result = await query(
            `UPDATE expenses SET title=$1, category=$2, amount=$3, expense_date=$4, updated_at=NOW()
             WHERE id=$5 RETURNING *`,
            [title, category, amount, expense_date, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Расход не найден' });
        }
        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/expenses/:id — удалить расход
router.delete('/:id', async (req, res) => {
    try {
        const result = await query('DELETE FROM expenses WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Расход не найден' });
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
