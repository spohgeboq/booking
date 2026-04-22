import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Определение структуры каждого шага бронирования
export type BookingStep =
    | 'SERVICE_SELECTION'
    | 'MASTER_SELECTION'
    | 'DATETIME_SELECTION'
    | 'CLIENT_DETAILS'
    | 'CONFIRMATION';

export interface Appointment {
    id: string;
    dbId?: string; // UUID из базы данных для синхронизации
    date: Date;
    selectedServices: string[];
    serviceId?: string; // Для обратной совместимости со старыми записями в localStorage
    masterId: string | null;
    status: 'active' | 'cancelled';
    clientName: string;
    clientPhone: string;
}

interface BookingState {
    isOpen: boolean;
    isAppointmentsOpen: boolean;
    currentStep: BookingStep;
    selectedServices: string[];
    masterId: string | null;
    dateTime: Date | null;
    clientDetails: { name: string; phone: string } | null;

    appointments: Appointment[];

    // Действия
    openBooking: () => void;
    closeBooking: () => void;
    openAppointments: () => void;
    closeAppointments: () => void;
    setStep: (step: BookingStep) => void;
    addService: (id: string) => void;
    removeService: (id: string) => void;
    setMaster: (id: string | null) => void; // null значит "Любой свободный"
    setDateTime: (date: Date) => void;
    setClientDetails: (details: { name: string; phone: string }) => void;
    startBookingWithMaster: (masterId: string, serviceIds: string[]) => void;
    startBookingWithService: (serviceId: string) => void;
    resetBooking: () => void;

    addAppointment: (apt: Omit<Appointment, 'id' | 'status'>) => void;
    removeAppointment: (id: string) => void;
    updateAppointment: (id: string, changes: Partial<Appointment>) => void;
}

export const useBookingStore = create<BookingState>()(
    persist(
        (set) => ({
            isOpen: false,
            isAppointmentsOpen: false,
            currentStep: 'SERVICE_SELECTION',
            selectedServices: [],
            masterId: null,
            dateTime: null,
            clientDetails: null,
            appointments: [],

            openBooking: () => set({ isOpen: true }),
            closeBooking: () => set({ isOpen: false }),
            openAppointments: () => set({ isAppointmentsOpen: true }),
            closeAppointments: () => set({ isAppointmentsOpen: false }),
            setStep: (step) => set({ currentStep: step }),
            addService: (id) => set((state) => {
                // Если данные клиента уже есть, значит он добавляет услугу со страницы CONFIRMATION
                const nextStep = state.clientDetails ? 'CONFIRMATION' : 'MASTER_SELECTION';
                // Проверяем, нет ли уже такой услуги, чтобы не дублировать
                if (state.selectedServices.includes(id)) return state;
                return {
                    selectedServices: [...state.selectedServices, id],
                    currentStep: nextStep
                };
            }),
            removeService: (id) => set((state) => ({
                selectedServices: state.selectedServices.filter(s => s !== id)
            })),
            setMaster: (id) => set({ masterId: id, currentStep: 'DATETIME_SELECTION' }),
            setDateTime: (date) => set({ dateTime: date, currentStep: 'CLIENT_DETAILS' }),
            setClientDetails: (details) => set({ clientDetails: details, currentStep: 'CONFIRMATION' }),
            startBookingWithMaster: (masterId, serviceIds) => set({
                masterId,
                selectedServices: serviceIds,
                currentStep: 'DATETIME_SELECTION',
                isOpen: true,
                dateTime: null,
                clientDetails: null
            }),
            startBookingWithService: (serviceId) => set({
                selectedServices: [serviceId],
                currentStep: 'MASTER_SELECTION',
                isOpen: true,
                masterId: null,
                dateTime: null,
                clientDetails: null
            }),
            resetBooking: () => set({
                currentStep: 'SERVICE_SELECTION',
                selectedServices: [],
                masterId: null,
                dateTime: null,
                clientDetails: null
            }),
            addAppointment: (apt) => set((state) => ({
                appointments: [...state.appointments, { ...apt, id: Date.now().toString(), status: 'active' }]
            })),
            removeAppointment: (id) => set((state) => ({
                appointments: state.appointments.filter(a => a.id !== id)
            })),
            updateAppointment: (id, changes) => set((state) => ({
                appointments: state.appointments.map(a => a.id === id ? { ...a, ...changes } : a)
            }))
        }),
        {
            name: 'laura-booking-storage',
            partialize: (state) => ({ appointments: state.appointments }), // Сохраняем в localStorage только массив записей
        }
    )
);
