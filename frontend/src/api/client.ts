import axios from 'axios';
import { Member, Receipt, Practice, PracticeType, DashboardData, StreetData, MemberStatement } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// --- CSRF handling ---
// When the frontend and backend share the same site, axios can read the
// "csrftoken" cookie directly and echo it back automatically. But when they
// are on different domains (e.g. a Vercel frontend calling a PythonAnywhere
// backend), browsers never expose one site's cookies to another site's
// JavaScript -- so that automatic cookie-reading approach silently does
// nothing there. Instead, we fetch the token from a small JSON endpoint
// (readable cross-origin, since it's a normal response body) and attach it
// to every unsafe request ourselves.
let csrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  try {
    const res = await api.get('/auth/csrf/');
    csrfToken = res.data.csrfToken;
  } catch {
    csrfToken = null;
  }
  return csrfToken;
}

const UNSAFE_METHODS = ['post', 'put', 'patch', 'delete'];

api.interceptors.request.use(async (config) => {
  if (config.method && UNSAFE_METHODS.includes(config.method.toLowerCase())) {
    const token = await ensureCsrfToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers['X-CSRFToken'] = token;
    }
  }
  return config;
});

// The CSRF token rotates on login/logout (Django does this deliberately to
// prevent session fixation), so force a refetch right after either happens.
function resetCsrfToken() {
  csrfToken = null;
}

// The backend paginates list endpoints (50 items per page by default).
// A plain "return res.data.results" only ever returns page 1, which silently
// cuts off any list once it grows past the page size (e.g. members, practices,
// payments). This helper follows the "next" link until every page has been
// fetched, so callers always get the complete, real list.
async function fetchAllPages<T>(url: string, params?: Record<string, any>): Promise<T[]> {
  let results: T[] = [];
  let page = 1;
  while (true) {
    const res = await api.get(url, { params: { ...params, page } });
    if (!res.data || res.data.results === undefined) {
      // Not a paginated response (e.g. a plain array) - return as-is.
      return res.data;
    }
    results = results.concat(res.data.results);
    if (!res.data.next) break;
    page += 1;
  }
  return results;
}

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await api.post('/auth/login/', { username, password });
    resetCsrfToken();
    return res.data;
  },
  me: async () => {
    const res = await api.get('/auth/me/');
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout/');
    resetCsrfToken();
    return res.data;
  },
};

export const membersApi = {
  list: async (params?: { street?: number | string; search?: string; is_active?: boolean; member_type?: 'RESIDENTIAL' | 'COMMERCIAL' | 'ALL' }) => {
    return fetchAllPages<Member>('/members/', params);
  },
  get: async (id: number) => {
    const res = await api.get(`/members/${id}/`);
    return res.data;
  },
  create: async (data: Partial<Member>) => {
    const res = await api.post('/members/', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Member>) => {
    const res = await api.patch(`/members/${id}/`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/members/${id}/`);
    return res.data;
  },
  statement: async (id: number, year?: number, month?: number): Promise<MemberStatement> => {
    const res = await api.get(`/members/${id}/statement/`, { params: { year, month } });
    return res.data;
  },
};

export const practiceTypesApi = {
  list: async () => {
    return fetchAllPages<PracticeType>('/practice-types/');
  },
};

export const practicesApi = {
  list: async (params?: { year?: number; month?: number; street?: number; member_id?: number; search?: string }) => {
    return fetchAllPages<Practice>('/practices/', params);
  },
  create: async (data: { member: number; practice_type: number; year: number; month: number; required_amount: number | string; notes?: string }) => {
    const res = await api.post('/practices/', data);
    return res.data;
  },
  bulkCreateMonth: async (data: { year: number; month: number; practice_type_id: number; required_amount: number | string }) => {
    const res = await api.post('/practices/bulk_create_month/', data);
    return res.data;
  },
  update: async (id: number, data: { practice_type?: number; year?: number; month?: number; required_amount?: number | string; notes?: string }) => {
    const res = await api.patch(`/practices/${id}/`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/practices/${id}/`);
    return res.data;
  },
};

export const paymentsApi = {
  list: async (params?: { member_id?: number; practice_id?: number; street?: number }) => {
    return fetchAllPages<any>('/payments/', params);
  },
  create: async (data: { practice: number; amount: number | string; payment_date?: string; payment_method: string; notes?: string }) => {
    const res = await api.post('/payments/', data);
    return res.data;
  },
  void: async (id: number, reason: string) => {
    const res = await api.post(`/payments/${id}/void_payment/`, { reason });
    return res.data;
  },
};

export const receiptsApi = {
  list: async (params?: { status?: string; year?: number; month?: number; street?: number; search?: string }) => {
    return fetchAllPages<Receipt>('/receipts/', params);
  },
  update: async (id: number, data: Partial<Receipt>) => {
    const res = await api.patch(`/receipts/${id}/`, data);
    return res.data;
  },
  markDelivered: async (id: number) => {
    const res = await api.post(`/receipts/${id}/mark_delivered/`);
    return res.data;
  },
  markReceived: async (id: number) => {
    const res = await api.post(`/receipts/${id}/mark_received/`);
    return res.data;
  },
  uploadImage: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('receipt_image', file);
    const res = await api.patch(`/receipts/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export const expensesApi = {
  list: async (params?: { year?: number; month?: number }) => {
    return fetchAllPages<any>('/expenses/', params);
  },
  create: async (formData: FormData) => {
    const res = await api.post('/expenses/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export const financialApi = {
  transactions: async (params?: { type?: string; year?: number; month?: number; member_id?: number }) => {
    return fetchAllPages<any>('/financial-transactions/', params);
  },
  recordManualOverpayment: async (data: { amount: number | string; source_name: string; payment_method: string; description?: string; transaction_date?: string }) => {
    const res = await api.post('/financial-transactions/record_manual_overpayment/', data);
    return res.data;
  },
};

export const reportsApi = {
  dashboard: async (year: number, month: number): Promise<DashboardData> => {
    const res = await api.get('/reports/dashboard/', { params: { year, month } });
    return res.data;
  },
  streets: async (year: number, month: number): Promise<{ year: number; month: number; streets: StreetData[] }> => {
    const res = await api.get('/reports/streets/', { params: { year, month } });
    return res.data;
  },
  exportExcelUrl: (year: number, month: number, street?: number | string) => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    const base = `${apiBase}/reports/export_excel/?year=${year}&month=${month}`;
    return street ? `${base}&street=${street}` : base;
  },
  backupExportUrl: () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    return `${apiBase}/reports/backup_export/`;
  },
  backupRestore: async (file: File, confirmPhrase: string) => {
    const formData = new FormData();
    formData.append('backup_file', file);
    formData.append('confirm_phrase', confirmPhrase);
    const res = await api.post('/reports/backup_restore/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export const auditLogsApi = {
  list: async () => {
    return fetchAllPages<any>('/audit-logs/');
  },
};

export default api;