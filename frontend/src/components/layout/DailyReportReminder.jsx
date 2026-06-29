import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDailyReportStatus } from '../../services/dailyReportService';
import { playNotificationSound } from '../../utils/audioUtils';

const REMINDER_HOUR = 15;
const REMINDER_MINUTE = 30;
const CHECK_INTERVAL = 60000;

const DailyReportReminder = () => {
  const navigate = useNavigate();
  const notifiedTodayRef = useRef(false);
  const checkedTodayRef = useRef('');

  const checkAndNotify = useCallback(async () => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

    if (checkedTodayRef.current === todayKey) return;
    if (notifiedTodayRef.current) return;

    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours < REMINDER_HOUR || (hours === REMINDER_HOUR && minutes < REMINDER_MINUTE)) return;

    checkedTodayRef.current = todayKey;

    try {
      const response = await getDailyReportStatus();
      if (response.success && !response.data.hasSubmitted) {
        notifiedTodayRef.current = true;
        playNotificationSound();

        const toast = document.createElement('div');
        toast.id = 'dr-toast';
        toast.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;background:#1a1a2e;color:#fff;padding:16px 24px;border-radius:12px;direction:rtl;font-family:system-ui,sans-serif;font-size:14px;box-shadow:0 8px 32px rgba(0,0,0,0.3);max-width:420px;text-align:center;animation:ntFadeIn 0.3s ease;border:1px solid rgba(255,255,255,0.1);cursor:pointer';
        toast.innerHTML = '<div style="font-weight:700;margin-bottom:6px;font-size:16px">📋 التقرير اليومي</div><div style="opacity:0.85;font-size:13px">لم تقم بتعبئة التقرير اليومي بعد. اضغط هنا للتعبئة</div>';
        toast.onclick = () => {
          toast.remove();
          navigate('/daily-report');
        };

        if (!document.getElementById('nt-style')) {
          const s = document.createElement('style');
          s.id = 'nt-style';
          s.textContent = '@keyframes ntFadeIn{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes ntFadeOut{from{opacity:1}to{opacity:0;transform:translateX(-50%) translateY(-20px)}}';
          document.head.appendChild(s);
        }

        document.body.appendChild(toast);
        setTimeout(() => {
          if (document.getElementById('dr-toast')) {
            toast.style.animation = 'ntFadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
          }
        }, 8000);
      }
    } catch (error) {
      console.error('Daily report reminder check error:', error);
    }
  }, [navigate]);

  useEffect(() => {
    notifiedTodayRef.current = false;
    checkedTodayRef.current = '';

    checkAndNotify();
    const interval = setInterval(checkAndNotify, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkAndNotify]);

  return null;
};

export default DailyReportReminder;
