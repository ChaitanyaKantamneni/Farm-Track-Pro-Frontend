import apiClient from "./apiClient";

export const listResource = (name) =>
  apiClient.get(`/farm/${name}`);

export const createResource = (name, data) =>
  apiClient.post(`/farm/${name}`, data);

export const updateResource = (name, id, data) =>
  apiClient.put(`/farm/${name}/${id}`, data);

export const deleteResource = (name, id) =>
  apiClient.delete(`/farm/${name}/${id}`);

export const getDashboard = () =>
  apiClient.get("/farm/dashboard");

// Disposed Inventory
export const listDisposals = () => apiClient.get("/inventory/disposals");
export const createDisposal = (data) => apiClient.post("/inventory/disposals", data);
export const updateDisposal = (id, data) => apiClient.put(`/inventory/disposals/${id}`, data);
export const deleteDisposal = (id) => apiClient.delete(`/inventory/disposals/${id}`);
export const restoreDisposal = (id) => apiClient.put(`/inventory/disposals/${id}/restore`);

// Tenant Settings
export const getSettings = () => apiClient.get("/inventory/settings");
export const updateSettings = (data) => apiClient.put("/inventory/settings", data);
