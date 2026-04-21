// src/services/api.client.ts
import { StorageHelper } from './storage';
import { API_HOST } from '../config/constants';

// Detectar si estamos en Android emulator, iOS simulator o dispositivo real
// Para device real en red local: 192.168.100.133:3000
const API_URL = API_HOST;

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number>;
}

// Custom API client using Fetch API
class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string, timeout: number = 40000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  // Helper to add timeout to fetch
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Add authorization header
  private async getHeaders(
    headers: Record<string, string> = {},
  ): Promise<Record<string, string>> {
    try {
      const token = StorageHelper.getItem('authToken');
      const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      if (token) {
        defaultHeaders.Authorization = `Bearer ${token}`;
      } else {
        // Importante: warning útil para endpoints que requieren auth
        console.warn('⚠️ [API] No auth token found');
      }

      return defaultHeaders;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return {
        'Content-Type': 'application/json',
        ...headers,
      };
    }
  }

  // Handle response
  private async handleResponse(response: Response): Promise<unknown> {
    if (response.status === 401) {
      // Token expired - clear storage and don't try to refresh
      StorageHelper.removeItem('authToken');
      StorageHelper.removeItem('user');
      throw new Error(
        'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        statusText: response.statusText,
        data: errorData,
      };
    }

    return response.json().catch(() => ({}));
  }

  // Refresh token (disabled - use login instead)
  private async refreshToken(): Promise<void> {
    // Instead of trying to refresh, just logout
    StorageHelper.removeItem('authToken');
    StorageHelper.removeItem('user');
    throw new Error(
      'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
    );
  }

  // Build URL with query params
  private buildUrl(
    endpoint: string,
    params?: Record<string, string | number>,
  ): string {
    // Ensure endpoint starts with / and add /api prefix if not already present
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const apiPath = path.startsWith('/api') ? path : `/api${path}`;
    let url = `${this.baseURL}${apiPath}`;
    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ).toString();
      url += `?${queryString}`;
    }
    return url;
  }

  // GET request
  async get<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const headers = await this.getHeaders(
      fetchOptions.headers as Record<string, string> | undefined,
    );
    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      ...fetchOptions,
      headers,
    });
    return this.handleResponse(response) as Promise<T>;
  }

  // POST request
  async post<T>(
    endpoint: string,
    data?: unknown,
    options: FetchOptions = {},
  ): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const headers = await this.getHeaders(
      fetchOptions.headers as Record<string, string> | undefined,
    );
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      ...fetchOptions,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse(response) as Promise<T>;
  }

  // PUT request
  async put<T>(
    endpoint: string,
    data?: unknown,
    options: FetchOptions = {},
  ): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const headers = await this.getHeaders(
      fetchOptions.headers as Record<string, string> | undefined,
    );
    const response = await this.fetchWithTimeout(url, {
      method: 'PUT',
      ...fetchOptions,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse(response) as Promise<T>;
  }

  // DELETE request
  async delete<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const headers = await this.getHeaders(
      fetchOptions.headers as Record<string, string> | undefined,
    );
    const response = await this.fetchWithTimeout(url, {
      method: 'DELETE',
      ...fetchOptions,
      headers,
    });
    return this.handleResponse(response) as Promise<T>;
  }
}

const api = new ApiClient(API_URL);

export default api;
