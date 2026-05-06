import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import {
    DollarSign,
    Calendar,
    Clock,
    Check,
    TrendingUp,
    Loader2,
    User
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function MasterDashboard() {
    const { user } = useAuth();
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
    const [dailyBreakdown, setDailyBreakdown] = useState<any[]>([]);

    const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const MONTH_NAMES = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

    const getRange = useCallback((p: 'day' | 'week' | 'month') => {
        const today = new Date();
        const end = format(today, 'yyyy-MM-dd');
        switch (p) {
            case 'day': return { start_date: end, end_date: end };
            case 'week': return { start_date: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end_date: end };
            case 'month': return { start_date: format(startOfMonth(today), 'yyyy-MM-dd'), end_date: end };
        }
    }, []);

    const fmtMoney = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });

    const fetchData = useCallback(async (p: 'day' | 'week' | 'month') => {
        setLoading(true);
        try {
            const range = getRange(p);
            const today = format(new Date(), 'yyyy-MM-dd');

            // Финансовая сводка (бэкенд уже фильтрует для MASTER)
            const finData = await api.finance.getSummary(range);
            const me = finData.masters?.[0] || null;
            setAnalyticsData(me);

            // Записи на сегодня
            const appts = await api.appointments.getAll({ date: today });
            setTodayAppointments(
                (appts || [])
                    .filter((a: any) => a.status !== 'cancelled')
                    .sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''))
            );

            // Детализация по дням
            const allAppts = await api.appointments.getAll({
                start_date: range.start_date,
                end_date: range.end_date,
            });

            const byDay: Record<string, { revenue: number; count: number }> = {};
            (allAppts || []).forEach((a: any) => {
                if (a.status !== 'completed') return;
                const date = a.appointment_date?.split('T')[0] || a.appointment_date;
                if (!date) return;
                if (!byDay[date]) byDay[date] = { revenue: 0, count: 0 };
                byDay[date].revenue += parseFloat(a.actual_price) || 0;
                byDay[date].count += 1;
            });

            const ct = me?.commission_type || 'percentage';
            const cv = me?.commission_value || 0;
            const fs = me?.fixed_salary || 0;
            const startD = new Date(range.start_date);
            const monthDays = new Date(startD.getFullYear(), startD.getMonth() + 1, 0).getDate();
            const dailyFixed = fs / monthDays;

            const days = Object.entries(byDay)
                .map(([date, data]) => {
                    let daySalary = 0;
                    switch (ct) {
                        case 'percentage': daySalary = data.revenue * (cv / 100); break;
                        case 'fixed': daySalary = cv / monthDays; break;
                        case 'both': daySalary = dailyFixed + data.revenue * (cv / 100); break;
                    }
                    const d = new Date(date + 'T00:00:00');
                    return {
                        date,
                        dayName: DAY_NAMES[d.getDay()],
                        dayNum: d.getDate(),
                        monthName: MONTH_NAMES[d.getMonth()],
                        revenue: data.revenue,
                        count: data.count,
                        salary: Math.round(daySalary),
                    };
                })
                .sort((a, b) => b.date.localeCompare(a.date));

            setDailyBreakdown(days);
        } catch (e) {
            console.error('Master dashboard error:', e);
        } finally {
            setLoading(false);
        }
    }, [getRange]);

    useEffect(() => {
        fetchData(period);
    }, [period, fetchData]);

    const PERIODS = [
        { key: 'day' as const, label: 'Сегодня' },
        { key: 'week' as const, label: 'Неделя' },
        { key: 'month' as const, label: 'Месяц' },
    ];

    return (
        <div className="space-y-6">
            {/* Заголовок */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-neutral-text1">Мой кабинет</h1>
                    <p className="text-sm text-neutral-text3">{user?.email}</p>
                </div>
            </div>

            {/* Фильтр периода */}
            <div className="flex items-center gap-1 p-1 bg-neutral-bg2/80 backdrop-blur-sm rounded-xl border border-neutral-border">
                {PERIODS.map(o => (
                    <button key={o.key} onClick={() => setPeriod(o.key)}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                            period === o.key
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-neutral-text3 hover:text-neutral-text1 hover:bg-white/5'
                        }`}>
                        {o.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : (
                <div className="space-y-5">
                    {/* KPI карточки */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Заработок */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-br from-amber-500/15 to-amber-500/5 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-5"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-5 h-5 text-amber-400" />
                                <span className="text-sm text-amber-400/80 font-medium">Мой заработок</span>
                            </div>
                            <div className="text-3xl font-bold text-white">
                                {analyticsData ? fmtMoney(analyticsData.salary) : '0'} ₸
                            </div>
                        </motion.div>

                        {/* Завершено */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="bg-neutral-bg2/80 backdrop-blur-sm border border-neutral-border rounded-2xl p-5"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Check className="w-5 h-5 text-green-400" />
                                <span className="text-sm text-neutral-text3 font-medium">Завершено</span>
                            </div>
                            <div className="text-3xl font-bold text-green-400">
                                {analyticsData?.completed_count || 0}
                            </div>
                        </motion.div>

                        {/* Ставка */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-neutral-bg2/80 backdrop-blur-sm border border-neutral-border rounded-2xl p-5"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                <span className="text-sm text-neutral-text3 font-medium">Ставка</span>
                            </div>
                            <div className="text-xl font-bold text-white">
                                {analyticsData ? (
                                    analyticsData.commission_type === 'percentage' ? `${analyticsData.commission_value}%` :
                                    analyticsData.commission_type === 'fixed' ? `${fmtMoney(analyticsData.commission_value)} ₸/мес` :
                                    `${fmtMoney(analyticsData.fixed_salary)} ₸ + ${analyticsData.commission_value}%`
                                ) : '—'}
                            </div>
                        </motion.div>
                    </div>

                    {/* Записи на сегодня */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-neutral-bg2/80 backdrop-blur-sm border border-neutral-border rounded-2xl p-5"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-5 h-5 text-primary" />
                            <span className="text-base font-semibold text-neutral-text1">Мои записи на сегодня</span>
                            <span className="ml-auto text-xs text-neutral-text3 bg-neutral-bg3 px-2 py-0.5 rounded-full">
                                {todayAppointments.length}
                            </span>
                        </div>

                        {todayAppointments.length === 0 ? (
                            <div className="text-center py-8 text-neutral-text3 text-sm">
                                <Calendar className="w-8 h-8 mx-auto opacity-20 mb-2" />
                                Нет записей на сегодня
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {todayAppointments.map((app: any) => (
                                    <div key={app.id} className="flex items-center justify-between bg-neutral-bg3/40 border border-neutral-border/50 rounded-xl p-3.5 hover:border-primary/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 text-primary font-semibold text-sm">
                                                <Clock className="w-3.5 h-3.5" />
                                                {app.start_time?.slice(0, 5)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-neutral-text1">{app.client_name}</div>
                                                <div className="text-xs text-neutral-text3">{app.services?.name || 'Услуга'}</div>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                            app.status === 'completed' ? 'text-green-400 border-green-400/30 bg-green-400/10' :
                                            app.status === 'confirmed' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' :
                                            'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
                                        }`}>
                                            {app.status === 'completed' ? 'Завершена' : app.status === 'confirmed' ? 'Подтверждена' : 'Ожидается'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Детализация по дням */}
                    {dailyBreakdown.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-neutral-bg2/80 backdrop-blur-sm border border-neutral-border rounded-2xl p-5"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <DollarSign className="w-5 h-5 text-amber-400" />
                                <span className="text-base font-semibold text-neutral-text1">Заработок по дням</span>
                            </div>
                            <div className="space-y-2">
                                {dailyBreakdown.map(day => (
                                    <div key={day.date} className="flex items-center justify-between bg-neutral-bg3/40 border border-neutral-border/50 rounded-xl p-3.5 hover:border-primary/30 transition-colors">
                                        <div>
                                            <span className="text-sm font-semibold text-neutral-text1">{day.dayNum} {day.monthName}</span>
                                            <span className="text-xs text-neutral-text3 ml-1.5">{day.dayName}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-neutral-text3 bg-neutral-bg3 px-2 py-0.5 rounded-full border border-neutral-border/50">
                                                {day.count} {day.count === 1 ? 'клиент' : day.count < 5 ? 'клиента' : 'клиентов'}
                                            </span>
                                            <span className="text-sm font-bold text-amber-400">{fmtMoney(day.salary)} ₸</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    );
}
