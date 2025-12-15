import axios from 'axios';

// Get API URL from environment or use current origin as fallback
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:3001/api';
};

const API_URL = getApiUrl();

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
    // If it's a paginated response (has data AND meta), return the whole body
    if (response.data && response.data.data && response.data.meta) {
      const data = response.data;
      // Clear inflight cache logic (duplicated below but needed here to return early)
      try {
        const key = buildKey(response.config);
        inflight.delete(key);
        if ((response.config.method || 'get').toLowerCase() === 'get') {
          cache.set(key, { expires: Date.now() + GET_CACHE_TTL_MS, data });
        }
      } catch {}
      return data;
    }

    // Return the data directly for non-paginated responses
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
    // Only retry GET requests, not POST/PUT/DELETE (state-changing operations)
    if (error.response?.status === 429) {
      const method = (originalRequest.method || 'get').toLowerCase();
      // Only retry GET requests to avoid duplicate state changes
      if (method === 'get') {
        originalRequest.__retryCount = originalRequest.__retryCount || 0;
        if (originalRequest.__retryCount < 3) {
          originalRequest.__retryCount += 1;
          const delayMs = 500 * Math.pow(2, originalRequest.__retryCount - 1);
          await new Promise((r) => setTimeout(r, delayMs));
          return apiClient(originalRequest);
        }
      }
      // For POST/PUT/DELETE, don't retry - just reject immediately
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

export async function getTeacherProfile() {
  return apiClient.get('/teachers/me');
}

export async function createPoint(payload: { studentId: string; subjectId?: string; amount: number }) {
  return apiClient.post('/points', payload);
}

export async function getPointSummary(studentId: string, date?: string) {
  const params = date ? { date } : undefined;
  return apiClient.get(`/points/students/${studentId}/summary`, { params });
}

export async function getBatchPointSummaries(studentIds: string[], date?: string) {
  return apiClient.post('/points/students/batch-summaries', { studentIds, date });
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

// Installments API
export async function getStudentInstallments(studentId: string, year?: number) {
  const params = year ? { year } : undefined;
  return apiClient.get(`/installments/student/${studentId}`, { params });
}

export async function getStudentOutstandingBalance(studentId: string) {
  return apiClient.get(`/installments/student/${studentId}/outstanding`);
}

export async function calculateInstallment(
  studentId: string,
  month: number,
  year: number,
) {
  return apiClient.post(`/installments/student/${studentId}/calculate`, {
    month,
    year,
  });
}

export async function createDiscount(data: {
  studentId: string;
  amount?: number;
  percent?: number;
  reason?: string;
}) {
  return apiClient.post('/installments/discounts', data);
}

export async function cancelDiscount(discountId: string) {
  return apiClient.delete(`/installments/discounts/${discountId}`);
}

export async function recordPayment(data: {
  studentId: string;
  installmentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
}) {
  return apiClient.post('/installments/payments', data);
}

// Student endpoints
export async function getMyInstallments(year?: number) {
  const params = year ? { year } : undefined;
  return apiClient.get('/installments/my-installments', { params });
}

export async function getMyOutstanding() {
  return apiClient.get('/installments/my-outstanding');
}

export async function getMyCurrentMonthInstallment() {
  return apiClient.get('/installments/my-current-month');
}

