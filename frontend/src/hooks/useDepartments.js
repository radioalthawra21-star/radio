import { useState, useEffect } from 'react';
import { getAllDepartments } from '../services/departmentService';

export const useDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await getAllDepartments();
        if (response.success) {
          setDepartments(response.data.departments || []);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  const getDepartmentName = (deptId) => {
    const dept = departments.find(d => d._id === deptId || d.id === deptId);
    return dept?.name || deptId || '-';
  };

  return { departments, loading, getDepartmentName };
};