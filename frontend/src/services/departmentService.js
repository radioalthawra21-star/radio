import api from './api';

export const getAllDepartments = async () => {
  const response = await api.get('/departments');
  return response.data;
};

export const createDepartment = async (data) => {
  const response = await api.post('/departments', data);
  return response.data;
};

export const deleteDepartment = async (id) => {
  const response = await api.delete(`/departments/${id}`);
  return response.data;
};

export default {
  getAllDepartments,
  createDepartment,
  deleteDepartment
};
