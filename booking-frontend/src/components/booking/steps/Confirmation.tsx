import { useState } from 'react';
import { useBookingStore } from '../../../store/useBookingStore';
import { useDataStore } from '../../../store/useDataStore';
import { api } from '../../../lib/api';
import { motion } from 'framer-motion';
import { Button } from '../../ui/Button';
import { CheckCircle2, Calendar, User, AlignLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function Confirmation() {
    const { dateTime, clientDetails, masterId, selectedServices, closeBooking, resetBooking, setStep, removeService, addAppointment } = useBookingStore();
    const { services, employees } = useDataStore();
    const [isConfirmed, setIsConfirmed] = useState(false);

    const currentServices = services.filter(s => selectedServices.includes(s.id));
    const selectedMaster = employees.find(m => m.id === masterId);

    // Считаем общую сумму (Number() т.к. price приходит из БД как строка)
    const totalPrice = currentServices.reduce((acc, s) => acc + (Number(s.price) || 0), 0);

    const handleClose = () => {
        closeBooking();
        // Небольшая задержка перед сбросом стейта, чтобы анимация скрытия модалки была плавной
        setTimeout(() => resetBooking(), 500);
    };

    const handleConfirm = async () => {
        if (dateTime && clientDetails && selectedServices.length > 0) {
            
            // Сохраняем в API с учетом того, что у нас может быть несколько услуг
            const serviceIdToSave = selectedServices[0]; 
            const endDateTime = new Date(dateTime.getTime() + (currentServices.reduce((acc, s) => acc + (Number(s.duration_minutes) || 30), 0) * 60000));
            
            try {
                const insertedData = await api.appointments.create({
                    client_name: clientDetails.name,
                    client_phone: clientDetails.phone,
                    appointment_date: format(dateTime, 'yyyy-MM-dd'),
                    start_time: format(dateTime, 'HH:mm:ss'),
                    end_time: format(endDateTime, 'HH:mm:ss'),
                    service_id: serviceIdToSave || null,
                    employee_id: masterId || null,
                    actual_price: totalPrice,
                    status: 'scheduled'
                });

                // Сохраняем локально с UUID из базы для возможности отмены
                addAppointment({
                    date: dateTime,
                    selectedServices,
                    masterId,
                    clientName: clientDetails.name,
                    clientPhone: clientDetails.phone,
                    // Используем UUID из базы, если доступен
                    ...(insertedData?.id ? { dbId: insertedData.id } : {})
                });

                // Отправляем Telegram-уведомление админу (в фоне, не блокируем UX)
                api.appointments.notifyBooking({
                    client_name: clientDetails.name,
                    client_phone: clientDetails.phone,
                    service_name: currentServices.map(s => s.name).join(', '),
                    master_name: selectedMaster ? `${selectedMaster.first_name} ${selectedMaster.last_name}`.trim() : 'Любой свободный',
                    appointment_date: format(dateTime, 'yyyy-MM-dd'),
                    start_time: format(dateTime, 'HH:mm:ss'),
                    end_time: format(endDateTime, 'HH:mm:ss'),
                    total_price: totalPrice > 0 ? totalPrice.toLocaleString('ru-RU') : null,
                }).catch(err => console.error('Ошибка отправки уведомления:', err));

            } catch (err) {
                console.error('Ошибка сохранения:', err);
                // Сохраняем локально даже если база упала
                addAppointment({
                    date: dateTime,
                    selectedServices,
                    masterId,
                    clientName: clientDetails.name,
                    clientPhone: clientDetails.phone
                });
            }
            setIsConfirmed(true);
        }
    };

    const handleAddService = () => {
        setStep('SERVICE_SELECTION');
    };

    const handleRemoveService = (serviceId: string) => {
        if (selectedServices.length === 1) {
            // Если пытаются удалить последнюю услугу, возвращаем на шаг выбора
            setStep('SERVICE_SELECTION');
            resetBooking();
        } else {
            removeService(serviceId);
        }
    };

    if (isConfirmed) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-6 text-center gap-6"
            >
                <div className="w-20 h-20 rounded-full bg-brand/20 flex items-center justify-center text-brand-light mb-2">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                    <h3 className="text-3xl font-serif text-white mb-2">Ждём вас!</h3>
                    <p className="text-text-secondary">Ваша запись успешно подтверждена, {clientDetails?.name}.</p>
                </div>
                <Button className="w-full" size="lg" onClick={handleClose}>
                    Отлично
                </Button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-6 text-center gap-6"
        >
            <div className="w-20 h-20 rounded-full bg-brand/20 flex items-center justify-center text-brand-light mb-2">
                <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
                <h3 className="text-3xl font-serif text-white mb-2">Сводка записи</h3>
                <p className="text-text-secondary">Почти готово, {clientDetails?.name}. Проверьте детали.</p>
            </div>

            <div className="w-full glass rounded-2xl p-6 flex flex-col gap-4 text-left my-2 border-brand/20 relative">
                <div className="flex items-center gap-4 text-white">
                    <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center text-text-muted">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">
                            {dateTime ? format(dateTime, 'd MMMM, EEEE', { locale: ru }) : ''}
                        </p>
                        <p className="text-lg font-bold text-brand-light">
                            {dateTime ? format(dateTime, 'HH:mm') : ''}
                        </p>
                    </div>
                </div>

                <div className="h-[1px] w-full bg-border-subtle my-1" />

                <div className="flex items-center gap-4 text-text-secondary text-sm">
                    <User className="w-4 h-4" />
                    <span>Мастер: {selectedMaster ? `${selectedMaster.first_name} ${selectedMaster.last_name}` : 'Любой свободный'}</span>
                </div>

                <div className="h-[1px] w-full bg-border-subtle my-1" />

                {/* Список услуг (Корзина) */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4 text-text-secondary text-sm mb-1">
                        <AlignLeft className="w-4 h-4" />
                        <span>Выбранные услуги:</span>
                    </div>

                    {currentServices.map(service => (
                        <div key={service.id} className="flex items-center justify-between text-white text-sm bg-white/[0.03] p-3 rounded-xl border border-white/5">
                            <span className="font-medium">{service.name}</span>
                            <div className="flex items-center gap-4">
                                <span className="text-brand-light font-medium">{Number(service.price || 0).toLocaleString('ru-RU')} ₸</span>
                                <button
                                    onClick={() => handleRemoveService(service.id)}
                                    className="text-text-muted hover:text-red-400 transition-colors p-1"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Кнопка Upsell */}
                    <button
                        onClick={handleAddService}
                        className="w-full py-3 mt-2 border border-dashed border-brand/50 rounded-xl text-brand text-sm font-medium hover:bg-brand/5 hover:border-brand transition-colors"
                    >
                        + Добавить еще услугу
                    </button>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-subtle">
                        <span className="text-text-secondary font-medium">К оплате в салоне:</span>
                        <span className="text-xl font-bold text-white">{totalPrice.toLocaleString('ru-RU')} ₸</span>
                    </div>
                </div>
            </div>

            <Button className="w-full mt-2" size="lg" onClick={handleConfirm}>
                Подтвердить и завершить
            </Button>
        </motion.div>
    );


}
