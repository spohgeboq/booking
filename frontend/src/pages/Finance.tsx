import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import {
    TrendingUp, TrendingDown, DollarSign, Plus, X,
    Loader2, Trash2, Edit3, Users, Receipt
} from 'lucide-react';

// ==========================================
// Типы
// ==========================================
interface FinanceSummary {
    total_income: number;
    total_expenses: number;
    total_salaries: number;
    net_profit: number;
}

interface MasterFinance {
    id: string;
    first_name: string;
    last_name: string;
    commission_type: string;
    commission_value: number;
    fixed_salary: number;
    total_revenue: number;
    completed_count: number;
    salary: number;
    salary_ratio: number;
}

interface Expense {
    id: string;
    title: string;
    category: string;
    amount: number;
    expense_date: string;
    created_at: string;
}

interface ExpenseCategory {
    id: string;
    name: string;
}

// ==========================================
// Хелперы
// ==========================================
const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });

const PERIOD_PRESETS = [
    { label: 'Сегодня', key: 'today' },
    { label: 'Неделя', key: 'week' },
    { label: 'Месяц', key: 'month' },
    { label: 'Год', key: 'year' },
] as const;

function getDateRange(preset: string) {
    const today = new Date();
    const end = format(today, 'yyyy-MM-dd');
    switch (preset) {
        case 'today': return { start: end, end };
        case 'week': return { start: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end };
        case 'month': return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end };
        case 'year': return { start: format(startOfYear(today), 'yyyy-MM-dd'), end };
        default: return { start: format(subDays(today, 30), 'yyyy-MM-dd'), end };
    }
}

function commissionLabel(type: string, value: number, fixedSalary: number) {
    switch (type) {
        case 'percentage': return `${value}%`;
        case 'fixed': return `${fmt(value)} ₸/мес`;
        case 'both': return `${fmt(fixedSalary)} ₸ + ${value}%`;
        default: return '—';
    }
}

// ==========================================
// Компонент страницы
// ==========================================
export function Finance() {
    const [period, setPeriod] = useState<string>('month');
    const [dateRange, setDateRange] = useState(getDateRange('month'));
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [masters, setMasters] = useState<MasterFinance[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [salaryRatio, setSalaryRatio] = useState(1);

    // Модалка расхода
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [expenseForm, setExpenseForm] = useState({ title: '', category: 'Прочее', amount: '', expense_date: format(new Date(), 'yyyy-MM-dd') });

    // Модалка категории
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [finData, expData, catData] = await Promise.all([
                api.finance.getSummary({ start_date: dateRange.start, end_date: dateRange.end }),
                api.expenses.getAll({ start_date: dateRange.start, end_date: dateRange.end }),
                api.expenseCategories.getAll(),
            ]);
            setSummary(finData.summary);
            setMasters(finData.masters);
            setSalaryRatio(finData.period?.salary_ratio ?? 1);
            setExpenses(expData);
            setCategories(catData);
        } catch (e: any) {
            toast.error('Ошибка: ' + e.message);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePeriodChange = (key: string) => {
        setPeriod(key);
        setDateRange(getDateRange(key));
    };

    // CRUD расходов
    const openAddExpense = () => {
        setEditingExpense(null);
        setExpenseForm({ title: '', category: categories[0]?.name || 'Прочее', amount: '', expense_date: format(new Date(), 'yyyy-MM-dd') });
        setShowExpenseModal(true);
    };

    const openEditExpense = (exp: Expense) => {
        setEditingExpense(exp);
        setExpenseForm({ title: exp.title, category: exp.category, amount: String(exp.amount), expense_date: exp.expense_date?.slice(0, 10) });
        setShowExpenseModal(true);
    };

    const saveExpense = async () => {
        if (!expenseForm.title || !expenseForm.amount) { toast.error('Заполните все поля'); return; }
        try {
            if (editingExpense) {
                await api.expenses.update(editingExpense.id, { ...expenseForm, amount: parseFloat(expenseForm.amount) });
                toast.success('Расход обновлён');
            } else {
                await api.expenses.create({ ...expenseForm, amount: parseFloat(expenseForm.amount) });
                toast.success('Расход добавлен');
            }
            setShowExpenseModal(false);
            fetchData();
        } catch (e: any) { toast.error(e.message); }
    };

    const deleteExpense = async (id: string) => {
        if (!confirm('Удалить расход?')) return;
        try { await api.expenses.delete(id); toast.success('Удалено'); fetchData(); }
        catch (e: any) { toast.error(e.message); }
    };

    // Категории
    const addCategory = async () => {
        if (!newCategoryName.trim()) return;
        try { await api.expenseCategories.create(newCategoryName.trim()); toast.success('Категория добавлена'); setNewCategoryName(''); fetchData(); }
        catch (e: any) { toast.error(e.message); }
    };

    const deleteCategory = async (id: string) => {
        try { await api.expenseCategories.delete(id); toast.success('Категория удалена'); fetchData(); }
        catch (e: any) { toast.error(e.message); }
    };

    return (
        <div className="space-y-6">
            {/* Заголовок + фильтр */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Финансы</h1>
                    <p className="text-text-secondary mt-1">Доходы, расходы и аналитика по мастерам</p>
                </div>
                <div className="flex items-center gap-1 p-1 bg-neutral-bg3 rounded-xl border border-white/5">
                    {PERIOD_PRESETS.map(p => (
                        <button key={p.key} onClick={() => handlePeriodChange(p.key)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${period === p.key ? 'bg-brand text-white shadow-glow' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Карточки */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
            ) : summary && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard icon={TrendingUp} label="Доход" value={summary.total_income} color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
                        <SummaryCard icon={TrendingDown} label="Расходы" value={summary.total_expenses} color="text-rose-400" bg="bg-rose-500/10" border="border-rose-500/20" />
                        <SummaryCard icon={Users} label="ЗП мастеров" value={summary.total_salaries} color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" subtitle={salaryRatio < 1 ? `Пропорция: ${Math.round(salaryRatio * 100)}% месяца` : undefined} />
                        <SummaryCard icon={DollarSign} label="Чистая прибыль" value={summary.net_profit} color={summary.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'} bg={summary.net_profit >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'} border={summary.net_profit >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'} />
                    </div>

                    {/* 2 колонки */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Расходы */}
                        <div className="bg-neutral-bg2/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-rose-400" />
                                    <h2 className="text-lg font-semibold text-white">Расходы</h2>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowCategoryModal(true)} className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                                        Категории
                                    </button>
                                    <button onClick={openAddExpense} className="flex items-center gap-1.5 px-4 py-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-lg transition-colors shadow-glow">
                                        <Plus className="w-4 h-4" /> Добавить
                                    </button>
                                </div>
                            </div>
                            {expenses.length === 0 ? (
                                <p className="text-center text-text-muted py-8">Нет расходов за период</p>
                            ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                    {expenses.map(exp => (
                                        <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors group">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-white truncate">{exp.title}</span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-text-muted shrink-0">{exp.category}</span>
                                                </div>
                                                <span className="text-xs text-text-muted">{exp.expense_date?.slice(0, 10)}</span>
                                            </div>
                                            <div className="flex items-center gap-3 ml-3">
                                                <span className="text-sm font-semibold text-rose-400 whitespace-nowrap">−{fmt(Number(exp.amount))} ₸</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEditExpense(exp)} className="p-1 hover:bg-white/10 rounded"><Edit3 className="w-3.5 h-3.5 text-text-muted" /></button>
                                                    <button onClick={() => deleteExpense(exp.id)} className="p-1 hover:bg-rose-500/20 rounded"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Мастера */}
                        <div className="bg-neutral-bg2/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-5">
                                <Users className="w-5 h-5 text-amber-400" />
                                <h2 className="text-lg font-semibold text-white">Мастера</h2>
                            </div>
                            {masters.length === 0 ? (
                                <p className="text-center text-text-muted py-8">Нет данных</p>
                            ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                    {masters.map(m => (
                                        <div key={m.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-white">{m.first_name} {m.last_name}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-text-muted">
                                                    {commissionLabel(m.commission_type, m.commission_value, m.fixed_salary)}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 text-sm">
                                                <div>
                                                    <span className="text-text-muted text-xs block">Выручка</span>
                                                    <span className="text-emerald-400 font-semibold">{fmt(m.total_revenue)} ₸</span>
                                                </div>
                                                <div>
                                                    <span className="text-text-muted text-xs block">К выплате</span>
                                                    <span className="text-amber-400 font-semibold">{fmt(m.salary)} ₸</span>
                                                </div>
                                                <div>
                                                    <span className="text-text-muted text-xs block">Записей</span>
                                                    <span className="text-white font-semibold">{m.completed_count}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Модалка расхода */}
            <AnimatePresence>
                {showExpenseModal && (
                    <Modal onClose={() => setShowExpenseModal(false)} title={editingExpense ? 'Редактировать расход' : 'Добавить расход'}>
                        <div className="space-y-4">
                            <Field label="Название" value={expenseForm.title} onChange={v => setExpenseForm(f => ({ ...f, title: v }))} />
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Категория</label>
                                <select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-neutral-bg3 border border-white/10 rounded-xl text-white focus:border-brand outline-none transition-colors">
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <Field label="Сумма (₸)" type="number" value={expenseForm.amount} onChange={v => setExpenseForm(f => ({ ...f, amount: v }))} />
                            <Field label="Дата" type="date" value={expenseForm.expense_date} onChange={v => setExpenseForm(f => ({ ...f, expense_date: v }))} />
                            <button onClick={saveExpense} className="w-full py-3 bg-brand hover:bg-brand-hover text-white font-medium rounded-xl transition-colors shadow-glow">
                                {editingExpense ? 'Сохранить' : 'Добавить'}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Модалка категорий */}
            <AnimatePresence>
                {showCategoryModal && (
                    <Modal onClose={() => setShowCategoryModal(false)} title="Категории расходов">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Новая категория..."
                                    className="flex-1 px-4 py-2.5 bg-neutral-bg3 border border-white/10 rounded-xl text-white placeholder:text-text-muted focus:border-brand outline-none" />
                                <button onClick={addCategory} className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-xl font-medium transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                {categories.map(c => (
                                    <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                                        <span className="text-sm text-white">{c.name}</span>
                                        <button onClick={() => deleteCategory(c.id)} className="p-1 hover:bg-rose-500/20 rounded transition-colors"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
}

// ==========================================
// Вспомогательные компоненты
// ==========================================
function SummaryCard({ icon: Icon, label, value, color, bg, border, subtitle }: {
    icon: any; label: string; value: number; color: string; bg: string; border: string; subtitle?: string;
}) {
    return (
        <div className={`${bg} border ${border} rounded-2xl p-5 backdrop-blur-sm`}>
            <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-sm font-medium text-text-secondary">{label}</span>
            </div>
            <div className={`text-2xl font-bold tracking-tight ${color}`}>{fmt(value)} ₸</div>
            {subtitle && <div className="text-xs text-text-muted mt-1">{subtitle}</div>}
        </div>
    );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-neutral-bg2 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl pointer-events-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-text-muted" /></button>
                    </div>
                    {children}
                </div>
            </motion.div>
        </>
    );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
    return (
        <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-bg3 border border-white/10 rounded-xl text-white placeholder:text-text-muted focus:border-brand outline-none transition-colors" />
        </div>
    );
}
