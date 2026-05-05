import { Router } from 'express';
import { query } from '../db';

const router = Router();

// ==========================================
// GET /api/finance/summary — Агрегированная финансовая сводка
// Параметры: start_date, end_date
// ==========================================
router.get('/summary', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'Параметры start_date и end_date обязательны' });
        }

        // 1. Общий доход (сумма actual_price завершённых записей за период)
        const incomeResult = await query(
            `SELECT COALESCE(SUM(actual_price), 0) as total_income
             FROM appointments
             WHERE status = 'completed'
               AND appointment_date >= $1
               AND appointment_date <= $2`,
            [start_date, end_date]
        );
        const totalIncome = parseFloat(incomeResult.rows[0].total_income);

        // 2. Общий расход (сумма amount из expenses за период)
        const expenseResult = await query(
            `SELECT COALESCE(SUM(amount), 0) as total_expenses
             FROM expenses
             WHERE expense_date >= $1
               AND expense_date <= $2`,
            [start_date, end_date]
        );
        const totalExpenses = parseFloat(expenseResult.rows[0].total_expenses);

        // 3. Аналитика по мастерам: выручка + расчёт ЗП
        //    Поддерживаем 3 типа: percentage, fixed, both
        const mastersResult = await query(
            `SELECT
                e.id,
                e.first_name,
                e.last_name,
                e.commission_type,
                e.commission_value,
                e.fixed_salary,
                COALESCE(SUM(a.actual_price), 0) as total_revenue,
                COALESCE(SUM(a.commission_earned), 0) as total_commission,
                COUNT(a.id) as completed_count
             FROM employees e
             LEFT JOIN appointments a
                ON e.id = a.employee_id
                AND a.status = 'completed'
                AND a.appointment_date >= $1
                AND a.appointment_date <= $2
             GROUP BY e.id
             ORDER BY total_revenue DESC`,
            [start_date, end_date]
        );

        // Рассчитываем ЗП для каждого мастера с учётом пропорции за период
        const startD = new Date(start_date as string);
        const endD = new Date(end_date as string);

        // Количество дней в выбранном периоде
        const periodDays = Math.max(1, Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        // Количество дней в месяце (берём месяц от start_date)
        const monthDays = new Date(startD.getFullYear(), startD.getMonth() + 1, 0).getDate();

        // Коэффициент пропорции для оклада: если период < месяца, пропорционально
        const salaryRatio = Math.min(periodDays / monthDays, 1);

        const masters = mastersResult.rows.map((m: any) => {
            const revenue = parseFloat(m.total_revenue);
            const commissionValue = parseFloat(m.commission_value) || 0;
            const fixedSalary = parseFloat(m.fixed_salary) || 0;
            const commissionType = m.commission_type || 'percentage';

            let salary = 0;

            switch (commissionType) {
                case 'percentage':
                    // ЗП = процент от выручки мастера
                    salary = revenue * (commissionValue / 100);
                    break;
                case 'fixed':
                    // ЗП = фиксированный оклад, пропорционально периоду
                    salary = commissionValue * salaryRatio;
                    break;
                case 'both':
                    // ЗП = фиксированный оклад (пропорц.) + процент от выручки
                    const fixedPart = fixedSalary * salaryRatio;
                    const percentPart = revenue * (commissionValue / 100);
                    salary = fixedPart + percentPart;
                    break;
            }

            return {
                id: m.id,
                first_name: m.first_name,
                last_name: m.last_name,
                commission_type: commissionType,
                commission_value: commissionValue,
                fixed_salary: fixedSalary,
                total_revenue: revenue,
                completed_count: parseInt(m.completed_count),
                salary: Math.round(salary * 100) / 100,
                salary_ratio: Math.round(salaryRatio * 100) / 100,
            };
        });

        // Общая сумма ЗП мастеров
        const totalSalaries = masters.reduce((sum: number, m: any) => sum + m.salary, 0);

        // Чистая прибыль = Доход - Расходы - ЗП мастеров
        const netProfit = totalIncome - totalExpenses - totalSalaries;

        res.json({
            period: {
                start_date,
                end_date,
                days: periodDays,
                salary_ratio: Math.round(salaryRatio * 100) / 100,
            },
            summary: {
                total_income: Math.round(totalIncome * 100) / 100,
                total_expenses: Math.round(totalExpenses * 100) / 100,
                total_salaries: Math.round(totalSalaries * 100) / 100,
                net_profit: Math.round(netProfit * 100) / 100,
            },
            masters,
        });

    } catch (error: any) {
        console.error('Ошибка финансовой сводки:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
