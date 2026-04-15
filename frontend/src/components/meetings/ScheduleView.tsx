import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { format, addDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface ScheduleAppointment {
    id: string;
    start_time: string;
    end_time: string;
    client_name: string;
    status: string;
    services: { name: string } | null;
    employees: { first_name: string; last_name: string } | null;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 9); // 9:00 - 21:00

export function ScheduleView() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [appointments, setAppointments] = useState<ScheduleAppointment[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAppointmentsForDate(selectedDate);
    }, [selectedDate]);

    const fetchAppointmentsForDate = async (date: Date) => {
        setLoading(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const data = await api.appointments.getAll({
                date: dateStr
            });

            setAppointments(data as any as ScheduleAppointment[]);
        } catch (error: any) {
            toast.error('Ошибка при загрузке расписания: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const nextDay = () => setSelectedDate(addDays(selectedDate, 1));
    const prevDay = () => setSelectedDate(subDays(selectedDate, 1));
    const goToToday = () => setSelectedDate(new Date());

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-400/20 text-green-400 border-green-400/30';
            case 'confirmed': return 'bg-blue-400/20 text-blue-400 border-blue-400/30';
            case 'cancelled': return 'bg-red-400/20 text-red-400 border-red-400/30 line-through opacity-70';
            default: return 'bg-yellow-400/20 text-yellow-500 border-yellow-400/30';
        }
    };

    const timeToPixels = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const startHour = 9; // 9:00
        const totalMinutes = (hours - startHour) * 60 + minutes;
        return (totalMinutes / 60) * 80; // 80px per hour
    };

    const calculateHeight = (start: string, end: string) => {
        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);
        const durationMins = (eH * 60 + eM) - (sH * 60 + sM);
        return Math.max((durationMins / 60) * 80, 40); // min 40px height
    };

    return (
        <div className="flex flex-col h-full bg-neutral-bg2 rounded-xl border border-neutral-border p-6 relative">
            {loading && (
                <div className="absolute inset-0 bg-neutral-bg1/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={prevDay} className="p-2 hover:bg-neutral-bg3 border border-neutral-border rounded-lg transition-colors text-neutral-text2 hover:text-white">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center px-4 py-2 bg-neutral-bg3/50 rounded-lg border border-neutral-border">
                        <CalendarIcon className="w-5 h-5 mr-3 text-primary" />
                        <h2 className="text-lg font-bold text-neutral-text1 capitalize">
                            {format(selectedDate, 'd MMMM, eeee', { locale: ru })}
                        </h2>
                    </div>
                    <button onClick={nextDay} className="p-2 hover:bg-neutral-bg3 border border-neutral-border rounded-lg transition-colors text-neutral-text2 hover:text-white">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <button onClick={goToToday} className="px-4 py-2 text-sm font-medium text-neutral-text2 hover:text-white hover:bg-neutral-bg3 border border-neutral-border rounded-lg transition-colors">
                    Сегодня
                </button>
            </div>

            <div className="flex-1 bg-neutral-bg3/20 border border-neutral-border rounded-xl  shadow-inner relative h-[600px] overflow-y-auto custom-scrollbar">
                <div className="relative min-h-[1040px] p-4 text-sm font-medium"> {/* 13 hours * 80px */}

                    {/* Time Scale & Grid */}
                    {HOURS.map((hour, index) => (
                        <div key={hour} className="absolute left-0 right-0 border-t border-neutral-border/50 flex w-full" style={{ top: `${index * 80}px` }}>
                            <div className="w-16 text-right pr-4 text-neutral-text3 -mt-2.5 bg-neutral-bg2/50 backdrop-blur-sm z-10">
                                {hour.toString().padStart(2, '0')}:00
                            </div>
                            <div className="flex-1 border-l border-neutral-border/50 relative"></div>
                        </div>
                    ))}

                    {/* Timeline Current Time Indicator */}
                    {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && (
                        <div className="absolute left-16 right-0 border-t border-red-500 z-20" style={{ top: `${timeToPixels(format(new Date(), 'HH:mm'))}px` }}>
                            <div className="absolute -left-2 -top-1.5 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                        </div>
                    )}

                    {/* Appointments Blocks */}
                    <div className="absolute left-16 right-4 top-0 bottom-0 pl-4 py-0">
                        {appointments.map((app) => (
                            <div
                                key={app.id}
                                className={`absolute left-4 right-0 rounded-lg border p-3 flex flex-col justify-start shadow-lg transition-all hover:scale-[1.01] hover:z-30 cursor-pointer overflow-hidden backdrop-blur-md ${getStatusColor(app.status)}`}
                                style={{
                                    top: `${timeToPixels(app.start_time.substring(0, 5))}px`,
                                    height: `${calculateHeight(app.start_time.substring(0, 5), app.end_time.substring(0, 5))}px`,
                                    marginLeft: '10px',
                                    width: 'calc(100% - 20px)'
                                }}
                            >
                                <div className="flex justify-between items-start w-full">
                                    <span className="font-bold text-neutral-text1 truncate pr-2">{app.client_name || 'Без имени'}</span>
                                    <span className="text-xs font-semibold opacity-80 shrink-0 bg-black/20 px-1.5 py-0.5 rounded">
                                        {app.start_time.substring(0, 5)} - {app.end_time.substring(0, 5)}
                                    </span>
                                </div>
                                <div className="text-sm mt-1 opacity-90 truncate">
                                    {app.services?.name || 'Услуга удалена'}
                                </div>
                                <div className="text-xs mt-auto opacity-70">
                                    Мастер: {app.employees ? `${app.employees.first_name} ${app.employees.last_name}`.trim() : 'Любой'}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}
