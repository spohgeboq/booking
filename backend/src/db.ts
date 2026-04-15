import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5433/booking_db',
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

// Обёртка для удобных запросов
export async function query(text: string, params?: any[]) {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    } finally {
        client.release();
    }
}

export default pool;
