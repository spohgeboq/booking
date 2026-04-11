import { useBookingStore } from '../../../store/useBookingStore';
import { useDataStore } from '../../../store/useDataStore';
import { motion } from 'framer-motion';
import { ChevronRight, Clock } from 'lucide-react';

export function ServiceSelection() {
    const { addService, selectedServices, masterId } = useBookingStore();
    const { services, employees } = useDataStore();

    // Если мастер уже выбран — ищем его в реальных данных
    const currentMaster = masterId ? employees.find(m => m.id === masterId) : null;

    const availableServices = services.filter(service => {
        // Убираем уже выбранные услуги
        if (selectedServices.includes(service.id)) return false;
        // Если мастер уже выбран, показываем только те услуги, которые он выполняет
        if (currentMaster && !currentMaster.serviceIds.includes(service.id)) return false;
        return true;
    });

    const isUpsell = selectedServices.length > 0 && currentMaster;

    // Форматирование длительности
    const formatDuration = (minutes: number) => {
        if (minutes >= 60) {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
        }
        return `${minutes} мин`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
        >
            <div className="mb-4">
                <h3 className="text-2xl font-serif text-white mb-2">
                    {isUpsell ? `Дополнительные услуги` : 'Выберите услугу'}
                </h3>
                <p className="text-sm text-text-secondary">
                    {isUpsell
                        ? `Что еще может сделать для вас ${currentMaster?.first_name}?`
                        : 'Укажите желаемую процедуру для бронирования'}
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {availableServices.length > 0 ? availableServices.map((service) => (
                    <button
                        key={service.id}
                        onClick={() => addService(service.id)}
                        className="group flex items-center justify-between p-4 rounded-xl glass hover:bg-white/[0.08] transition-colors text-left"
                    >
                        <div>
                            <h4 className="font-medium text-white group-hover:text-brand-light transition-colors">{service.name}</h4>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs text-brand-light font-medium">от {service.price.toLocaleString()} ₸</span>
                                <span className="text-xs text-text-muted flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(service.duration)}</span>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-white transition-colors" />
                    </button>
                )) : (
                    <div className="p-6 rounded-2xl glass text-center flex flex-col items-center gap-2">
                        <span className="text-2xl">✨</span>
                        <p className="text-white text-sm font-medium">Вы выбрали все доступные услуги.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
