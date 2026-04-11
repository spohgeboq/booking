import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Calendar, User, Trash2, MapPin, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { useBookingStore } from '../../store/useBookingStore';
import { useDataStore } from '../../store/useDataStore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface AppointmentsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AppointmentsDrawer({ isOpen, onClose }: AppointmentsDrawerProps) {
    const { appointments, removeAppointment } = useBookingStore();
    const { services, employees, settings } = useDataStore();
    const [confirmingId, setConfirmingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    // Форматирование длительности
    const formatDuration = (minutes: number) => {
        if (minutes >= 60) {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
        }
        return `${minutes} мин`;
    };

    // Сортируем записи, чтобы новые были выше
    const sortedApts = [...appointments].reverse();

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex justify-end">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-neutral-bg1/80 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Drawer */}
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-sm sm:max-w-md bg-neutral-bg2 shadow-2xl h-[100dvh] flex flex-col border-l border-border z-10"
                >
                    <div className="p-6 border-b border-border-subtle flex items-center justify-between">
                        <h2 className="text-xl font-serif text-white">Мои записи {sortedApts.length > 0 && `(${sortedApts.length})`}</h2>
                        <button onClick={onClose} className="touch-target rounded-full hover:bg-white/5 text-text-secondary hover:text-white transition-colors bg-white/[0.03]">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide flex flex-col gap-4">
                        <AnimatePresence mode="popLayout">
                            {sortedApts.length > 0 ? (
                                sortedApts.map((apt) => {
                                    // Поддержка старых записей (serviceId) и новых (selectedServices)
                                    const aptServiceIds = apt.selectedServices || (apt.serviceId ? [apt.serviceId] : []);
                                    const currentServices = services.filter(s => aptServiceIds.includes(s.id));
                                    const master = employees.find(m => m.id === apt.masterId);
                                    const aptDate = new Date(apt.date);
                                    const totalPrice = currentServices.reduce((acc, s) => acc + (s.price || 0), 0);

                                    return (
                                        <motion.div
                                            key={apt.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="glass rounded-xl p-5 border-brand/20 relative"
                                        >
                                            <div className="absolute top-4 right-4 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                                                Активна
                                            </div>

                                            <div className="mb-4 pr-16 flex flex-col gap-2">
                                                {currentServices.map(service => (
                                                    <div key={service.id}>
                                                        <p className="text-lg font-serif text-white leading-tight">{service.name}</p>
                                                        <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                                                            <Clock className="w-3 h-3 text-brand-light" />
                                                            <span>{formatDuration(service.duration)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {currentServices.length === 0 && (
                                                    <p className="text-sm text-text-muted italic">Услуги были удалены</p>
                                                )}
                                                <div className="mt-2 text-brand-light font-medium">
                                                    Итого: {totalPrice.toLocaleString('ru-RU')} ₸
                                                </div>
                                            </div>

                                            <div className="h-[1px] w-full bg-border-subtle my-3" />

                                            <div className="flex flex-col gap-3 my-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-text-secondary text-sm">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>Дата и время</span>
                                                    </div>
                                                    <p className="text-white font-medium pl-6">
                                                        {format(aptDate, 'd MMMM, EE', { locale: ru })} в {format(aptDate, 'HH:mm')}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-text-secondary text-sm">
                                                        <User className="w-4 h-4" />
                                                        <span>Мастер</span>
                                                    </div>
                                                    <p className="text-white font-medium pl-6">
                                                        {master ? `${master.first_name} ${master.last_name}` : 'Любой свободный мастер'}
                                                    </p>
                                                </div>
                                                {settings?.address && (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 text-text-secondary text-sm">
                                                            <MapPin className="w-4 h-4" />
                                                            <span>Адрес</span>
                                                        </div>
                                                        <p className="text-white font-medium pl-6">{settings.address}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <AnimatePresence mode="wait">
                                                {confirmingId === apt.id ? (
                                                    <motion.div
                                                        key="confirm"
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="flex flex-col gap-3 bg-red-500/10 p-4 rounded-xl border border-red-500/20 overflow-hidden"
                                                    >
                                                        <p className="text-sm text-center font-medium text-white">Точно отменить запись?</p>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex-1 text-white hover:bg-white/10 border-white/20"
                                                                onClick={() => setConfirmingId(null)}
                                                            >
                                                                Оставить
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
                                                                onClick={() => {
                                                                    removeAppointment(apt.id);
                                                                    setConfirmingId(null);
                                                                }}
                                                            >
                                                                Удалить
                                                            </Button>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="button"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                    >
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50"
                                                            onClick={() => setConfirmingId(apt.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" /> Отменить запись
                                                        </Button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center text-center h-[50vh] text-text-muted gap-4"
                                >
                                    <Calendar className="w-12 h-12 opacity-50" />
                                    <div className="max-w-[200px]">
                                        <p className="font-medium text-white text-lg">Нет активных записей</p>
                                        <p className="text-sm mt-2 mb-6 text-text-secondary">У вас пока нет оформленных заявок.</p>
                                        <Button size="sm" onClick={() => {
                                            onClose();
                                            useBookingStore.getState().openBooking();
                                        }}>
                                            Записаться онлайн
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div >
        </AnimatePresence >,
        document.body
    );
}
