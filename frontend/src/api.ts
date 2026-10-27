// Cliente centralizado de API con gestión de cookies y protección CSRF

let _csrfToken = '';

export function setCsrfToken(token: string) {
  _csrfToken = token;
}

export function getCsrfToken(): string {
  return _csrfToken;
}

export async function api(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const method = (options.method || 'GET').toUpperCase();
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (mutatingMethods.includes(method) && _csrfToken) {
    headers['x-csrf-token'] = _csrfToken;
  }

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });
}
