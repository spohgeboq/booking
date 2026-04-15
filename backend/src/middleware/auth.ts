import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'booking-secret-key-2026';

export interface AuthRequest extends Request {
    user?: { id: string; email: string };
}

// Middleware для защиты маршрутов (только для админ-панели)
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Недействительный токен' });
    }
}

// Генерация JWT токена
export function generateToken(user: { id: string; email: string }): string {
    return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}
