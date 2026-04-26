import api from "./api.js";

export const login = async (credentials) => {
  const { data } = await api.post("/users/login", credentials);
  return data;
};

export const register = async (payload) => {
  const { data } = await api.post("/users/register", payload);
  return data;
};

export const getProfile = async () => {
  const { data } = await api.get("/users/profile");
  return data;
};
