import React from 'react';
import { BarChart, Users, Phone, CheckCircle2 } from 'lucide-react';

interface AnnouncementStatsProps {
  stats: {
    totalSent: number;
    groupsSent: number;
    contactsSent: number;
    successRate: number;
  };
}

const AnnouncementStats: React.FC<AnnouncementStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50 border-t border-gray-100">
      
    </div>
  );
};

export default AnnouncementStats;
