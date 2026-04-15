import { Router } from 'express';
import { query } from '../db';

const router = Router();

// GET /api/services — все услуги
router.get('/', async (_req, res) => {
    try {
        const result = await query('SELECT * FROM services ORDER BY category, name');
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/services/:id — одна услуга
router.get('/:id', async (req, res) => {
    try {
        const result = await query('SELECT * FROM services WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Услуга не найдена' });
        }
        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/services — создать услугу
router.post('/', async (req, res) => {
    const { name, description, price, duration_minutes, category, image_url } = req.body;
    try {
        const result = await query(
            `INSERT INTO services (name, description, price, duration_minutes, category, image_url)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, description || null, price || 0, duration_minutes || 30, category || null, image_url || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/services/:id — обновить услугу
router.put('/:id', async (req, res) => {
    const { name, description, price, duration_minutes, category, image_url } = req.body;
    try {
        const result = await query(
            `UPDATE services SET name = $1, description = $2, price = $3, duration_minutes = $4, 
             category = $5, image_url = $6, updated_at = NOW() WHERE id = $7 RETURNING *`,
            [name, description, price, duration_minutes, category, image_url, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Услуга не найдена' });
        }
        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/services/:id — удалить услугу
router.delete('/:id', async (req, res) => {
    try {
        const result = await query('DELETE FROM services WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Услуга не найдена' });
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
