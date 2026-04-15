import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { query } from './db';

// Роуты
import authRoutes from './routes/auth';
import servicesRoutes from './routes/services';
import employeesRoutes from './routes/employees';
import appointmentsRoutes from './routes/appointments';
import schedulesRoutes from './routes/schedules';
import settingsRoutes from './routes/settings';
import uploadRoutes from './routes/upload';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Статика для загруженных файлов
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- TELEGRAM BOT CONFIGURATION ---
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const groupId = process.env.TELEGRAM_GROUP_ID;
let bot: Telegraf | null = null;

if (botToken) {
    bot = new Telegraf(botToken);
    bot.launch().catch(err => console.error('Bot launch error:', err));
    console.log('Telegram bot launched.');

    if (groupId) {
        bot.telegram.sendMessage(groupId, '🤖 Система Admin CRM запущена. Бот готов к рассылке уведомлений.').catch(console.error);
    }
}

// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);

// --- POST endpoint для Telegram уведомлений об удалении ---
app.post('/api/notify-deletion', async (req, res) => {
    const { client_name, client_phone, service_name, master_name, appointment_date, start_time, end_time } = req.body;
    console.log('notify-deletion received:', req.body);
    try {
        if (bot && groupId) {
            const message = [
                '🗑️ Запись удалена администратором!',
                '',
                '👤 Клиент: ' + (client_name || 'Не указан'),
                '📞 Телефон: ' + (client_phone || 'Не указан'),
                '💼 Услуга: ' + (service_name || 'Не указана'),
                '👷 Мастер: ' + (master_name || 'Не указан'),
                '📅 Дата: ' + (appointment_date || 'Не указана'),
                '⏰ Время: ' + ((start_time || '').substring(0, 5) || '?') + ' - ' + ((end_time || '').substring(0, 5) || '?'),
            ].join('\n');
            await bot.telegram.sendMessage(groupId, message);
            console.log('Telegram notification sent successfully');
        }
        res.json({ success: true });
    } catch (error: any) {
        console.error('Telegram send error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- POST endpoint для Telegram уведомлений об отмене записи клиентом ---
app.post('/api/notify-client-cancel', async (req, res) => {
    const { client_name, client_phone, service_name, master_name, appointment_date, start_time } = req.body;
    console.log('notify-client-cancel received:', req.body);
    try {
        if (bot && groupId) {
            const message = [
                '🚫 Клиент отменил запись!',
                '',
                '👤 Клиент: ' + (client_name || 'Не указан'),
                '📞 Телефон: ' + (client_phone || 'Не указан'),
                '💼 Услуга: ' + (service_name || 'Не указана'),
                '👷 Мастер: ' + (master_name || 'Не указан'),
                '📅 Дата: ' + (appointment_date || 'Не указана'),
                '⏰ Время: ' + ((start_time || '').substring(0, 5) || '?'),
                '',
                '💡 Время освободилось для других клиентов.',
            ].join('\n');
            await bot.telegram.sendMessage(groupId, message);
            console.log('Client cancel notification sent');
        }
        res.json({ success: true });
    } catch (error: any) {
        console.error('Telegram send error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- Хелперы для работы со временем ---
function timeToMinutes(time: string): number {
    const parts = time.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// --- Умный поиск свободных окон для переноса записи ---
app.post('/api/available-slots', async (req, res) => {
    const { service_id, appointment_date, start_time, appointment_id } = req.body;

    if (!service_id || !appointment_date || !start_time) {
        return res.status(400).json({ error: 'service_id, appointment_date и start_time обязательны' });
    }

    try {
        // 1. Получаем длительность услуги
        const svcResult = await query('SELECT id, name, duration_minutes FROM services WHERE id = $1', [service_id]);
        const service = svcResult.rows[0];

        if (!service) {
            return res.json({ slots: [], message: 'Услуга не найдена' });
        }

        const duration = service.duration_minutes || 30;

        // 2. Определяем день недели (1=Пн, 7=Вс)
        const date = new Date(appointment_date + 'T12:00:00');
        const jsDay = date.getDay();
        const dbDay = jsDay === 0 ? 7 : jsDay;

        // 3. Найти всех мастеров, которые оказывают эту услугу
        const empSvcResult = await query('SELECT employee_id FROM employee_services WHERE service_id = $1', [service_id]);
        const employeeIds = empSvcResult.rows.map((es: any) => es.employee_id);

        if (employeeIds.length === 0) {
            return res.json({ slots: [], message: 'Нет мастеров для этой услуги' });
        }

        // 4. Получаем данные мастеров
        const empResult = await query(
            `SELECT id, first_name, last_name FROM employees WHERE id = ANY($1)`,
            [employeeIds]
        );

        // 5. Получаем расписание на нужный день недели
        const schResult = await query(
            `SELECT * FROM schedules WHERE employee_id = ANY($1) AND day_of_week = $2 AND is_working = true`,
            [employeeIds, dbDay]
        );

        // 6. Получаем существующие активные записи на эту дату
        const apptResult = await query(
            `SELECT id, employee_id, start_time, end_time FROM appointments 
             WHERE appointment_date = $1 AND employee_id = ANY($2) AND status IN ('scheduled', 'confirmed')`,
            [appointment_date, employeeIds]
        );

        // Исключаем текущую редактируемую запись
        const otherAppts = apptResult.rows.filter((a: any) => a.id !== appointment_id);

        // 7. Окно поиска: ±2 часа от текущего времени записи
        const centerMinutes = timeToMinutes(start_time);
        const searchStart = Math.max(0, centerMinutes - 120);
        const searchEnd = Math.min(24 * 60, centerMinutes + 120);

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // 8. Для каждого работающего мастера ищем свободные окна
        const slots: Array<{
            employee_id: string;
            employee_name: string;
            date: string;
            start_time: string;
            end_time: string;
        }> = [];

        for (const schedule of schResult.rows) {
            const emp = empResult.rows.find((e: any) => e.id === schedule.employee_id);
            if (!emp) continue;

            const workStart = timeToMinutes(schedule.start_time?.slice(0, 5) || '09:00');
            const workEnd = timeToMinutes(schedule.end_time?.slice(0, 5) || '18:00');

            const effectiveStart = Math.max(searchStart, workStart);
            const effectiveEnd = Math.min(searchEnd, workEnd);
            if (effectiveStart >= effectiveEnd) continue;

            const breakStart = schedule.break_start ? timeToMinutes(schedule.break_start.slice(0, 5)) : null;
            const breakEnd = schedule.break_end ? timeToMinutes(schedule.break_end.slice(0, 5)) : null;

            const busySlots = otherAppts
                .filter((a: any) => a.employee_id === schedule.employee_id)
                .map((a: any) => ({
                    start: timeToMinutes(a.start_time.slice(0, 5)),
                    end: timeToMinutes(a.end_time.slice(0, 5))
                }));

            const blocked: Array<{ start: number; end: number }> = [...busySlots];
            if (breakStart !== null && breakEnd !== null) {
                blocked.push({ start: breakStart, end: breakEnd });
            }
            blocked.sort((a, b) => a.start - b.start);

            for (let slotStart = effectiveStart; slotStart + duration <= effectiveEnd; slotStart += 30) {
                if (appointment_date === todayStr && slotStart < currentMinutes) continue;

                const slotEnd = slotStart + duration;
                const overlaps = blocked.some(b => slotStart < b.end && slotEnd > b.start);
                if (overlaps) continue;

                slots.push({
                    employee_id: emp.id,
                    employee_name: `${emp.first_name} ${emp.last_name}`.trim(),
                    date: appointment_date,
                    start_time: minutesToTime(slotStart),
                    end_time: minutesToTime(slotEnd),
                });
            }
        }

        slots.sort((a, b) => {
            const timeCompare = a.start_time.localeCompare(b.start_time);
            if (timeCompare !== 0) return timeCompare;
            return a.employee_name.localeCompare(b.employee_name);
        });

        res.json({ slots: slots.slice(0, 20), service_name: service.name, duration });
    } catch (error: any) {
        console.error('Ошибка поиска свободных окон:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- CRON JOBS (ОТЧЕТЫ) ---
cron.schedule('0 20 * * *', async () => {
    if (!bot || !groupId) return;
    try {
        const today = new Date().toISOString().split('T')[0];
        const result = await query('SELECT * FROM appointments WHERE appointment_date = $1', [today]);
        const todayAppts = result.rows;

        const completed = todayAppts.filter((a: any) => a.status === 'completed').length;
        const cancelled = todayAppts.filter((a: any) => a.status === 'cancelled').length;
        const totalRevenue = todayAppts
            .filter((a: any) => a.status === 'completed')
            .reduce((sum: number, a: any) => sum + (Number(a.actual_price) || 0), 0);

        const msg = `📊 *Ежедневный отчет (Admin CRM)*\n\n📅 Дата: ${today}\n✅ Завершено записей: ${completed}\n❌ Отменено: ${cancelled}\n💰 Примерная выручка: ${totalRevenue} руб.`;
        bot.telegram.sendMessage(groupId, msg, { parse_mode: 'Markdown' }).catch(console.error);
    } catch (err) {
        console.error('Ошибка генерации ежедневного отчета', err);
    }
});

cron.schedule('0 20 * * 0', async () => {
    if (!bot || !groupId) return;
    try {
        const msg = `📈 *Еженедельный отчет (Admin CRM)*\n\nСистема работает стабильно. Подробная выгрузка за неделю доступна в Excel в Панели Администратора.`;
        bot.telegram.sendMessage(groupId, msg, { parse_mode: 'Markdown' }).catch(console.error);
    } catch (err) {
        console.error('Ошибка еженедельного отчета', err);
    }
});

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Employee_services endpoint для booking-frontend ---
app.get('/api/employee-services', async (_req, res) => {
    try {
        const result = await query('SELECT employee_id, service_id FROM employee_services');
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful stop
process.once('SIGINT', () => {
    if (bot) bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    if (bot) bot.stop('SIGTERM');
});
