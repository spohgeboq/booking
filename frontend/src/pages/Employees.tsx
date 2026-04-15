import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Users, Plus, Edit, Trash2, Loader2, Search, X, Check, Calendar, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// ========== РАСПИСАНИЕ ==========
const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface ScheduleDay {
    day_of_week: number; // 1-7
    is_working: boolean;
    start_time: string;  // HH:mm
    end_time: string;
    break_start: string;
    break_end: string;
}

const defaultScheduleDay = (day: number): ScheduleDay => ({
    day_of_week: day,
    is_working: day <= 5, // пн-пт рабочие, сб-вс выходные
    start_time: '09:00',
    end_time: '18:00',
    break_start: '13:00',
    break_end: '14:00',
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
    // виртуальные поля
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

export function Employees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [saving, setSaving] = useState(false);

    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState<FormData>(emptyForm);
    // Выбранные услуги в форме
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    // Расписание
    const [scheduleData, setScheduleData] = useState<ScheduleDay[]>(defaultSchedule);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            // Сотрудники
            const empData = await api.employees.getAll();
            // Все услуги
            const svcData = await api.services.getAll();

            const services: Service[] = svcData || [];
            setAllServices(services);

            const mapped = (empData || []).map((emp: any) => {
                return {
                    ...emp,
                    fullName: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
                    photo_url: emp.avatar_url || emp.image_url || '',
                };
            });
            setEmployees(mapped);
        } catch (error: any) {
            toast.error('Ошибка при загрузке: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Загрузка расписания сотрудника
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
                            break_start: fromDb.break_start?.slice(0, 5) || '13:00',
                            break_end: fromDb.break_end?.slice(0, 5) || '14:00',
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

    // Обновление поля расписания
    const updateScheduleDay = (dayIndex: number, field: keyof ScheduleDay, value: any) => {
        setScheduleData(prev => prev.map((d, i) => i === dayIndex ? { ...d, [field]: value } : d));
    };

    // Копировать расписание первого рабочего дня на все рабочие дни
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

            if (editingEmployee) {
                await api.employees.update(editingEmployee.id, dbPayload);
                employeeId = editingEmployee.id;
            } else {
                const result = await api.employees.create(dbPayload);
                employeeId = result.id;
            }

            // ===== СОХРАНЕНИЕ РАСПИСАНИЯ =====
            const scheduleInserts = scheduleData.map(day => ({
                day_of_week: day.day_of_week,
                is_working: day.is_working,
                start_time: day.is_working ? day.start_time : null,
                end_time: day.is_working ? day.end_time : null,
                break_start: day.is_working ? day.break_start : null,
                break_end: day.is_working ? day.break_end : null,
            }));
            await api.schedules.update({ employee_id: employeeId, schedules: scheduleInserts });

            toast.success(editingEmployee ? 'Сотрудник обновлён' : 'Сотрудник добавлен');
            setIsModalOpen(false);
            fetchAll();
        } catch (error: any) {
            toast.error('Ошибка при сохранении: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Вы уверены, что хотите удалить сотрудника "${name}"?`)) return;
        try {
            await api.employees.delete(id);
            toast.success('Сотрудник удалён');
            fetchAll();
        } catch (error: any) {
            toast.error('Ошибка при удалении: ' + error.message);
        }
    };

    const openCreateModal = () => {
        setEditingEmployee(null);
        setFormData(emptyForm);
        setSelectedServiceIds([]);
        setScheduleData(defaultSchedule);
        setIsModalOpen(true);
    };

    const openEditModal = (emp: Employee) => {
        setEditingEmployee(emp);
        setFormData({
            first_name: emp.first_name || '',
            last_name: emp.last_name || '',
            position: emp.position || '',
            phone: emp.phone || '',
            email: emp.email || '',
            address: emp.address || '',
            experience_years: emp.experience_years || 0,
            specialization: emp.specialization || '',
            certificates: emp.certificates || '',
            photo_url: emp.avatar_url || emp.image_url || '',
            commission_type: emp.commission_type || 'percentage',
            commission_value: emp.commission_value || 0,
        });
        setSelectedServiceIds(emp.serviceIds || []);
        fetchSchedule(emp.id);
        setIsModalOpen(true);
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

    // Группировка услуг по категории
    const servicesByCategory = allServices.reduce<Record<string, Service[]>>((acc, svc) => {
        const cat = svc.category || 'Без категории';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(svc);
        return acc;
    }, {});

    const filteredEmployees = employees.filter(emp =>
        emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.specialization && emp.specialization.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.position && emp.position.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const inputCls = "w-full px-3 py-2 bg-neutral-bg3/50 border border-neutral-border rounded-xl text-white placeholder-neutral-text3 focus:ring-2 focus:ring-primary/50 outline-none transition-all";
    const labelCls = "block text-sm font-medium text-neutral-text2 mb-1";

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-text1">Сотрудники</h1>
                    <p className="text-neutral-text2 mt-1">Управление командой, услугами и ставками комиссий</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Добавить сотрудника
                </button>
            </div>

            <div className="bg-neutral-bg2/80 backdrop-blur-xl rounded-2xl border border-neutral-border p-6 shadow-xl relative min-h-[400px]">
                {/* Поиск */}
                <div className="mb-6 relative max-w-md w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-neutral-text3" />
                    </div>
                    <input
                        type="text"
                        placeholder="Поиск по имени, должности или специальности..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-neutral-border bg-neutral-bg3/50 rounded-xl text-neutral-text1 placeholder-neutral-text3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>

                {loading ? (
                    <div className="flex h-[200px] items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-neutral-border rounded-xl bg-neutral-bg3/20 shadow-inner">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-bg3/50 border-b border-neutral-border text-xs uppercase tracking-wider text-neutral-text3">
                                    <th className="p-4 font-medium">Сотрудник</th>
                                    <th className="p-4 font-medium">Должность / Специализация</th>
                                    <th className="p-4 font-medium">Услуги</th>
                                    <th className="p-4 font-medium">Контакты</th>
                                    <th className="p-4 font-medium">Комиссия</th>
                                    <th className="p-4 font-medium text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-border/50 text-sm">
                                {filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-neutral-text3">
                                            Сотрудники не найдены
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map((emp) => {
                                        const empServices = allServices.filter(s => (emp.serviceIds || []).includes(s.id));
                                        return (
                                            <tr key={emp.id} className="hover:bg-neutral-bg3/30 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 rounded-full bg-neutral-bg3 border border-neutral-border overflow-hidden mr-3 shrink-0">
                                                            {emp.photo_url ? (
                                                                <img src={emp.photo_url.startsWith('http') ? emp.photo_url : `${import.meta.env.VITE_BACKEND_URL}${emp.photo_url}`} alt={emp.fullName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-neutral-text3 bg-neutral-bg2">
                                                                    <Users className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-neutral-text1">{emp.fullName || '—'}</div>
                                                            {emp.experience_years > 0 && (
                                                                <div className="text-xs text-neutral-text3">Опыт: {emp.experience_years} лет</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-neutral-text2">{emp.position || '—'}</div>
                                                    {emp.specialization && (
                                                        <div className="text-xs text-neutral-text3 mt-0.5">{emp.specialization}</div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {empServices.length > 0 ? (
                                                            empServices.slice(0, 3).map(s => (
                                                                <span key={s.id} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                                                    {s.name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-neutral-text3 text-xs">Не назначены</span>
                                                        )}
                                                        {empServices.length > 3 && (
                                                            <span className="text-xs text-neutral-text3">+{empServices.length - 3}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {emp.phone && <div className="text-neutral-text2 text-xs">{emp.phone}</div>}
                                                    {emp.email && <div className="text-neutral-text3 text-xs">{emp.email}</div>}
                                                    {!emp.phone && !emp.email && <span className="text-neutral-text3">—</span>}
                                                </td>
                                                <td className="p-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded bg-neutral-bg3/50 border border-neutral-border text-neutral-text1 font-medium text-xs">
                                                        {emp.commission_type === 'percentage'
                                                            ? `${emp.commission_value ?? 0}% от услуги`
                                                            : `${emp.commission_value ?? 0} ₸ фиксировано`}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 text-neutral-text3">
                                                        <button
                                                            onClick={() => openEditModal(emp)}
                                                            className="p-1.5 hover:bg-primary/20 hover:text-primary rounded transition-colors"
                                                            title="Редактировать"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(emp.id, emp.fullName)}
                                                            className="p-1.5 hover:bg-red-400/20 hover:text-red-400 rounded transition-colors"
                                                            title="Удалить"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Модалка */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-neutral-bg2 border border-neutral-border rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            {/* Заголовок */}
                            <div className="flex items-center justify-between p-6 border-b border-neutral-border sticky top-0 bg-neutral-bg2 z-10">
                                <h2 className="text-xl font-bold text-neutral-text1">
                                    {editingEmployee ? 'Редактировать сотрудника' : 'Новый сотрудник'}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-1.5 hover:bg-neutral-bg3 rounded-lg text-neutral-text3 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-5">
                                {/* Фото */}
                                <div>
                                    <label className={labelCls}>Фото сотрудника</label>
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
                                            {uploadingImage && (
                                                <div className="text-xs text-primary mt-2 flex items-center gap-1">
                                                    <Loader2 className="w-3 h-3 animate-spin" /> Загрузка...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Имя и Фамилия */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Имя <span className="text-red-400">*</span></label>
                                        <input
                                            type="text" required
                                            placeholder="Алибек"
                                            value={formData.first_name}
                                            onChange={e => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Фамилия</label>
                                        <input
                                            type="text"
                                            placeholder="Иванов"
                                            value={formData.last_name}
                                            onChange={e => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>

                                {/* Должность */}
                                <div>
                                    <label className={labelCls}>Должность</label>
                                    <input
                                        type="text"
                                        placeholder="Мастер, Барбер, Администратор..."
                                        value={formData.position}
                                        onChange={e => setFormData(prev => ({ ...prev, position: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>

                                {/* Специализация */}
                                <div>
                                    <label className={labelCls}>Специализация</label>
                                    <input
                                        type="text"
                                        placeholder="Стрижки, окрашивание..."
                                        value={formData.specialization}
                                        onChange={e => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>

                                {/* Телефон и Email */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Телефон</label>
                                        <input
                                            type="tel"
                                            placeholder="+7 777 123 45 67"
                                            value={formData.phone}
                                            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Email</label>
                                        <input
                                            type="email"
                                            placeholder="email@example.com"
                                            value={formData.email}
                                            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>

                                {/* Адрес и Опыт */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Адрес</label>
                                        <input
                                            type="text"
                                            placeholder="Город, улица..."
                                            value={formData.address}
                                            onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Опыт работы (лет)</label>
                                        <input
                                            type="number" min="0" max="50"
                                            value={formData.experience_years}
                                            onChange={e => setFormData(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>

                                {/* Сертификаты / Описание */}
                                <div>
                                    <label className={labelCls}>Описание / Сертификаты</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Дипломы, сертификаты, достижения..."
                                        value={formData.certificates}
                                        onChange={e => setFormData(prev => ({ ...prev, certificates: e.target.value }))}
                                        className={`${inputCls} resize-none`}
                                    />
                                </div>

                                {/* ===== ВЫБОР УСЛУГ ===== */}
                                <div>
                                    <label className={labelCls}>
                                        Услуги мастера
                                        <span className="ml-2 text-xs text-neutral-text3 font-normal">
                                            ({selectedServiceIds.length} выбрано)
                                        </span>
                                    </label>
                                    {allServices.length === 0 ? (
                                        <div className="p-4 rounded-xl border border-neutral-border bg-neutral-bg3/30 text-center text-neutral-text3 text-sm">
                                            Сначала создайте услуги в разделе «Услуги»
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-neutral-border overflow-hidden">
                                            {Object.entries(servicesByCategory).map(([category, svcs]) => (
                                                <div key={category}>
                                                    <div className="px-4 py-2 bg-neutral-bg3/50 border-b border-neutral-border text-xs uppercase tracking-wider text-neutral-text3 font-medium">
                                                        {category}
                                                    </div>
                                                    {svcs.map(svc => {
                                                        const isSelected = selectedServiceIds.includes(svc.id);
                                                        return (
                                                            <div
                                                                key={svc.id}
                                                                onClick={() => toggleService(svc.id)}
                                                                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-neutral-border/50 last:border-b-0 ${isSelected
                                                                    ? 'bg-primary/10 hover:bg-primary/15'
                                                                    : 'hover:bg-neutral-bg3/30'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected
                                                                        ? 'bg-primary border-primary'
                                                                        : 'border-neutral-border bg-neutral-bg3/50'
                                                                        }`}>
                                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                                    </div>
                                                                    <span className={`text-sm ${isSelected ? 'text-neutral-text1' : 'text-neutral-text2'}`}>
                                                                        {svc.name}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-xs text-neutral-text3 ml-4 shrink-0">
                                                                    <span>{svc.duration_minutes} мин</span>
                                                                    <span className="font-medium text-neutral-text2">{Number(svc.price).toLocaleString('ru-RU')} ₸</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* ===== РАСПИСАНИЕ ===== */}
                                <div>
                                    <label className={labelCls}>
                                        <span className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-primary" />
                                            Расписание работы
                                        </span>
                                    </label>
                                    <div className="rounded-xl border border-neutral-border overflow-hidden">
                                        {/* Заголовок таблицы */}
                                        <div className="grid grid-cols-[100px_60px_1fr_1fr_auto] gap-2 px-4 py-2 bg-neutral-bg3/50 border-b border-neutral-border text-xs uppercase tracking-wider text-neutral-text3 font-medium items-center">
                                            <span>День</span>
                                            <span className="text-center">Работа</span>
                                            <span className="text-center">Рабочее время</span>
                                            <span className="text-center">Обед</span>
                                            <span></span>
                                        </div>

                                        {scheduleData.map((day, idx) => (
                                            <div
                                                key={day.day_of_week}
                                                className={`grid grid-cols-[100px_60px_1fr_1fr_auto] gap-2 px-4 py-3 items-center border-b border-neutral-border/50 last:border-b-0 transition-colors ${day.is_working ? 'bg-transparent' : 'bg-neutral-bg3/20'
                                                    }`}
                                            >
                                                {/* Название дня */}
                                                <span className={`text-sm font-medium ${day.is_working ? 'text-neutral-text1' : 'text-neutral-text3 line-through'
                                                    }`}>
                                                    {DAY_SHORT[idx]}
                                                </span>

                                                {/* Toggle рабочий/выходной */}
                                                <div className="flex justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateScheduleDay(idx, 'is_working', !day.is_working)}
                                                        className={`relative w-10 h-5 rounded-full transition-colors ${day.is_working ? 'bg-green-500' : 'bg-neutral-bg3 border border-neutral-border'
                                                            }`}
                                                    >
                                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${day.is_working ? 'translate-x-5' : 'translate-x-0.5'
                                                            }`} />
                                                    </button>
                                                </div>

                                                {/* Рабочие часы */}
                                                <div className="flex items-center gap-1">
                                                    {day.is_working ? (
                                                        <>
                                                            <input
                                                                type="time"
                                                                value={day.start_time}
                                                                onChange={e => updateScheduleDay(idx, 'start_time', e.target.value)}
                                                                className="px-2 py-1 bg-neutral-bg3/50 border border-neutral-border rounded-lg text-white text-xs focus:ring-1 focus:ring-primary/50 outline-none w-[85px]"
                                                            />
                                                            <span className="text-neutral-text3 text-xs">–</span>
                                                            <input
                                                                type="time"
                                                                value={day.end_time}
                                                                onChange={e => updateScheduleDay(idx, 'end_time', e.target.value)}
                                                                className="px-2 py-1 bg-neutral-bg3/50 border border-neutral-border rounded-lg text-white text-xs focus:ring-1 focus:ring-primary/50 outline-none w-[85px]"
                                                            />
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-neutral-text3 text-center w-full italic">Выходной</span>
                                                    )}
                                                </div>

                                                {/* Обед */}
                                                <div className="flex items-center gap-1">
                                                    {day.is_working ? (
                                                        <>
                                                            <input
                                                                type="time"
                                                                value={day.break_start}
                                                                onChange={e => updateScheduleDay(idx, 'break_start', e.target.value)}
                                                                className="px-2 py-1 bg-neutral-bg3/50 border border-neutral-border rounded-lg text-white text-xs focus:ring-1 focus:ring-primary/50 outline-none w-[85px]"
                                                            />
                                                            <span className="text-neutral-text3 text-xs">–</span>
                                                            <input
                                                                type="time"
                                                                value={day.break_end}
                                                                onChange={e => updateScheduleDay(idx, 'break_end', e.target.value)}
                                                                className="px-2 py-1 bg-neutral-bg3/50 border border-neutral-border rounded-lg text-white text-xs focus:ring-1 focus:ring-primary/50 outline-none w-[85px]"
                                                            />
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-neutral-text3 text-center w-full italic">—</span>
                                                    )}
                                                </div>

                                                {/* Копировать */}
                                                <div className="flex justify-end">
                                                    {day.is_working && idx === 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToAllDays(idx)}
                                                            className="p-1.5 hover:bg-neutral-bg3 rounded text-neutral-text3 hover:text-primary transition-colors"
                                                            title="Применить это время ко всем дням"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Комиссия */}
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-border/50">
                                    <div>
                                        <label className={labelCls}>Тип комиссии</label>
                                        <select
                                            value={formData.commission_type}
                                            onChange={e => setFormData(prev => ({ ...prev, commission_type: e.target.value as any }))}
                                            className={inputCls}
                                        >
                                            <option value="percentage">Процент %</option>
                                            <option value="fixed">Фикс ₸</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Значение комиссии</label>
                                        <input
                                            type="number" min="0"
                                            value={formData.commission_value}
                                            onChange={e => setFormData(prev => ({ ...prev, commission_value: parseInt(e.target.value) || 0 }))}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 sticky bottom-0 bg-neutral-bg2 pt-4 pb-2 border-t border-neutral-border/50 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-neutral-text2 hover:text-white transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-6 py-2 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Сохранить
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

