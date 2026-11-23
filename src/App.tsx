import React, { useEffect } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { Toasts } from './components/common/Toasts';
import { DashboardView } from './components/views/DashboardView';
import { UploadCenterView } from './components/views/UploadCenterView';
import { DataPreviewView } from './components/views/DataPreviewView';
import { CleaningStudioView } from './components/views/CleaningStudioView';
import { TransformationStudioView } from './components/views/TransformationStudioView';
import { ValidationRulesView } from './components/views/ValidationRulesView';
import { DataAnalysisView } from './components/views/DataAnalysisView';
import { AIAssistantView } from './components/views/AIAssistantView';
import { CleaningRecipesView } from './components/views/CleaningRecipesView';
import { DataComparisonView } from './components/views/DataComparisonView';
import { HistoryView } from './components/views/HistoryView';
import { ExportCenterView } from './components/views/ExportCenterView';
import { SettingsView } from './components/views/SettingsView';

const MainLayout: React.FC = () => {
  const { activeTab, canUndo, canRedo, undo, redo } = useData();

  // Keyboard shortcuts (Ctrl+Z for undo, Ctrl+Y or Ctrl+Shift+Z for redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          if (canRedo) {
            e.preventDefault();
            redo();
          }
        } else {
          if (canUndo) {
            e.preventDefault();
            undo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (canRedo) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50/70 dark:bg-slate-950/70">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'upload' && <UploadCenterView />}
          {activeTab === 'preview' && <DataPreviewView />}
          {activeTab === 'clean' && <CleaningStudioView />}
          {activeTab === 'transform' && <TransformationStudioView />}
          {activeTab === 'validation' && <ValidationRulesView />}
          {activeTab === 'analysis' && <DataAnalysisView />}
          {activeTab === 'assistant' && <AIAssistantView />}
          {activeTab === 'recipes' && <CleaningRecipesView />}
          {activeTab === 'comparison' && <DataComparisonView />}
          {activeTab === 'history' && <HistoryView />}
          {activeTab === 'export' && <ExportCenterView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
      <Toasts />
    </div>
  );
};

export function App() {
  return (
    <DataProvider>
      <MainLayout />
    </DataProvider>
  );
}

export default App;
