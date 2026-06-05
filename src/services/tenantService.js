import apiClient from "./apiClient";

export const createTenant =
(data) =>
apiClient.post("/tenants", data);

export const getTenants =
() =>
apiClient.get("/tenants");
