import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Search, Filter, Loader2, Check, X, Clock, Edit, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface Appointment {
    id: string;
    client_name: string;
    client_phone: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    actual_price: number | null;
    status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
    service_id: string | null;
    employee_id: string | null;
    services: { name: string } | null;
    employees: { first_name: string, last_name: string } | null;
}

interface AvailableSlot {
    employee_id: string;
    employee_name: string;
    date: string;
    start_time: string;
    end_time: string;
}

export function ListView() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [editingTime, setEditingTime] = useState<{ id: string, date: string, start: string, end: string, service_id: string | null, employee_id: string | null } | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);

    useEffect(() => {
        fetchAppointments();
    }, []);

    // Загрузка свободных слотов при открытии модалки редактирования
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!editingTime || !editingTime.service_id) {
            setAvailableSlots([]);
            setSelectedSlotKey(null);
            return;
        }

        let cancelled = false;
        const fetchSlots = async () => {
            setLoadingSlots(true);
            setAvailableSlots([]);
            setSelectedSlotKey(null);
            try {
                const data = await api.appointments.getAvailableSlots({
                    service_id: editingTime.service_id,
                    appointment_date: editingTime.date,
                    start_time: editingTime.start,
                    appointment_id: editingTime.id
                });
                if (!cancelled) {
                    setAvailableSlots(data.slots || []);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('Ошибка загрузки свободных слотов:', err);
                    setAvailableSlots([]);
                }
            } finally {
                if (!cancelled) setLoadingSlots(false);
            }
        };

        fetchSlots();
        return () => { cancelled = true; };
    }, [editingTime?.id]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const data = await api.appointments.getAll();
            setAppointments(data as any as Appointment[]);
        } catch (error: any) {
            toast.error('Ошибка при загрузке встреч: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            await api.appointments.update(id, { status: newStatus });
            toast.success('Статус обновлен');

            // Update local state
            setAppointments(appointments.map(app =>
                app.id === id ? { ...app, status: newStatus as any } : app
            ));
        } catch (error: any) {
            toast.error('Ошибка при обновлении статуса: ' + error.message);
        }
    };

    const cycleStatus = (id: string, currentStatus: string) => {
        const sequence = ['scheduled', 'confirmed', 'completed', 'cancelled'];
        const nextIdx = (sequence.indexOf(currentStatus) + 1) % sequence.length;
        updateStatus(id, sequence[nextIdx]);
    };

    const deleteAppointment = async () => {
        if (!confirmDeleteId) return;
        setDeleting(true);

        const appt = appointments.find(a => a.id === confirmDeleteId);

        try {
            // Шаг 1: Отправляем данные клиента в бэкенд для Telegram-уведомления
            if (appt) {
                await api.appointments.notifyDeletion({
                    client_name: appt.client_name,
                    client_phone: appt.client_phone,
                    service_name: appt.services?.name,
                    master_name: appt.employees
                        ? `${appt.employees.first_name} ${appt.employees.last_name}`.trim()
                        : 'Любой мастер',
                    appointment_date: appt.appointment_date,
                    start_time: appt.start_time,
                    end_time: appt.end_time,
                }).catch(() => {});
            }

            // Шаг 2: Удаляем запись из базы
            await api.appointments.delete(confirmDeleteId);

            toast.success('Запись успешно удалена');
            setAppointments(prev => prev.filter(a => a.id !== confirmDeleteId));
            setConfirmDeleteId(null);
        } catch (error: any) {
            toast.error('Ошибка при удалении: ' + error.message);
        } finally {
            setDeleting(false);
        }
    };

    const updateTime = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTime) return;
        try {
            const updatePayload: Record<string, any> = {
                appointment_date: editingTime.date,
                start_time: editingTime.start,
                end_time: editingTime.end,
            };
            // Если выбран слот другого мастера — обновляем и employee_id
            if (editingTime.employee_id) {
                updatePayload.employee_id = editingTime.employee_id;
            }

            await api.appointments.update(editingTime.id, updatePayload);
            toast.success('Время успешно изменено');
            setEditingTime(null);
            setAvailableSlots([]);
            setSelectedSlotKey(null);
            fetchAppointments(); // Перезагружаем для отображения нового мастера
        } catch (error: any) {
            toast.error('Ошибка при обновлении времени: ' + error.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-400/10 text-green-400 border-green-400/20';
            case 'confirmed': return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
            case 'cancelled': return 'bg-red-400/10 text-red-400 border-red-400/20';
            default: return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'; // scheduled
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed': return 'Завершено';
            case 'confirmed': return 'Подтверждено';
            case 'cancelled': return 'Отменено';
            default: return 'Ожидает';
        }
    };

    const filteredAppointments = appointments.filter(app => {
        const matchesSearch =
            app.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.client_phone?.includes(searchTerm);

        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative w-full sm:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-neutral-text3" />
                    </div>
                    <input
                        type="text"
                        placeholder="Поиск по имени или телефону..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-neutral-border bg-neutral-bg3/50 rounded-xl text-neutral-text1 placeholder-neutral-text3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-neutral-text3" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="py-2 pl-3 pr-8 border border-neutral-border bg-neutral-bg3/50 rounded-xl text-neutral-text1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                    >
                        <option value="all">Все статусы</option>
                        <option value="scheduled">Ожидают</option>
                        <option value="confirmed">Подтверждены</option>
                        <option value="completed">Завершены</option>
                        <option value="cancelled">Отменены</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-neutral-border rounded-xl bg-neutral-bg3/20 shadow-inner">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-neutral-bg3/50 border-b border-neutral-border text-xs uppercase tracking-wider text-neutral-text3">
                            <th className="p-4 font-medium">Клиент</th>
                            <th className="p-4 font-medium">Услуга и Мастер</th>
                            <th className="p-4 font-medium">Дата и время</th>
                            <th className="p-4 font-medium">Цена</th>
                            <th className="p-4 font-medium">Статус</th>
                            <th className="p-4 font-medium text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-border/50 text-sm">
                        {filteredAppointments.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-neutral-text3">
                                    Встречи не найдены
                                </td>
                            </tr>
                        ) : (
                            filteredAppointments.map((app) => (
                                <tr key={app.id} className="hover:bg-neutral-bg3/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-neutral-text1">{app.client_name || 'Без имени'}</div>
                                        <div className="text-xs text-neutral-text3 mt-0.5">{app.client_phone || 'Нет телефона'}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-neutral-text1">{app.services?.name || 'Услуга удалена'}</div>
                                        <div className="text-xs text-neutral-text3 mt-0.5">{app.employees ? `${app.employees.first_name} ${app.employees.last_name}`.trim() : 'Любой мастер'}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-neutral-text1 capitalize">
                                            {app.appointment_date ? format(parseISO(app.appointment_date), 'd MMM yyyy', { locale: ru }) : 'Без даты'}
                                        </div>
                                        <div className="text-xs text-neutral-text3 flex items-center mt-0.5">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {app.start_time.substring(0, 5)} - {app.end_time.substring(0, 5)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-neutral-text1">{app.actual_price ? `${app.actual_price} ₸` : 'Не указана'}</div>
                                    </td>
                                    <td className="p-4" title="Нажмите, чтобы изменить статус">
                                        <button 
                                            onClick={() => cycleStatus(app.id, app.status)}
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(app.status)}`}
                                        >
                                            {getStatusText(app.status)}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 text-neutral-text3">
                                            {app.status === 'scheduled' && (
                                                <button
                                                    onClick={() => updateStatus(app.id, 'confirmed')}
                                                    className="p-1.5 hover:bg-blue-400/20 hover:text-blue-400 rounded transition-colors"
                                                    title="Подтвердить"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                            {(app.status === 'confirmed' || app.status === 'scheduled') && (
                                                <button
                                                    onClick={() => updateStatus(app.id, 'completed')}
                                                    className="p-1.5 hover:bg-green-400/20 hover:text-green-400 rounded transition-colors"
                                                    title="Завершить"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                            {(app.status !== 'cancelled' && app.status !== 'completed') && (
                                                <button
                                                    onClick={() => updateStatus(app.id, 'cancelled')}
                                                    className="p-1.5 hover:bg-red-400/20 hover:text-red-400 rounded transition-colors"
                                                    title="Отменить"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setEditingTime({
                                                    id: app.id,
                                                    date: app.appointment_date,
                                                    start: app.start_time,
                                                    end: app.end_time,
                                                    service_id: app.service_id,
                                                    employee_id: app.employee_id
                                                })}
                                                className="p-1.5 hover:bg-primary/20 hover:text-primary rounded transition-colors"
                                                title="Редактировать время"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(app.id)}
                                                className="p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded transition-colors"
                                                title="Удалить запись"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Confirm Delete Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-neutral-bg2 rounded-2xl border border-neutral-border p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                                <AlertTriangle className="w-7 h-7 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-neutral-text1 mb-1">Удалить запись?</h3>
                                <p className="text-sm text-neutral-text2">Запись будет безвозвратно удалена из базы данных, а уведомление отправлено в Telegram.</p>
                            </div>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    disabled={deleting}
                                    className="flex-1 py-2.5 border border-neutral-border text-neutral-text2 rounded-xl font-medium hover:bg-neutral-bg3 transition-colors disabled:opacity-50"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={deleteAppointment}
                                    disabled={deleting}
                                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Модалка изменения времени — с умным подбором */}
            {editingTime && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-neutral-bg2 rounded-2xl border border-neutral-border p-6 max-w-md w-full shadow-xl max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-neutral-text1">Изменить время</h3>
                            <button
                                onClick={() => { setEditingTime(null); setAvailableSlots([]); setSelectedSlotKey(null); }}
                                className="text-neutral-text3 hover:text-neutral-text1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={updateTime} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-text2 mb-1">Дата</label>
                                <input
                                    type="date"
                                    required
                                    value={editingTime.date}
                                    onChange={(e) => { setEditingTime({ ...editingTime, date: e.target.value }); setSelectedSlotKey(null); }}
                                    className="w-full px-3 py-2 bg-neutral-bg3 border border-neutral-border rounded-xl text-neutral-text1 focus:ring-2 focus:ring-primary/50 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-text2 mb-1">Начало</label>
                                    <input
                                        type="time"
                                        required
                                        value={editingTime.start}
                                        onChange={(e) => { setEditingTime({ ...editingTime, start: e.target.value }); setSelectedSlotKey(null); }}
                                        className="w-full px-3 py-2 bg-neutral-bg3 border border-neutral-border rounded-xl text-neutral-text1 focus:ring-2 focus:ring-primary/50 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-text2 mb-1">Конец</label>
                                    <input
                                        type="time"
                                        required
                                        value={editingTime.end}
                                        onChange={(e) => { setEditingTime({ ...editingTime, end: e.target.value }); setSelectedSlotKey(null); }}
                                        className="w-full px-3 py-2 bg-neutral-bg3 border border-neutral-border rounded-xl text-neutral-text1 focus:ring-2 focus:ring-primary/50 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Секция с умными предложениями */}
                            {editingTime.service_id && (
                                <div className="mt-2 pt-4 border-t border-neutral-border/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium text-neutral-text2">Ближайшие свободные мастера</span>
                                    </div>

                                    {loadingSlots ? (
                                        <div className="flex items-center justify-center py-4 gap-2 text-neutral-text3 text-sm">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Поиск свободных окон…</span>
                                        </div>
                                    ) : availableSlots.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-1">
                                            {availableSlots.map((slot) => {
                                                const key = `${slot.employee_id}-${slot.start_time}`;
                                                const isSelected = selectedSlotKey === key;
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingTime({
                                                                ...editingTime,
                                                                date: slot.date,
                                                                start: slot.start_time,
                                                                end: slot.end_time,
                                                                employee_id: slot.employee_id,
                                                            });
                                                            setSelectedSlotKey(key);
                                                        }}
                                                        className={`inline-flex items-center px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                                                            isSelected
                                                                ? 'bg-primary/20 border-primary/60 text-primary shadow-sm shadow-primary/10'
                                                                : 'bg-neutral-bg3/50 border-neutral-border text-neutral-text2 hover:bg-primary/10 hover:border-primary/30 hover:text-primary'
                                                        }`}
                                                    >
                                                        {slot.employee_name} — {slot.start_time}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-3 px-4 rounded-xl bg-neutral-bg3/30 border border-neutral-border/50">
                                            <p className="text-sm text-neutral-text3">В ближайшие 2 часа свободных мастеров на эту услугу нет</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-colors mt-6"
                            >
                                Сохранить изменения
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
