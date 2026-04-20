import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Users, Plus, Edit, Trash2, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { EmployeeDrawer } from '../components/employees/EmployeeDrawer';

// ========== ИНТЕРФЕЙСЫ ==========
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

export function Employees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const empData = await api.employees.getAll();
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

    const openCreateDrawer = () => {
        setSelectedEmployee(null);
        setIsDrawerOpen(true);
    };

    const openEditDrawer = (emp: Employee) => {
        setSelectedEmployee(emp);
        setIsDrawerOpen(true);
    };

    const filteredEmployees = employees.filter(emp =>
        emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.specialization && emp.specialization.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.position && emp.position.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-text1">Сотрудники</h1>
                    <p className="text-neutral-text2 mt-1">Управление командой, расписанием и записями</p>
                </div>
                <button
                    onClick={openCreateDrawer}
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
                                            <tr 
                                                key={emp.id} 
                                                className="hover:bg-neutral-bg3/30 transition-colors cursor-pointer group"
                                                onClick={() => openEditDrawer(emp)}
                                            >
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
                                                            <div className="font-medium text-neutral-text1 group-hover:text-primary transition-colors">{emp.fullName || '—'}</div>
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
                                                <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-2 text-neutral-text3">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEditDrawer(emp); }}
                                                            className="p-1.5 hover:bg-primary/20 hover:text-primary rounded transition-colors"
                                                            title="Редактировать / Записи"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(emp.id, emp.fullName); }}
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

            <EmployeeDrawer 
                isOpen={isDrawerOpen} 
                onClose={() => setIsDrawerOpen(false)} 
                employee={selectedEmployee} 
                allServices={allServices} 
                onSuccess={fetchAll} 
            />
        </div>
    );
}
