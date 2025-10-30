import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simple in-flight GET request de-duplication + short-lived cache to avoid hammering server (prevents 429)
const inflight = new Map<string, Promise<any>>();
const cache = new Map<string, { expires: number; data: any }>();
const GET_CACHE_TTL_MS = 5000; // 5s cache to absorb double-invocations and hot reloads

function buildKey(config: any) {
  const url = config?.url || '';
  const params = config?.params ? JSON.stringify(config.params) : '';
  return `${config.method || 'get'}:${url}?${params}`;
}

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // De-duplicate GETs
    if ((config.method || 'get').toLowerCase() === 'get') {
      const key = buildKey(config);
      // Serve from cache when fresh
      const cached = cache.get(key);
      if (cached && cached.expires > Date.now()) {
        // Use a custom adapter to short-circuit the request with cached response
        config.adapter = async () => ({
          data: cached.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          request: undefined,
        });
        return config;
      }
      if (inflight.has(key)) {
        // @ts-expect-error reuse
        return inflight.get(key);
      }
      const promise = Promise.resolve(config);
      inflight.set(key, promise);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Return the data directly
    const data = response.data?.data || response.data;
    // Clear inflight cache for this response
    try {
      const key = buildKey(response.config);
      inflight.delete(key);
      if ((response.config.method || 'get').toLowerCase() === 'get') {
        cache.set(key, { expires: Date.now() + GET_CACHE_TTL_MS, data });
      }
    } catch {}
    return data;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle 429 rate limit with exponential backoff and limited retries
    if (error.response?.status === 429) {
      originalRequest.__retryCount = originalRequest.__retryCount || 0;
      if (originalRequest.__retryCount < 5) {
        originalRequest.__retryCount += 1;
        const delayMs = 500 * Math.pow(2, originalRequest.__retryCount - 1);
        await new Promise((r) => setTimeout(r, delayMs));
        return apiClient(originalRequest);
      }
    }

    // Clear inflight on error
    try {
      const key = buildKey(originalRequest);
      inflight.delete(key);
    } catch {}

    return Promise.reject(error);
  }
);

export default apiClient;

export async function getTeacherMyStudents() {
  return apiClient.get('/teachers/me/students');
}

export async function createPoint(payload: { studentId: string; subjectId?: string; amount: number }) {
  return apiClient.post('/points', payload);
}

export async function getPointSummary(studentId: string, date?: string) {
  const params = date ? { date } : undefined;
  return apiClient.get(`/points/students/${studentId}/summary`, { params });
}

export async function getMyPointSummary(date?: string) {
  const params = date ? { date } : undefined;
  return apiClient.get('/points/me/summary', { params });
}

export async function listPointTransactions(studentId: string, limit = 50, cursor?: string) {
  const params: Record<string, any> = { limit };
  if (cursor) params.cursor = cursor;
  return apiClient.get(`/points/students/${studentId}/transactions`, { params });
}

export async function getStudentSubjects(studentId: string) {
  return apiClient.get(`/students/${studentId}/subjects`);
}

