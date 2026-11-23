import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useData } from '../../context/DataContext';

export const Toasts: React.FC = () => {
  const { toasts, dismissToast } = useData();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm pointer-events-none">
      {toasts.map(toast => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
          info: <Info className="w-4 h-4 text-brand-500 flex-shrink-0" />
        };

        const borders = {
          success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200',
          error: 'border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-200',
          warning: 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200',
          info: 'border-brand-500/30 bg-brand-500/10 text-brand-950 dark:text-brand-200'
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-xl border backdrop-blur-md shadow-lg shadow-black/5 text-xs font-medium animate-in slide-in-from-bottom-2 duration-200 ${borders[toast.type]}`}
          >
            {icons[toast.type]}
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="opacity-60 hover:opacity-100 transition-opacity p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
