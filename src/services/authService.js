import apiClient from "./apiClient";

/**
 * Sends credentials to verify identity and obtain JWT token.
 * @param {Object} data - Contains login email and password keys.
 * @returns {Promise} Axios response containing the logged-in user profile, role, and authorization token.
 */
export const loginUser = async (data) => {

  return await apiClient.post(
    "/auth/login",
    data
  );

};
