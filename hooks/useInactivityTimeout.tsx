
import { useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';

const useInactivityTimeout = (timeout: number) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const timeoutIdRef = useRef<number | null>(null);

  const resetTimeout = () => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    if (user) {
      timeoutIdRef.current = window.setTimeout(() => {
        alert('คุณไม่ได้ใช้งานระบบเป็นเวลานาน, ระบบจะทำการออกจากระบบอัตโนมัติ');
        logout();
        navigate('/');
      }, timeout);
    }
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'scroll', 'click'];

    const eventListener = () => {
      resetTimeout();
    };

    if (user) {
      events.forEach(event => window.addEventListener(event, eventListener));
      resetTimeout();
    }

    return () => {
      events.forEach(event => window.removeEventListener(event, eventListener));
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, timeout]);

  return null;
};

export default useInactivityTimeout;
