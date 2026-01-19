export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('auth_token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));

        // Handle different error response formats
        let errorMessage: string;
        if (typeof errorBody.error === 'string') {
            // Standard API error: { error: "message" }
            errorMessage = errorBody.error;
        } else if (errorBody.error?.name === 'ZodError' && errorBody.error?.message) {
            // Hono zod-validator error: { success: false, error: { name: "ZodError", message: "[...issues JSON...]" } }
            try {
                const issues = JSON.parse(errorBody.error.message);
                errorMessage = issues.map((i: { message: string; path?: string[] }) =>
                    i.path?.length ? `${i.path.join('.')}: ${i.message}` : i.message
                ).join(', ');
            } catch {
                errorMessage = errorBody.error.message;
            }
        } else if (errorBody.error?.issues) {
            // Direct Zod validation error: { error: { issues: [...] } }
            const issues = errorBody.error.issues;
            errorMessage = issues.map((i: { message: string; path?: string[] }) =>
                i.path?.length ? `${i.path.join('.')}: ${i.message}` : i.message
            ).join(', ');
        } else if (errorBody.message) {
            // Generic error: { message: "..." }
            errorMessage = errorBody.message;
        } else {
            errorMessage = `Request failed with status ${response.status}`;
        }

        throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

export function setAuthToken(token: string) {
    localStorage.setItem('auth_token', token);
}

export function clearAuthToken() {
    localStorage.removeItem('auth_token');
}

export function getAuthToken() {
    return localStorage.getItem('auth_token');
}
