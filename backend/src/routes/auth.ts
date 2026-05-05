import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import { generateToken, AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/auth/login — вход (OWNER или MASTER)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    try {
        const result = await query(
            'SELECT id, email, password_hash, role, employee_id FROM admin_users WHERE email = $1',
            [email]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
            employee_id: user.employee_id,
        });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                employee_id: user.employee_id,
            }
        });
    } catch (error: any) {
        console.error('Auth error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/auth/me — проверка текущей сессии
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const result = await query(
            'SELECT id, email, role, employee_id FROM admin_users WHERE id = $1',
            [req.user!.id]
        );
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        res.json({ user });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
