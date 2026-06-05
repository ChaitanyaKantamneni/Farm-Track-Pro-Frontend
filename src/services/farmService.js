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
