const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
}

export const api = {
    auth: {
        login: (credentials: any) => fetchWithAuth('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        }),
        me: () => fetchWithAuth('/api/auth/me'),
    },
    services: {
        getAll: () => fetchWithAuth('/api/services'),
        getOne: (id: string) => fetchWithAuth(`/api/services/${id}`),
        create: (data: any) => fetchWithAuth('/api/services', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: any) => fetchWithAuth(`/api/services/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => fetchWithAuth(`/api/services/${id}`, {
            method: 'DELETE',
        }),
    },
    employees: {
        getAll: () => fetchWithAuth('/api/employees'),
        getOne: (id: string) => fetchWithAuth(`/api/employees/${id}`),
        create: (data: any) => fetchWithAuth('/api/employees', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: any) => fetchWithAuth(`/api/employees/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => fetchWithAuth(`/api/employees/${id}`, {
            method: 'DELETE',
        }),
    },
    appointments: {
        getAll: (params?: any) => {
            const query = params ? `?${new URLSearchParams(params)}` : '';
            return fetchWithAuth(`/api/appointments${query}`);
        },
        getOne: (id: string) => fetchWithAuth(`/api/appointments/${id}`),
        create: (data: any) => fetchWithAuth('/api/appointments', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: any) => fetchWithAuth(`/api/appointments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => fetchWithAuth(`/api/appointments/${id}`, {
            method: 'DELETE',
        }),
        getAvailableSlots: (data: any) => fetchWithAuth('/api/available-slots', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        notifyDeletion: (data: any) => fetchWithAuth('/api/notify-deletion', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    },
    schedules: {
        getAll: (params?: any) => {
            const query = params ? `?${new URLSearchParams(params)}` : '';
            return fetchWithAuth(`/api/schedules${query}`);
        },
        update: (data: any) => fetchWithAuth('/api/schedules', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    },
    settings: {
        get: () => fetchWithAuth('/api/settings'),
        update: (data: any) => fetchWithAuth('/api/settings', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    },
    upload: async (file: File) => {
        const token = localStorage.getItem('auth_token');
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${BASE_URL}/api/upload`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Ошибка загрузки' }));
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }
};
