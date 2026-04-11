import { useState, useMemo, useEffect } from 'react';
import { useBookingStore } from '../../../store/useBookingStore';
import { useDataStore } from '../../../store/useDataStore';
import { motion } from 'framer-motion';
import { format, startOfDay, isSameDay, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '../../ui/Button';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { supabase } from '../../../lib/supabase';

// Конвертирует JS getDay() (0=Вс, 1=Пн, ..., 6=Сб) в наш формат (1=Пн, ..., 7=Вс)
function jsDayToDbDay(jsDay: number): number {
    return jsDay === 0 ? 7 : jsDay;
}

function timeToMinutes(time?: string | null): number {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

// Генерирует слоты каждые 30 минут между start и end
function generateTimeSlots(
    startTime: string,
    endTime: string,
    stepMinutes: number = 30
): string[] {
    const slots: string[] = [];
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    for (let m = startMin; m < endMin; m += stepMinutes) {
        const hour = Math.floor(m / 60);
        const min = m % 60;
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
    return slots;
}

// Дефолтные слоты, если расписание не задано
const DEFAULT_START = '09:00';
const DEFAULT_END = '21:00';

export function DateTimeSelection() {
    const setDateTime = useBookingStore(state => state.setDateTime);
    const selectedDateFromStore = useBookingStore(state => state.dateTime);
    const masterId = useBookingStore(state => state.masterId);
    const selectedServices = useBookingStore(state => state.selectedServices);
    const { schedules, employees, services } = useDataStore();

    const [selectedDate, setSelectedDate] = useState<Date>(selectedDateFromStore || new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(
        selectedDateFromStore ? format(selectedDateFromStore, 'HH:mm') : null
    );
    const [bookedSlots, setBookedSlots] = useState<any[]>([]);

    useEffect(() => {
        let isMounted = true;
        const fetchAppointments = async () => {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const { data, error } = await supabase
                .from('appointments')
                .select('start_time, end_time, employee_id')
                .eq('appointment_date', dateStr)
                .neq('status', 'cancelled');
                
            if (error) {
                console.error('Error fetching appointments:', error);
                return;
            }
            if (isMounted && data) {
                setBookedSlots(data);
            }
        };
        fetchAppointments();
        return () => { isMounted = false; };
    }, [selectedDate]);

    // Вычисляем суммарную продолжительность выбранных услуг
    const totalDuration = useMemo(() => {
        return services
            .filter(s => selectedServices.includes(s.id))
            .reduce((acc, s) => acc + (s.duration_minutes || 30), 0) || 30; // 30 минут по умолчанию
    }, [services, selectedServices]);

    // Получаем расписание выбранного мастера
    const masterSchedule = useMemo(() => {
        if (!masterId) return null;
        return schedules.filter(s => s.employee_id === masterId);
    }, [masterId, schedules]);

    // Определяем, какие дни недели являются выходными для мастера
    const disabledDaysOfWeek = useMemo(() => {
        if (!masterSchedule || masterSchedule.length === 0) return [];
        const offDays: number[] = [];
        masterSchedule.forEach(s => {
            if (!s.is_working) {
                // Конвертируем из нашего формата (1=Пн...7=Вс) в JS формат (0=Вс, 1=Пн...6=Сб)
                offDays.push(s.day_of_week === 7 ? 0 : s.day_of_week);
            }
        });
        return offDays;
    }, [masterSchedule]);

    // Расписание для выбранного дня
    const daySchedule = useMemo(() => {
        if (!masterSchedule || masterSchedule.length === 0) return null;
        const dbDay = jsDayToDbDay(getDay(selectedDate));
        return masterSchedule.find(s => s.day_of_week === dbDay) || null;
    }, [masterSchedule, selectedDate]);

    // Генерируем сырые слоты времени перед фильтрацией (базово)
    const timeSlots = useMemo(() => {
        if (!masterId) {
            // Если выбран "Любой мастер", находим крайнее время начала и окончания среди всех работающих
            const dbDay = jsDayToDbDay(getDay(selectedDate));
            const workingSchedules = schedules.filter(s => s.day_of_week === dbDay && s.is_working);
            
            if (workingSchedules.length === 0) return [];
            
            let minStart = 24 * 60;
            let maxEnd = 0;
            workingSchedules.forEach(s => {
                const start = timeToMinutes(s.start_time || DEFAULT_START);
                const end = timeToMinutes(s.end_time || DEFAULT_END);
                if (start < minStart) minStart = start;
                if (end > maxEnd) maxEnd = end;
            });
            
            const sh = Math.floor(minStart / 60);
            const sm = minStart % 60;
            const eh = Math.floor(maxEnd / 60);
            const em = maxEnd % 60;
            const startTimeStr = `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}`;
            const endTimeStr = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
            
            return generateTimeSlots(startTimeStr, endTimeStr);
        } else {
            if (!daySchedule || !daySchedule.is_working) return [];
            return generateTimeSlots(
                daySchedule.start_time || DEFAULT_START,
                daySchedule.end_time || DEFAULT_END
            );
        }
    }, [daySchedule, masterId, selectedDate, schedules]);

    const isSlotAvailable = (slotTime: string) => {
        const slotStart = timeToMinutes(slotTime);
        const slotEnd = slotStart + totalDuration;

        // Вариант 1: Любой свободный мастер
        if (!masterId) {
            const dbDay = jsDayToDbDay(getDay(selectedDate));
            const workingSchedules = schedules.filter(s => s.day_of_week === dbDay && s.is_working);
            
            if (workingSchedules.length === 0) return false;

            let busyMastersCount = 0;

            for (const schedule of workingSchedules) {
                const empId = schedule.employee_id;
                
                const masterStart = timeToMinutes(schedule.start_time || DEFAULT_START);
                const masterEnd = timeToMinutes(schedule.end_time || DEFAULT_END);
                let isOutsideWorkHours = slotStart < masterStart || slotEnd > masterEnd;
                
                if (schedule.break_start && schedule.break_end) {
                    const bStart = timeToMinutes(schedule.break_start);
                    const bEnd = timeToMinutes(schedule.break_end);
                    if (Math.max(slotStart, bStart) < Math.min(slotEnd, bEnd)) {
                        isOutsideWorkHours = true;
                    }
                }

                if (isOutsideWorkHours) {
                    busyMastersCount++;
                    continue; 
                }

                // Проверяем брони мастера
                const masterBookings = bookedSlots.filter(b => b.employee_id === empId);
                const hasBookingOverlap = masterBookings.some(b => {
                    const bStart = timeToMinutes(b.start_time);
                    const bEnd = timeToMinutes(b.end_time);
                    return Math.max(slotStart, bStart) < Math.min(slotEnd, bEnd);
                });

                if (hasBookingOverlap) {
                    busyMastersCount++;
                }
            }

            // Если занятых мастеров меньше, чем всех вышедших в смену, то слот свободен
            return busyMastersCount < workingSchedules.length;
        }

        // Вариант 2: Выбран конкретный мастер
        if (daySchedule) {
            const masterEnd = timeToMinutes(daySchedule.end_time || DEFAULT_END);
            // Если выбранная услуга не успевает завершиться до конца смены
            if (slotEnd > masterEnd) return false;

            if (daySchedule.break_start && daySchedule.break_end) {
                const bStart = timeToMinutes(daySchedule.break_start);
                const bEnd = timeToMinutes(daySchedule.break_end);
                // Если пересекается с обедом
                if (Math.max(slotStart, bStart) < Math.min(slotEnd, bEnd)) {
                    return false;
                }
            }
        }

        const masterBookings = bookedSlots.filter(b => b.employee_id === masterId);
        
        const hasOverlap = masterBookings.some(b => {
            const bStart = timeToMinutes(b.start_time);
            const bEnd = timeToMinutes(b.end_time);
            return Math.max(slotStart, bStart) < Math.min(slotEnd, bEnd);
        });

        return !hasOverlap;
    };

    // Фильтрация для текущего дня (убираем прошедшие часы и проверяем доступность)
    const now = new Date();
    const isToday = isSameDay(selectedDate, now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const availableTimeSlots = timeSlots.filter(time => {
        if (isToday) {
            const [hour, min] = time.split(':').map(Number);
            // Оставляем запас в 30 минут для записи "день в день"
            if (hour * 60 + min <= currentHour * 60 + currentMinute + 30) {
                return false;
            }
        }
        return isSlotAvailable(time);
    });

    const handleContinue = () => {
        if (selectedTime && selectedDate) {
            const [hours, minutes] = selectedTime.split(':');
            const finalDateTime = new Date(selectedDate);
            finalDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            setDateTime(finalDateTime);
        }
    };

    // Информация о выбранном мастере для UI
    const selectedMaster = masterId ? employees.find(e => e.id === masterId) : null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
        >
            <div>
                <h3 className="text-2xl font-serif text-white mb-2">Дата и Время</h3>
                <p className="text-sm text-text-secondary">
                    {selectedMaster
                        ? `Расписание мастера ${selectedMaster.first_name}`
                        : 'Укажите удобное для вас время визита'}
                </p>
            </div>

            {/* Классический календарь */}
            <div className="flex justify-center glass rounded-2xl p-4 border-brand/20">
                <style>{`
                    .rdp {
                        --rdp-cell-size: 40px;
                        --rdp-accent-color: #8251EE;
                        --rdp-background-color: rgba(130, 81, 238, 0.15);
                        --rdp-accent-color-dark: #8251EE;
                        --rdp-background-color-dark: rgba(255, 255, 255, 0.08);
                        --rdp-outline: 2px solid #8251EE;
                        --rdp-outline-selected: 2px solid #A37EF5;
                        margin: 0;
                    }
                    .rdp-day {
                        color: #a1a1aa;
                        border-radius: 0.75rem;
                        transition: all 0.2s ease;
                    }
                    .rdp-day:hover:not(.rdp-day_disabled) {
                        background-color: rgba(255, 255, 255, 0.08);
                        color: #ffffff;
                    }
                    .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
                        background-color: var(--rdp-accent-color);
                        color: white;
                        font-weight: 600;
                        box-shadow: 0 0 20px rgba(130, 81, 238, 0.3);
                    }
                    .rdp-day_today:not(.rdp-day_selected) {
                        font-weight: bold;
                        color: #fff;
                        background-color: rgba(255,255,255,0.05);
                    }
                    .rdp-day_disabled {
                        color: #3f3f46 !important;
                        text-decoration: line-through;
                        opacity: 0.4;
                    }
                    .rdp-button:focus-visible:not([disabled]) {
                        background-color: var(--rdp-background-color);
                        border: var(--rdp-outline);
                    }
                    .rdp-nav_button {
                        color: #a1a1aa;
                    }
                    .rdp-nav_button:hover {
                        background-color: rgba(255,255,255,0.08);
                        color: #fff;
                    }
                    .rdp-caption_label {
                        color: #fff;
                        font-weight: 500;
                        font-size: 1.1rem;
                    }
                    .rdp-head_cell {
                        color: #71717a;
                        font-weight: 500;
                        text-transform: uppercase;
                        font-size: 0.75rem;
                    }
                `}</style>
                <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                        if (date) {
                            setSelectedDate(date);
                            setSelectedTime(null);
                        }
                    }}
                    locale={ru}
                    disabled={[
                        { before: startOfDay(new Date()) },
                        // Блокируем выходные дни мастера
                        ...(disabledDaysOfWeek.length > 0
                            ? [{ dayOfWeek: disabledDaysOfWeek }]
                            : [])
                    ]}
                    showOutsideDays
                />
            </div>

            {/* Информация о расписании */}
            {daySchedule && daySchedule.is_working && (
                <div className="flex items-center gap-3 text-xs text-text-muted glass rounded-xl px-4 py-2 border-brand/10">
                    <span>🕐 Работает: {daySchedule.start_time} – {daySchedule.end_time}</span>
                    {daySchedule.break_start && daySchedule.break_end && (
                        <span>| 🍽 Обед: {daySchedule.break_start} – {daySchedule.break_end}</span>
                    )}
                </div>
            )}

            {/* Слоты времени */}
            {availableTimeSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {availableTimeSlots.map((time) => (
                        <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`p-3 rounded-xl transition-all font-medium text-sm ${selectedTime === time
                                ? 'bg-brand text-white shadow-glow border border-brand'
                                : 'glass text-text-secondary border-transparent hover:text-white hover:border-brand/30'
                                }`}
                        >
                            {time}
                        </button>
                    ))}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl glass border border-amber-500/20 bg-amber-500/5 text-center flex flex-col items-center gap-2"
                >
                    <span className="text-2xl">⏰</span>
                    <p className="text-amber-200/90 text-sm font-medium">
                        {daySchedule && !daySchedule.is_working
                            ? 'В этот день мастер не работает.'
                            : 'На сегодня свободных окон больше нет.'}
                    </p>
                    <p className="text-text-muted text-xs">
                        Пожалуйста, выберите другую дату в календаре.
                    </p>
                </motion.div>
            )}

            <Button
                className="w-full mt-4"
                size="lg"
                onClick={handleContinue}
                disabled={!selectedTime || !selectedDate}
            >
                Продолжить
            </Button>

        </motion.div>
    );
}

