import api from './api';

export const giveBonus = async (data) => {
  const response = await api.post('/bonuses', data);
  return response.data;
};

export const getEmployeeBonuses = async (employeeId) => {
  const response = await api.get(`/bonuses/employee/${employeeId}`);
  return response.data;
};

export const getAllBonuses = async () => {
  const response = await api.get('/bonuses/all');
  return response.data;
};

export const deleteBonus = async (bonusId) => {
  const response = await api.delete(`/bonuses/${bonusId}`);
  return response.data;
};

export default { giveBonus, getEmployeeBonuses, getAllBonuses, deleteBonus };