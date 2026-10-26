import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const scrollMap = new Map();

export function saveCurrentScroll(key, pathname) {
  const y = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
  if (key) {
    scrollMap.set(`key_${key}`, y);
    try {
      sessionStorage.setItem(`scroll_key_${key}`, String(y));
    } catch (e) {}
  }
  if (pathname) {
    scrollMap.set(`path_${pathname}`, y);
    try {
      sessionStorage.setItem(`scroll_path_${pathname}`, String(y));
    } catch (e) {}
  }
}

export function getSavedScroll(key, pathname) {
  if (key && scrollMap.has(`key_${key}`)) {
    return scrollMap.get(`key_${key}`);
  }
  if (key) {
    try {
      const val = sessionStorage.getItem(`scroll_key_${key}`);
      if (val !== null) return Number(val);
    } catch (e) {}
  }
  if (pathname && scrollMap.has(`path_${pathname}`)) {
    return scrollMap.get(`path_${pathname}`);
  }
  if (pathname) {
    try {
      const val = sessionStorage.getItem(`scroll_path_${pathname}`);
      if (val !== null) return Number(val);
    } catch (e) {}
  }
  if (pathname === '/' || pathname === '/dashboard') {
    const alias = pathname === '/' ? '/dashboard' : '/';
    if (scrollMap.has(`path_${alias}`)) return scrollMap.get(`path_${alias}`);
    try {
      const val = sessionStorage.getItem(`scroll_path_${alias}`);
      if (val !== null) return Number(val);
    } catch (e) {}
  }
  return null;
}

export function useScrollRestoration() {
  const location = useLocation();
  const navType = useNavigationType();
  const isRestoring = useRef(false);

  // Set manual scroll restoration so the browser does not prematurely clamp to 0
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Continuously record scroll position on the active page
  useEffect(() => {
    let animId;
    const onScroll = () => {
      if (isRestoring.current) return;
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        saveCurrentScroll(location.key, location.pathname);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('scroll', onScroll);
    };
  }, [location.key, location.pathname]);

  // Handle route transitions & scroll restoration
  useEffect(() => {
    if (navType === 'POP') {
      const targetY = getSavedScroll(location.key, location.pathname);
      if (targetY !== null && targetY > 0) {
        isRestoring.current = true;
        let attempts = 0;
        const maxAttempts = 25; // Poll across dynamic renders

        const restore = () => {
          const maxScroll = Math.max(
            document.documentElement.scrollHeight - window.innerHeight,
            0
          );

          window.scrollTo({ top: targetY, behavior: 'instant' });

          if (maxScroll < targetY && attempts < maxAttempts) {
            attempts++;
            setTimeout(restore, 40);
          } else {
            window.scrollTo({ top: targetY, behavior: 'instant' });
            setTimeout(() => {
              isRestoring.current = false;
            }, 100);
          }
        };

        requestAnimationFrame(() => {
          setTimeout(restore, 20);
        });
        return;
      }
    }

    if (navType !== 'POP') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.key, location.pathname, navType]);
}
