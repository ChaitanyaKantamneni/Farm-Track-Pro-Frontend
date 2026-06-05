import apiClient from "./apiClient";

export const loginUser = async (data) => {

  return await apiClient.post(
    "/auth/login",
    data
  );

};
