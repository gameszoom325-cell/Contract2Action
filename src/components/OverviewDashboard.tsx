import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  ArrowUpRight, 
  TrendingUp, 
  Calendar, 
  Filter, 
  ChevronRight, 
  Upload, 
  Lock, 
  CheckCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { computeDeadlineStatus, computeRiskDistribution } from '../utils/workflowEngine.ts';
import { NavTab } from './Header.tsx';

interface OverviewDashboardProps {
  setActiveTab: (tab: NavTab) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ setActiveTab }) => {
  const { obligations, tasks, contracts, currentUser } = useApp();
  const [selectedChartFilter, setSelectedChartFilter] = useState<'all' | 'approved' | 'pending'>('all');

  // KPI Calculations
  const totalObligations = obligations.length;
  const pendingApprovals = obligations.filter(
    o => o.approval_status === 'Pending' || o.approval_status === 'Needs Review'
  ).length;
  const activeTasks = tasks.filter(t => t.status !== 'Completed').length;
  const highRiskCount = obligations.filter(o => o.risk_level === 'High').length;
  
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'Completed') return false;
    const deadline = computeDeadlineStatus(t.due_date);
    return deadline.isOverdue;
  });

  // Risk Distribution for Donut Chart
  const riskDist = computeRiskDistribution(obligations);

  // Group by Type for Bar Chart
  const types = ['Payment', 'Delivery', 'Inspection', 'Compliance', 'Reporting', 'SLA'] as const;
  const typeCounts = types.map(t => {
    const matchingObs = obligations.filter(o => {
      if (selectedChartFilter === 'approved') return o.type === t && o.approval_status === 'Approved';
      if (selectedChartFilter === 'pending') return o.type === t && (o.approval_status === 'Pending' || o.approval_status === 'Needs Review');
      return o.type === t;
    });

    const completed = tasks.filter(task => task.type === t && task.status === 'Completed').length;
    const inProgress = tasks.filter(task => task.type === t && (task.status === 'In Progress' || task.status === 'In Review')).length;
    const blocked = tasks.filter(task => task.type === t && (task.status === 'Blocked' || task.is_locked)).length;
    const pending = matchingObs.filter(o => o.approval_status === 'Pending' || o.approval_status === 'Needs Review').length;

    return {
      type: t,
      total: matchingObs.length,
      completed,
      inProgress,
      blocked,
      pending,
    };
  });

  const maxTypeCount = Math.max(...typeCounts.map(d => d.total), 1);

  // Upcoming Deadlines (Next 30 days)
  const upcomingList = [...tasks]
    .map(t => ({
      ...t,
      deadlineInfo: computeDeadlineStatus(t.due_date),
    }))
    .filter(t => t.status !== 'Completed' && t.deadlineInfo.daysRemaining <= 30)
    .sort((a, b) => a.deadlineInfo.daysRemaining - b.deadlineInfo.daysRemaining);

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome & Hackathon Mission Banner */}
      <div 
        className="rounded-2xl p-6 border shadow-xs relative overflow-hidden transition-all"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="max-w-3xl relative z-10">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--accent)' }}>
            <Sparkles className="w-4 h-4" />
            <span>Genie X Hub Hackathon • Project Eclipse</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
            Understand the Contract. Automate the Action. Track the Outcome.
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            AI extracts binding clauses and calculates risks. Deterministic rule engines enforce preconditions and human approvals control execution before any task or payment takes action.
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              onClick={() => setActiveTab('upload')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-foreground)'
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New Contract</span>
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--surface-raised)',
                color: 'var(--text)',
                borderColor: 'var(--border)'
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
              <span>Review Approvals Queue ({pendingApprovals})</span>
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--surface-raised)',
                color: 'var(--text)',
                borderColor: 'var(--border)'
              }}
            >
              <span>View Tasks Board</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div 
          className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Obligations */}
        <div 
          className="p-5 rounded-2xl border shadow-xs transition-transform hover:-translate-y-0.5 cursor-pointer"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          onClick={() => setActiveTab('analysis')}
        >
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span className="font-semibold uppercase tracking-wider">Total Obligations</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--surface-raised)' }}>
              <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold" style={{ color: 'var(--text)' }}>
              {totalObligations}
            </span>
            <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
              Across {contracts.length} agreements
            </span>
          </div>
          <div className="mt-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            100% grounded in source clauses
          </div>
        </div>

        {/* Card 2: Pending Approvals */}
        <div 
          className="p-5 rounded-2xl border shadow-xs transition-transform hover:-translate-y-0.5 cursor-pointer relative overflow-hidden"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          onClick={() => setActiveTab('approvals')}
        >
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span className="font-semibold uppercase tracking-wider">Pending Review</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--warning-subtle)' }}>
              <Clock className="w-4 h-4" style={{ color: 'var(--warning)' }} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold" style={{ color: 'var(--warning)' }}>
              {pendingApprovals}
            </span>
            <span 
              className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
              style={{
                backgroundColor: 'var(--warning-subtle)',
                color: 'var(--warning)',
                borderColor: 'var(--warning)'
              }}
            >
              Action Required
            </span>
          </div>
          <div className="mt-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Requires Approver or Manager sign-off
          </div>
        </div>

        {/* Card 3: Active Tasks */}
        <div 
          className="p-5 rounded-2xl border shadow-xs transition-transform hover:-translate-y-0.5 cursor-pointer"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          onClick={() => setActiveTab('tasks')}
        >
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span className="font-semibold uppercase tracking-wider">Active Tasks</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--surface-raised)' }}>
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold" style={{ color: 'var(--text)' }}>
              {activeTasks}
            </span>
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              {tasks.filter(t => t.status === 'Completed').length} Completed
            </span>
          </div>
          <div className="mt-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Automated from approved obligations
          </div>
        </div>

        {/* Card 4: Overdue Items */}
        <div 
          className="p-5 rounded-2xl border shadow-xs transition-transform hover:-translate-y-0.5 cursor-pointer"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          onClick={() => setActiveTab('tasks')}
        >
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span className="font-semibold uppercase tracking-wider">Overdue</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--danger-subtle)' }}>
              <AlertCircle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold" style={{ color: overdueTasks.length > 0 ? 'var(--danger)' : 'var(--text)' }}>
              {overdueTasks.length}
            </span>
            {overdueTasks.length > 0 ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--danger-subtle)', color: 'var(--danger)' }}>
                Urgent
              </span>
            ) : (
              <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>
                On Schedule
              </span>
            )}
          </div>
          <div className="mt-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Tasks past contractual milestone
          </div>
        </div>

        {/* Card 5: High Risk Items */}
        <div 
          className="p-5 rounded-2xl border shadow-xs transition-transform hover:-translate-y-0.5 cursor-pointer"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          onClick={() => setActiveTab('approvals')}
        >
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span className="font-semibold uppercase tracking-wider">High Risk</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--danger-subtle)' }}>
              <ShieldAlert className="w-4 h-4" style={{ color: 'var(--danger)' }} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold" style={{ color: 'var(--danger)' }}>
              {highRiskCount}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ backgroundColor: 'var(--danger-subtle)', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
              Mandatory Rationale
            </span>
          </div>
          <div className="mt-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Requires written approval comment
          </div>
        </div>
      </div>

      {/* Charts Section: Bar Chart & Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BAR CHART: Obligations & Tasks by Type & Status */}
        <div 
          className="lg:col-span-2 p-6 rounded-2xl border shadow-xs"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b gap-2" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                Obligations & Tasks by Category
              </h2>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Distribution across Payment, Delivery, Inspection, Compliance, Reporting, and SLA
              </p>
            </div>
            
            {/* Filter Toggle */}
            <div 
              className="inline-flex rounded-lg p-0.5 border self-start"
              style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
            >
              {(['all', 'approved', 'pending'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSelectedChartFilter(mode)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-colors"
                  style={{
                    backgroundColor: selectedChartFilter === mode ? 'var(--surface)' : 'transparent',
                    color: selectedChartFilter === mode ? 'var(--accent)' : 'var(--text-secondary)',
                    boxShadow: selectedChartFilter === mode ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart Visualizer */}
          <div className="mt-6 space-y-4">
            {typeCounts.map(item => {
              const widthPct = Math.max(12, Math.round((item.total / maxTypeCount) * 100));
              return (
                <div key={item.type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>
                      {item.type}
                    </span>
                    <span className="font-bold font-mono" style={{ color: 'var(--accent)' }}>
                      {item.total} obligation{item.total === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Multi-segmented bar */}
                  <div 
                    className="h-6 w-full rounded-lg overflow-hidden flex"
                    style={{ backgroundColor: 'var(--surface-raised)' }}
                  >
                    {item.total === 0 ? (
                      <div className="h-full w-full flex items-center px-3 text-[10px]" style={{ color: 'var(--muted)' }}>
                        No obligations
                      </div>
                    ) : (
                      <div 
                        className="h-full rounded-lg transition-all flex items-center justify-between px-2 text-[10px] font-bold"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: item.type === 'Payment' ? 'var(--accent)' :
                                          item.type === 'Delivery' ? 'var(--success)' :
                                          item.type === 'Inspection' ? 'var(--info)' :
                                          item.type === 'Compliance' ? 'var(--purple)' :
                                          item.type === 'Reporting' ? 'var(--warning)' : 'var(--danger)',
                          color: '#ffffff'
                        }}
                      >
                        <span className="truncate">{item.type}</span>
                        <span>{item.total}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--accent)' }} />
              <span>Payment ($)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--success)' }} />
              <span>Delivery</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--info)' }} />
              <span>Inspection</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--purple)' }} />
              <span>Compliance</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--warning)' }} />
              <span>Reporting</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--danger)' }} />
              <span>SLA Penalty</span>
            </div>
          </div>
        </div>

        {/* PIE / DONUT CHART: Risk Level Distribution */}
        <div 
          className="p-6 rounded-2xl border shadow-xs flex flex-col justify-between"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                  Risk Profile Distribution
                </h2>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Grounded AI severity assessment
                </p>
              </div>
            </div>

            {/* Donut Chart SVG */}
            <div className="mt-6 flex flex-col items-center justify-center">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Background track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="var(--surface-raised)"
                    strokeWidth="16"
                  />
                  {/* High Risk slice */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="var(--danger)"
                    strokeWidth="16"
                    strokeDasharray={`${(riskDist.percentages.High / 100) * 251.2} 251.2`}
                    strokeDashoffset="0"
                  />
                  {/* Medium Risk slice */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="var(--warning)"
                    strokeWidth="16"
                    strokeDasharray={`${(riskDist.percentages.Medium / 100) * 251.2} 251.2`}
                    strokeDashoffset={`-${(riskDist.percentages.High / 100) * 251.2}`}
                  />
                  {/* Low Risk slice */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="var(--success)"
                    strokeWidth="16"
                    strokeDasharray={`${(riskDist.percentages.Low / 100) * 251.2} 251.2`}
                    strokeDashoffset={`-${((riskDist.percentages.High + riskDist.percentages.Medium) / 100) * 251.2}`}
                  />
                </svg>

                {/* Center metric */}
                <div className="absolute text-center">
                  <div className="text-2xl font-black font-mono" style={{ color: 'var(--text)' }}>
                    {riskDist.total}
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--muted)' }}>
                    Total Items
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown cards */}
          <div className="mt-6 space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl border text-xs" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--danger)' }} />
                <span className="font-semibold" style={{ color: 'var(--text)' }}>High Risk</span>
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>(Requires Comment)</span>
              </div>
              <div className="font-bold font-mono" style={{ color: 'var(--danger)' }}>
                {riskDist.counts.High} ({riskDist.percentages.High}%)
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl border text-xs" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--warning)' }} />
                <span className="font-semibold" style={{ color: 'var(--text)' }}>Medium Risk</span>
              </div>
              <div className="font-bold font-mono" style={{ color: 'var(--warning)' }}>
                {riskDist.counts.Medium} ({riskDist.percentages.Medium}%)
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl border text-xs" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
                <span className="font-semibold" style={{ color: 'var(--text)' }}>Low Risk</span>
              </div>
              <div className="font-bold font-mono" style={{ color: 'var(--success)' }}>
                {riskDist.counts.Low} ({riskDist.percentages.Low}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Upcoming 30-Day Deadlines & Conditional Workflow Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines Radar (2 cols) */}
        <div 
          className="lg:col-span-2 p-6 rounded-2xl border shadow-xs"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                  Upcoming Milestone Deadlines (Next 30 Days)
                </h2>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Contract milestones sorted by urgency
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('tasks')}
              className="text-xs font-semibold inline-flex items-center space-x-1 hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              <span>View all tasks</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 divide-y" style={{ borderColor: 'var(--border)' }}>
            {upcomingList.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
                No active tasks due in the next 30 days.
              </div>
            ) : (
              upcomingList.slice(0, 5).map(task => {
                const isOverdue = task.deadlineInfo.isOverdue;
                const isUrgent = task.deadlineInfo.urgency === 'urgent';
                return (
                  <div key={task.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {task.is_locked ? (
                          <span 
                            className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded border"
                            style={{
                              backgroundColor: 'var(--surface-raised)',
                              color: 'var(--muted)',
                              borderColor: 'var(--border)'
                            }}
                          >
                            <Lock className="w-2.5 h-2.5" />
                            <span>Locked Precondition</span>
                          </span>
                        ) : (
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded border"
                            style={{
                              backgroundColor: 'var(--accent-subtle)',
                              color: 'var(--accent)',
                              borderColor: 'var(--border)'
                            }}
                          >
                            {task.type}
                          </span>
                        )}
                        <span className="font-semibold text-xs" style={{ color: 'var(--text)' }}>
                          {task.title}
                        </span>
                      </div>
                      <div className="text-[11px] flex items-center space-x-2" style={{ color: 'var(--muted)' }}>
                        <span>Ref: {task.clause_reference} (P.{task.page})</span>
                        <span>•</span>
                        <span>Assignee: {task.assigned_role}</span>
                        {task.amount && (
                          <>
                            <span>•</span>
                            <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>
                              ${task.amount.toLocaleString()} {task.currency}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-center">
                      <div className="text-right">
                        <div 
                          className="text-xs font-bold font-mono"
                          style={{
                            color: isOverdue ? 'var(--danger)' : isUrgent ? 'var(--warning)' : 'var(--text)'
                          }}
                        >
                          {task.deadlineInfo.formattedText}
                        </div>
                        <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
                          Due {task.due_date}
                        </div>
                      </div>

                      <span 
                        className="text-[10px] font-bold uppercase px-2 py-1 rounded"
                        style={{
                          backgroundColor: task.status === 'Completed' ? 'var(--success-subtle)' :
                                          task.status === 'In Progress' ? 'var(--accent-subtle)' :
                                          task.status === 'Blocked' ? 'var(--danger-subtle)' : 'var(--surface-raised)',
                          color: task.status === 'Completed' ? 'var(--success)' :
                                 task.status === 'In Progress' ? 'var(--accent)' :
                                 task.status === 'Blocked' ? 'var(--danger)' : 'var(--muted)'
                        }}
                      >
                        {task.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Conditional Workflow Architecture Card (1 col) */}
        <div 
          className="p-6 rounded-2xl border shadow-xs flex flex-col justify-between"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div>
            <div className="flex items-center space-x-2 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <Lock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                  Conditional Execution Engine
                </h2>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Deterministic dependency graph
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div 
                className="p-3 rounded-xl border text-xs space-y-1.5"
                style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
              >
                <div className="font-bold flex items-center justify-between" style={{ color: 'var(--text)' }}>
                  <span>Stage 1: Milestone Delivery</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                    In Progress
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                  Apex Cloud delivers cloud architecture manifests (Due Oct 25).
                </p>
              </div>

              <div className="flex justify-center -my-1">
                <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>↓ then</span>
              </div>

              <div 
                className="p-3 rounded-xl border text-xs space-y-1.5"
                style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
              >
                <div className="font-bold flex items-center justify-between" style={{ color: 'var(--text)' }}>
                  <span>Stage 2: Acceptance Inspection</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded" style={{ backgroundColor: 'var(--surface)', color: 'var(--muted)' }}>
                    Pending Delivery
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                  Titan Security conducts vulnerability tests within 10-day window.
                </p>
              </div>

              <div className="flex justify-center -my-1">
                <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>↓ then</span>
              </div>

              <div 
                className="p-3 rounded-xl border text-xs space-y-1.5"
                style={{ backgroundColor: 'var(--danger-subtle)', borderColor: 'var(--danger)' }}
              >
                <div className="font-bold flex items-center justify-between" style={{ color: 'var(--danger)' }}>
                  <span className="flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Stage 3: $45,000 Payment Unlock</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border" style={{ backgroundColor: 'var(--surface)', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                    Guarded
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--danger)' }}>
                  Payment task is mathematically locked until signed inspection certificate is uploaded.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            Ensures unauthorized disbursements never occur before verified milestone delivery.
          </div>
        </div>
      </div>
    </div>
  );
};
