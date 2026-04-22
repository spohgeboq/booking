const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

async function fetchPublic(endpoint: string, options: RequestInit = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
}

export const api = {
    auth: {
        login: (credentials: any) => fetchPublic('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        }),
    },
    services: {
        getAll: () => fetchPublic('/api/services'),
    },
    employees: {
        getAll: () => fetchPublic('/api/employees'),
    },
    schedules: {
        getAll: () => fetchPublic('/api/schedules'),
    },
    settings: {
        get: () => fetchPublic('/api/settings'),
    },
    appointments: {
        getAll: (params?: any) => {
            const query = params ? `?${new URLSearchParams(params)}` : '';
            return fetchPublic(`/api/appointments${query}`);
        },
        getOne: (id: string) => fetchPublic(`/api/appointments/${id}`),
        create: (data: any) => fetchPublic('/api/appointments', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => fetchPublic(`/api/appointments/${id}`, {
            method: 'DELETE',
        }),
        // Для уведомления об отмене клиентом
        notifyClientCancel: (data: any) => fetchPublic('/api/notify-client-cancel', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        // Для уведомления о новой записи
        notifyBooking: (data: any) => fetchPublic('/api/notify-booking', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    }
};
