import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import { Telegraf } from 'telegraf';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);

// --- TELEGRAM BOT CONFIGURATION ---
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const groupId = process.env.TELEGRAM_GROUP_ID;
let bot: Telegraf | null = null;

if (botToken) {
    bot = new Telegraf(botToken);
    bot.launch().catch(err => console.error('Bot launch error:', err));
    console.log('Telegram bot launched.');

    // Отправляем тестовое сообщение при старте
    if (groupId) {
        bot.telegram.sendMessage(groupId, '🤖 Система Admin CRM запущена. Бот готов к рассылке уведомлений.').catch(console.error);
    }
}

// --- SUPABASE REALTIME SUBSCRIPTION ---
// Слушаем новые записи в таблице appointments
supabase
    .channel('appointments-channel')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        (payload: any) => {
            console.log('New appointment received:', payload.new);
            if (bot && groupId) {
                const newAppt = payload.new;
                // Форматируем сообщение
                const message = `🔔 *Новая запись!*\n\n📅 Дата: ${newAppt.appointment_date}\n⏰ Время: ${newAppt.start_time}\n👤 Клиент: ${newAppt.client_name || 'Не указан'}\n📞 Телефон: ${newAppt.client_phone || 'Не указан'}`;
                bot.telegram.sendMessage(groupId, message, { parse_mode: 'Markdown' }).catch(console.error);
            }
        }
    )
    .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments' },
        (payload: any) => {
            console.log('Appointment updated:', payload.new);
            if (bot && groupId) {
                const appt = payload.new;
                if (appt.status === 'cancelled') {
                    const message = `❌ *Запись отменена!*\n\n📅 Дата: ${appt.appointment_date}\n⏰ Время: ${appt.start_time}\n👤 Клиент: ${appt.client_name || 'Не указан'}`;
                    bot.telegram.sendMessage(groupId, message, { parse_mode: 'Markdown' }).catch(console.error);
                }
            }
        }
    )
    .subscribe();

// --- CRON JOBS (ОТЧЕТЫ) ---
// Ежедневный отчет: каждый день в 20:00
cron.schedule('0 20 * * *', async () => {
    if (!bot || !groupId) return;
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: todayAppts } = await supabase
            .from('appointments')
            .select('*')
            .eq('appointment_date', today);

        const completed = todayAppts?.filter((a: any) => a.status === 'completed').length || 0;
        const cancelled = todayAppts?.filter((a: any) => a.status === 'cancelled').length || 0;
        const totalRevenue = todayAppts?.filter((a: any) => a.status === 'completed').reduce((sum: number, a: any) => sum + (Number(a.actual_price) || 0), 0) || 0;

        const msg = `📊 *Ежедневный отчет (Admin CRM)*\n\n📅 Дата: ${today}\n✅ Завершено записей: ${completed}\n❌ Отменено: ${cancelled}\n💰 Примерная выручка: ${totalRevenue} руб.`;
        bot.telegram.sendMessage(groupId, msg, { parse_mode: 'Markdown' }).catch(console.error);
    } catch (err) {
        console.error('Ошибка генерации ежедневного отчета', err);
    }
});

// Еженедельный отчет: каждое воскресенье в 20:00
cron.schedule('0 20 * * 0', async () => {
    if (!bot || !groupId) return;
    try {
        const msg = `📈 *Еженедельный отчет (Admin CRM)*\n\nСистема работает стабильно. Подробная выгрузка за неделю доступна в Excel в Панели Администратора.`;
        bot.telegram.sendMessage(groupId, msg, { parse_mode: 'Markdown' }).catch(console.error);
    } catch (err) {
        console.error('Ошибка еженедельного отчета', err);
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
