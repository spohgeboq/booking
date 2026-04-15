import { create } from 'zustand';
import { api } from '../lib/api';

export interface Service {
    id: string;
    name: string;
    category: string;
    price: number;
    duration: number;
    duration_minutes?: number;
    description: string;
    image_url?: string;
}

export interface Employee {
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
    // ID услуг, которые выполняет этот мастер
    serviceIds: string[];
}

// Расписание одного дня для сотрудника
export interface Schedule {
    employee_id: string;
    day_of_week: number; // 1 = Пн, 7 = Вс
    is_working: boolean;
    start_time: string | null; // "09:00"
    end_time: string | null;   // "18:00"
    break_start: string | null; // "13:00"
    break_end: string | null;   // "14:00"
}

export interface AppSettings {
    company_name: string;
    phone: string;
    email: string;
    address: string;
    working_hours: string;
    about_us_image?: string;
    gallery?: string[];
}

interface DataState {
    services: Service[];
    employees: Employee[];
    schedules: Schedule[];
    settings: AppSettings | null;
    loading: boolean;
    error: string | null;

    fetchData: () => Promise<void>;

    // Хелпер: расписание сотрудника за конкретный день недели
    getScheduleForEmployee: (employeeId: string | null, dayOfWeek: number) => Schedule | null;
}

export const useDataStore = create<DataState>((set, get) => ({
    services: [],
    employees: [],
    schedules: [],
    settings: null,
    loading: true,
    error: null,

    fetchData: async () => {
        set({ loading: true, error: null });
        try {
            // Загружаем всё параллельно
            const [servicesData, employeesData, schedulesData, settingsData] = await Promise.all([
                api.services.getAll(),
                api.employees.getAll(),
                api.schedules.getAll(),
                api.settings.get()
            ]);

            // Маппим услуги: duration_minutes → duration
            const services: Service[] = (servicesData || []).map((s: any) => ({
                ...s,
                duration: s.duration_minutes ?? s.duration ?? 30,
            }));

            // Сотрудники уже приходят с serviceIds из нашего API
            const employees: Employee[] = employeesData || [];

            // Маппим расписание: нормализуем формат времени (убираем секунды)
            const schedules: Schedule[] = (schedulesData || []).map((s: any) => ({
                employee_id: s.employee_id,
                day_of_week: s.day_of_week,
                is_working: s.is_working ?? true,
                start_time: s.start_time?.slice(0, 5) || null,
                end_time: s.end_time?.slice(0, 5) || null,
                break_start: s.break_start?.slice(0, 5) || null,
                break_end: s.break_end?.slice(0, 5) || null,
            }));

            set({
                services,
                employees,
                schedules,
                settings: settingsData || null,
                loading: false,
            });
        } catch (error: any) {
            console.error('Error fetching data from API:', error);
            set({ error: error.message, loading: false });
        }
    },

    // Получить расписание для сотрудника за конкретный день недели (1-7)
    getScheduleForEmployee: (employeeId: string | null, dayOfWeek: number): Schedule | null => {
        if (!employeeId) return null;
        return get().schedules.find(
            s => s.employee_id === employeeId && s.day_of_week === dayOfWeek
        ) || null;
    },
}));
