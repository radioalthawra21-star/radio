/**
 * Rankings Page
 * Admin can view employee rankings based on performance
 */

import { useState, useEffect } from 'react';
import { getRankings } from '../../services/userService';
import { getAllDepartments } from '../../services/departmentService';
import { getSettings } from '../../services/notificationService';
import { useDepartments } from '../../hooks/useDepartments';
import Card from '../../components/common/Card';

const Rankings = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minTasks, setMinTasks] = useState(5);
  const [departments, setDepartments] = useState([]);

  const { getDepartmentName } = useDepartments();

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await getAllDepartments();
        if (res.success) {
          setDepartments(res.data.departments);
        }
      } catch (err) { console.error(err); }
    };
    loadDepts();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch rankings
      const rankResponse = await getRankings();
      if (rankResponse.success) {
        setRankings(rankResponse.data.rankings);
      }

      // Fetch settings for minimum tasks
      const settingsResponse = await getSettings();
      if (settingsResponse.success) {
        setMinTasks(settingsResponse.data.settings.minimumTasksForRanking || 5);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return '🏆';
    } else if (rank === 2) {
      return '🥈';
    } else if (rank === 3) {
      return '🥉';
    }
    return rank;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'bg-yellow-400 text-white';
    if (rank === 2) return 'bg-gray-400 text-white';
    if (rank === 3) return 'bg-yellow-600 text-white';
    return 'bg-gray-200 text-dark';
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-8">ترتيب الموظفين</h1>

      <p className="text-gray-600 mb-6">
        الترتيب بناءً على نقاط الأداء. الحد الأدنى للمهام المطلوبة: {minTasks} مهمة
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
        </div>
      ) : rankings.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">لا توجد بيانات للترتيب</p>
        </Card>
      ) : (
        <Card>
          <div className="space-y-4">
            {rankings.map((rank) => (
              <div 
                key={rank.user._id} 
                className={`flex items-center justify-between p-4 rounded-lg ${
                  rank.rank <= 3 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${getRankColor(rank.rank)}`}>
                    {getRankBadge(rank.rank)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark text-lg">{rank.user.name}</h3>
                    <p className="text-sm text-gray-600">
                      {getDepartmentName(rank.user.department)}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-3xl font-bold text-interactive">{rank.performanceScore}</p>
                  <p className="text-sm text-gray-500">نقطة أداء</p>
                  <p className="text-xs text-gray-400">{rank.completedTasks} مهمة مكتملة</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top 3 Summary */}
      {rankings.length >= 3 && (
        <Card className="mt-6">
          <h2 className="text-xl font-bold text-dark mb-4">المتميزون</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-2">
                  {index === 0 ? '🏆' : index === 1 ? '🥈' : '🥉'}
                </div>
                <h3 className="font-semibold text-dark">{rankings[index].user.name}</h3>
                <p className="text-gray-600 text-sm">
                  {getDepartmentName(rankings[index].user.department)}
                </p>
                <p className="text-2xl font-bold text-interactive mt-2">
                  {rankings[index].performanceScore}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Rankings;