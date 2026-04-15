import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Подключение к postgres (системная БД) для создания booking_db
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5433/booking_db';

async function initDatabase() {
    // Парсим URL чтобы получить dbName и baseUrl
    const url = new URL(DATABASE_URL);
    const dbName = url.pathname.slice(1); // "booking_db"
    url.pathname = '/postgres'; // подключаемся к системной БД

    console.log('🔄 Подключаюсь к PostgreSQL...');

    // 1. Создать базу если не существует
    const sysPool = new Pool({ connectionString: url.toString() });
    try {
        const dbCheck = await sysPool.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
        );
        if (dbCheck.rows.length === 0) {
            await sysPool.query(`CREATE DATABASE ${dbName}`);
            console.log(`✅ База данных "${dbName}" создана`);
        } else {
            console.log(`ℹ️  База данных "${dbName}" уже существует`);
        }
    } finally {
        await sysPool.end();
    }

    // 2. Подключаемся к booking_db и создаём таблицы
    const pool = new Pool({ connectionString: DATABASE_URL });

    console.log('🔄 Создаю таблицы...');

    // Создаём ENUM типы
    await pool.query(`
        DO $$ BEGIN
            CREATE TYPE commission_type AS ENUM ('percentage', 'fixed');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await pool.query(`
        DO $$ BEGIN
            CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    // Таблица admin_users
    await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);

    // Таблица settings
    await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_name TEXT DEFAULT 'Моя Компания',
            phone TEXT,
            email TEXT,
            address TEXT,
            working_hours TEXT,
            logo_url TEXT,
            default_commission_type commission_type DEFAULT 'percentage',
            default_commission_value NUMERIC DEFAULT 30.00,
            telegram_report_enabled BOOLEAN DEFAULT false,
            daily_report_enabled BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            gallery TEXT[],
            about_us_image TEXT,
            telegram_chat_id TEXT
        );
    `);

    // Таблица employees
    await pool.query(`
        CREATE TABLE IF NOT EXISTS employees (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            position TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            experience_years INTEGER DEFAULT 0,
            specialization TEXT,
            certificates TEXT,
            avatar_url TEXT,
            commission_type commission_type,
            commission_value NUMERIC,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            image_url TEXT
        );
    `);

    // Таблица services
    await pool.query(`
        CREATE TABLE IF NOT EXISTS services (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            price NUMERIC DEFAULT 0.00,
            duration_minutes INTEGER DEFAULT 30,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            category TEXT,
            image_url TEXT
        );
    `);

    // Таблица employee_services
    await pool.query(`
        CREATE TABLE IF NOT EXISTS employee_services (
            employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
            service_id UUID REFERENCES services(id) ON DELETE CASCADE,
            PRIMARY KEY (employee_id, service_id)
        );
    `);

    // Таблица schedules
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schedules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
            day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
            start_time TIME,
            end_time TIME,
            is_working BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            break_start TIME,
            break_end TIME
        );
    `);

    // Таблица appointments
    await pool.query(`
        CREATE TABLE IF NOT EXISTS appointments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_name TEXT NOT NULL,
            client_phone TEXT,
            service_id UUID REFERENCES services(id),
            employee_id UUID REFERENCES employees(id),
            appointment_date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            status appointment_status DEFAULT 'scheduled',
            cancel_reason TEXT,
            actual_price NUMERIC,
            commission_earned NUMERIC,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);

    console.log('✅ Все таблицы созданы');

    // 3. Создаём админ-пользователя (пароль: admin)
    const adminEmail = 'admin@admin.com';
    const adminPassword = 'admin';
    const adminCheck = await pool.query('SELECT 1 FROM admin_users WHERE email = $1', [adminEmail]);
    if (adminCheck.rows.length === 0) {
        const hash = await bcrypt.hash(adminPassword, 10);
        await pool.query('INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)', [adminEmail, hash]);
        console.log(`✅ Админ создан: ${adminEmail} / ${adminPassword}`);
    } else {
        console.log('ℹ️  Админ уже существует');
    }

    // 4. Миграция данных из Supabase
    console.log('🔄 Мигрирую данные...');

    // Employees
    const empCheck = await pool.query('SELECT COUNT(*) as cnt FROM employees');
    if (parseInt(empCheck.rows[0].cnt) === 0) {
        await pool.query(`
            INSERT INTO employees (id, first_name, last_name, position, phone, email, address, experience_years, specialization, certificates, avatar_url, commission_type, commission_value, created_at, updated_at, image_url) VALUES
            ('da94b0db-11c0-44ae-92a4-957c1498d22b', 'Nurkasym', 'Idragim', 'мастер', NULL, NULL, NULL, 2, 'барбер', 'привт', 'https://jvqrrcqiohikqepmnvpc.supabase.co/storage/v1/object/public/images/employees/tq5kmok9xqj_1775577425309.png', 'fixed', 0.00, '2026-04-07 15:57:23.738697+00', '2026-04-11 09:53:14.876+00', NULL),
            ('911471b8-786f-48df-84e4-0ce5e2d58915', 'йцук', 'йййййй', 'ййййййй', NULL, NULL, NULL, 0, 'йййййй', NULL, 'https://jvqrrcqiohikqepmnvpc.supabase.co/storage/v1/object/public/images/employees/o75auv2p4zq_1776196144486.PNG', 'percentage', 0.00, '2026-04-14 19:49:19.759893+00', '2026-04-14 19:49:19.954+00', NULL)
        `);
        console.log('  ✅ employees: 2 записи');
    }

    // Services
    const svcCheck = await pool.query('SELECT COUNT(*) as cnt FROM services');
    if (parseInt(svcCheck.rows[0].cnt) === 0) {
        await pool.query(`
            INSERT INTO services (id, name, description, price, duration_minutes, created_at, updated_at, category, image_url) VALUES
            ('81266228-8182-40d2-9668-6e55a0bcc4c1', 'апрол', 'фывыыыыыыыф', 12200.00, 30, '2026-04-11 09:23:38.67562+00', '2026-04-11 09:23:38.67562+00', 'ыва', 'https://jvqrrcqiohikqepmnvpc.supabase.co/storage/v1/object/public/images/services/blrhssrecw7_1775899440359.PNG'),
            ('8cc6547e-eca3-4e80-84c9-35c721f211c6', 'йцуке', 'фывапрорпавыфывап', 1200.00, 35, '2026-04-14 19:48:50.189841+00', '2026-04-14 19:48:50.189841+00', 'йцукуй', 'https://jvqrrcqiohikqepmnvpc.supabase.co/storage/v1/object/public/images/services/zxcw1wsux5r_1776196126940.PNG')
        `);
        console.log('  ✅ services: 2 записи');
    }

    // Employee_services
    const esCheck = await pool.query('SELECT COUNT(*) as cnt FROM employee_services');
    if (parseInt(esCheck.rows[0].cnt) === 0) {
        await pool.query(`
            INSERT INTO employee_services (employee_id, service_id) VALUES
            ('da94b0db-11c0-44ae-92a4-957c1498d22b', '81266228-8182-40d2-9668-6e55a0bcc4c1'),
            ('911471b8-786f-48df-84e4-0ce5e2d58915', '8cc6547e-eca3-4e80-84c9-35c721f211c6')
        `);
        console.log('  ✅ employee_services: 2 записи');
    }

    // Schedules
    const schCheck = await pool.query('SELECT COUNT(*) as cnt FROM schedules');
    if (parseInt(schCheck.rows[0].cnt) === 0) {
        await pool.query(`
            INSERT INTO schedules (id, employee_id, day_of_week, start_time, end_time, is_working, created_at, break_start, break_end) VALUES
            ('d1e27066-cd98-4632-a7b8-d9e8bc3f88af', 'da94b0db-11c0-44ae-92a4-957c1498d22b', 1, '15:20:00', '01:00:00', true, '2026-04-11 09:53:22.460854+00', '13:00:00', '14:00:00'),
            ('a23e4418-a3b7-41c3-adda-603f6650f763', 'da94b0db-11c0-44ae-92a4-957c1498d22b', 2, '09:00:00', '18:00:00', true, '2026-04-11 09:53:22.460854+00', '13:00:00', '14:00:00'),
            ('4c3f7564-0021-4674-85e4-0cbb2adf01c1', 'da94b0db-11c0-44ae-92a4-957c1498d22b', 3, NULL, NULL, false, '2026-04-11 09:53:22.460854+00', NULL, NULL),
            ('95f0b07b-2e7f-4deb-82a1-91349c6e12c5', 'da94b0db-11c0-44ae-92a4-957c1498d22b', 4, '09:00:00', '18:00:00', true, '2026-04-11 09:53:22.460854+00', '13:00:00', '14:00:00'),
            ('0549aeac-6a18-4a53-9c78-9a1caf8c3ef9', 'da94b0db-11c0-44ae-92a4-957c1498d22b', 5, '09:00:00', '18:00:00', true, '2026-04-11 09:53:22.460854+00', '13:00:00', '14:00:00'),
            ('55a662b5-6832-48f8-8e53-1a1a64b16fd1', 'da94b0db-11c0-44ae-92a4-957c1498d22b', 6, NULL, NULL, false, '2026-04-11 09:53:22.460854+00', NULL, NULL),
            ('3ac26a8b-4c67-40d9-972d-f687ce960149', 'da94b0db-11c0-44ae-92a4-957c1498d22b', 7, NULL, NULL, false, '2026-04-11 09:53:22.460854+00', NULL, NULL),
            ('77349362-d8a2-478d-a310-a80b466f39f6', '911471b8-786f-48df-84e4-0ce5e2d58915', 1, '09:00:00', '18:00:00', true, '2026-04-14 19:49:20.524214+00', '13:00:00', '14:00:00'),
            ('9f42847e-5d7c-4483-bd9e-979aa3019151', '911471b8-786f-48df-84e4-0ce5e2d58915', 2, '09:00:00', '18:00:00', true, '2026-04-14 19:49:20.524214+00', '13:00:00', '14:00:00'),
            ('88e6c4f8-b53b-4175-a339-5ad6f99d8671', '911471b8-786f-48df-84e4-0ce5e2d58915', 3, '09:00:00', '18:00:00', true, '2026-04-14 19:49:20.524214+00', '13:00:00', '14:00:00'),
            ('ddc1738b-5aaf-4c39-9e26-fba1fc63db52', '911471b8-786f-48df-84e4-0ce5e2d58915', 4, '09:00:00', '18:00:00', true, '2026-04-14 19:49:20.524214+00', '13:00:00', '14:00:00'),
            ('546986c1-77f8-45a5-aed9-07724aa15ba6', '911471b8-786f-48df-84e4-0ce5e2d58915', 5, '09:00:00', '18:00:00', true, '2026-04-14 19:49:20.524214+00', '13:00:00', '14:00:00'),
            ('e7745884-fc30-48e0-b563-a28a97f80812', '911471b8-786f-48df-84e4-0ce5e2d58915', 6, NULL, NULL, false, '2026-04-14 19:49:20.524214+00', NULL, NULL),
            ('2a914ccc-6925-42b6-b986-2df536e79922', '911471b8-786f-48df-84e4-0ce5e2d58915', 7, NULL, NULL, false, '2026-04-14 19:49:20.524214+00', NULL, NULL)
        `);
        console.log('  ✅ schedules: 14 записей');
    }

    // Settings
    const setCheck = await pool.query('SELECT COUNT(*) as cnt FROM settings');
    if (parseInt(setCheck.rows[0].cnt) === 0) {
        await pool.query(`
            INSERT INTO settings (id, company_name, phone, email, address, working_hours, logo_url, default_commission_type, default_commission_value, telegram_report_enabled, daily_report_enabled, created_at, updated_at, gallery, about_us_image, telegram_chat_id) VALUES
            ('953758f1-4189-4f1d-943b-f91d0c6c229a', 'L''AURA', '87087171518', 'nurkasymidragim@gmail.com', 'Бейбарн ', '90', NULL, 'percentage', 30.00, true, false, '2026-02-27 10:29:35.199423+00', '2026-04-14 08:26:11.173+00', '{}', 'https://jvqrrcqiohikqepmnvpc.supabase.co/storage/v1/object/public/images/settings/5yza9oevo39_1775902898968.PNG', '')
        `);
        console.log('  ✅ settings: 1 запись');
    }

    console.log('\n🎉 Инициализация завершена!');
    console.log('📋 Данные для входа: admin@admin.com / admin');

    await pool.end();
}

initDatabase().catch(err => {
    console.error('❌ Ошибка инициализации:', err);
    process.exit(1);
});
