/**
 * Одноразовый скрипт миграции изображений: PNG/JPEG → WebP
 * 
 * Что делает:
 * 1. Сканирует папку uploads/ на наличие PNG/JPEG файлов
 * 2. Конвертирует каждый в WebP (качество 80, макс. ширина 1000px)
 * 3. Обновляет пути в таблицах: services, employees, settings
 * 4. Удаляет оригинальные PNG/JPEG файлы после успешной конвертации
 * 
 * Запуск: npx ts-node src/migrate-images.ts
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { query } from './db';

dotenv.config();

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const MAX_WIDTH = 1000;
const WEBP_QUALITY = 80;

// Расширения для конвертации
const CONVERTIBLE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'];

interface ConversionResult {
    originalFile: string;
    newFile: string;
    originalSize: number;
    newSize: number;
    saved: number;
}

async function convertFile(filePath: string): Promise<ConversionResult | null> {
    const ext = path.extname(filePath).toLowerCase();
    if (!CONVERTIBLE_EXTENSIONS.includes(ext)) return null;

    const baseName = path.basename(filePath, ext);
    const newFileName = `${baseName}.webp`;
    const newFilePath = path.join(UPLOADS_DIR, newFileName);

    // Если WebP уже существует — пропускаем
    if (fs.existsSync(newFilePath)) {
        console.log(`  ⏭  ${path.basename(filePath)} → уже конвертирован, пропускаем`);
        return null;
    }

    const originalSize = fs.statSync(filePath).size;

    try {
        await sharp(filePath)
            .resize({ width: MAX_WIDTH, withoutEnlargement: true })
            .webp({ quality: WEBP_QUALITY })
            .toFile(newFilePath);

        const newSize = fs.statSync(newFilePath).size;
        const savedBytes = originalSize - newSize;
        const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);

        console.log(
            `  ✅ ${path.basename(filePath)} (${(originalSize / 1024 / 1024).toFixed(1)} МБ) → ` +
            `${newFileName} (${(newSize / 1024).toFixed(0)} КБ) | -${savedPercent}%`
        );

        return {
            originalFile: path.basename(filePath),
            newFile: newFileName,
            originalSize,
            newSize,
            saved: savedBytes,
        };
    } catch (err: any) {
        console.error(`  ❌ Ошибка конвертации ${path.basename(filePath)}: ${err.message}`);
        // Удаляем битый WebP если он создался
        if (fs.existsSync(newFilePath)) fs.unlinkSync(newFilePath);
        return null;
    }
}

async function updateDatabase(conversions: ConversionResult[]) {
    console.log('\n📦 Обновление базы данных...');

    let updated = 0;

    for (const conv of conversions) {
        const oldSuffix = conv.originalFile;   // 1776506757553-431403711.png
        const newSuffix = conv.newFile;         // 1776506757553-431403711.webp

        // Обновляем services.image_url
        const svcResult = await query(
            `UPDATE services SET image_url = REPLACE(image_url, $1, $2), updated_at = NOW()
             WHERE image_url LIKE '%' || $1`,
            [oldSuffix, newSuffix]
        );
        if (svcResult.rowCount && svcResult.rowCount > 0) {
            console.log(`  📋 services: ${svcResult.rowCount} запись(ей) обновлено (${oldSuffix})`);
            updated += svcResult.rowCount;
        }

        // Обновляем employees.avatar_url
        const empAvatarResult = await query(
            `UPDATE employees SET avatar_url = REPLACE(avatar_url, $1, $2), updated_at = NOW()
             WHERE avatar_url LIKE '%' || $1`,
            [oldSuffix, newSuffix]
        );
        if (empAvatarResult.rowCount && empAvatarResult.rowCount > 0) {
            console.log(`  👤 employees.avatar_url: ${empAvatarResult.rowCount} запись(ей) обновлено`);
            updated += empAvatarResult.rowCount;
        }

        // Обновляем employees.image_url
        const empImageResult = await query(
            `UPDATE employees SET image_url = REPLACE(image_url, $1, $2), updated_at = NOW()
             WHERE image_url LIKE '%' || $1`,
            [oldSuffix, newSuffix]
        );
        if (empImageResult.rowCount && empImageResult.rowCount > 0) {
            console.log(`  👤 employees.image_url: ${empImageResult.rowCount} запись(ей) обновлено`);
            updated += empImageResult.rowCount;
        }

        // Обновляем settings.about_us_image
        const settingsAboutResult = await query(
            `UPDATE settings SET about_us_image = REPLACE(about_us_image, $1, $2), updated_at = NOW()
             WHERE about_us_image LIKE '%' || $1`,
            [oldSuffix, newSuffix]
        );
        if (settingsAboutResult.rowCount && settingsAboutResult.rowCount > 0) {
            console.log(`  ⚙️  settings.about_us_image: обновлено`);
            updated += settingsAboutResult.rowCount;
        }

        // Обновляем settings.gallery (массив текстовых URL)
        const settingsGalleryResult = await query(
            `UPDATE settings
             SET gallery = (
                 SELECT array_agg(REPLACE(elem, $1, $2))
                 FROM unnest(gallery) AS elem
             ),
             updated_at = NOW()
             WHERE EXISTS (
                 SELECT 1 FROM unnest(gallery) AS elem WHERE elem LIKE '%' || $1
             )`,
            [oldSuffix, newSuffix]
        );
        if (settingsGalleryResult.rowCount && settingsGalleryResult.rowCount > 0) {
            console.log(`  🖼️  settings.gallery: обновлено`);
            updated += settingsGalleryResult.rowCount;
        }

        // Обновляем settings.logo_url
        const settingsLogoResult = await query(
            `UPDATE settings SET logo_url = REPLACE(logo_url, $1, $2), updated_at = NOW()
             WHERE logo_url LIKE '%' || $1`,
            [oldSuffix, newSuffix]
        );
        if (settingsLogoResult.rowCount && settingsLogoResult.rowCount > 0) {
            console.log(`  🏷️  settings.logo_url: обновлено`);
            updated += settingsLogoResult.rowCount;
        }
    }

    return updated;
}

async function deleteOriginals(conversions: ConversionResult[]) {
    console.log('\n🗑️  Удаление оригинальных файлов...');
    let deleted = 0;
    let freedBytes = 0;

    for (const conv of conversions) {
        const originalPath = path.join(UPLOADS_DIR, conv.originalFile);
        if (fs.existsSync(originalPath)) {
            fs.unlinkSync(originalPath);
            deleted++;
            freedBytes += conv.originalSize;
        }
    }

    console.log(`  Удалено: ${deleted} файлов, освобождено: ${(freedBytes / 1024 / 1024).toFixed(1)} МБ`);
}

async function main() {
    console.log('🔄 Миграция изображений: PNG/JPEG → WebP');
    console.log(`📁 Папка: ${UPLOADS_DIR}`);
    console.log(`⚙️  Макс. ширина: ${MAX_WIDTH}px, качество WebP: ${WEBP_QUALITY}\n`);

    // 1. Сканируем файлы
    const files = fs.readdirSync(UPLOADS_DIR)
        .filter(f => CONVERTIBLE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
        .map(f => path.join(UPLOADS_DIR, f));

    if (files.length === 0) {
        console.log('✅ Нет файлов для конвертации. Всё уже в WebP!');
        process.exit(0);
    }

    const totalSizeBefore = files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
    console.log(`📊 Найдено: ${files.length} файлов (${(totalSizeBefore / 1024 / 1024).toFixed(1)} МБ)\n`);

    // 2. Конвертируем
    console.log('🔧 Конвертация...');
    const conversions: ConversionResult[] = [];

    for (const file of files) {
        const result = await convertFile(file);
        if (result) conversions.push(result);
    }

    if (conversions.length === 0) {
        console.log('\n✅ Все файлы уже сконвертированы!');
        process.exit(0);
    }

    // 3. Статистика конвертации
    const totalOriginal = conversions.reduce((sum, c) => sum + c.originalSize, 0);
    const totalNew = conversions.reduce((sum, c) => sum + c.newSize, 0);
    const totalSaved = totalOriginal - totalNew;

    console.log(`\n📊 Итог конвертации:`);
    console.log(`   Сконвертировано: ${conversions.length} файлов`);
    console.log(`   Было: ${(totalOriginal / 1024 / 1024).toFixed(1)} МБ`);
    console.log(`   Стало: ${(totalNew / 1024 / 1024).toFixed(1)} МБ`);
    console.log(`   Сэкономлено: ${(totalSaved / 1024 / 1024).toFixed(1)} МБ (${((totalSaved / totalOriginal) * 100).toFixed(1)}%)`);

    // 4. Обновляем БД
    const dbUpdated = await updateDatabase(conversions);
    console.log(`\n✅ Обновлено записей в БД: ${dbUpdated}`);

    // 5. Удаляем оригиналы
    await deleteOriginals(conversions);

    console.log('\n🎉 Миграция завершена успешно!');
    process.exit(0);
}

main().catch(err => {
    console.error('💥 Критическая ошибка:', err);
    process.exit(1);
});
