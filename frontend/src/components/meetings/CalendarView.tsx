import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface AppointmentRecord {
    id: string;
    appointment_date: string;
    start_time: string;
    status: string;
    client_name: string;
}

export function CalendarView() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAppointmentsForMonth(currentDate);
    }, [currentDate]);

    const fetchAppointmentsForMonth = async (date: Date) => {
        setLoading(true);
        try {
            const start = format(startOfWeek(startOfMonth(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
            const end = format(endOfWeek(endOfMonth(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');

            const { data, error } = await supabase
                .from('appointments')
                .select('id, appointment_date, start_time, status, client_name')
                .gte('appointment_date', start)
                .lte('appointment_date', end);

            if (error) throw error;
            setAppointments(data as AppointmentRecord[]);
        } catch (error) {
            console.error('Error fetching calendar appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const renderHeader = () => {
        return (
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
                <div className="flex gap-2 text-sm">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-400"></div> Ожидают</div>
                    <div className="flex items-center gap-1.5 ml-2"><div className="w-3 h-3 rounded-full bg-green-400"></div> Завершено</div>
                </div>
            </div>
        );
    };

    const renderDays = () => {
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

        const dateFormat = 'd';
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = '';

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);

                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                const dayStr = format(day, 'yyyy-MM-dd');

                const dayAppointments = appointments.filter(a => a.appointment_date === dayStr);

                // Show max 3 appointments per day in the tiny box
                const displayedApps = dayAppointments.slice(0, 3);
                const moreCount = dayAppointments.length - 3;

                days.push(
                    <div
                        key={day.toString()}
                        className={`min-h-[120px] p-2 border-b border-r border-neutral-border/50 relative group transition-colors hover:bg-neutral-bg3/20 cursor-pointer
                            ${!isCurrentMonth ? 'bg-neutral-bg3/10 opacity-60' : ''}
                            ${i === 6 ? 'border-r-0' : ''}`}
                    >
                        <div className="flex justify-between items-start">
                            <span className={`flex items-center justify-center w-7 h-7 text-sm rounded-full ${isToday ? 'bg-primary text-white font-bold shadow-md' : 'text-neutral-text2'}`}>
                                {formattedDate}
                            </span>
                        </div>

                        <div className="mt-2 flex flex-col gap-1.5 overflow-hidden">
                            {displayedApps.map(app => {
                                const isCompleted = app.status === 'completed';
                                const isCancelled = app.status === 'cancelled';
                                const colorClass = isCompleted ? 'bg-green-400/10 text-green-400 border-green-400/20' :
                                    isCancelled ? 'bg-red-400/10 text-red-500 border-red-400/20 line-through opacity-70' :
                                        'bg-blue-400/10 text-blue-400 border-blue-400/20';

                                return (
                                    <div key={app.id} className={`text-[10px] px-1.5 py-1 rounded border truncate font-medium ${colorClass}`} title={`${app.start_time.substring(0, 5)} - ${app.client_name}`}>
                                        {app.start_time.substring(0, 5)} {app.client_name}
                                    </div>
                                );
                            })}
                            {moreCount > 0 && (
                                <div className="text-[10px] text-neutral-text3 font-medium px-1">
                                    Ещё {moreCount}...
                                </div>
                            )}
                        </div>
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

    return (
        <div className="flex flex-col h-full bg-neutral-bg2 rounded-xl border border-neutral-border p-6 relative">
            {loading && (
                <div className="absolute inset-0 bg-neutral-bg1/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}
            {renderHeader()}
            <div className="flex-1 bg-neutral-bg3/20 border border-neutral-border rounded-xl overflow-hidden shadow-inner">
                {renderDays()}
                {renderCells()}
            </div>
        </div>
    );
}
