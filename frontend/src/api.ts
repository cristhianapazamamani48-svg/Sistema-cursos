// Cliente centralizado de API con gestión de cookies y protección CSRF

export interface ApiOptions extends RequestInit {
  skipAuthRedirect?: boolean;
}

let _csrfToken = '';
let _onUnauthorized: ((notice?: string) => void) | null = null;

export function setCsrfToken(token: string) {
  _csrfToken = token;
}

export function getCsrfToken(): string {
  return _csrfToken;
}

export function setOnUnauthorized(handler: ((notice?: string) => void) | null) {
  _onUnauthorized = handler;
}

export async function api(url: string, options: ApiOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const method = (options.method || 'GET').toUpperCase();
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (mutatingMethods.includes(method) && _csrfToken) {
    headers['x-csrf-token'] = _csrfToken;
  }

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  // Interceptor para expiración de sesión o 401 no autenticado
  if (res.status === 401 && !options.skipAuthRedirect) {
    if (!url.includes('/api/auth/login') && !url.includes('/api/auth/logout') && _onUnauthorized) {
      _onUnauthorized('Sesión cerrada');
    }
  }

  return res;
}
