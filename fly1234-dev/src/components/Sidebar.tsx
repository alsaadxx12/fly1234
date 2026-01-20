import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SidebarTree from './SidebarTree';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import {
  Key,
  Check,
  Loader as Loader2,
  TriangleAlert as AlertTriangle,
  X,
  Sun,
  Moon,
  ChevronRight,
  ChevronsLeft
} from 'lucide-react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { menuItems } from '../lib/constants';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isCollapsed: boolean;
  onCollapseChange: (isCollapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, toggleSidebar, isCollapsed, onCollapseChange }) => {
  const { checkPermission } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);


  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    setIsChangingPassword(true);

    try {
      if (newPassword !== confirmPassword) {
        throw new Error('كلمات المرور الجديدة غير متطابقة');
      }

      if (newPassword.length < 8) {
        throw new Error('يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل');
      }

      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('لم يتم العثور على المستخدم الحالي');
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setPasswordSuccess('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (error) {
      console.error('Error changing password:', error);
      if (error instanceof Error) {
        if (error.message.includes('auth/wrong-password')) {
          setPasswordError('كلمة المرور الحالية غير صحيحة');
        } else {
          setPasswordError(error.message);
        }
      } else {
        setPasswordError('حدث خطأ أثناء تغيير كلمة المرور');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const visibleMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if ((item as any).subItems) {
        return (item as any).subItems.some((subItem: any) => checkPermission(subItem.path.substring(1), 'view'));
      }
      if (!item.path) return false;
      return checkPermission(item.path.substring(1), 'view');
    });
  }, [checkPermission]);

  return (
    <>
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 backdrop-blur-sm transition-opacity duration-300"
          onClick={toggleSidebar}
        ></div>
      )}

      <aside
        className={`absolute top-0 right-0 bottom-0 shadow-xl transition-all duration-300 z-40 flex flex-col ${isMobile
          ? isSidebarOpen
            ? 'translate-x-0 w-64'
            : 'translate-x-full w-64'
          : isCollapsed
            ? 'w-20'
            : 'w-64'
          } ${theme === 'dark'
            ? 'bg-gray-900 border-l border-gray-800'
            : 'bg-white border-l border-gray-200'
          }`}
      >
        {/* Sidebar Header & Toggle */}
        {!isMobile && (
          <div className={`p-4 border-b border-gray-100 dark:border-gray-800 flex items-center ${isCollapsed ? 'justify-center' : 'justify-end'}`}>

            <button
              onClick={() => onCollapseChange(!isCollapsed)}
              className={`p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isCollapsed ? '' : 'mr-auto'}`}
            >
              {isCollapsed ? (
                <ChevronsLeft className="w-5 h-5 rotate-180" />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400">طي القائمة</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </div>
        )}

        <ScrollArea.Root className="flex-1 overflow-hidden">
          <ScrollArea.Viewport className="h-full w-full">
            <nav className={`${isCollapsed ? 'p-2' : 'pt-2'} space-y-2`}>
              {isCollapsed ? (
                // Collapsed View (Icon Only) - Existing Logic adapted
                visibleMenuItems.map((item: any) => {
                  const isActive = location.pathname === item.path || (item.subItems && item.subItems.some((sub: any) => location.pathname.startsWith(sub.path)));
                  const Icon = item.icon;

                  return (
                    <div key={item.textKey} className="flex justify-center py-2">
                      <Link
                        to={item.path || (item.subItems ? item.subItems[0].path : '#')}
                        className={`group relative flex items-center justify-center p-3 rounded-xl transition-all duration-300 transform hover:scale-105 ${isActive
                          ? theme === 'dark'
                            ? 'bg-gray-800 text-white shadow-lg'
                            : 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 shadow-md border border-indigo-200'
                          : theme === 'dark'
                            ? 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                          }`}
                        title={t(item.textKey)}
                      >
                        <div className={`relative ${isActive ? theme === 'dark' ? 'bg-white/20' : 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white' : ''} p-1 rounded-lg`}>
                          <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                        </div>
                      </Link>
                    </div>
                  );
                })
              ) : (
                // Tree View (Expanded)
                <SidebarTree isCollapsed={isCollapsed} onItemClick={isMobile ? toggleSidebar : undefined} />
              )}
            </nav>
          </ScrollArea.Viewport>

          <ScrollArea.Scrollbar
            className="flex select-none touch-none p-0.5 transition-colors duration-150 ease-out data-[orientation=vertical]:w-2 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2"
            orientation="vertical"
          >
            <ScrollArea.Thumb
              className={`flex-1 rounded-full relative ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                }`}
            />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
        <div className={`mt-auto p-4 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
          <button
            onClick={toggleTheme}
            className={`flex items-center w-full gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${theme === 'dark'
              ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
              : 'bg-gray-50 text-slate-700 hover:bg-gray-100'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-yellow-400/10' : 'bg-slate-200'}`}>
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-sm">
                {theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
              </span>
            )}
          </button>
        </div>
      </aside>

      {isPasswordModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4"
          onClick={() => setIsPasswordModalOpen(false)}
        >
          <div
            className={`rounded-2xl shadow-2xl max-w-md w-full overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-xl">
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">تغيير كلمة المرور</h3>
                    <p className="text-sm text-white/80">
                      تحديث كلمة المرور الخاصة بك
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="p-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="p-5">
              {passwordError && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 border ${theme === 'dark'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-red-50 text-red-700 border-red-100'
                    }`}
                >
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 border ${theme === 'dark'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-green-50 text-green-700 border-green-100'
                    }`}
                >
                  <Check className="w-5 h-5 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}
                  >
                    كلمة المرور الحالية
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg transition-all ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-amber-500'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500'
                      } border focus:outline-none focus:ring-2 focus:ring-amber-500/20`}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}
                  >
                    كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg transition-all ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-amber-500'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500'
                      } border focus:outline-none focus:ring-2 focus:ring-amber-500/20`}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <p
                    className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}
                  >
                    يجب أن تكون كلمة المرور 8 أحرف على الأقل
                  </p>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}
                  >
                    تأكيد كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg transition-all ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-amber-500'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500'
                      } border focus:outline-none focus:ring-2 focus:ring-amber-500/20`}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div
                className={`flex items-center justify-end gap-3 pt-4 border-t mt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}
              >
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2 text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التحديث...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>تحديث كلمة المرور</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
