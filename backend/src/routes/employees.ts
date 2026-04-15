import { Router } from 'express';
import { query } from '../db';

const router = Router();

// GET /api/employees — все сотрудники с их serviceIds
router.get('/', async (_req, res) => {
    try {
        const empResult = await query('SELECT * FROM employees ORDER BY first_name');
        const esResult = await query('SELECT employee_id, service_id FROM employee_services');

        const employees = empResult.rows.map((emp: any) => ({
            ...emp,
            serviceIds: esResult.rows
                .filter((es: any) => es.employee_id === emp.id)
                .map((es: any) => es.service_id),
        }));

        res.json(employees);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/employees/:id — один сотрудник
router.get('/:id', async (req, res) => {
    try {
        const result = await query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }
        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/employees — создать сотрудника
router.post('/', async (req, res) => {
    const { first_name, last_name, position, phone, email, address,
        experience_years, specialization, certificates, avatar_url, image_url,
        commission_type, commission_value, serviceIds } = req.body;
    try {
        const result = await query(
            `INSERT INTO employees (first_name, last_name, position, phone, email, address,
             experience_years, specialization, certificates, avatar_url, image_url,
             commission_type, commission_value)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
            [first_name, last_name, position, phone, email, address,
                experience_years || 0, specialization, certificates, avatar_url, image_url,
                commission_type || 'percentage', commission_value || 0]
        );

        const employee = result.rows[0];

        // Вставляем связи с услугами
        if (serviceIds && serviceIds.length > 0) {
            for (const svcId of serviceIds) {
                await query(
                    'INSERT INTO employee_services (employee_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [employee.id, svcId]
                );
            }
        }

        res.status(201).json({ ...employee, serviceIds: serviceIds || [] });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/employees/:id — обновить сотрудника
router.put('/:id', async (req, res) => {
    const { first_name, last_name, position, phone, email, address,
        experience_years, specialization, certificates, avatar_url, image_url,
        commission_type, commission_value, serviceIds } = req.body;
    try {
        const result = await query(
            `UPDATE employees SET first_name=$1, last_name=$2, position=$3, phone=$4, email=$5,
             address=$6, experience_years=$7, specialization=$8, certificates=$9,
             avatar_url=$10, image_url=$11, commission_type=$12, commission_value=$13,
             updated_at=NOW() WHERE id=$14 RETURNING *`,
            [first_name, last_name, position, phone, email, address,
                experience_years, specialization, certificates, avatar_url, image_url,
                commission_type, commission_value, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }

        // Обновляем связи услуг
        if (serviceIds !== undefined) {
            await query('DELETE FROM employee_services WHERE employee_id = $1', [req.params.id]);
            for (const svcId of serviceIds) {
                await query(
                    'INSERT INTO employee_services (employee_id, service_id) VALUES ($1, $2)',
                    [req.params.id, svcId]
                );
            }
        }

        res.json({ ...result.rows[0], serviceIds: serviceIds || [] });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/employees/:id — удалить сотрудника
router.delete('/:id', async (req, res) => {
    try {
        await query('DELETE FROM employee_services WHERE employee_id = $1', [req.params.id]);
        await query('DELETE FROM schedules WHERE employee_id = $1', [req.params.id]);
        const result = await query('DELETE FROM employees WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
