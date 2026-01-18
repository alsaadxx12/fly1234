import React, { useState } from 'react';
import { BarChart, PieChart as PieChartIcon, LineChart, Download } from 'lucide-react';

interface ChartControlsProps {
  title: string;
  description?: string;
  onChartTypeChange: (type: 'bar' | 'line' | 'area' | 'pie') => void;
  onRefresh?: () => void;
  onExport?: () => void;
  chartType: 'bar' | 'line' | 'area' | 'pie';
  showChartTypeSelector?: boolean;
  icon?: React.ReactNode;
}

const ChartControls: React.FC<ChartControlsProps> = ({
  title,
  description,
  onChartTypeChange,
  onRefresh,
  onExport,
  chartType,
  showChartTypeSelector = true,
  icon
}) => { 

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
      <div className="flex items-center gap-3">
        {icon ? (
          <div className="p-3 bg-gradient-to-br from-secondary-100 to-secondary-50 rounded-lg shadow-inner flex items-center justify-center">
            {icon}
          </div>
        ) : (
          <div className="p-3 bg-gradient-to-br from-secondary-100 to-secondary-50 rounded-lg shadow-inner flex items-center justify-center">
            {chartType === 'bar' && <BarChart className="w-5 h-5 text-secondary-800" />}
            {(chartType === 'line' || chartType === 'area') && <LineChart className="w-5 h-5 text-secondary-800" />}
            {chartType === 'pie' && <PieChartIcon className="w-5 h-5 text-secondary-800" />}
          </div>
        )}
        <div>
          <h3 className="text-xl font-bold text-secondary-800">{title}</h3>
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        {showChartTypeSelector && (
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => onChartTypeChange('bar')}
              className={`p-1.5 rounded-md ${chartType === 'bar' ? 'bg-secondary-50 text-secondary-800' : 'text-gray-500 hover:bg-gray-200'}`}
              title="مخطط أعمدة"
            >
              <BarChart className="w-4 h-4" />
            </button>
            <button
              onClick={() => onChartTypeChange('line')}
              className={`p-1.5 rounded-md ${chartType === 'line' ? 'bg-secondary-50 text-secondary-800' : 'text-gray-500 hover:bg-gray-200'}`}
              title="مخطط خطي"
            >
              <LineChart className="w-4 h-4" />
            </button>
            <button
              onClick={() => onChartTypeChange('area')}
              className={`p-1.5 rounded-md ${chartType === 'area' ? 'bg-secondary-50 text-secondary-800' : 'text-gray-500 hover:bg-gray-200'}`}
              title="مخطط مساحة"
            >
              <LineChart className="w-4 h-4" />
            </button>
             <button
              onClick={() => onChartTypeChange('pie')}
              className={`p-1.5 rounded-md ${chartType === 'pie' ? 'bg-secondary-50 text-secondary-800' : 'text-gray-500 hover:bg-gray-200'}`}
              title="مخطط دائري"
            >
              <PieChartIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {onRefresh && (
          null
        )}

        {onExport && (
          <button 
            onClick={onExport}
            className="p-2 bg-secondary-50 rounded-lg border border-secondary-200 text-secondary-800"
            title="تصدير"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChartControls;
