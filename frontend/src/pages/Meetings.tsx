import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, List, Clock, Plus } from 'lucide-react';
import { ListView } from '../components/meetings/ListView';
import { CalendarView } from '../components/meetings/CalendarView';
import { ScheduleView } from '../components/meetings/ScheduleView';

type ViewMode = 'calendar' | 'list' | 'schedule';

export function Meetings() {
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-text1">Встречи</h1>
                    <p className="text-neutral-text2 mt-1">Управление записями и расписанием</p>
                </div>

                <button className="flex items-center justify-center px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary/20">
                    <Plus className="w-5 h-5 mr-2" />
                    Новая запись
                </button>
            </div>

            <div className="flex bg-neutral-bg3/50 p-1 rounded-xl w-fit border border-neutral-border">
                <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'list'
                            ? 'bg-neutral-bg2 text-primary shadow-sm'
                            : 'text-neutral-text2 hover:text-neutral-text1'
                        }`}
                >
                    <List className="w-4 h-4 mr-2" />
                    Список
                </button>
                <button
                    onClick={() => setViewMode('calendar')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'calendar'
                            ? 'bg-neutral-bg2 text-primary shadow-sm'
                            : 'text-neutral-text2 hover:text-neutral-text1'
                        }`}
                >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Календарь
                </button>
                <button
                    onClick={() => setViewMode('schedule')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'schedule'
                            ? 'bg-neutral-bg2 text-primary shadow-sm'
                            : 'text-neutral-text2 hover:text-neutral-text1'
                        }`}
                >
                    <Clock className="w-4 h-4 mr-2" />
                    Расписание
                </button>
            </div>

            <div className="bg-neutral-bg2/80 backdrop-blur-xl rounded-2xl border border-neutral-border p-6 shadow-xl min-h-[500px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={viewMode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {viewMode === 'list' && <ListView />}
                        {viewMode === 'calendar' && <CalendarView />}
                        {viewMode === 'schedule' && <ScheduleView />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
