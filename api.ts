import { AnalyticsSummary, User, UserDetails, Case, Category, SendNotificationRequest } from './types';

const API_URL = '/api/analytics';

// Internal helper to get the admin password from localStorage
const getAdminPassword = () => {
    return localStorage.getItem('admin_password') || '';
};

// Internal fetch wrapper that includes the security header
const secureFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
        ...options.headers,
        'X-Admin-Password': getAdminPassword(),
    };

    const response = await fetch(url, { ...options, headers });

    // If we get an unauthorized error, we might want to clear the password
    if (response.status === 401) {
        localStorage.removeItem('admin_password');
        // window.location.reload(); // Causing loops
        throw new Error('Unauthorized');
    }

    return response;
};

export const fetchSummary = async (days: number): Promise<AnalyticsSummary> => {
    const response = await secureFetch(`${API_URL}/summary?days=${days}`);
    if (!response.ok) {
        throw new Error('Failed to fetch summary');
    }
    return response.json();
};

export const fetchUserTrend = async (days: number) => {
    const response = await secureFetch(`${API_URL}/users/trend?days=${days}`);
    if (!response.ok) {
        throw new Error('Failed to fetch user trend');
    }
    return response.json();
};

export const fetchGameplayTrend = async (days: number) => {
    const response = await secureFetch(`${API_URL}/gameplays/trend?days=${days}`);
    if (!response.ok) {
        throw new Error('Failed to fetch gameplay trend');
    }
    return response.json();
};

export const fetchRecentUsers = async (limit: number = 10): Promise<User[]> => {
    const response = await secureFetch(`${API_URL}/users/recent?limit=${limit}`);
    if (!response.ok) {
        throw new Error('Failed to fetch recent users');
    }
    const data = await response.json();
    return Array.isArray(data) ? data : data.users;
};

export interface PaginatedUsersResponse {
    users: User[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const fetchPaginatedUsers = async (page: number = 1, limit: number = 10, search: string = ''): Promise<PaginatedUsersResponse> => {
    const response = await secureFetch(`${API_URL}/users/recent?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch users');
    }
    return response.json();
};

export const fetchTimezones = async () => {
    const response = await secureFetch(`${API_URL}/users/timezones`);
    if (!response.ok) {
        throw new Error('Failed to fetch timezones');
    }
    return response.json();
};

export const fetchUserDetails = async (userId: string): Promise<UserDetails> => {
    const response = await secureFetch(`${API_URL}/users/${userId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch user details');
    }
    return response.json();
};

export const sendNotification = async (userId: string, notification: SendNotificationRequest) => {
    const response = await secureFetch(`${API_URL}/users/${userId}/send-notification`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send notification');
    }
    return response.json();
};

export const sendNotificationByTopic = async (topic: string, notification: SendNotificationRequest) => {
    const response = await secureFetch(`${API_URL}/notifications/send-by-topic`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            topic,
            ...notification
        }),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send notification');
    }
    return response.json();
};

export const fetchCases = async (): Promise<Case[]> => {
    const response = await secureFetch(`${API_URL}/cases`);
    if (!response.ok) {
        throw new Error('Failed to fetch cases');
    }
    return response.json();
};

export const fetchCategories = async (): Promise<Category[]> => {
    const response = await secureFetch(`${API_URL}/categories`);
    if (!response.ok) {
        throw new Error('Failed to fetch categories');
    }
    return response.json();
};

export const fetchCasesByCategory = async (category: string): Promise<Case[]> => {
    const response = await secureFetch(`${API_URL}/cases/category/${encodeURIComponent(category)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch cases by category');
    }
    return response.json();
};

export interface ActiveUsersByDateResponse {
    date: string;
    users: Array<{
        _id: string;
        name: string;
        email: string;
        platform: string;
        isPremium: boolean;
        createdAt: string;
        gamesPlayedOnDate: number;
    }>;
    count: number;
}

export const fetchActiveUsersByDate = async (date: string): Promise<ActiveUsersByDateResponse> => {
    const response = await secureFetch(`${API_URL}/gameplays/users-by-date/${date}`);
    if (!response.ok) {
        throw new Error('Failed to fetch active users for date');
    }
    return response.json();
};

export const fetchActiveQuizUsersByDate = async (date: string): Promise<ActiveUsersByDateResponse> => {
    const response = await secureFetch(`${API_URL}/quizzes/users-by-date/${date}`);
    if (!response.ok) {
        throw new Error('Failed to fetch active quiz users for date');
    }
    return response.json();
};
