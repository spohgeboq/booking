import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookingStore } from '../../store/useBookingStore';
import { X, ArrowLeft } from 'lucide-react';

// Шаги бронирования
import { ServiceSelection } from './steps/ServiceSelection';
import { MasterSelection } from './steps/MasterSelection';
import { DateTimeSelection } from './steps/DateTimeSelection';
import { ClientDetails } from './steps/ClientDetails';
import { Confirmation } from './steps/Confirmation';

export function BookingModal() {
    const { isOpen, currentStep, setStep, closeBooking } = useBookingStore();

    // Блокировка скролла страницы при открытой модалке
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    // Определение компонентов для каждого шага
    const renderStep = () => {
        switch (currentStep) {
            case 'SERVICE_SELECTION': return <ServiceSelection key="step1" />;
            case 'MASTER_SELECTION': return <MasterSelection key="step2" />;
            case 'DATETIME_SELECTION': return <DateTimeSelection key="step3" />;
            case 'CLIENT_DETAILS': return <ClientDetails key="step4" />;
            case 'CONFIRMATION': return <Confirmation key="step5" />;
            default: return null;
        }
    };

    // Кнопка "Назад"
    const handleBack = () => {
        switch (currentStep) {
            case 'MASTER_SELECTION': setStep('SERVICE_SELECTION'); break;
            case 'DATETIME_SELECTION': setStep('MASTER_SELECTION'); break;
            case 'CLIENT_DETAILS': setStep('DATETIME_SELECTION'); break;
        }
    };

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                {/* Backdrop overlay */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-neutral-bg1/80 backdrop-blur-sm"
                    onClick={closeBooking}
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-lg bg-neutral-bg2 sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl overflow-hidden glass border-border h-[90vh] sm:h-[80vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border-subtle shrink-0">
                        {currentStep !== 'SERVICE_SELECTION' && currentStep !== 'CONFIRMATION' ? (
                            <button onClick={handleBack} className="touch-target rounded-full hover:bg-white/5 text-text-secondary hover:text-white transition-colors">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                        ) : (
                            <div className="w-12" /> // Placeholder для выравнивания заголовка по центру
                        )}

                        <div className="flex gap-2">
                            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                {currentStep === 'CONFIRMATION' ? 'Успешно' : 'Онлайн-запись'}
                            </span>
                        </div>

                        <button onClick={closeBooking} className="touch-target rounded-full hover:bg-white/5 text-text-secondary hover:text-white transition-colors bg-white/[0.03]">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    {currentStep !== 'CONFIRMATION' && (
                        <div className="w-full bg-white/[0.02] h-1">
                            <motion.div
                                className="h-full bg-brand"
                                initial={{ width: '20%' }}
                                animate={{
                                    width: currentStep === 'SERVICE_SELECTION' ? '20%' :
                                        currentStep === 'MASTER_SELECTION' ? '40%' :
                                            currentStep === 'DATETIME_SELECTION' ? '60%' :
                                                currentStep === 'CLIENT_DETAILS' ? '80%' : '100%'
                                }}
                            />
                        </div>
                    )}

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                        <AnimatePresence mode="wait">
                            {renderStep()}
                        </AnimatePresence>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
