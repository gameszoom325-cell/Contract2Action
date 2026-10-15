import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Header, NavTab } from './components/Header.tsx';
import { OverviewDashboard } from './components/OverviewDashboard.tsx';
import { ContractUpload } from './components/ContractUpload.tsx';
import { ContractAnalysisViewer } from './components/ContractAnalysisViewer.tsx';
import { ApprovalsHub } from './components/ApprovalsHub.tsx';
import { TasksTracker } from './components/TasksTracker.tsx';
import { AuditTrailView } from './components/AuditTrailView.tsx';
import { PRDDocView } from './components/PRDDocView.tsx';
import { ChatbotDrawer } from './components/ChatbotDrawer.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';
import { MessageSquare, X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { toast, clearToast } = useApp();

  return (
    <div className="min-h-screen flex flex-col transition-colors selection:bg-accent/20" style={{ backgroundColor: 'var(--background)', color: 'var(--text)' }}>
      {/* Top Header */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        openNotificationDrawer={() => setIsNotificationOpen(true)}
      />

      {/* Main App Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && <OverviewDashboard setActiveTab={setActiveTab} />}
        {activeTab === 'upload' && <ContractUpload setActiveTab={setActiveTab} />}
        {activeTab === 'analysis' && <ContractAnalysisViewer setActiveTab={setActiveTab} />}
        {activeTab === 'approvals' && <ApprovalsHub setActiveTab={setActiveTab} />}
        {activeTab === 'tasks' && <TasksTracker setActiveTab={setActiveTab} />}
        {activeTab === 'audit' && <AuditTrailView />}
        {activeTab === 'prd' && <PRDDocView />}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs transition-colors" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold" style={{ color: 'var(--text)' }}>Contract2Action AI</span>
            <span>•</span>
            <span>Team Titan Attacks (Project Eclipse)</span>
          </div>
          <div>
            "Understand the Contract. Automate the Action. Track the Outcome."
          </div>
        </div>
      </footer>

      {/* Floating Chat Trigger Button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-5 right-5 z-40 p-3.5 rounded-2xl shadow-xl flex items-center space-x-2.5 transition-all hover:scale-105 cursor-pointer focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-foreground)',
          }}
          aria-label="Open Contract2Action Legal QA Assistant"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs font-bold hidden sm:inline-block">Ask Contract Assistant</span>
        </button>
      )}

      {/* Grounded Chatbot Drawer */}
      <ChatbotDrawer 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />

      {/* Notifications Drawer */}
      <NotificationDrawer 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
        setActiveTab={setActiveTab}
      />

      {/* Toast Alert Popup */}
      {toast && (
        <div 
          className="fixed bottom-5 left-5 z-50 max-w-md p-3.5 rounded-2xl border shadow-xl flex items-center justify-between space-x-3 text-xs animate-in slide-in-from-bottom-5"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: toast.type === 'success' ? 'var(--success)' :
                         toast.type === 'danger' ? 'var(--danger)' :
                         toast.type === 'warning' ? 'var(--warning)' : 'var(--accent)',
            color: 'var(--text)',
          }}
        >
          <div className="flex items-center space-x-2.5">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />}
            {toast.type === 'danger' && <AlertCircle className="w-4 h-4 shrink-0 text-danger" />}
            {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />}
            {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-accent" />}
            <span className="font-medium">{toast.message}</span>
          </div>
          <button onClick={clearToast} className="p-1 rounded text-muted hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}
