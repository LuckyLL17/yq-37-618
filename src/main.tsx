import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useAppStore } from './store/appStore'

function AppWithLockCheck() {
  useEffect(() => {
    const checkLocks = () => {
      useAppStore.getState().checkExpiredLocks();
    };
    checkLocks();
    const interval = setInterval(checkLocks, 30000);
    return () => clearInterval(interval);
  }, []);

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithLockCheck />
  </StrictMode>,
)
