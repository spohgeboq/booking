import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, FileText, FileSpreadsheet, File } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, HeadingLevel, WidthType } from 'docx';
import { saveAs } from 'file-saver';

interface ReportData {
    periodStart: Date;
    periodEnd: Date;
    totalIncome: number;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    dailyStats: any[];
    servicesStats: any[];
    workersStats: any[];
}

export function Reports() {
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Default: last 30 days
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const [data, setData] = useState<ReportData | null>(null);

    useEffect(() => {
        fetchReportData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchReportData = async () => {
        if (!startDate || !endDate) return;
        setLoading(true);
        try {
            const startStr = format(startOfDay(parseISO(startDate)), "yyyy-MM-dd'T'HH:mm:ssXXX");
            const endStr = format(endOfDay(parseISO(endDate)), "yyyy-MM-dd'T'HH:mm:ssXXX");

            // Fetch appointments in range
            const { data: apps, error } = await supabase
                .from('appointments')
                .select('id, appointment_date, status, actual_price, services(name), employees(first_name, last_name)')
                .gte('appointment_date', startStr)
                .lte('appointment_date', endStr);

            if (error) throw error;

            const appointments = apps || [];

            // Calculate stats
            let totalIncome = 0;
            let completed = 0;
            let cancelled = 0;
            const dailyMap = new Map<string, number>();
            const serviceMap = new Map<string, number>();
            const workerMap = new Map<string, number>();

            appointments.forEach((app: any) => {
                if (app.status === 'completed') {
                    completed++;
                    totalIncome += Number(app.actual_price) || 0;
                } else if (app.status === 'cancelled') {
                    cancelled++;
                }

                // Daily income
                if (app.status === 'completed') {
                    const d = app.appointment_date;
                    dailyMap.set(d, (dailyMap.get(d) || 0) + (Number(app.actual_price) || 0));

                    // Service count
                    const servicesObj = Array.isArray(app.services) ? app.services[0] : app.services;
                    const sName = servicesObj?.name || 'Неизвестно';
                    serviceMap.set(sName, (serviceMap.get(sName) || 0) + 1);

                    // Worker count
                    const workersObj = Array.isArray(app.employees) ? app.employees[0] : app.employees;
                    const wName = workersObj ? `${workersObj.first_name || ''} ${workersObj.last_name || ''}`.trim() : 'Без мастера';
                    workerMap.set(wName, (workerMap.get(wName) || 0) + 1);
                }
            });

            const dailyStats = Array.from(dailyMap, ([date, income]) => ({
                date: format(parseISO(date), 'd MMM', { locale: ru }),
                rawDate: date,
                income
            })).sort((a, b) => a.rawDate.localeCompare(b.rawDate));

            const servicesStats = Array.from(serviceMap, ([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count);

            const workersStats = Array.from(workerMap, ([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count);

            setData({
                periodStart: parseISO(startDate),
                periodEnd: parseISO(endDate),
                totalIncome,
                totalAppointments: appointments.length,
                completedAppointments: completed,
                cancelledAppointments: cancelled,
                dailyStats,
                servicesStats,
                workersStats
            });

        } catch (error: any) {
            toast.error('Ошибка загрузки данных: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = () => {
        fetchReportData();
    };

    // Export PDF
    const exportPDF = () => {
        if (!data) return;
        setGenerating(true);
        try {
            const doc = new jsPDF();

            // Fix utf-8 issues slightly by using basic fonts or relying on default (might need custom font for full RU support in jspdf if needed, but let's use standard table)
            // Warning: default jsPDF font doesn't support Cyrillic well without adding a TTF. We'll add a simple english title or basic translit if it fails, but standard browser jsPDF might render basic chars or squares.
            // For production, a custom VFS font like Roboto is needed.
            doc.text(`Report: ${startDate} to ${endDate}`, 14, 15);
            doc.text(`Total Income: ${data.totalIncome.toLocaleString()} KZT`, 14, 25);
            doc.text(`Completed: ${data.completedAppointments} | Cancelled: ${data.cancelledAppointments}`, 14, 32);

            autoTable(doc, {
                startY: 40,
                head: [['Service', 'Completed Count']],
                body: data.servicesStats.map(s => [s.name, s.count.toString()]),
            });

            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [['Worker', 'Completed Count']],
                body: data.workersStats.map(w => [w.name, w.count.toString()]),
            });

            doc.save(`report_${startDate}_${endDate}.pdf`);
            toast.success('PDF отчет скачан');
        } catch (error: any) {
            toast.error('Ошибка PDF: ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    // Export Excel
    const exportExcel = () => {
        if (!data) return;
        setGenerating(true);
        try {
            const wb = XLSX.utils.book_new();

            // Summary Sheet
            const summaryData = [
                ['Отчетный период', `${startDate} - ${endDate}`],
                ['Общий доход', data.totalIncome],
                ['Всего записей', data.totalAppointments],
                ['Завершено', data.completedAppointments],
                ['Отменено', data.cancelledAppointments],
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, "Сводка");

            // Services Sheet
            const wsServices = XLSX.utils.json_to_sheet(data.servicesStats);
            XLSX.utils.book_append_sheet(wb, wsServices, "Услуги");

            // Workers Sheet
            const wsWorkers = XLSX.utils.json_to_sheet(data.workersStats);
            XLSX.utils.book_append_sheet(wb, wsWorkers, "Мастера");

            XLSX.writeFile(wb, `Отчет_${startDate}_${endDate}.xlsx`);
            toast.success('Excel отчет скачан');
        } catch (error: any) {
            toast.error('Ошибка Excel: ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    // Export DOCX
    const exportDOCX = async () => {
        if (!data) return;
        setGenerating(true);
        try {
            const doc = new Document({
                sections: [
                    {
                        properties: {},
                        children: [
                            new Paragraph({
                                text: `Отчет за период: ${startDate} - ${endDate}`,
                                heading: HeadingLevel.HEADING_1,
                            }),
                            new Paragraph(`Общий доход: ${data.totalIncome.toLocaleString()} ₸`),
                            new Paragraph(`Всего записей: ${data.totalAppointments}`),
                            new Paragraph(`Завершено: ${data.completedAppointments}`),
                            new Paragraph(`Отменено: ${data.cancelledAppointments}`),
                            new Paragraph({ text: "Услуги", heading: HeadingLevel.HEADING_2 }),
                            new Table({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                rows: [
                                    new TableRow({
                                        children: [
                                            new TableCell({ children: [new Paragraph("Название")] }),
                                            new TableCell({ children: [new Paragraph("Количество")] }),
                                        ],
                                    }),
                                    ...data.servicesStats.map(s => new TableRow({
                                        children: [
                                            new TableCell({ children: [new Paragraph(s.name)] }),
                                            new TableCell({ children: [new Paragraph(s.count.toString())] }),
                                        ]
                                    }))
                                ]
                            }),
                        ],
                    },
                ],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `Отчет_${startDate}_${endDate}.docx`);
            toast.success('DOCX отчет скачан');
        } catch (error: any) {
            toast.error('Ошибка DOCX: ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-text1">Отчеты и Аналитика</h1>
                    <p className="text-neutral-text2 mt-1">Детальная статистика и экспорт данных</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={exportPDF} disabled={!data || generating}
                        className="flex items-center px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        <FileText className="w-4 h-4 mr-2" /> PDF
                    </button>
                    <button
                        onClick={exportExcel} disabled={!data || generating}
                        className="flex items-center px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                    </button>
                    <button
                        onClick={exportDOCX} disabled={!data || generating}
                        className="flex items-center px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        <File className="w-4 h-4 mr-2" /> DOCX
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-neutral-bg2/80 backdrop-blur-xl rounded-2xl border border-neutral-border p-5 flex flex-wrap items-end gap-4 shadow-sm">
                <div>
                    <label className="block text-sm font-medium text-neutral-text2 mb-1">Начало периода</label>
                    <input
                        type="date"
                        value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="px-3 py-2 bg-neutral-bg3 border border-neutral-border rounded-xl text-white focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-text2 mb-1">Конец периода</label>
                    <input
                        type="date"
                        value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="px-3 py-2 bg-neutral-bg3 border border-neutral-border rounded-xl text-white focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="px-6 py-2 bg-primary hover:bg-primary-light text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 flex items-center h-[42px]"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Показать'}
                </button>
            </div>

            {/* Dashboard Stats */}
            {data && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-neutral-bg2/80 border border-neutral-border rounded-2xl p-5 shadow-sm">
                            <h3 className="text-neutral-text3 text-sm font-medium mb-1">Общий доход</h3>
                            <div className="text-2xl font-bold tracking-tight text-white mb-1">
                                {data.totalIncome.toLocaleString()} ₸
                            </div>
                        </div>
                        <div className="bg-neutral-bg2/80 border border-neutral-border rounded-2xl p-5 shadow-sm">
                            <h3 className="text-neutral-text3 text-sm font-medium mb-1">Завершено</h3>
                            <div className="text-2xl font-bold tracking-tight text-green-400 mb-1">
                                {data.completedAppointments}
                            </div>
                            <div className="text-xs text-neutral-text3">Из {data.totalAppointments} записей</div>
                        </div>
                        <div className="bg-neutral-bg2/80 border border-neutral-border rounded-2xl p-5 shadow-sm">
                            <h3 className="text-neutral-text3 text-sm font-medium mb-1">Отменено</h3>
                            <div className="text-2xl font-bold tracking-tight text-red-500 mb-1">
                                {data.cancelledAppointments}
                            </div>
                            <div className="text-xs text-neutral-text3">{(data.cancelledAppointments / (data.totalAppointments || 1) * 100).toFixed(1)}% отказов</div>
                        </div>
                        <div className="bg-neutral-bg2/80 border border-neutral-border rounded-2xl p-5 shadow-sm">
                            <h3 className="text-neutral-text3 text-sm font-medium mb-1">Топ мастер</h3>
                            <div className="text-lg font-bold tracking-tight text-white mb-1 truncate">
                                {data.workersStats[0]?.name || 'Нет данных'}
                            </div>
                            <div className="text-xs text-neutral-text3">{data.workersStats[0]?.count || 0} записей</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Income Chart */}
                        <div className="bg-neutral-bg2/80 border border-neutral-border rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-neutral-text1 mb-6">Динамика дохода</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.dailyStats}>
                                        <defs>
                                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#404040" vertical={false} />
                                        <XAxis dataKey="date" stroke="#A3A3A3" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#A3A3A3" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#404040', borderRadius: '12px' }}
                                            itemStyle={{ color: '#F5F5F5' }}
                                        />
                                        <Area type="monotone" dataKey="income" name="Доход ₸" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Services Chart */}
                        <div className="bg-neutral-bg2/80 border border-neutral-border rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-neutral-text1 mb-6">Популярные услуги</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.servicesStats.slice(0, 5)} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#404040" horizontal={false} />
                                        <XAxis type="number" stroke="#A3A3A3" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis dataKey="name" type="category" stroke="#A3A3A3" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#404040', borderRadius: '12px' }}
                                            itemStyle={{ color: '#F5F5F5' }}
                                            cursor={{ fill: '#333' }}
                                        />
                                        <Bar dataKey="count" name="Записей" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
