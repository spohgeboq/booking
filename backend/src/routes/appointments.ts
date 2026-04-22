import { Router } from 'express';
import { query } from '../db';

const router = Router();

// GET /api/appointments — список записей (с фильтрами)
router.get('/', async (req, res) => {
    try {
        let sql = `
            SELECT a.*, 
                   s.name as service_name, s.price as service_price,
                   e.first_name as employee_first_name, e.last_name as employee_last_name
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN employees e ON a.employee_id = e.id
        `;
        const params: any[] = [];
        const conditions: string[] = [];

        if (req.query.date) {
            conditions.push(`a.appointment_date = $${params.length + 1}`);
            params.push(req.query.date);
        }
        if (req.query.start_date) {
            conditions.push(`a.appointment_date >= $${params.length + 1}`);
            params.push(req.query.start_date);
        }
        if (req.query.end_date) {
            conditions.push(`a.appointment_date <= $${params.length + 1}`);
            params.push(req.query.end_date);
        }
        if (req.query.status) {
            conditions.push(`a.status = $${params.length + 1}`);
            params.push(req.query.status);
        }
        if (req.query.employee_id) {
            conditions.push(`a.employee_id = $${params.length + 1}`);
            params.push(req.query.employee_id);
        }
        // Фильтр: исключить определённый статус
        if (req.query.status_neq) {
            conditions.push(`a.status != $${params.length + 1}`);
            params.push(req.query.status_neq);
        }
        // Фильтр: несколько статусов через запятую (status_in=scheduled,confirmed)
        if (req.query.status_in) {
            const statuses = (req.query.status_in as string).split(',');
            const placeholders = statuses.map((_, i) => `$${params.length + i + 1}`).join(',');
            conditions.push(`a.status IN (${placeholders})`);
            params.push(...statuses);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY a.appointment_date DESC, a.start_time ASC';

        const result = await query(sql, params);

        // Мапим результат, чтобы фронтенд получал объекты services и employees, как в Supabase
        const appointments = result.rows.map(row => ({
            ...row,
            services: { name: row.service_name, price: row.service_price },
            employees: { first_name: row.employee_first_name, last_name: row.employee_last_name }
        }));

        res.json(appointments);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/appointments/:id — получить одну запись по ID
router.get('/:id', async (req, res) => {
    try {
        const result = await query(
            `SELECT a.*, 
                    s.name as service_name, s.price as service_price,
                    e.first_name as employee_first_name, e.last_name as employee_last_name
             FROM appointments a
             LEFT JOIN services s ON a.service_id = s.id
             LEFT JOIN employees e ON a.employee_id = e.id
             WHERE a.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Запись не найдена' });
        }
        const row = result.rows[0];
        res.json({
            ...row,
            services: { name: row.service_name, price: row.service_price },
            employees: { first_name: row.employee_first_name, last_name: row.employee_last_name }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/appointments — создать запись
router.post('/', async (req, res) => {
    const { client_name, client_phone, service_id, employee_id,
        appointment_date, start_time, end_time, status, actual_price, commission_earned } = req.body;
    try {
        const result = await query(
            `INSERT INTO appointments (client_name, client_phone, service_id, employee_id,
             appointment_date, start_time, end_time, status, actual_price, commission_earned)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [client_name, client_phone, service_id, employee_id,
                appointment_date, start_time, end_time, status || 'scheduled',
                actual_price || null, commission_earned || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/appointments/:id — обновить запись (возвращает полные данные с JOIN)
router.put('/:id', async (req, res) => {
    const fields = req.body;
    try {
        // Динамическое построение SET-клаузы
        const keys = Object.keys(fields);
        if (keys.length === 0) {
            return res.status(400).json({ error: 'Нет полей для обновления' });
        }

        const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
        setClauses.push(`updated_at = NOW()`);
        const values = keys.map(k => fields[k]);
        values.push(req.params.id);

        const updateResult = await query(
            `UPDATE appointments SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
            values
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Запись не найдена' });
        }

        // Возвращаем полные данные с JOIN, как в GET-запросе
        const fullResult = await query(
            `SELECT a.*, 
                    s.name as service_name, s.price as service_price,
                    e.first_name as employee_first_name, e.last_name as employee_last_name
             FROM appointments a
             LEFT JOIN services s ON a.service_id = s.id
             LEFT JOIN employees e ON a.employee_id = e.id
             WHERE a.id = $1`,
            [req.params.id]
        );

        if (fullResult.rows.length === 0) {
            return res.json(updateResult.rows[0]);
        }

        const row = fullResult.rows[0];
        const appointment = {
            ...row,
            services: { name: row.service_name, price: row.service_price },
            employees: { first_name: row.employee_first_name, last_name: row.employee_last_name }
        };

        res.json(appointment);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/appointments/:id — удалить запись
router.delete('/:id', async (req, res) => {
    try {
        const result = await query('DELETE FROM appointments WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Запись не найдена' });
        }
        res.json({ success: true, deleted: result.rows[0] });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
