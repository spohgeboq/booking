import { Router } from 'express';
import { query } from '../db';

const router = Router();

// GET /api/schedules — все расписания
router.get('/', async (req, res) => {
    try {
        let sql = 'SELECT * FROM schedules';
        const params: any[] = [];

        if (req.query.employee_id) {
            sql += ' WHERE employee_id = $1';
            params.push(req.query.employee_id);
        }

        sql += ' ORDER BY employee_id, day_of_week';
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/schedules — обновить расписание сотрудника (замена всех дней)
router.post('/', async (req, res) => {
    const { employee_id, schedules } = req.body;

    if (!employee_id || !schedules || !Array.isArray(schedules)) {
        return res.status(400).json({ error: 'employee_id и schedules обязательны' });
    }

    try {
        // Удаляем старое расписание
        await query('DELETE FROM schedules WHERE employee_id = $1', [employee_id]);

        // Вставляем новое
        for (const s of schedules) {
            await query(
                `INSERT INTO schedules (employee_id, day_of_week, start_time, end_time, is_working, break_start, break_end)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [employee_id, s.day_of_week, s.start_time || null, s.end_time || null,
                    s.is_working !== undefined ? s.is_working : true,
                    s.break_start || null, s.break_end || null]
            );
        }

        const result = await query('SELECT * FROM schedules WHERE employee_id = $1 ORDER BY day_of_week', [employee_id]);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
