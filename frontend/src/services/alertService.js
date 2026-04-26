import api from "./api.js";

export const getAlerts = async () => {
  const { data } = await api.get("/alerts");
  return data;
};

export const resolveAlert = async (id) => {
  const { data } = await api.patch(`/alerts/${id}/resolve`);
  return data;
};
