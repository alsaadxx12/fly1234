import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ModernInputProps {
  label?: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  multiline?: boolean;
  rows?: number;
  helperText?: string;
  options?: { value: string | number; label: string }[];
  className?: string;
}

const ModernInput: React.FC<ModernInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  icon,
  iconPosition = 'left',
  multiline = false,
  rows = 3,
  helperText,
  options,
  className = '',
}) => {
  const { theme } = useTheme();

  const baseInputClasses = `w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark'
      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
    } ${error ? 'border-red-500 focus:ring-red-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''
    } ${icon ? (iconPosition === 'right' ? 'pr-12' : 'pl-12') : ''}`;

  const renderInput = () => {
    if (options) {
      return (
        <select
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={baseInputClasses}
        >
          <option value="">{placeholder || 'اختر...'}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (multiline) {
      return (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={baseInputClasses}
        />
      );
    }

    return (
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={baseInputClasses}
      />
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
          }`}>
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      <div className="relative">
        {renderInput()}
        {icon && (
          <div className={`absolute ${iconPosition === 'right' ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 pointer-events-none`}>
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span>⚠</span>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
          {helperText}
        </p>
      )}
    </div>
  );
};

export default ModernInput;
