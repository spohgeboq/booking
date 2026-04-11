import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { X, Award, Scissors, Star, Check, Clock, ArrowLeft, Phone, Mail, MapPin } from 'lucide-react';
import { useBookingStore } from '../../store/useBookingStore';
import { useEffect, useState } from 'react';
import { Employee, useDataStore } from '../../store/useDataStore';

interface MasterProfileModalProps {
    master: Employee | null;
    onClose: () => void;
}

export function MasterProfileModal({ master, onClose }: MasterProfileModalProps) {
    const [showServices, setShowServices] = useState(false);
    const [localSelectedServices, setLocalSelectedServices] = useState<string[]>([]);

    useEffect(() => {
        if (!master) {
            setShowServices(false);
            setLocalSelectedServices([]);
        }
    }, [master]);

    useEffect(() => {
        if (master) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [master]);

    const handleContinueBooking = () => {
        if (master && localSelectedServices.length > 0) {
            useBookingStore.getState().startBookingWithMaster(master.id, localSelectedServices);
            onClose();
        }
    };

    const { services } = useDataStore();

    const toggleService = (id: string) => {
        setLocalSelectedServices(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    // Только услуги этого мастера
    const masterServices = master
        ? services.filter(s => master.serviceIds?.includes(s.id))
        : [];

    // Если у мастера нет привязанных — показываем все (fallback)
    const displayServices = masterServices.length > 0 ? masterServices : services;

    const selectedPrice = displayServices
        .filter(s => localSelectedServices.includes(s.id))
        .reduce((acc, s) => acc + (s.price || 0), 0);

    const masterName = master ? `${master.first_name || ''} ${master.last_name || ''}`.trim() : '';
    const masterImage = master?.avatar_url || master?.image_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=800&auto=format&fit=crop';
    const masterRole = master?.specialization || master?.position || 'Мастер';
    const masterBio = master?.certificates || null;

    // Опыт работы
    const experienceYears = master?.experience_years;
    const experienceText =
        experienceYears && experienceYears > 0
            ? `${experienceYears} ${experienceYears === 1 ? 'год' : experienceYears < 5 ? 'года' : 'лет'} опыта`
            : 'Опытный мастер';

    return (
        <AnimatePresence>
            {master && (
                <>
                    {/* Оверлей */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.3 } }}
                        onClick={onClose}
                        className="fixed inset-0 bg-neutral-bg1/80 backdrop-blur-md z-40"
                    />

                    {/* Модальное окно */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12 pointer-events-none">
                        <motion.div
                            layoutId={`master-card-${master.id}`}
                            className="w-full max-w-4xl max-h-[90vh] bg-neutral-bg2 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row pointer-events-auto relative mt-[70px]"
                        >
                            {/* Кнопка закрытия */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:text-brand-light transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Левая часть: Фото */}
                            <motion.div
                                layoutId={`master-img-container-${master.id}`}
                                className="relative w-full h-[300px] md:h-auto md:w-[40%] flex-shrink-0"
                            >
                                <motion.img
                                    layoutId={`master-img-${master.id}`}
                                    src={masterImage}
                                    alt={masterName}
                                    className="absolute inset-0 w-full h-full object-cover object-top"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-bg2 via-transparent md:bg-gradient-to-r md:from-transparent md:to-neutral-bg2" />
                            </motion.div>

                            {/* Правая часть: Контент */}
                            <div className="flex-1 overflow-hidden relative h-[500px] md:h-auto">
                                <AnimatePresence mode="wait">
                                    {!showServices ? (
                                        <motion.div
                                            key="info"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                            className="p-8 md:p-12 h-full overflow-y-auto custom-scrollbar flex flex-col"
                                        >
                                            {/* Бейдж роль + звёзды */}
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-brand-light uppercase tracking-wider text-xs font-semibold px-2 py-1 bg-brand/10 rounded-md">
                                                    {masterRole}
                                                </span>
                                                <div className="flex text-amber-400 gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className="w-3 h-3 fill-current" />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Имя */}
                                            <h2 className="text-4xl md:text-5xl font-serif text-white mb-6">{masterName}</h2>

                                            {/* Опыт работы */}
                                            <div className="flex flex-wrap gap-6 mb-8 border-y border-border py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-text-muted text-xs uppercase tracking-wide">Опыт работы</span>
                                                    <span className="text-white font-medium flex items-center gap-2">
                                                        <Award className="w-4 h-4 text-brand-light" />
                                                        {experienceText}
                                                    </span>
                                                </div>
                                                {master.position && master.position !== masterRole && (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-text-muted text-xs uppercase tracking-wide">Должность</span>
                                                        <span className="text-white font-medium">{master.position}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* О мастере */}
                                            {masterBio && (
                                                <div className="mb-8">
                                                    <h4 className="text-lg font-medium text-white mb-3">О мастере</h4>
                                                    <p className="text-text-secondary leading-relaxed text-sm md:text-base whitespace-pre-line">
                                                        {masterBio}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Специализация / услуги */}
                                            <div className="mb-6">
                                                <h4 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                                                    <Scissors className="w-5 h-5 text-brand-light" /> Специализация
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {masterServices.length > 0 ? (
                                                        masterServices.map(s => (
                                                            <span key={s.id} className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-border bg-neutral-bg1 text-text-secondary">
                                                                {s.name}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-border bg-neutral-bg1 text-text-secondary">
                                                            {masterRole}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Контакты */}
                                            {(master.phone || master.email || master.address) && (
                                                <div className="mb-8 space-y-2">
                                                    {master.phone && (
                                                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                                                            <Phone className="w-4 h-4 text-brand-light shrink-0" />
                                                            <span>{master.phone}</span>
                                                        </div>
                                                    )}
                                                    {master.email && (
                                                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                                                            <Mail className="w-4 h-4 text-brand-light shrink-0" />
                                                            <span>{master.email}</span>
                                                        </div>
                                                    )}
                                                    {master.address && (
                                                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                                                            <MapPin className="w-4 h-4 text-brand-light shrink-0" />
                                                            <span>{master.address}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Кнопка перейти к услугам */}
                                            <div className="mt-auto pt-6 border-t border-border">
                                                <Button
                                                    size="lg"
                                                    className="w-full bg-brand hover:bg-brand-light text-white shadow-[0_0_20px_rgba(130,81,238,0.3)] transition-all"
                                                    onClick={() => setShowServices(true)}
                                                >
                                                    Перейти к услугам
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="services"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                            className="p-8 md:p-12 h-full flex flex-col"
                                        >
                                            <div className="mb-6 flex-shrink-0">
                                                <button
                                                    onClick={() => setShowServices(false)}
                                                    className="text-sm text-brand-light flex items-center gap-1 hover:text-white transition-colors mb-4"
                                                >
                                                    <ArrowLeft className="w-4 h-4" /> Назад к профилю
                                                </button>
                                                <h3 className="text-3xl font-serif text-white">Услуги мастера</h3>
                                                <p className="text-sm text-text-secondary mt-1">Отметьте одну или несколько услуг для записи</p>
                                            </div>

                                            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
                                                {displayServices.length === 0 ? (
                                                    <p className="text-text-secondary text-sm text-center py-8">У мастера пока нет услуг</p>
                                                ) : (
                                                    displayServices.map(service => (
                                                        <div
                                                            key={service.id}
                                                            onClick={() => toggleService(service.id)}
                                                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                                                localSelectedServices.includes(service.id)
                                                                    ? 'bg-brand/10 border-brand-light'
                                                                    : 'bg-neutral-bg3 border-border hover:border-brand-light/50'
                                                            }`}
                                                        >
                                                            <div>
                                                                <h5 className="text-white font-medium mb-1">{service.name}</h5>
                                                                <div className="flex items-center gap-3 text-xs text-text-secondary">
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        {service.duration} мин
                                                                    </span>
                                                                    {service.category && (
                                                                        <span className="px-2 py-0.5 rounded bg-neutral-bg1 text-text-muted">
                                                                            {service.category}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 ml-3 shrink-0">
                                                                <span className="text-white text-sm font-medium">{Number(service.price).toLocaleString('ru-RU')} ₸</span>
                                                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                                                                    localSelectedServices.includes(service.id)
                                                                        ? 'bg-brand-light border-brand-light text-white'
                                                                        : 'border-border text-transparent'
                                                                }`}>
                                                                    <Check className="w-4 h-4" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            <div className="mt-6 pt-6 border-t border-border flex-shrink-0">
                                                <Button
                                                    size="lg"
                                                    className="w-full"
                                                    disabled={localSelectedServices.length === 0}
                                                    onClick={handleContinueBooking}
                                                >
                                                    {localSelectedServices.length > 0
                                                        ? `Продолжить • ${selectedPrice.toLocaleString('ru-RU')} ₸`
                                                        : 'Выберите услугу'}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
