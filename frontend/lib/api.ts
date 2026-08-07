import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const api = {
  // Dashboard
  getDashboardStats: () => axios.get(`${API_BASE}/dashboard/stats`),
  getStats: () => axios.get(`${API_BASE}/dashboard/stats`),
  
  // Documents
  listDocuments: (params?: any) => axios.get(`${API_BASE}/documents`, { params }),
  getDocument: (id: string) => axios.get(`${API_BASE}/documents/${id}`),
  deleteDocument: (id: string) => axios.delete(`${API_BASE}/documents/${id}`),
  getDocumentPII: (id: string) => axios.get(`${API_BASE}/analyze/${id}/pii`),
  getMaskedText: (id: string) => axios.get(`${API_BASE}/analyze/${id}/masked-text`),
  maskDocument: (id: string, strategy: string) => axios.post(`${API_BASE}/analyze/${id}/mask`, { strategy }),
  
  // Upload
  // Scan (unified pipeline)
  scanDocument: (file: File, onProgress?: (p: number) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    return axios.post(`${API_BASE}/scan/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / (e.total || 1)))
    })
  },
  batchScan: (files: File[]) => {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    return axios.post(`${API_BASE}/scan/batch`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getRecommendations: (scanId: string) => axios.get(`${API_BASE}/scan/${scanId}/recommendations`),
  
  // Export
  exportPDF: (documentId: string) => `${API_BASE}/export/${documentId}/pdf`,
  exportExcel: (documentId: string) => `${API_BASE}/export/${documentId}/excel`,
  
  // Auth
  login: (email: string, password: string) => axios.post(`${API_BASE}/auth/login`, { email, password }),
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    axios.post(`${API_BASE}/auth/register`, data),

  // Upload (legacy fallback)
  uploadDocument: (file: File, onProgress?: (p: number) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    return axios.post(`${API_BASE}/upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / (e.total || 1)))
    })
  },
  getUploadStatus: (id: string) => axios.get(`${API_BASE}/upload/${id}/status`),
  
  // Reports
  generateReport: (id: string) => axios.post(`${API_BASE}/reports/${id}/generate`),
  getReport: (id: string) => axios.get(`${API_BASE}/reports/${id}`),
  listReports: () => axios.get(`${API_BASE}/reports/`),
  downloadReportUrl: (id: string) => `${API_BASE}/reports/${id}/download`,
  
  // Chat
  sendMessage: (message: string, history: any[]) => axios.post(`${API_BASE}/chat/`, { message, conversation_history: history }),
}
