import api from "./api.js";

export const getTransactions = async () => {
  const { data } = await api.get("/transactions");
  return data;
};

export const createTransaction = async (payload) => {
  const { data } = await api.post("/transactions", payload);
  return data;
};
