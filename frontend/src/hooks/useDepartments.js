import { useState, useEffect } from 'react';
import { getAllDepartments } from '../services/departmentService';

export const useDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchDepartments = async () => {
      try {
        const response = await getAllDepartments({ signal: abortController.signal });
        if (response.success) {
          setDepartments(response.data.departments || []);
        }
      } catch (error) {
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return;
        console.error('Error fetching departments:', error);
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };
    fetchDepartments();

    return () => {
      abortController.abort();
    };
  }, []);

  const getDepartmentName = (deptId) => {
    const dept = departments.find(d => d._id === deptId || d.id === deptId);
    return dept?.name || deptId || '-';
  };

  return { departments, loading, getDepartmentName };
};