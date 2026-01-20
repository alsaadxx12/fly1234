
import React, { useMemo, useState, useEffect } from 'react';
import Tree from 'rc-tree';
import 'rc-tree/assets/index.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronDown } from 'lucide-react';
import { menuItems } from '../lib/constants';

// --- Custom Styles for Tree ---
// --- Custom Styles for Tree ---
const treeStyles = `
  .rc-tree {
    background: transparent;
    border: none;
    font-family: inherit;
  }
  .rc-tree .rc-tree-treenode {
    width: 100%;
    margin-bottom: 35px; /* Significantly increased separation */
    padding: 0;
    display: flex;
    align-items: center;
    position: relative;
  }
  /* RTL Indent Fix */
  .rc-tree.rc-tree-rtl .rc-tree-indent {
    margin: 0;
  }
  .rc-tree .rc-tree-node-content-wrapper {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0; /* Enable truncation */
    padding: 0;
    cursor: pointer;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
  .rc-tree .rc-tree-switcher {
    display: inline-flex; /* Fix flex behavior */
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 100%; 
    background: transparent !important;
    transition: all 0.3s;
    flex-shrink: 0; /* Don't shrink */
  }
  .rc-tree-node-selected {
    background: transparent !important;
    opacity: 1 !important;
  }
`;

interface SidebarTreeProps {
    isCollapsed: boolean;
    onItemClick?: () => void;
}

const SidebarTree: React.FC<SidebarTreeProps> = ({ isCollapsed, onItemClick }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { checkPermission } = useAuth();
    const { t } = useLanguage();
    const { theme } = useTheme();

    // --- Transform menuItems to TreeData ---
    const treeData = useMemo(() => {
        const mapItems = (items: any[]): any[] => {
            return items
                .filter(item => {
                    if (item.subItems) {
                        return item.subItems.some((sub: any) => checkPermission(sub.path?.substring(1), 'view'));
                    }
                    if (!item.path) return true;
                    return checkPermission(item.path.substring(1), 'view');
                })
                .map(item => {
                    const hasChildren = item.subItems && item.subItems.length > 0;
                    const key = item.path || item.textKey;

                    return {
                        key: key,
                        title: item.textKey,
                        path: item.path,
                        icon: item.icon,
                        iconColor: item.iconColor,
                        iconBg: item.iconBg,
                        permissions: item.permissions,
                        children: hasChildren ? mapItems(item.subItems) : undefined,
                        isLeaf: !hasChildren,
                        data: item
                    };
                });
        };
        return mapItems(menuItems);
    }, [checkPermission]);

    // --- Expanded Keys State ---
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

    useEffect(() => {
        const findParentKeys = (nodes: any[], targetPath: string, parents: string[] = []): string[] => {
            for (const node of nodes) {
                if (node.path === targetPath) return parents;
                if (node.children) {
                    const found = findParentKeys(node.children, targetPath, [...parents, node.key]);
                    if (found.length) return found;
                }
            }
            return [];
        };

        const activeKey = menuItems.find(i => i.path === location.pathname)?.path
            || menuItems.flatMap(i => i.subItems || []).find(i => i.path === location.pathname)?.path;

        if (activeKey) {
            setSelectedKeys([activeKey]);
            const parents = findParentKeys(treeData, activeKey);
            setExpandedKeys((prev: any) => Array.from(new Set([...prev, ...parents])));
        }
    }, [location.pathname, treeData]);

    const onSelect = (_keys: React.Key[], info: any) => {
        const node = info.node;
        if (node.path) {
            navigate(node.path);
            if (onItemClick) onItemClick();
        } else {
            const key = node.key as string;
            setExpandedKeys((prev: any) =>
                prev.includes(key) ? prev.filter((k: any) => k !== key) : [...prev, key]
            );
        }
    };

    const onExpand = (expandedKeys: React.Key[]) => {
        setExpandedKeys(expandedKeys);
    };

    const switcherIcon = (obj: any) => {
        if (obj.isLeaf) return null;
        return (
            <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${obj.expanded ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
            />
        );
    };

    const titleRender = (node: any) => {
        const isActive = location.pathname === node.path;
        const Icon = node.icon;

        const containerClasses = `
        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 w-full
        ${isActive
                ? theme === 'dark'
                    ? 'bg-gray-800 text-white shadow-lg'
                    : 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 shadow-md border border-indigo-200'
                : theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
            }
    `;

        const iconClasses = `
       relative p-2 rounded-lg transition-all duration-300
       ${isActive
                ? theme === 'dark'
                    ? 'bg-white/20 shadow-inner'
                    : 'bg-gradient-to-br from-indigo-500 to-blue-500 shadow-md'
                : `${node.iconBg || 'bg-gray-100 dark:bg-gray-700'} group-hover:scale-110`
            }
    `;

        const iconSvgClasses = `
        w-4 h-4 transition-all duration-300
        ${isActive
                ? 'text-white'
                : theme === 'dark'
                    ? node.iconColor || 'text-gray-300'
                    : node.iconColor || 'text-gray-700'
            }
    `;

        return (
            <div className={containerClasses}>
                {isActive && theme === 'light' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/50 to-blue-100/50 rounded-xl animate-pulse -z-10"></div>
                )}

                {Icon && (
                    <div className={iconClasses}>
                        <Icon className={iconSvgClasses} />
                    </div>
                )}

                <span className="flex-1 font-semibold text-sm truncate">
                    {t(node.title)}
                </span>
            </div>
        );
    };

    if (isCollapsed) return null;

    return (
        <div className="w-full px-2" dir="rtl">
            <style>{treeStyles}</style>
            <Tree
                treeData={treeData}
                expandedKeys={expandedKeys}
                selectedKeys={selectedKeys}
                onSelect={onSelect}
                onExpand={onExpand}
                switcherIcon={switcherIcon}
                titleRender={titleRender}
                direction="rtl"
                showLine={false}
                showIcon={false}
            />
        </div>
    );
};

export default SidebarTree;
