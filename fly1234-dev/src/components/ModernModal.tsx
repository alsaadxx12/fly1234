import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

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
  headerContent?: React.ReactNode;
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
  headerContent,
}) => {
  const { theme } = useTheme();

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

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none md:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 pointer-events-auto transition-opacity ${theme === 'dark' ? 'bg-black/70' : 'bg-black/50'
              } backdrop-blur-[2px]`}
            onClick={closeOnOutsideClick ? onClose : undefined}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`relative w-full pointer-events-auto flex flex-col ${theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
              } 
              /* Mobile Styling: Bottom Sheet */
              md:rounded-[1.25rem] md:max-h-[90vh] md:border ${sizeClasses[size]} md:shadow-2xl md:animate-none overflow-hidden
              max-md:fixed max-md:bottom-0 max-md:max-h-[95vh] max-md:rounded-t-[1.5rem] max-md:border-t
              `}
          >
            {/* Header */}
            <div className={`px-6 py-4 md:py-5 border-b shrink-0 ${theme === 'dark'
              ? 'border-gray-700 bg-gradient-to-r from-gray-800 to-gray-800/80'
              : 'border-gray-200 bg-gradient-to-r from-gray-50 to-white'
              }`}>
              {/* Drag handle for mobile */}
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4 md:hidden" />

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4 flex-1">
                  {headerContent ? (
                    <div className="flex-1">{headerContent}</div>
                  ) : (
                    <>
                      {icon && (
                        <div className={`p-2.5 md:p-3 rounded-xl ${iconColorClasses[iconColor]}`}>
                          {icon}
                        </div>
                      )}
                      <div className="flex-1">
                        <h2 className={`text-lg md:text-xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                          }`}>
                          {title}
                        </h2>
                        {description && (
                          <p className={`text-xs md:text-sm mt-0.5 md:mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                            {description}
                          </p>
                        )}
                      </div>
                    </>
                  )}
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
            <div className={`px-6 py-5 overflow-y-auto ${footer ? 'mb-0' : 'mb-4'} scrollbar-hide`}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className={`px-6 py-4 border-t shrink-0 ${theme === 'dark'
                ? 'border-gray-700 bg-gray-800/50'
                : 'border-gray-200 bg-gray-50'
                } max-md:pb-10`}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ModernModal;
