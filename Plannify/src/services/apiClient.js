import { API_CONFIG } from '../config/buildConfig';

const BASE_URL = API_CONFIG.BASE_URL;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Standardized HTTP request handler with authentication, JSON serialization,
 * and unified error extraction.
 */
async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    token,
    body,
    headers = {},
    ...customOptions
  } = options;

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers: requestHeaders,
    ...customOptions,
  };

  if (body !== undefined && body !== null) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, config);

  let data;
  try {
    data = await response.json();
  } catch (_e) {
    data = null;
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `HTTP Error ${response.status}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data;
}

export const apiClient = {
  get: (endpoint, token, options = {}) =>
    request(endpoint, { method: 'GET', token, ...options }),

  post: (endpoint, body, token, options = {}) =>
    request(endpoint, { method: 'POST', body, token, ...options }),

  put: (endpoint, body, token, options = {}) =>
    request(endpoint, { method: 'PUT', body, token, ...options }),

  delete: (endpoint, token, options = {}) =>
    request(endpoint, { method: 'DELETE', token, ...options }),

  request,
};

export default apiClient;
