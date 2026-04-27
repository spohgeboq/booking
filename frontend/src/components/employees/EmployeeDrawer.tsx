import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Users, Loader2, X, Check, Calendar, Copy, Clock, DollarSign, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// ========== ИНТЕРФЕЙСЫ ==========
const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export interface ScheduleDay {
    day_of_week: number;
    is_working: boolean;
    start_time: string;
    end_time: string;
    break_start: string;
    break_end: string;
}

const defaultScheduleDay = (day: number): ScheduleDay => ({
    day_of_week: day,
    is_working: day <= 5,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '',
    break_end: '',
});

const defaultSchedule: ScheduleDay[] = Array.from({ length: 7 }, (_, i) => defaultScheduleDay(i + 1));

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    position: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    experience_years: number;
    specialization: string | null;
    certificates: string | null;
    avatar_url: string | null;
    image_url: string | null;
    commission_type: 'percentage' | 'fixed' | null;
    commission_value: number | null;
    fullName: string;
    photo_url: string;
    serviceIds: string[];
}

interface Service {
    id: string;
    name: string;
    category: string | null;
    price: number;
    duration_minutes: number;
}

interface FormData {
    first_name: string;
    last_name: string;
    position: string;
    phone: string;
    email: string;
    address: string;
    experience_years: number;
    specialization: string;
    certificates: string;
    photo_url: string;
    commission_type: 'percentage' | 'fixed';
    commission_value: number;
}

const emptyForm: FormData = {
    first_name: '',
    last_name: '',
    position: '',
    phone: '',
    email: '',
    address: '',
    experience_years: 0,
    specialization: '',
    certificates: '',
    photo_url: '',
    commission_type: 'percentage',
    commission_value: 0,
};

interface EmployeeDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Employee | null;
    allServices: Service[];
    onSuccess: () => void;
}

type TabKey = 'settings' | 'appointments' | 'analytics';

export function EmployeeDrawer({ isOpen, onClose, employee, allServices, onSuccess }: EmployeeDrawerProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('settings');

    // === Стейты формы (Настройки) ===
    const [formData, setFormData] = useState<FormData>(emptyForm);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [scheduleData, setScheduleData] = useState<ScheduleDay[]>(defaultSchedule);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [saving, setSaving] = useState(false);

    // === Стейты для Аналитики и Расписания ===
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (isOpen) {
            setActiveTab('settings');
            if (employee) {
                setFormData({
                    first_name: employee.first_name || '',
                    last_name: employee.last_name || '',
                    position: employee.position || '',
                    phone: employee.phone || '',
                    email: employee.email || '',
                    address: employee.address || '',
                    experience_years: employee.experience_years || 0,
                    specialization: employee.specialization || '',
                    certificates: employee.certificates || '',
                    photo_url: employee.avatar_url || employee.image_url || '',
                    commission_type: employee.commission_type || 'percentage',
                    commission_value: employee.commission_value || 0,
                });
                setSelectedServiceIds(employee.serviceIds || []);
                fetchSchedule(employee.id);
                fetchAppointments(employee.id, selectedDate);
            } else {
                setFormData(emptyForm);
                setSelectedServiceIds([]);
                setScheduleData(defaultSchedule);
            }
        }
    }, [isOpen, employee]);

    useEffect(() => {
        if (isOpen && employee && (activeTab === 'appointments' || activeTab === 'analytics')) {
            fetchAppointments(employee.id, activeTab === 'appointments' ? selectedDate : undefined);
        }
    }, [selectedDate, activeTab]);

    const fetchSchedule = async (employeeId: string) => {
        try {
            const data = await api.schedules.getAll({ employee_id: employeeId });
            if (data && data.length > 0) {
                const mapped: ScheduleDay[] = defaultSchedule.map(def => {
                    const fromDb = data.find((d: any) => d.day_of_week === def.day_of_week);
                    if (fromDb) {
                        return {
                            day_of_week: fromDb.day_of_week,
                            is_working: fromDb.is_working ?? true,
                            start_time: fromDb.start_time?.slice(0, 5) || '09:00',
                            end_time: fromDb.end_time?.slice(0, 5) || '18:00',
                            break_start: fromDb.break_start?.slice(0, 5) || '',
                            break_end: fromDb.break_end?.slice(0, 5) || '',
                        };
                    }
                    return def;
                });
                setScheduleData(mapped);
            } else {
                setScheduleData(defaultSchedule);
            }
        } catch (error: any) {
            console.error('Ошибка загрузки расписания:', error);
        }
    };

    const fetchAppointments = async (employeeId: string, date?: string) => {
        setLoadingAppointments(true);
        try {
            // Если date передана, загружаем за день (для таймлайна)
            // Если нет, загружаем за месяц или вообще все (для аналитики). 
            // Для простоты возьмём за текущий месяц для аналитики, или все, если параметр не передан.
            const query: any = { employee_id: employeeId };
            if (date && activeTab === 'appointments') {
                query.date = date;
            }
            const data = await api.appointments.getAll(query);
            setAppointments(data);
        } catch (error: any) {
            console.error('Ошибка загрузки записей:', error);
        } finally {
            setLoadingAppointments(false);
        }
    };

    // ========== СОХРАНЕНИЕ ПРОФИЛЯ ==========
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.first_name.trim()) {
            toast.error('Укажите имя сотрудника');
            return;
        }
        setSaving(true);
        try {
            const dbPayload = {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                position: formData.position.trim() || null,
                phone: formData.phone.trim() || null,
                email: formData.email.trim() || null,
                address: formData.address.trim() || null,
                experience_years: formData.experience_years || 0,
                specialization: formData.specialization.trim() || null,
                certificates: formData.certificates.trim() || null,
                avatar_url: formData.photo_url || null,
                commission_type: formData.commission_type,
                commission_value: formData.commission_value || 0,
                serviceIds: selectedServiceIds,
            };

            let employeeId: string;
            if (employee) {
                await api.employees.update(employee.id, dbPayload);
                employeeId = employee.id;
            } else {
                const result = await api.employees.create(dbPayload);
                employeeId = result.id;
            }

            const scheduleInserts = scheduleData.map(day => ({
                day_of_week: day.day_of_week,
                is_working: day.is_working,
                start_time: day.is_working ? day.start_time : null,
                end_time: day.is_working ? day.end_time : null,
                break_start: day.is_working ? day.break_start : null,
                break_end: day.is_working ? day.break_end : null,
            }));
            await api.schedules.update({ employee_id: employeeId, schedules: scheduleInserts });

            toast.success(employee ? 'Сотрудник обновлён' : 'Сотрудник добавлен');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error('Ошибка при сохранении: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const data = await api.upload(file);
            setFormData(prev => ({ ...prev, photo_url: data.url }));
            toast.success('Фото загружено');
        } catch (error: any) {
            toast.error('Ошибка загрузки: ' + error.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const toggleService = (id: string) => {
        setSelectedServiceIds(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const updateScheduleDay = (dayIndex: number, field: keyof ScheduleDay, value: any) => {
        setScheduleData(prev => prev.map((d, i) => i === dayIndex ? { ...d, [field]: value } : d));
    };

    const copyToAllDays = (sourceDayIndex: number) => {
        const source = scheduleData[sourceDayIndex];
        setScheduleData(prev => prev.map(d => ({
            ...d,
            start_time: source.start_time,
            end_time: source.end_time,
            break_start: source.break_start,
            break_end: source.break_end,
        })));
        toast.success('Время скопировано на все дни');
    };

    const handleStatusChange = async (appointmentId: string, newStatus: string) => {
        try {
            await api.appointments.update(appointmentId, { status: newStatus });
            toast.success('Статус обновлён');
            if (employee) fetchAppointments(employee.id, selectedDate);
        } catch (error: any) {
            toast.error('Ошибка: ' + error.message);
        }
    };

    // ======= РЕНДЕР: Настройки =======
    const renderSettings = () => {
        const servicesByCategory = allServices.reduce<Record<string, Service[]>>((acc, svc) => {
            const cat = svc.category || 'Без категории';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(svc);
            return acc;
        }, {});

        const inputCls = "w-full px-3 py-2 bg-neutral-bg3/50 border border-neutral-border rounded-xl text-white placeholder-neutral-text3 focus:ring-2 focus:ring-primary/50 outline-none transition-all";
        const labelCls = "block text-sm font-medium text-neutral-text2 mb-1";

        return (
            <form onSubmit={handleSave} className="p-6 space-y-6">
                <div>
                    <label className={labelCls}>Фото</label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-neutral-border bg-neutral-bg3 shrink-0 flex items-center justify-center">
                            {formData.photo_url ? (
                                <img src={formData.photo_url.startsWith('http') ? formData.photo_url : `${import.meta.env.VITE_BACKEND_URL}${formData.photo_url}`} alt="Аватар" className="w-full h-full object-cover" />
                            ) : (
                                <Users className="w-7 h-7 text-neutral-text3" />
                            )}
                        </div>
                        <div className="flex-1">
                            <input
                                type="file" accept="image/*"
                                disabled={uploadingImage}
                                onChange={handleImageUpload}
                                className="w-full px-3 py-2 bg-neutral-bg3/50 border border-neutral-border rounded-xl text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-light disabled:opacity-50 text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Имя <span className="text-red-400">*</span></label>
                        <input type="text" required placeholder="Алибек" value={formData.first_name} onChange={e => setFormData(prev => ({ ...prev, first_name: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Фамилия</label>
                        <input type="text" placeholder="Иванов" value={formData.last_name} onChange={e => setFormData(prev => ({ ...prev, last_name: e.target.value }))} className={inputCls} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Должность</label>
                        <input type="text" placeholder="Мастер, Барбер..." value={formData.position} onChange={e => setFormData(prev => ({ ...prev, position: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Опыт (лет)</label>
                        <input type="number" min="0" value={formData.experience_years} onChange={e => setFormData(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))} className={inputCls} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Телефон</label>
                        <input type="tel" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Email</label>
                        <input type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} className={inputCls} />
                    </div>
                </div>

                <div>
                    <label className={labelCls}>
                        Услуги <span className="text-xs text-neutral-text3">({selectedServiceIds.length})</span>
                    </label>
                    <div className="rounded-xl border border-neutral-border overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
                        {Object.entries(servicesByCategory).map(([category, svcs]) => (
                            <div key={category}>
                                <div className="px-4 py-2 bg-neutral-bg3/50 text-xs text-neutral-text3 font-medium uppercase tracking-wider sticky top-0 backdrop-blur-md">
                                    {category}
                                </div>
                                {svcs.map(svc => (
                                    <div
                                        key={svc.id}
                                        onClick={() => toggleService(svc.id)}
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-t border-neutral-border/30 transition-colors ${selectedServiceIds.includes(svc.id) ? 'bg-primary/10' : 'hover:bg-neutral-bg3'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedServiceIds.includes(svc.id) ? 'bg-primary border-primary' : 'border-neutral-border bg-neutral-bg3/50'}`}>
                                            {selectedServiceIds.includes(svc.id) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <div className="flex-1 text-sm text-neutral-text1">{svc.name}</div>
                                        <div className="text-xs text-neutral-text3">{svc.duration_minutes} мин</div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className={labelCls}><Calendar className="w-4 h-4 inline mr-1 text-primary" /> Расписание</label>
                    <div className="rounded-xl border border-neutral-border overflow-hidden">
                        {scheduleData.map((day, idx) => (
                            <div key={day.day_of_week} className="px-3 py-2.5 border-b border-neutral-border/50 last:border-b-0">
                                {/* Строка: День + Переключатель + Время работы + Копировать */}
                                <div className="grid grid-cols-[30px_35px_1fr_auto] gap-2 items-center">
                                    <span className={`text-xs font-medium ${day.is_working ? 'text-neutral-text1' : 'text-neutral-text3'}`}>{DAY_SHORT[idx]}</span>
                                    <button type="button" onClick={() => updateScheduleDay(idx, 'is_working', !day.is_working)} className={`relative flex items-center justify-center w-8 h-4 rounded-full transition-colors ${day.is_working ? 'bg-green-500' : 'bg-neutral-bg3 border border-neutral-border'}`}>
                                        <div className={`absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${day.is_working ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                    <div className="flex flex-col gap-1">
                                        {day.is_working ? (
                                            <div className="flex gap-2">
                                                <input type="time" value={day.start_time} onChange={e => updateScheduleDay(idx, 'start_time', e.target.value)} className="px-1 py-0.5 bg-neutral-bg3 border border-neutral-border rounded text-xs w-[70px] outline-none" />
                                                <span className="text-neutral-text3 text-xs">-</span>
                                                <input type="time" value={day.end_time} onChange={e => updateScheduleDay(idx, 'end_time', e.target.value)} className="px-1 py-0.5 bg-neutral-bg3 border border-neutral-border rounded text-xs w-[70px] outline-none" />
                                            </div>
                                        ) : <span className="text-xs text-neutral-text3 italic mt-1">Выходной</span>}
                                    </div>
                                    {day.is_working && idx === 0 && (
                                        <button type="button" onClick={() => copyToAllDays(idx)} className="p-1 hover:bg-neutral-bg3 rounded text-neutral-text3 hover:text-primary" title="Скопировать время на все дни"><Copy className="w-3.5 h-3.5" /></button>
                                    )}
                                </div>

                                {/* Строка обеда (только для рабочих дней) */}
                                {day.is_working && (
                                    <div className="mt-1.5 ml-[65px] flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (day.break_start && day.break_end) {
                                                    // Убираем обед
                                                    updateScheduleDay(idx, 'break_start', '');
                                                    updateScheduleDay(idx, 'break_end', '');
                                                } else {
                                                    // Устанавливаем обед по умолчанию
                                                    updateScheduleDay(idx, 'break_start', '13:00');
                                                    updateScheduleDay(idx, 'break_end', '14:00');
                                                }
                                            }}
                                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all ${
                                                day.break_start && day.break_end
                                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                    : 'bg-neutral-bg3/50 text-neutral-text3 border border-neutral-border/50 hover:text-neutral-text2'
                                            }`}
                                        >
                                            <span>🍽</span>
                                            {day.break_start && day.break_end ? 'Обед' : '+ Обед'}
                                        </button>

                                        {day.break_start && day.break_end && (
                                            <>
                                                <input
                                                    type="time"
                                                    value={day.break_start}
                                                    onChange={e => updateScheduleDay(idx, 'break_start', e.target.value)}
                                                    className="px-1 py-0.5 bg-amber-500/5 border border-amber-500/20 rounded text-xs w-[70px] outline-none text-amber-300 focus:border-amber-500/50"
                                                />
                                                <span className="text-neutral-text3 text-[10px]">-</span>
                                                <input
                                                    type="time"
                                                    value={day.break_end}
                                                    onChange={e => updateScheduleDay(idx, 'break_end', e.target.value)}
                                                    className="px-1 py-0.5 bg-amber-500/5 border border-amber-500/20 rounded text-xs w-[70px] outline-none text-amber-300 focus:border-amber-500/50"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        updateScheduleDay(idx, 'break_start', '');
                                                        updateScheduleDay(idx, 'break_end', '');
                                                    }}
                                                    className="text-neutral-text3 hover:text-red-400 text-xs transition-colors p-0.5"
                                                    title="Убрать обед"
                                                >
                                                    ✕
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Комиссия</label>
                        <select value={formData.commission_type} onChange={e => setFormData(prev => ({ ...prev, commission_type: e.target.value as any }))} className={inputCls}>
                            <option value="percentage">%</option>
                            <option value="fixed">Фикс</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Значение</label>
                        <input type="number" min="0" value={formData.commission_value} onChange={e => setFormData(prev => ({ ...prev, commission_value: parseInt(e.target.value) || 0 }))} className={inputCls} />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-border/50">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-neutral-text2 hover:text-white">Отмена</button>
                    <button type="submit" disabled={saving} className="px-6 py-2 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-medium shadow-lg disabled:opacity-50 flex items-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Сохранить
                    </button>
                </div>
            </form>
        );
    };

    // ======= РЕНДЕР: Записи =======
    const renderAppointments = () => {
        return (
            <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 bg-neutral-bg3/50 p-3 rounded-xl border border-neutral-border">
                    <Calendar className="w-5 h-5 text-neutral-text2" />
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent text-neutral-text1 outline-none text-sm font-medium flex-1 cursor-pointer"
                    />
                </div>

                {loadingAppointments ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
                ) : appointments.length === 0 ? (
                    <div className="text-center p-8 text-neutral-text3 text-sm">
                        На выбранную дату записей нет
                    </div>
                ) : (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[19px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-border before:to-transparent">
                        {appointments.map((app) => (
                            <div key={app.id} className="relative flex items-start gap-4 group">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-neutral-border bg-neutral-bg2 shrink-0 shadow-sm z-10 relative mt-1">
                                    <Clock className="w-4 h-4 text-primary group-hover:drop-shadow-[0_0_8px_rgba(var(--color-primary),0.5)] transition-all" />
                                </div>
                                <div className="flex-1 bg-neutral-bg3/50 border border-neutral-border hover:border-primary/50 transition-colors p-4 rounded-xl shadow-lg backdrop-blur-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-primary font-bold">{app.start_time?.slice(0, 5)} - {app.end_time?.slice(0, 5)}</div>
                                        <select 
                                            value={app.status || 'scheduled'}
                                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                            className={`text-xs px-2 py-1 rounded bg-neutral-bg2 border border-neutral-border outline-none cursor-pointer ${
                                                app.status === 'completed' ? 'text-green-400' :
                                                app.status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'
                                            }`}
                                        >
                                            <option value="scheduled">Ожидается</option>
                                            <option value="confirmed">Подтверждена</option>
                                            <option value="completed">Завершена</option>
                                            <option value="cancelled">Отменена</option>
                                        </select>
                                    </div>
                                    <div className="font-medium text-neutral-text1">{app.client_name}</div>
                                    <div className="text-xs text-neutral-text3 mb-2">{app.client_phone}</div>
                                    <div className="inline-flex px-2 py-1 bg-primary/10 text-primary text-xs rounded-lg border border-primary/20">
                                        {app.services?.name || 'Услуга'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ======= РЕНДЕР: Аналитика =======
    const renderAnalytics = () => {
        // Простая статистика по текущим загруженным appointments
        const completed = appointments.filter(a => a.status === 'completed');
        const totalEarned = completed.reduce((acc, curr) => acc + (Number(curr.actual_price) || 0), 0);
        
        return (
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-bg3/50 border border-neutral-border rounded-xl p-4 flex flex-col justify-center items-center">
                        <Activity className="w-6 h-6 text-primary mb-2" />
                        <div className="text-xs text-neutral-text3">Записей (Всего)</div>
                        <div className="text-2xl font-bold text-neutral-text1">{appointments.length}</div>
                    </div>
                    <div className="bg-neutral-bg3/50 border border-neutral-border rounded-xl p-4 flex flex-col justify-center items-center">
                        <Check className="w-6 h-6 text-green-400 mb-2" />
                        <div className="text-xs text-neutral-text3">Завершено</div>
                        <div className="text-2xl font-bold text-neutral-text1">{completed.length}</div>
                    </div>
                    <div className="col-span-2 bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col justify-center items-center">
                        <DollarSign className="w-8 h-8 text-primary mb-2" />
                        <div className="text-sm text-primary">Общий доход мастера (выполненные)</div>
                        <div className="text-4xl font-bold text-white mt-1">{totalEarned.toLocaleString('ru-RU')} ₸</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop Blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-neutral-bg2 shadow-2xl border-l border-neutral-border flex flex-col"
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between p-6 border-b border-neutral-border bg-neutral-bg2/80 backdrop-blur-xl shrink-0 z-10">
                            <div className="flex items-center gap-3">
                                {employee ? (
                                    <>
                                        <div className="w-10 h-10 rounded-full overflow-hidden border border-neutral-border bg-neutral-bg3">
                                            {employee.photo_url ? (
                                                <img src={employee.photo_url.startsWith('http') ? employee.photo_url : `${import.meta.env.VITE_BACKEND_URL}${employee.photo_url}`} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <Users className="w-full h-full p-2 text-neutral-text3" />
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-neutral-text1">{employee.fullName}</h2>
                                            <p className="text-xs text-neutral-text3">{employee.position || 'Мастер'}</p>
                                        </div>
                                    </>
                                ) : (
                                    <h2 className="text-xl font-bold text-neutral-text1">Новый сотрудник</h2>
                                )}
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-neutral-bg3 rounded-xl text-neutral-text3 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs Navigation */}
                        {employee && (
                            <div className="flex border-b border-neutral-border bg-neutral-bg3/30 shrink-0">
                                <button
                                    onClick={() => setActiveTab('settings')}
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-neutral-text3 hover:text-neutral-text2'}`}
                                >
                                    Настройки
                                </button>
                                <button
                                    onClick={() => setActiveTab('appointments')}
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'appointments' ? 'border-primary text-primary' : 'border-transparent text-neutral-text3 hover:text-neutral-text2'}`}
                                >
                                    Записи
                                </button>
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-neutral-text3 hover:text-neutral-text2'}`}
                                >
                                    Аналитика
                                </button>
                            </div>
                        )}

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {activeTab === 'settings' && renderSettings()}
                            {activeTab === 'appointments' && employee && renderAppointments()}
                            {activeTab === 'analytics' && employee && renderAnalytics()}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
