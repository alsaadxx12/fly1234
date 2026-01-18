import React from 'react';
import { Loader as Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ModernButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
}

const ModernButton: React.FC<ModernButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
}) => {
  const { theme } = useTheme();

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-5 py-3 text-sm',
    lg: 'px-6 py-4 text-base',
  };

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg',
    secondary:
      theme === 'dark'
        ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200',
    success:
      'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg',
    danger:
      'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg',
    warning:
      'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg',
    ghost:
      theme === 'dark'
        ? 'hover:bg-gray-700 text-gray-300'
        : 'hover:bg-gray-100 text-gray-700',
  };

  const baseClasses = `
    inline-flex items-center justify-center gap-2
    rounded-xl font-medium transition-all
    transform hover:-translate-y-0.5
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={baseClasses}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
};

export default ModernButton;
