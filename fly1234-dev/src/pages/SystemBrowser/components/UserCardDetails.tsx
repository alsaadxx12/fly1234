import React from 'react';
import { Mail, Phone, MapPin, Clock, Shield, CheckCircle2 } from 'lucide-react';

interface UserCardProps {
    user: {
        id: string;
        fullname: string;
        email: string;
        mobile: string;
        role: string;
        status: string;
        statusBadge: string;
        last_login: string;
        created_at: string;
        user_photo: string;
        city: string;
        buyer_group: string;
    };
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
}

const UserCardDetails: React.FC<UserCardProps> = ({ user, isSelected, onToggleSelect }) => {
    const getStatusColor = (badge: string) => {
        switch (badge.toLowerCase()) {
            case 'success': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'danger': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    return (
        <div
            className={`group relative bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-lg border-2 cursor-pointer h-[320px] flex flex-col justify-between transition-colors
        ${isSelected
                    ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/10'
                    : 'border-slate-100 dark:border-slate-800'
                }`}
            onClick={() => onToggleSelect(user.id)}
        >
            {/* Checkbox Overlay */}
            <div className={`absolute top-4 left-4 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center
        ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white/50 dark:bg-black/20 border-white/30'}
      `}>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>

            <div className="flex flex-col items-center text-center overflow-hidden">
                {/* Header Info - No Photo */}
                <div className="mt-2 mb-4">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white mb-1 px-2 line-clamp-1">{user.fullname}</h4>
                    <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(user.statusBadge)}`}>
                            {user.status}
                        </span>
                        <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-blue-500" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{user.role}</span>
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="w-full space-y-2 mb-2 overflow-hidden">
                    <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 truncate" dir="ltr">{user.email}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 truncate" dir="ltr">{user.mobile}</span>
                        </div>
                        {user.mobile && (
                            <a
                                href={`https://wa.me/${user.mobile.replace(/\+/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors"
                            >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                            </a>
                        )}
                    </div>
                    {user.city && (
                        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 truncate">{user.city}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Info - Always at bottom */}
            <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[8px] font-bold text-slate-400 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <Clock className="w-2.5 h-2.5 opacity-50" />
                    <span>آخر ظهور: {user.last_login}</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[7px] truncate max-w-[80px]">
                    {user.buyer_group}
                </div>
            </div>
        </div>
    );
};

export default UserCardDetails;
