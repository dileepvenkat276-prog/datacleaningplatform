import React, { useState } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  TableProperties,
  Wand2,
  Workflow,
  ShieldCheck,
  BarChart3,
  Bot,
  ScrollText,
  GitCompare,
  History,
  DownloadCloud,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ActiveNavTab } from '../../types/dataset';
import { useData } from '../../context/DataContext';

interface NavItem {
  id: ActiveNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, qualityReport, validationErrors, history } = useData();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const qualityIssuesCount = qualityReport?.issues.length || 0;
  const validationCount = validationErrors.length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload Dataset', icon: UploadCloud },
    { id: 'preview', label: 'Data Preview', icon: TableProperties },
    {
      id: 'clean',
      label: 'Clean Data',
      icon: Wand2,
      badge: qualityIssuesCount > 0 ? qualityIssuesCount : undefined,
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
    },
    { id: 'transform', label: 'Transformation', icon: Workflow },
    {
      id: 'validation',
      label: 'Data Validation',
      icon: ShieldCheck,
      badge: validationCount > 0 ? validationCount : undefined,
      badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
    },
    { id: 'analysis', label: 'Data Analysis', icon: BarChart3 },
    {
      id: 'assistant',
      label: 'AI Assistant',
      icon: Bot,
      badge: 'AI',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
    },
    { id: 'recipes', label: 'Cleaning Recipes', icon: ScrollText },
    { id: 'comparison', label: 'Data Comparison', icon: GitCompare },
    {
      id: 'history',
      label: 'History & Logs',
      icon: History,
      badge: history.length > 1 ? history.length : undefined,
      badgeColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
    },
    { id: 'export', label: 'Export Center', icon: DownloadCloud },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside
      className={`relative z-20 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Sidebar Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 group relative ${
                isActive
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold border border-brand-500/20 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              />

              {!collapsed && (
                <span className="ml-3 truncate text-left flex-1">{item.label}</span>
              )}

              {!collapsed && item.badge !== undefined && (
                <span
                  className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {/* Collapsed Tooltip badge */}
              {collapsed && item.badge !== undefined && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>Local Engine Active</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors mx-auto"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
