import apiClient from "./apiClient";

/**
 * Creates a new tenant (farm instance) along with its first admin account.
 * @param {Object} data - Form data containing farm details, admin credentials, and initial settings.
 * @returns {Promise} Axios promise resolving to the created tenant and generated access credentials.
 */
export const createTenant = (data) =>
  apiClient.post("/tenants", data);

/**
 * Fetches all registered tenants from the system.
 * @returns {Promise} Axios promise resolving to the array of tenant records.
 */
export const getTenants = () =>
  apiClient.get("/tenants");

/**
 * Updates the brand logo of a specific tenant.
 * @param {string|number} id - Target tenant ID.
 * @param {string} logo - Base64 encoded logo image data.
 * @returns {Promise} Axios promise.
 */
export const updateTenantLogo = (id, logo) =>
  apiClient.put(`/tenants/${id}/logo`, { logo });

/**
 * Modifies the subscription parameters (plan tier, status, active days) of a tenant.
 * @param {string|number} id - Target tenant ID.
 * @param {Object} data - Subscription parameters to apply.
 * @returns {Promise} Axios promise.
 */
export const updateTenantSubscription = (id, data) =>
  apiClient.put(`/tenants/${id}/subscription`, data);

/**
 * Pulls operational metrics, aggregated billing details, and tenant totals for platform reports.
 * @returns {Promise} Axios promise containing stats.
 */
export const getPlatformStats = () =>
  apiClient.get("/tenants/platform-stats");

/**
 * Modifies target tenant info and optional admin password.
 * @param {string|number} id - Target tenant ID.
 * @param {Object} data - Tenant fields.
 * @returns {Promise} Axios promise.
 */
export const updateTenantDetails = (id, data) =>
  apiClient.put(`/tenants/${id}`, data);

