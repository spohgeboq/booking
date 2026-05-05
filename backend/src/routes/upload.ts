import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const router = Router();

// Создаём папку uploads если не существует
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Конфигурация multer — memoryStorage для обработки буфера через sharp
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Только изображения'));
    }
});

// POST /api/upload — загрузка файла с оптимизацией через sharp
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не передан' });
        }

        // Генерируем уникальное имя файла с расширением .webp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + '.webp';
        const outputPath = path.join(uploadDir, filename);

        // Обработка изображения: ресайз до 1000px по ширине + конвертация в WebP
        await sharp(req.file.buffer)
            .resize({ width: 1000, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(outputPath);

        const backendUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
        const publicUrl = `${backendUrl}/uploads/${filename}`;

        // Получаем размер оптимизированного файла
        const stats = fs.statSync(outputPath);

        res.json({
            url: publicUrl,
            filename,
            originalName: req.file.originalname, // Оригинальное имя как загрузил юзер
            size: stats.size
        });
    } catch (err) {
        console.error('Ошибка обработки изображения:', err);

        // Если sharp не смог обработать файл — значит файл невалидный
        if (err instanceof Error && err.message.includes('Input buffer')) {
            return res.status(400).json({ error: 'Невалидный файл изображения' });
        }

        res.status(500).json({ error: 'Ошибка при обработке изображения' });
    }
});

export default router;
