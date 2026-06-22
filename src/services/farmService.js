import apiClient from "./apiClient";

/**
 * Retrieves lists of generic farm resources (items, customers, vendors, sales, sheds, etc.).
 * @param {string} name - Resource endpoint name.
 * @returns {Promise} Axios promise.
 */
export const listResource = (name) =>
  apiClient.get(`/farm/${name}`);

/**
 * Submits a new resource entry to the backend.
 * @param {string} name - Resource endpoint name.
 * @param {Object} data - Payload data.
 * @returns {Promise} Axios promise.
 */
export const createResource = (name, data) =>
  apiClient.post(`/farm/${name}`, data);

/**
 * Modifies an existing resource entry.
 * @param {string} name - Resource endpoint name.
 * @param {string|number} id - Target resource record ID.
 * @param {Object} data - Updated payload data.
 * @returns {Promise} Axios promise.
 */
export const updateResource = (name, id, data) =>
  apiClient.put(`/farm/${name}/${id}`, data);

/**
 * Wipes a specific resource record from the database.
 * @param {string} name - Resource endpoint name.
 * @param {string|number} id - Target resource record ID.
 * @returns {Promise} Axios promise.
 */
export const deleteResource = (name, id) =>
  apiClient.delete(`/farm/${name}/${id}`);

/**
 * Gets aggregated summary metrics, outstanding invoices, and charts for the tenant dashboard.
 * @returns {Promise} Axios promise.
 */
export const getDashboard = () =>
  apiClient.get("/farm/dashboard");

// ==========================================
// Disposed Inventory (Enterprise Plan Only)
// ==========================================

/**
 * Retrieves all disposal/mortality records.
 * @returns {Promise} Axios promise.
 */
export const listDisposals = () => apiClient.get("/inventory/disposals");

/**
 * Logs a new egg or feed disposal entry.
 * @param {Object} data - Contains type, quantity, reason, and estimated loss.
 * @returns {Promise} Axios promise.
 */
export const createDisposal = (data) => apiClient.post("/inventory/disposals", data);

/**
 * Edits an active disposal log.
 * @param {string|number} id - Disposal log ID.
 * @param {Object} data - Updated parameters.
 * @returns {Promise} Axios promise.
 */
export const updateDisposal = (id, data) => apiClient.put(`/inventory/disposals/${id}`, data);

/**
 * Soft-deletes a disposal log (marks as inactive).
 * @param {string|number} id - Disposal log ID.
 * @returns {Promise} Axios promise.
 */
export const deleteDisposal = (id) => apiClient.delete(`/inventory/disposals/${id}`);

/**
 * Restores a soft-deleted disposal log (marks back to active).
 * @param {string|number} id - Disposal log ID.
 * @returns {Promise} Axios promise.
 */
export const restoreDisposal = (id) => apiClient.put(`/inventory/disposals/${id}/restore`);

// ==========================================
// Tenant Settings
// ==========================================

/**
 * Gets the configurations (standard egg values, custom farm logo) of the active tenant.
 * @returns {Promise} Axios promise.
 */
export const getSettings = () => apiClient.get("/inventory/settings");

/**
 * Saves modified tenant settings.
 * @param {Object} data - Contains configuration values.
 * @returns {Promise} Axios promise.
 */
export const updateSettings = (data) => apiClient.put("/inventory/settings", data);
