import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

export default function ToastNotification() {
  const { notification, clearNotification } = useAppStore();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  if (!notification) return null;

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    error: <AlertCircle className="w-5 h-5 text-red-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
  };

  const bgMap = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-2">
      <div
        className={cn(
          'flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg border animate-in slide-in-from-top-2 fade-in duration-200 min-w-[280px] max-w-md',
          bgMap[notification.type]
        )}
      >
        {iconMap[notification.type]}
        <span className="font-medium flex-1">{notification.message}</span>
        <button
          onClick={clearNotification}
          className="p-1 hover:bg-black/5 rounded transition-colors"
        >
          <X className="w-4 h-4 opacity-60" />
        </button>
      </div>
    </div>
  );
}
