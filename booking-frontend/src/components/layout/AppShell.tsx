import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Header } from './Header';
import { Footer } from './Footer';
import { BookingModal } from '../booking/BookingModal';
import { AppointmentsDrawer } from '../booking/AppointmentsDrawer';
import { useBookingStore } from '../../store/useBookingStore';

export function AppShell({ children }: { children: ReactNode }) {
    const { isAppointmentsOpen, closeAppointments } = useBookingStore();
    return (
        <div className="min-h-[100dvh] flex flex-col relative overflow-hidden bg-neutral-bg1">
            {/* Мягкое атмосферное свечение на фоне (акцентный цвет) */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-brand/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Основной контент */}
            <Header />
            <main className="flex-1 w-full mx-auto relative z-10 flex flex-col">
                {children}
            </main>
            <Footer />
            <BookingModal />
            <AppointmentsDrawer isOpen={isAppointmentsOpen} onClose={closeAppointments} />
        </div>
    );
}

export function PageTransition({ children }: { children: ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} // Элегантный ease-out
            className="flex-1 flex flex-col"
        >
            {children}
        </motion.div>
    );
}
