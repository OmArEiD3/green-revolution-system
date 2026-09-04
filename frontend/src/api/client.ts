import axios from 'axios';
import { Member, Receipt, DashboardData, StreetData, MemberStatement } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Django's CSRF protection expects the token from the "csrftoken" cookie
  // to be echoed back in an "X-CSRFToken" header on unsafe requests
  // (POST/PATCH/PUT/DELETE). Axios reads/sends this automatically once
  // these two options are set.
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await api.post('/auth/login/', { username, password });
    return res.data;
  },
  me: async () => {
    const res = await api.get('/auth/me/');
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout/');
    return res.data;
  },
};

export const membersApi = {
  list: async (params?: { street?: number | string; search?: string; is_active?: boolean }) => {
    const res = await api.get('/members/', { params });
    return res.data.results ? res.data.results : res.data;
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
    const res = await api.get('/practice-types/');
    return res.data.results ? res.data.results : res.data;
  },
};

export const practicesApi = {
  list: async (params?: { year?: number; month?: number; street?: number; member_id?: number; search?: string }) => {
    const res = await api.get('/practices/', { params });
    return res.data.results ? res.data.results : res.data;
  },
  create: async (data: { member: number; practice_type: number; year: number; month: number; required_amount: number | string; notes?: string }) => {
    const res = await api.post('/practices/', data);
    return res.data;
  },
  bulkCreateMonth: async (data: { year: number; month: number; practice_type_id: number; required_amount: number | string }) => {
    const res = await api.post('/practices/bulk_create_month/', data);
    return res.data;
  },
};

export const paymentsApi = {
  list: async (params?: { member_id?: number; practice_id?: number; street?: number }) => {
    const res = await api.get('/payments/', { params });
    return res.data.results ? res.data.results : res.data;
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
    const res = await api.get('/receipts/', { params });
    return res.data.results ? res.data.results : res.data;
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
    const res = await api.get('/expenses/', { params });
    return res.data.results ? res.data.results : res.data;
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
    const res = await api.get('/financial-transactions/', { params });
    return res.data.results ? res.data.results : res.data;
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
    const base = `/api/reports/export_excel/?year=${year}&month=${month}`;
    return street ? `${base}&street=${street}` : base;
  },
};

export const auditLogsApi = {
  list: async () => {
    const res = await api.get('/audit-logs/');
    return res.data.results ? res.data.results : res.data;
  },
};

export default api;
