const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('pos_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// 🔧 Helper to safely parse JSON (avoids "undefined is not valid JSON")
const safeJson = async (response: Response) => {
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    console.error('❌ JSON parse failed:', err);
    throw new Error('"undefined" is not valid JSON');
  }
};

// 🔧 Helper to handle all fetches consistently
const handleFetch = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, options);
    const data = await safeJson(response);

    if (!response.ok) {
      const message =
        data?.error || data?.message || `HTTP ${response.status} Error`;
      throw new Error(message);
    }

    return data;
  } catch (err: any) {
    console.error('❌ API Error:', err.message || err);
    throw err;
  }
};

export const api = {
  // 🔸 Creditors
  getCreditors: () =>
    handleFetch(`${API_URL}/api/creditors`, { headers: getAuthHeaders() }),

  createCreditor: (data: any) =>
    handleFetch(`${API_URL}/api/creditors`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  updateCreditor: (id: number, data: any) =>
    handleFetch(`${API_URL}/api/creditors/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  getCreditorAudit: (id: number) =>
    handleFetch(`${API_URL}/api/creditors/${id}/audit`, {
      headers: getAuthHeaders(),
    }),

  updateCreditorBalance: (id: number, data: { amount_deposited: number }) =>
    handleFetch(`${API_URL}/api/creditors/${id}/update-balance`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  getCreditorChanges: (id: number) =>
    handleFetch(`${API_URL}/api/creditors/${id}/changes`, {
      headers: getAuthHeaders(),
    }),

  getCreditorReceipts: (id: number, params: { start_date?: string; end_date?: string }) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString
      ? `${API_URL}/api/creditors/${id}/receipts?${queryString}`
      : `${API_URL}/api/creditors/${id}/receipts`;
    return handleFetch(url, { headers: getAuthHeaders() });
  },

  // 🔸 Items
  getItems: () =>
    handleFetch(`${API_URL}/api/items`, { headers: getAuthHeaders() }),

  createItem: (data: any) =>
    handleFetch(`${API_URL}/api/items`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  updateItem: (id: number, data: any) =>
    handleFetch(`${API_URL}/api/items/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  // 🔸 Bills
  createBill: (data: any) =>
    handleFetch(`${API_URL}/api/bills`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  // ✅ New: Fetch today's bills
  getTodayBills: () =>
    handleFetch(`${API_URL}/api/bills/today`, {
      headers: getAuthHeaders(),
    }),

  // ✅ Optional: Fetch all bills or between dates
  getBills: (params: { start_date?: string; end_date?: string }) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString
      ? `${API_URL}/api/bills?${queryString}`
      : `${API_URL}/api/bills`;
    return handleFetch(url, { headers: getAuthHeaders() });
  },

  // 🔸 Reports
  getCreditReport: (params: any) => {
    const queryString = new URLSearchParams(params).toString();
    return handleFetch(`${API_URL}/api/reports/credit?${queryString}`, {
      headers: getAuthHeaders(),
    });
  },

  // 🔸 Duplicates
  getDuplicates: () =>
    handleFetch(`${API_URL}/api/duplicates`, { headers: getAuthHeaders() }),

  // 🔸 Login Logs
  getLoginLogs: () =>
    handleFetch(`${API_URL}/api/logs/login`, { headers: getAuthHeaders() }),

  // 🔸 Receipts
  getAllBills: () =>
    handleFetch(`${API_URL}/api/bills`, { headers: getAuthHeaders() }),

  refundBill: (id: string) =>
    handleFetch(`${API_URL}/api/bills/${id}/refund`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    }),

  getRefundedBills: () =>
    handleFetch(`${API_URL}/api/bills/refunded`, { headers: getAuthHeaders() }),

  // 🔸 Receipt Actions
  previewReceipt: (billId: string) =>
    handleFetch(`${API_URL}/api/receipts/${billId}/preview`, {
      headers: getAuthHeaders(),
    }),

  downloadReceipt: async (billId: string) => {
    const token = localStorage.getItem('pos_token');
    const response = await fetch(`${API_URL}/api/receipts/${billId}/download`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to download receipt');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${billId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  printReceipt: (billId: string) =>
    handleFetch(`${API_URL}/api/receipts/${billId}/print`, {
      method: 'POST',
      headers: getAuthHeaders(),
    }),

  getReceipts: (offset: number = 0, limit: number = 10) =>
    handleFetch(`${API_URL}/api/receipts?offset=${offset}&limit=${limit}`, {
      headers: getAuthHeaders(),
    }),

  // 🔸 WhatsApp Integration Endpoints
  getWhatsAppStatus: () =>
    handleFetch(`${API_URL}/api/whatsapp/status`, { headers: getAuthHeaders() }),

  disconnectWhatsApp: () =>
    handleFetch(`${API_URL}/api/whatsapp/disconnect`, {
      method: 'POST',
      headers: getAuthHeaders(),
    }),

  sendWhatsAppReceipt: (billId: string) =>
    handleFetch(`${API_URL}/api/bills/${billId}/send-whatsapp`, {
      method: 'POST',
      headers: getAuthHeaders(),
    }),

  sendWhatsAppReminder: (creditorId: string) =>
    handleFetch(`${API_URL}/api/creditors/${creditorId}/send-reminder`, {
      method: 'POST',
      headers: getAuthHeaders(),
    }),

  // 🔸 Refunds
  createRefund: (data: any) =>
    handleFetch(`${API_URL}/api/refunds`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  previewRefund: (refundId: string) =>
    handleFetch(`${API_URL}/api/receipts/${refundId}/preview`, {
      headers: getAuthHeaders(),
    }),

  downloadRefund: async (refundId: string) => {
    const token = localStorage.getItem('pos_token');
    const response = await fetch(`${API_URL}/api/refunds/${refundId}/download`, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
    });
    if (!response.ok) throw new Error('Failed to download refund receipt');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refund-${refundId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  printRefund: (refundId: string) =>
    handleFetch(`${API_URL}/api/refunds/${refundId}/print`, {
      method: 'POST',
      headers: getAuthHeaders(),
    }),
};

