/**
 * Tenant-aware Fetch API client with automatic session header propagation
 */
export class ApiClient {
  private static baseUrl = '/api/v1';

  public static async get<T>(endpoint: string, tenantSlug?: string): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (tenantSlug) {
      headers['X-Tenant-Slug'] = tenantSlug;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'API request failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  public static async post<T>(endpoint: string, data: unknown, tenantSlug?: string): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (tenantSlug) {
      headers['X-Tenant-Slug'] = tenantSlug;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'API request failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  }
}
