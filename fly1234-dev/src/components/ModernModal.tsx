import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ModernModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconColor?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray';
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOutsideClick?: boolean;
}

const ModernModal: React.FC<ModernModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  iconColor = 'blue',
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOutsideClick = true,
}) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw]',
  };

  const iconColorClasses = {
    blue: theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600',
    green: theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600',
    red: theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600',
    orange: theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600',
    purple: theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600',
    gray: theme === 'dark' ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600',
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-fadeIn" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 transition-opacity ${theme === 'dark' ? 'bg-black/70' : 'bg-black/50'
          }`}
        onClick={closeOnOutsideClick ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className={`relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border animate-slideUp ${theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
          }`}
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b ${theme === 'dark'
          ? 'border-gray-700 bg-gradient-to-r from-gray-800 to-gray-800/80'
          : 'border-gray-200 bg-gradient-to-r from-gray-50 to-white'
          }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              {icon && (
                <div className={`p-3 rounded-xl ${iconColorClasses[iconColor]}`}>
                  {icon}
                </div>
              )}
              <div className="flex-1">
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                  }`}>
                  {title}
                </h2>
                {description && (
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    {description}
                  </p>
                )}
              </div>
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-all ${theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-6 py-4 border-t ${theme === 'dark'
            ? 'border-gray-700 bg-gray-800/50'
            : 'border-gray-200 bg-gray-50'
            }`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default ModernModal;
