import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import { authMiddleware, checkRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/employees — все сотрудники с их serviceIds
// OWNER: все, MASTER: только свой профиль
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        // Если MASTER — вернуть только себя
        if (req.user!.role === 'MASTER' && req.user!.employee_id) {
            const empResult = await query('SELECT * FROM employees WHERE id = $1', [req.user!.employee_id]);
            const esResult = await query('SELECT employee_id, service_id FROM employee_services WHERE employee_id = $1', [req.user!.employee_id]);
            const employees = empResult.rows.map((emp: any) => ({
                ...emp,
                serviceIds: esResult.rows.map((es: any) => es.service_id),
            }));
            return res.json(employees);
        }

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
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        // MASTER может смотреть только свой профиль
        if (req.user!.role === 'MASTER' && req.user!.employee_id !== req.params.id) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }

        const result = await query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }
        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/employees — создать сотрудника (только OWNER)
router.post('/', authMiddleware, checkRole(['OWNER']), async (req, res) => {
    const { first_name, last_name, position, phone, email, address,
        experience_years, specialization, certificates, avatar_url, image_url,
        commission_type, commission_value, fixed_salary, serviceIds } = req.body;
    try {
        const result = await query(
            `INSERT INTO employees (first_name, last_name, position, phone, email, address,
             experience_years, specialization, certificates, avatar_url, image_url,
             commission_type, commission_value, fixed_salary)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
            [first_name, last_name, position, phone, email, address,
                experience_years || 0, specialization, certificates, avatar_url, image_url,
                commission_type || 'percentage', commission_value || 0, fixed_salary || 0]
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

// PUT /api/employees/:id — обновить сотрудника (только OWNER)
router.put('/:id', authMiddleware, checkRole(['OWNER']), async (req, res) => {
    const { first_name, last_name, position, phone, email, address,
        experience_years, specialization, certificates, avatar_url, image_url,
        commission_type, commission_value, fixed_salary, serviceIds } = req.body;
    try {
        const result = await query(
            `UPDATE employees SET first_name=$1, last_name=$2, position=$3, phone=$4, email=$5,
             address=$6, experience_years=$7, specialization=$8, certificates=$9,
             avatar_url=$10, image_url=$11, commission_type=$12, commission_value=$13,
             fixed_salary=$14, updated_at=NOW() WHERE id=$15 RETURNING *`,
            [first_name, last_name, position, phone, email, address,
                experience_years, specialization, certificates, avatar_url, image_url,
                commission_type, commission_value, fixed_salary || 0, req.params.id]
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

// DELETE /api/employees/:id — удалить сотрудника (только OWNER)
router.delete('/:id', authMiddleware, checkRole(['OWNER']), async (req, res) => {
    try {
        // Удаляем связанный доступ мастера
        await query('DELETE FROM admin_users WHERE employee_id = $1', [req.params.id]);
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

// POST /api/employees/:id/generate-access — сгенерировать логин/пароль для мастера (только OWNER)
router.post('/:id/generate-access', authMiddleware, checkRole(['OWNER']), async (req, res) => {
    try {
        const employeeId = req.params.id;

        // Проверяем, существует ли сотрудник
        const empResult = await query('SELECT * FROM employees WHERE id = $1', [employeeId]);
        if (empResult.rows.length === 0) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }
        const emp = empResult.rows[0];

        // Проверяем, есть ли уже доступ для этого сотрудника
        const existingAccess = await query('SELECT id, email FROM admin_users WHERE employee_id = $1', [employeeId]);
        if (existingAccess.rows.length > 0) {
            return res.status(409).json({
                error: 'Доступ уже существует',
                email: existingAccess.rows[0].email,
            });
        }

        // Транслитерация кириллицы → латиница
        const translitMap: Record<string, string> = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
            'і': 'i', 'ї': 'yi', 'є': 'ye', 'ғ': 'gh', 'қ': 'q', 'ң': 'ng',
            'ө': 'o', 'ұ': 'u', 'ү': 'u', 'һ': 'h', 'ә': 'a',
        };

        const transliterate = (text: string): string => {
            return text
                .toLowerCase()
                .split('')
                .map(ch => translitMap[ch] ?? ch)
                .join('')
                .replace(/[^a-z0-9._-]/g, '') // убираем всё кроме латиницы, цифр, точки, дефиса
                .replace(/\.{2,}/g, '.')       // убираем двойные точки
                .replace(/^\.+|\.+$/g, '');    // убираем точки по краям
        };

        const firstName = transliterate(emp.first_name || 'master');
        const lastName = transliterate(emp.last_name || '');
        const baseName = lastName ? `${firstName}.${lastName}` : firstName;

        // Проверяем уникальность — если логин занят, добавляем число
        let generatedEmail = `${baseName}@crm.local`;
        let counter = 1;
        while (true) {
            const dup = await query('SELECT 1 FROM admin_users WHERE email = $1', [generatedEmail]);
            if (dup.rows.length === 0) break;
            generatedEmail = `${baseName}${counter}@crm.local`;
            counter++;
        }

        // Генерируем надёжный пароль (8 символов, латиница + цифры)
        const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
        let generatedPassword = '';
        for (let i = 0; i < 8; i++) {
            generatedPassword += chars[Math.floor(Math.random() * chars.length)];
        }

        const hash = await bcrypt.hash(generatedPassword, 10);

        await query(
            'INSERT INTO admin_users (email, password_hash, role, employee_id) VALUES ($1, $2, $3, $4)',
            [generatedEmail, hash, 'MASTER', employeeId]
        );

        res.json({
            success: true,
            credentials: {
                email: generatedEmail,
                password: generatedPassword,
            },
            message: 'Запишите пароль — он не будет показан повторно!',
        });
    } catch (error: any) {
        console.error('Generate access error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/employees/:id/revoke-access — отозвать доступ мастера (только OWNER)
router.delete('/:id/revoke-access', authMiddleware, checkRole(['OWNER']), async (req, res) => {
    try {
        const result = await query('DELETE FROM admin_users WHERE employee_id = $1 AND role = $2 RETURNING *', [req.params.id, 'MASTER']);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Доступ не найден' });
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/employees/:id/access — проверить наличие доступа (только OWNER)
router.get('/:id/access', authMiddleware, checkRole(['OWNER']), async (req, res) => {
    try {
        const result = await query('SELECT id, email, created_at FROM admin_users WHERE employee_id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.json({ hasAccess: false });
        }
        res.json({ hasAccess: true, email: result.rows[0].email, created_at: result.rows[0].created_at });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
