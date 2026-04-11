import { useBookingStore } from '../../../store/useBookingStore';
import { useDataStore } from '../../../store/useDataStore';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

export function MasterSelection() {
    const setMaster = useBookingStore(state => state.setMaster);
    const selectedServices = useBookingStore(state => state.selectedServices);
    const { employees } = useDataStore();

    // Фильтруем мастеров: показываем только тех, кто выполняет хотя бы одну из выбранных услуг
    const availableMasters = employees.filter(emp => {
        if (selectedServices.length === 0) return true;
        return selectedServices.some(serviceId => emp.serviceIds.includes(serviceId));
    });

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
        >
            <div className="mb-4">
                <h3 className="text-2xl font-serif text-white mb-2">Выберите мастера</h3>
                <p className="text-sm text-text-secondary">К кому бы вы хотели записаться?</p>
            </div>

            <button
                onClick={() => setMaster(null)}
                className="w-full p-4 rounded-xl glass border-brand/30 hover:bg-brand/10 hover:border-brand/50 transition-colors text-center text-brand-light font-medium mb-2"
            >
                Любой свободный мастер
            </button>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {availableMasters.map((master) => (
                    <button
                        key={master.id}
                        onClick={() => setMaster(master.id)}
                        className="group flex flex-col items-center gap-3 p-4 rounded-xl glass hover:bg-white/[0.08] transition-colors"
                    >
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-brand-light transition-colors bg-white/[0.05] flex items-center justify-center">
                            {master.image_url || master.avatar_url ? (
                                <img
                                    src={master.image_url || master.avatar_url || ''}
                                    alt={`${master.first_name} ${master.last_name}`}
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                                />
                            ) : (
                                <User className="w-8 h-8 text-text-muted" />
                            )}
                        </div>
                        <div className="text-center">
                            <h4 className="font-medium text-white text-sm">{master.first_name}</h4>
                            <p className="text-xs text-text-muted">{master.position || master.specialization || 'Мастер'}</p>
                        </div>
                    </button>
                ))}
            </div>

            {availableMasters.length === 0 && (
                <div className="p-6 rounded-2xl glass text-center flex flex-col items-center gap-2">
                    <span className="text-2xl">😔</span>
                    <p className="text-white text-sm font-medium">Мастера пока не добавлены</p>
                    <p className="text-text-muted text-xs">Попробуйте позже</p>
                </div>
            )}
        </motion.div>
    );
}
