import React from 'react';
import { CheckCircle2, Plus, Users, Phone, Ban, MessageCircle } from 'lucide-react';

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  features: string[];
  color: string;
  icon: string;
  onClick: () => void;
}

interface AnnouncementFeaturesProps {
  features: FeatureCard[];
  selectedAccount: { instance_id: string; token: string } | null;
  simplified?: boolean;
}

const AnnouncementFeatures: React.FC<AnnouncementFeaturesProps> = ({ features, selectedAccount, simplified = false }) => {
  // Function to render the appropriate icon based on the icon name
  const renderIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case 'Users':
        return <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />;
      case 'Phone':
        return <Phone className="w-7 h-7 text-green-600 dark:text-green-400" />; 
      case 'Ban':
        return <Ban className="w-7 h-7 text-red-600 dark:text-red-400" />;
      default:
        return <MessageCircle className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {features.map((feature) => (
        <div key={feature.id} className={`bg-gray-50 dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-colors flex flex-col`}>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 bg-gray-100 dark:bg-gray-700 rounded-lg`}>
                {renderIcon(feature.icon, feature.color)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">{feature.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{feature.id === 'exceptions' ? 'إدارة الاستثناءات' : feature.title}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {feature.description}
            </p>
            
            <div className="space-y-2 mb-4">
              {feature.features.map((featureText, idx) => (
                <div key={idx} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-medium">{featureText}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={feature.onClick}
            className={`w-full px-4 py-2.5 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
              feature.id === 'groups' ? 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600' :
              feature.id === 'contacts' ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600' :
              'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600'
            }`}
            disabled={!selectedAccount}
          >
            <Plus className="w-5 h-5" />
            <span>
              {feature.id === 'groups' ? 'إرسال عبر المجموعات' : 
               feature.id === 'contacts' ? 'إرسال عبر جهات الاتصال' : 
               'إدارة الاستثناءات'}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
};

export default AnnouncementFeatures;
