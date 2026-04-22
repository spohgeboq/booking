import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, X, DollarSign, Users, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface AppointmentRecord {
    id: string;
    appointment_date: string;
    start_time: string;
    status: string;
    client_name: string;
    actual_price?: number;
    services?: { name: string; price: number };
    employees?: { first_name: string; last_name: string };
}

export function CalendarView() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useEffect(() => {
        fetchAppointmentsForMonth(currentDate);
    }, [currentDate]);

    const fetchAppointmentsForMonth = async (date: Date) => {
        setLoading(true);
        try {
            const start = format(startOfWeek(startOfMonth(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
            const end = format(endOfWeek(endOfMonth(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');

            const data = await api.appointments.getAll({
                start_date: start,
                end_date: end
            });

            setAppointments(data as AppointmentRecord[]);
        } catch (error: any) {
            console.error('Error fetching calendar appointments:', error);
            toast.error('Ошибка загрузки календаря');
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    // Stats
    const currentMonthAppointments = appointments.filter(a => isSameMonth(new Date(a.appointment_date), currentDate));
    const totalVisits = currentMonthAppointments.filter(a => ['scheduled', 'confirmed', 'completed'].includes(a.status)).length;
    const totalRevenue = currentMonthAppointments.filter(a => ['scheduled', 'confirmed', 'completed'].includes(a.status)).reduce((acc, a) => acc + (Number(a.actual_price) || Number(a.services?.price) || 0), 0);
    const totalCancellations = currentMonthAppointments.filter(a => a.status === 'cancelled').length;

    const getHeatmapColor = (count: number, isCurrentMonth: boolean) => {
        if (!isCurrentMonth) return 'bg-neutral-bg3/10 opacity-30';
        if (count === 0) return 'bg-neutral-bg3/20 border-transparent';
        if (count <= 2) return 'bg-brand/20 border-brand/30 text-brand-light';
        if (count <= 5) return 'bg-brand/40 border-brand/50 text-white';
        if (count <= 8) return 'bg-brand/60 border-brand/70 text-white font-bold';
        return 'bg-brand/80 border-brand text-white font-bold';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-400/10 text-green-400 border-green-400/20';
            case 'confirmed': return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
            case 'cancelled': return 'bg-red-400/10 text-red-400 border-red-400/20 line-through opacity-70';
            default: return 'bg-yellow-400/10 text-yellow-500 border-yellow-400/20';
        }
    };

    // Drag and Drop
    const handleDragStart = (e: React.DragEvent, appointmentId: string) => {
        e.dataTransfer.setData('appointmentId', appointmentId);
        // Optional: add custom drag image or styling
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, dropDate: Date) => {
        e.preventDefault();
        const appointmentId = e.dataTransfer.getData('appointmentId');
        if (!appointmentId) return;

        // Запрет переноса на прошедшую дату
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dropDate < today) {
            toast.error('Нельзя перенести запись на прошедшую дату');
            return;
        }

        const newDateStr = format(dropDate, 'yyyy-MM-dd');
        const appointment = appointments.find(a => a.id === appointmentId);
        
        if (!appointment) return;
        const oldDateStr = format(new Date(appointment.appointment_date), 'yyyy-MM-dd');
        if (oldDateStr === newDateStr) return; // та же дата

        try {
            // Оптимистичное обновление UI
            setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, appointment_date: newDateStr } : a));
            
            // Обновляем запись на бэкенде — ответ содержит полные данные с JOIN
            const updatedAppointment = await api.appointments.update(appointmentId, { appointment_date: newDateStr });
            
            // Синхронизируем state с реальными данными из БД
            setAppointments(prev => prev.map(a => a.id === appointmentId ? updatedAppointment : a));
            
            toast.success(`Запись перенесена на ${format(dropDate, 'd MMMM', { locale: ru })}`);

            // Отправляем Telegram-уведомление
            api.appointments.notifyReschedule({
                client_name: appointment.client_name,
                client_phone: (appointment as any).client_phone || '',
                service_name: appointment.services?.name || 'Услуга',
                master_name: appointment.employees
                    ? `${appointment.employees.first_name} ${appointment.employees.last_name}`.trim()
                    : 'Не указан',
                old_date: oldDateStr,
                new_date: newDateStr,
                start_time: appointment.start_time,
            }).catch((err: any) => console.warn('Telegram notify failed:', err));

        } catch (err: any) {
            toast.error('Не удалось перенести запись');
            fetchAppointmentsForMonth(currentDate); // Откатываем
        }
    };

    const renderDashboard = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-neutral-bg3/30 border border-neutral-border p-4 rounded-xl flex items-center justify-between">
                <div>
                    <p className="text-sm text-neutral-text2 font-medium">Всего визитов</p>
                    <p className="text-2xl font-bold text-white mt-1">{totalVisits}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                </div>
            </div>
            <div className="bg-neutral-bg3/30 border border-neutral-border p-4 rounded-xl flex items-center justify-between">
                <div>
                    <p className="text-sm text-neutral-text2 font-medium">Выручка (примерно)</p>
                    <p className="text-2xl font-bold text-brand-light mt-1">{totalRevenue.toLocaleString('ru-RU')} ₸</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-brand" />
                </div>
            </div>
            <div className="bg-neutral-bg3/30 border border-neutral-border p-4 rounded-xl flex items-center justify-between">
                <div>
                    <p className="text-sm text-neutral-text2 font-medium">Отмены</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">{totalCancellations}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-500" />
                </div>
            </div>
        </div>
    );

    const renderHeader = () => (
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-neutral-text1 flex items-center capitalize gap-3">
                <button onClick={prevMonth} className="p-2 hover:bg-neutral-bg3 rounded-full transition-colors text-neutral-text2 hover:text-white">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                {format(currentDate, 'LLLL yyyy', { locale: ru })}
                <button onClick={nextMonth} className="p-2 hover:bg-neutral-bg3 rounded-full transition-colors text-neutral-text2 hover:text-white">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </h2>
        </div>
    );

    const renderDaysContext = () => {
        const days = [];
        const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} className="text-center font-medium text-sm text-neutral-text3 uppercase tracking-wider py-3 border-b border-neutral-border">
                    {format(addDays(startDate, i), 'eeeeee', { locale: ru })}
                </div>
            );
        }
        return <div className="grid grid-cols-7 bg-neutral-bg3/30 rounded-t-xl">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        // Сегодня без времени для сравнения
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const currentIterationDay = day; // for closure
                const formattedDate = format(currentIterationDay, 'd');
                const isCurrentMonth = isSameMonth(currentIterationDay, monthStart);
                const isToday = isSameDay(currentIterationDay, new Date());
                const isPast = currentIterationDay < todayMidnight; // прошедшая дата
                const dayStr = format(currentIterationDay, 'yyyy-MM-dd');
                const isSelected = selectedDate && isSameDay(currentIterationDay, selectedDate);

                const dayAppointments = appointments.filter(a => format(new Date(a.appointment_date), 'yyyy-MM-dd') === dayStr);
                const count = dayAppointments.length;

                days.push(
                    <div
                        key={currentIterationDay.toString()}
                        onClick={() => setSelectedDate(currentIterationDay)}
                        onDragOver={isPast ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'none'; } : handleDragOver}
                        onDrop={isPast ? (e) => { e.preventDefault(); toast.error('Нельзя перенести запись на прошедшую дату'); } : (e) => handleDrop(e, currentIterationDay)}
                        className={`h-24 md:h-32 p-2 border-b border-r border-neutral-border/50 relative transition-all flex flex-col
                            ${isPast ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-brand/50'}
                            ${isSelected ? 'ring-2 ring-brand ring-inset bg-brand/5' : ''}
                            ${getHeatmapColor(count, isCurrentMonth)}
                            ${i === 6 ? 'border-r-0' : ''}`}
                    >
                        <span className={`block w-7 h-7 text-sm rounded-full flex items-center justify-center ${isToday ? 'bg-primary text-white font-bold shadow-md' : ''} ${isPast && !isToday ? 'text-neutral-text3 line-through' : ''}`}>
                            {formattedDate}
                        </span>
                        
                        {count > 0 && isCurrentMonth && (
                            <div className="mt-auto self-end md:self-center pb-1">
                                <span className="text-xs md:text-xl font-bold opacity-90 drop-shadow-sm">
                                    {count} {count === 1 ? 'запись' : count < 5 ? 'записи' : 'записей'}
                                </span>
                            </div>
                        )}

                        {/* Индикатор прошедшего дня */}
                        {isPast && isCurrentMonth && (
                            <div className="absolute inset-0 pointer-events-none rounded-sm" style={{ background: 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 5px)' }} />
                        )}
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7 border-x border-neutral-border/50 last:border-b last:rounded-b-xl" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div>{rows}</div>;
    };

    const renderSideDrawer = () => {
        if (!selectedDate) return null;
        const dayStr = format(selectedDate, 'yyyy-MM-dd');
        const dayAppointments = appointments.filter(a => format(new Date(a.appointment_date), 'yyyy-MM-dd') === dayStr);
        
        return (
            <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                className="absolute right-0 top-0 bottom-0 w-80 md:w-96 bg-neutral-bg2/95 backdrop-blur-3xl border-l border-neutral-border shadow-2xl z-20 flex flex-col rounded-r-xl overflow-hidden"
            >
                <div className="p-5 border-b border-neutral-border flex justify-between items-center bg-neutral-bg3/30">
                    <div>
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-brand" />
                            {format(selectedDate, 'd MMMM', { locale: ru })}
                        </h3>
                        <p className="text-sm text-neutral-text2 mt-1">{dayAppointments.length} записей</p>
                    </div>
                    <button 
                        onClick={() => setSelectedDate(null)} 
                        className="p-2 hover:bg-white/10 rounded-full text-neutral-text2 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3 custom-scrollbar">
                    {dayAppointments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center h-40 text-neutral-text3">
                            <CalendarIcon className="w-10 h-10 opacity-20 mb-3" />
                            <p>На этот день записей нет</p>
                        </div>
                    ) : (
                        dayAppointments.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(app => (
                            <div 
                                key={app.id} 
                                draggable 
                                onDragStart={(e) => handleDragStart(e, app.id)}
                                className={`p-4 rounded-xl border cursor-grab active:cursor-grabbing backdrop-blur-sm shadow flex flex-col gap-2 transition-transform hover:scale-[1.02] ${getStatusColor(app.status)}`}
                                title="Перетащите карточку на другой день в календаре, чтобы изменить дату"
                            >
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-sm">{app.client_name}</span>
                                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/20">
                                        {app.start_time.substring(0, 5)}
                                    </span>
                                </div>
                                <div className="text-sm opacity-90 truncate">
                                    {app.services?.name || 'Услуга'}
                                </div>
                                <div className="flex justify-between items-center text-xs opacity-70 mt-1">
                                    <span>{app.employees ? `${app.employees.first_name} ${app.employees.last_name}` : 'Любой мастер'}</span>
                                    {app.actual_price ? <span className="font-bold">{app.actual_price.toLocaleString('ru-RU')} ₸</span> : null}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {/* Drag hint */}
                {dayAppointments.length > 0 && (
                    <div className="p-3 text-center text-xs text-neutral-text3 bg-neutral-bg3/20 border-t border-neutral-border">
                        Совет: перетащите карточку на другой день, чтобы быстро изменить дату записи
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="flex flex-col h-full relative">
            {renderDashboard()}
            
            <div className="flex flex-col h-full bg-neutral-bg2 rounded-xl border border-neutral-border p-6 relative overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 bg-neutral-bg1/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                )}
                
                {renderHeader()}
                
                <div className="flex-1 bg-neutral-bg3/20 border border-neutral-border rounded-xl  shadow-inner relative grid grid-rows-[auto_1fr]">
                    {renderDaysContext()}
                    <div className="relative overflow-hidden w-full h-full pb-1">
                        {renderCells()}
                    </div>
                </div>

                <AnimatePresence>
                    {renderSideDrawer()}
                </AnimatePresence>
            </div>
        </div>
    );
}
