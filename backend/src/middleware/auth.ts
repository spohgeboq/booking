import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'booking-secret-key-2026';

// Роли пользователей
export type UserRole = 'OWNER' | 'MASTER';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: UserRole;
        employee_id: string | null;
    };
}

// Middleware для защиты маршрутов
// Всегда подтягивает актуальную роль из БД — старые токены работают корректно
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
            id: string;
            email: string;
            role?: UserRole;
            employee_id?: string | null;
        };

        // Всегда подтягиваем актуальную роль из БД
        // Это гарантирует, что даже старые токены без role будут работать
        const result = await query(
            'SELECT id, email, role, employee_id FROM admin_users WHERE id = $1',
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

        const dbUser = result.rows[0];
        req.user = {
            id: dbUser.id,
            email: dbUser.email,
            role: dbUser.role || 'OWNER', // fallback для старых записей без роли
            employee_id: dbUser.employee_id || null,
        };

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Недействительный токен' });
    }
}

// Middleware для проверки роли пользователя
export function checkRole(allowedRoles: UserRole[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Недостаточно прав для выполнения операции' });
        }

        next();
    };
}

// Генерация JWT токена
export function generateToken(user: {
    id: string;
    email: string;
    role: UserRole;
    employee_id: string | null;
}): string {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, employee_id: user.employee_id },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}
