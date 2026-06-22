import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const organizationTenderApi = {
  // GET /api/organization-tenders?page=&limit=
  getAll: (page = 1, limit = 9) =>
    apiClient.get("/organization-tenders", { params: { page, limit } }),

  // GET /api/organization-tenders/search?q=
  search: (q) => apiClient.get("/organization-tenders/search", { params: { q } }),

  // GET /api/organization-tenders/filter
  filter: (filters = {}, page = 1, limit = 9) =>
    apiClient.get("/organization-tenders/filter", {
      params: { ...filters, page, limit },
    }),

  // GET /api/organization-tenders/organizations/list
  getOrganizationList: () => apiClient.get("/organization-tenders/organizations/list"),

  // GET /api/organization-tenders/:id
  getById: (id) => apiClient.get(`/organization-tenders/${id}`),

  // POST /api/organization-tenders/create
  create: (payload) => apiClient.post("/organization-tenders/create", payload),

  // PUT /api/organization-tenders/update/:id
  update: (id, payload) => apiClient.put(`/organization-tenders/update/${id}`, payload),

  // DELETE /api/organization-tenders/delete/:id
  remove: (id) => apiClient.delete(`/organization-tenders/delete/${id}`),
};

export default apiClient;
