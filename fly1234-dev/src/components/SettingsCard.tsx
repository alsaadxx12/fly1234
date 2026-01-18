import React from 'react';
import { Video as LucideIcon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  gradient?: string;
  iconColor?: string;
}

export default function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
  gradient = 'from-blue-500 to-cyan-500',
  iconColor = 'text-blue-600 dark:text-blue-400'
}: SettingsCardProps) {
  const { theme } = useTheme();

  return (
    <div className="rounded-lg shadow border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
