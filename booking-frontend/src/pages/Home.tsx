import { PageTransition } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { ArrowRight, Sparkles, Clock, CalendarCheck, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBookingStore } from '../store/useBookingStore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { MasterProfileModal } from '../components/team/MasterProfileModal';
import { Employee, useDataStore } from '../store/useDataStore';

// Анимационные варианты
const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

export default function Home() {
    const openBooking = useBookingStore(state => state.openBooking);
    const navigate = useNavigate();
    const [selectedMaster, setSelectedMaster] = useState<Employee | null>(null);
    const { employees, services } = useDataStore();

    return (
        <PageTransition>
            <div className="flex flex-col gap-24 pb-24">

                {/* HERO SECTION */}
                <section className="relative min-h-[85vh] flex items-center pt-20">
                    {/* Фоновое изображение */}
                    <div className="absolute inset-0 rounded-3xl overflow-hidden glass border-border-subtle/50">
                        <div className="absolute inset-0 bg-neutral-bg1/60 z-10" /> {/* Затемнение */}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-neutral-bg1 to-transparent z-10" />
                        <img
                            src="/src/assets/hero_minimal_studio.webp"
                            alt="Luxury minimal studio interior"
                            className="w-full h-full object-cover opacity-80"
                            onError={(e) => {
                                // Если картинка пока не сгенерирована, показываем плейсхолдер
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop';
                            }}
                        />
                    </div>

                    <div className="relative z-20 w-full px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-12">
                        <motion.div
                            className="max-w-2xl flex flex-col gap-8"
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                        >
                            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass bg-white/[0.02] border border-white/5 w-fit">
                                <Sparkles className="w-4 h-4 text-brand-light" />
                                <span className="text-sm font-medium tracking-wide text-text-secondary uppercase">Премиальный сервис</span>
                            </motion.div>

                            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-serif text-white leading-[1.1] tracking-tight">
                                Искусство <br /><span className="text-brand-light italic">превосходства</span>
                            </motion.h1>

                            <motion.p variants={fadeUp} className="text-lg md:text-xl text-text-secondary max-w-lg leading-relaxed">
                                Погрузитесь в атмосферу роскоши и стиля. Безупречное качество, индивидуальный подход и новейшие техники от топ-мастеров.
                            </motion.p>

                            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Button size="lg" className="w-full sm:w-auto gap-2 group" onClick={openBooking}>
                                    Записаться онлайн
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                                <Button variant="glass" size="lg" className="w-full sm:w-auto" onClick={() => navigate('/services')}>
                                    Наши услуги
                                </Button>
                            </motion.div>
                        </motion.div>

                        {/* Карточка статистики / Доверия */}
                        <motion.div
                            variants={fadeUp}
                            initial="hidden"
                            animate="visible"
                            className="hidden lg:flex flex-col gap-6"
                        >
                            <div className="glass-card p-6 flex items-center gap-6 backdrop-blur-xl bg-white/[0.02]">
                                <div className="w-14 h-14 rounded-full bg-brand/20 flex items-center justify-center text-brand-light border border-brand/30">
                                    <CalendarCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-semibold text-white">1000+</h4>
                                    <p className="text-sm text-text-secondary">Довольных клиентов</p>
                                </div>
                            </div>
                            <div className="glass-card p-6 flex items-center gap-6 backdrop-blur-xl bg-white/[0.02] translate-x-8">
                                <div className="w-14 h-14 rounded-full bg-neutral-bg3 flex items-center justify-center text-white border border-border">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-semibold text-white">Выбор времени</h4>
                                    <p className="text-sm text-text-secondary">Легкая онлайн-запись</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* SERVICES SECTION */}
                <section className="px-6 md:px-12 relative">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col gap-12"
                    >
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="max-w-xl">
                                <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">Наши Услуги</h2>
                                <p className="text-text-secondary">Выберите подходящую услугу, и мы подберем удобное для вас время. Высший стандарт качества в каждой детали.</p>
                            </div>
                            <Button variant="outline" className="w-fit" onClick={() => navigate('/services')}>Смотреть все услуги <ArrowRight className="w-4 h-4 ml-2" /></Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {services.slice(0, 3).map((service, i) => (
                                <motion.div
                                    key={service.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1, duration: 0.5 }}
                                    className="group cursor-pointer"
                                >
                                    <div className="glass-card hover:bg-white/[0.05] transition-colors p-2 h-full flex flex-col">
                                        <div className="relative h-60 rounded-xl overflow-hidden mb-4">
                                            <img
                                                src={service.image_url || 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=800&auto=format&fit=crop'}
                                                alt={service.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                            <div className="absolute top-4 right-4 glass px-3 py-1 rounded-full text-xs font-medium text-white shadow-lg">
                                                {service.price} ₸
                                            </div>
                                        </div>
                                        <div className="px-4 pb-4 flex-1 flex flex-col">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-xl font-semibold text-white group-hover:text-brand-light transition-colors">{service.name}</h3>
                                                <span className="text-sm text-text-muted flex items-center gap-1"><Clock className="w-3 h-3" /> {service.duration} мин</span>
                                            </div>
                                            <p className="text-sm text-text-secondary mb-6 flex-1 line-clamp-3">{service.description}</p>
                                            <Button variant="ghost" className="w-full text-brand-light hover:bg-brand/10 bg-brand/5 border border-brand/20 mt-auto" onClick={openBooking}>
                                                Записаться
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </section>

                {/* FEATURES / WHY US SECTION */}
                <section className="px-6 md:px-12 relative py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="relative h-[600px] rounded-3xl overflow-hidden glass border-border-subtle group"
                        >
                            <img
                                src="https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?q=80&w=1500&auto=format&fit=crop"
                                alt="Атмосфера салона"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-bg1/80 via-transparent to-transparent" />
                            <div className="absolute bottom-8 left-8 right-8 glass-card p-6 backdrop-blur-xl bg-white/[0.03]">
                                <p className="text-white font-serif text-xl italic drop-shadow-md">
                                    "Мы не просто делаем стрижки. Мы создаем уверенность в себе."
                                </p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="flex flex-col gap-10"
                        >
                            <div className="max-w-xl">
                                <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">Почему выбирают именно нас</h2>
                                <p className="text-lg text-text-secondary leading-relaxed">
                                    Философия L'AURA строится на трех столпах: индивидуальный подход, премиальные материалы и безупречный сервис. Каждый визит к нам — это ритуал заботы о себе.
                                </p>
                            </div>

                            <div className="flex flex-col gap-6">
                                {[
                                    {
                                        title: "Топ-мастера с международным опытом",
                                        desc: "Наши барберы и стилисты регулярно проходят стажировки в Европе и владеют новейшими техниками."
                                    },
                                    {
                                        title: "Премиальная косметика",
                                        desc: "В работе используются только нишевые бренды: Balmain, Kevin Murphy, Oribe. Идеальный уход гарантирован."
                                    },
                                    {
                                        title: "Приватная атмосфера",
                                        desc: "VIP-зоны, авторские коктейли и премиальный кофе. У нас вы можете отдохнуть от городской суеты."
                                    }
                                ].map((feature, i) => (
                                    <motion.div
                                        key={feature.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.15 + 0.3, duration: 0.5 }}
                                        className="flex gap-4 group"
                                    >
                                        <div className="mt-1 flex-shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand-light group-hover:bg-brand group-hover:text-white transition-colors duration-300">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-medium text-white mb-2">{feature.title}</h4>
                                            <p className="text-text-secondary leading-relaxed">{feature.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* TEAM SECTION */}
                <section className="px-6 md:px-12 relative py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col gap-12"
                    >
                        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
                            <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">Наши Мастера</h2>
                            <p className="text-text-secondary">Команда профессионалов, преданных своему делу. Выберите своего идеального мастера.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {employees.slice(0, 4).map((master, i) => (
                                <motion.div
                                    key={master.id}
                                    layoutId={`master-card-${master.id}`}
                                    onClick={() => setSelectedMaster(master)}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1, duration: 0.5 }}
                                    className="group cursor-pointer text-center flex flex-col items-center gap-4"
                                >
                                    <motion.div
                                        layoutId={`master-img-container-${master.id}`}
                                        className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border border-border group-hover:border-brand-light transition-colors p-2"
                                    >
                                        <div className="w-full h-full rounded-full overflow-hidden">
                                            <motion.img
                                                layoutId={`master-img-${master.id}`}
                                                src={master.avatar_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=800&auto=format&fit=crop'}
                                                alt={`${master.first_name} ${master.last_name}`}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 grayscale group-hover:grayscale-0"
                                            />
                                        </div>
                                    </motion.div>
                                    <div>
                                        <h3 className="text-xl font-medium text-white mb-1">{master.first_name} {master.last_name}</h3>
                                        <p className="text-sm text-brand-light">{master.specialization}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </section>

            </div>

            {/* Модальное окно профиля мастера */}
            <MasterProfileModal
                master={selectedMaster}
                onClose={() => setSelectedMaster(null)}
            />
        </PageTransition>
    );
}
