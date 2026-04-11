import { PageTransition } from '../components/layout/AppShell';
import { motion } from 'framer-motion';
import { useDataStore } from '../store/useDataStore';

export default function About() {
    const { settings } = useDataStore();
    const companyName = settings?.company_name || "Наш Салон";
    const gallery = settings?.gallery || [];

    return (
        <PageTransition>
            <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto flex flex-col gap-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl"
                >
                    <h1 className="text-4xl md:text-6xl font-serif text-white mb-6">О нас — {companyName}</h1>
                    <p className="text-lg text-text-secondary leading-relaxed">
                        Истинная роскошь кроется в деталях. Мы создали пространство, где время замирает, а каждый момент посвящен исключительно вам. {companyName} — это не просто салон, это философия превосходства, симбиоз передовых технологий и классического искусства ухода.
                    </p>
                </motion.div>

                {/* Главное фото "О нас" */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full h-[50vh] md:h-[60vh] rounded-3xl overflow-hidden glass border-border-subtle"
                >
                    <img
                        src={settings?.about_us_image || "https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?q=80&w=1974&auto=format&fit=crop"}
                        alt={`Интерьер ${companyName}`}
                        className="w-full h-full object-cover"
                    />
                </motion.div>

                {/* Галерея работ */}
                {gallery.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-2xl font-serif text-white mb-6">Наши работы</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {gallery.map((url, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="aspect-square rounded-2xl overflow-hidden glass border-border-subtle group cursor-pointer"
                                >
                                    <img
                                        src={url}
                                        alt={`Работа ${idx + 1}`}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 pt-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-2xl font-serif text-white mb-4">Наш Подход</h3>
                        <p className="text-text-secondary leading-relaxed">
                            Мы верим, что идеальный образ рождается в диалоге. Наши мастера не просто выполняют услугу, они конструируют ваш стиль, учитывая анатомию лица, структуру волос и ваш ритм жизни.
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                    >
                        <h3 className="text-2xl font-serif text-white mb-4">Премиальные Материалы</h3>
                        <p className="text-text-secondary leading-relaxed">
                            В своей работе мы используем исключительно нишевую косметику и инструменты премиум-класса. Это гарантия безупречного результата и здоровья ваших волос.
                        </p>
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}
