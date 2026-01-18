import React from 'react';
import { Video as LucideIcon } from 'lucide-react';

interface SettingsToggleProps {
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
}

export default function SettingsToggle({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  color = 'blue'
}: SettingsToggleProps) {
  const colorClasses = {
    blue: {
      bg: 'from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20',
      icon: 'text-blue-600 dark:text-blue-400',
      toggle: 'peer-checked:bg-blue-600 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800'
    },
    green: {
      bg: 'from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20',
      icon: 'text-green-600 dark:text-green-400',
      toggle: 'peer-checked:bg-green-600 peer-focus:ring-green-300 dark:peer-focus:ring-green-800'
    },
    purple: {
      bg: 'from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20',
      icon: 'text-purple-600 dark:text-purple-400',
      toggle: 'peer-checked:bg-purple-600 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800'
    }
  };

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4 flex-1">
        <div className={`p-2.5 ${colors.bg} rounded-lg`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900 dark:text-white text-sm">
            {title}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {description}
          </div>
        </div>
      </div>

      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className={`w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 ${colors.toggle} rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
      </label>
    </div>
  );
}
