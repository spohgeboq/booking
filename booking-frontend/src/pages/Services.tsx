import { motion } from 'framer-motion';
import { useDataStore, Service } from '../store/useDataStore';
import { useBookingStore } from '../store/useBookingStore';
import { Button } from '../components/ui/Button';
import { Clock } from 'lucide-react';

export default function Services() {
    const { services } = useDataStore();
    const startBookingWithService = useBookingStore(state => state.startBookingWithService);

    // Группируем услуги по категориям
    const groupedServices = services.reduce((acc, service) => {
        const category = service.category || 'Основные услуги';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(service);
        return acc;
    }, {} as Record<string, Service[]>);

    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto flex flex-col gap-16">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl"
            >
                <h1 className="text-4xl md:text-6xl font-serif text-white mb-6">Наши Услуги</h1>
                <p className="text-lg text-text-secondary">
                    Полный спектр премиальных услуг для самых требовательных клиентов. Высший стандарт качества в каждой детали.
                </p>
            </motion.div>

            <div className="flex flex-col gap-16">
                {Object.entries(groupedServices).map(([category, items], catIndex) => (
                    <div key={category} className="flex flex-col gap-8">
                        <motion.h2
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: catIndex * 0.1 }}
                            className="text-2xl md:text-3xl font-serif text-white border-b border-border pb-4"
                        >
                            {category}
                        </motion.h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {items.map((service, i) => (
                                <motion.div
                                    key={service.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1, duration: 0.5 }}
                                    className="group flex flex-col h-full"
                                >
                                    <div className="glass-card hover:bg-white/[0.05] transition-colors p-2 h-full flex flex-col border border-border/50">
                                        <div className="relative h-60 rounded-xl overflow-hidden mb-4">
                                            <img
                                                src={service.image_url || 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=800&auto=format&fit=crop'}
                                                alt={service.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                            <div className="absolute top-4 right-4 glass px-3 py-1 rounded-full text-xs font-medium text-white shadow-lg backdrop-blur-md bg-black/20">
                                                {service.price} ₸
                                            </div>
                                        </div>
                                        <div className="px-4 pb-4 flex-1 flex flex-col">
                                            <div className="flex items-start justify-between mb-3 gap-4">
                                                <h3 className="text-xl font-medium text-white group-hover:text-brand-light transition-colors leading-tight">
                                                    {service.name}
                                                </h3>
                                                <span className="text-sm text-text-muted flex items-center gap-1 whitespace-nowrap bg-neutral-bg3 px-2 py-1 rounded-md">
                                                    <Clock className="w-3 h-3" /> {service.duration} мин
                                                </span>
                                            </div>
                                            <p className="text-sm text-text-secondary leading-relaxed mb-6 flex-1">
                                                {service.description}
                                            </p>
                                            <Button
                                                className="w-full bg-brand/10 text-brand-light hover:bg-brand hover:text-white border-none mt-auto"
                                                onClick={() => startBookingWithService(service.id)}
                                            >
                                                Записаться
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}

                {services.length === 0 && (
                    <div className="p-12 glass rounded-3xl border border-border flex items-center justify-center">
                        <p className="text-text-muted">Список услуг пока пуст.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
