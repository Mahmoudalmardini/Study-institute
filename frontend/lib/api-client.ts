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


// Short-lived GET cache to absorb double-invocations (prevents 429). Keyed per token so users never share entries.
const cache = new Map<string, { expires: number; data: any }>();
const GET_CACHE_TTL_MS = 5000;
const CACHE_MAX_ENTRIES = 200;

function buildKey(config: any, token: string | null) {
  const url = config?.url || '';
  const params = config?.params ? JSON.stringify(config.params) : '';
  return `${token ?? ''}|${(config.method || 'get').toLowerCase()}:${url}?${params}`;
}

function remember(key: string, data: any) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
    if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
  }
  cache.set(key, { expires: Date.now() + GET_CACHE_TTL_MS, data });
}

export function clearApiCache() {
  cache.clear();
}

// Refresh tokens are single-use, so concurrent 401s must share one refresh call
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(refreshToken: string): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, { refreshToken })
      .then((response) => {
        const payload = response.data?.data ?? response.data;
        localStorage.setItem('accessToken', payload.accessToken);
        localStorage.setItem('refreshToken', payload.refreshToken);
        cache.clear();
        return payload.accessToken as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if ((config.method || 'get').toLowerCase() === 'get') {
      const key = buildKey(config, token);
      (config as any).__cacheKey = key;
      const cached = cache.get(key);
      if (cached && cached.expires > Date.now()) {
        (config as any).__fromCache = true;
        // Short-circuit the request with the cached (already unwrapped) response
        config.adapter = async () => ({
          data: cached.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          request: undefined,
        });
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: unwrap the API envelope, maintain the cache, refresh expired tokens
apiClient.interceptors.response.use(
  (response) => {
    const config = response.config as any;
    if (config.__fromCache) {
      return response.data;
    }

    // Paginated responses (data AND meta) are returned whole; everything else is unwrapped
    const body = response.data;
    const data = body && body.data && body.meta ? body : body?.data || body;

    if ((config.method || 'get').toLowerCase() === 'get') {
      if (config.__cacheKey) remember(config.__cacheKey, data);
    } else {
      // Any write can change what a cached GET would return
      cache.clear();
    }
    return data;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      if (refreshToken) {
        try {
          const accessToken = await refreshAccessToken(refreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            cache.clear();
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }
    }

    // Handle 429 rate limit with exponential backoff and limited retries
    // Only retry GET requests, not POST/PUT/DELETE (state-changing operations)
    if (error.response?.status === 429 && originalRequest) {
      const method = (originalRequest.method || 'get').toLowerCase();
      if (method === 'get') {
        originalRequest.__retryCount = originalRequest.__retryCount || 0;
        if (originalRequest.__retryCount < 3) {
          originalRequest.__retryCount += 1;
          const delayMs = 500 * Math.pow(2, originalRequest.__retryCount - 1);
          await new Promise((r) => setTimeout(r, delayMs));
          return apiClient(originalRequest);
        }
      }
    }

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
export async function getInstallmentsOverview(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  month?: number;
  year?: number;
}) {
  // Filter out undefined or empty values
  const cleanParams: Record<string, any> = {};
  if (params.page) cleanParams.page = params.page;
  if (params.limit) cleanParams.limit = params.limit;
  if (params.search) cleanParams.search = params.search;
  if (params.status && params.status !== 'all') cleanParams.status = params.status;
  if (params.month) cleanParams.month = params.month;
  if (params.year) cleanParams.year = params.year;

  return apiClient.get('/installments/overview', { params: cleanParams });
}

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

