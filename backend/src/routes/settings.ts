import { Router } from 'express';
import { query } from '../db';

const router = Router();

// GET /api/settings — получить настройки
router.get('/', async (_req, res) => {
    try {
        const result = await query('SELECT * FROM settings LIMIT 1');
        if (result.rows.length === 0) {
            return res.json(null);
        }
        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/settings — обновить настройки (upsert)
router.put('/', async (req, res) => {
    const { company_name, phone, email, address, working_hours, logo_url,
        default_commission_type, default_commission_value,
        telegram_report_enabled, daily_report_enabled,
        gallery, about_us_image, telegram_chat_id } = req.body;
    try {
        // Проверяем есть ли уже строка
        const existing = await query('SELECT id FROM settings LIMIT 1');

        let result;
        if (existing.rows.length > 0) {
            result = await query(
                `UPDATE settings SET company_name=$1, phone=$2, email=$3, address=$4,
                 working_hours=$5, logo_url=$6, default_commission_type=$7,
                 default_commission_value=$8, telegram_report_enabled=$9,
                 daily_report_enabled=$10, gallery=$11, about_us_image=$12,
                 telegram_chat_id=$13, updated_at=NOW()
                 WHERE id=$14 RETURNING *`,
                [company_name, phone, email, address, working_hours, logo_url,
                    default_commission_type || 'percentage', default_commission_value || 30,
                    telegram_report_enabled || false, daily_report_enabled || false,
                    gallery || [], about_us_image, telegram_chat_id,
                    existing.rows[0].id]
            );
        } else {
            result = await query(
                `INSERT INTO settings (company_name, phone, email, address, working_hours,
                 logo_url, default_commission_type, default_commission_value,
                 telegram_report_enabled, daily_report_enabled, gallery, about_us_image, telegram_chat_id)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
                [company_name || 'Моя Компания', phone, email, address, working_hours, logo_url,
                    default_commission_type || 'percentage', default_commission_value || 30,
                    telegram_report_enabled || false, daily_report_enabled || false,
                    gallery || [], about_us_image, telegram_chat_id]
            );
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
