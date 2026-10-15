import React, { useState } from 'react';
import { 
  ListTodo, 
  Columns, 
  List, 
  Download, 
  Plus, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { TaskItem, TaskStatus, TaskPriority, Role, ObligationType } from '../types/contract.ts';
import { computeDeadlineStatus } from '../utils/workflowEngine.ts';
import { NavTab } from './Header.tsx';

interface TasksTrackerProps {
  setActiveTab: (tab: NavTab) => void;
}

export const TasksTracker: React.FC<TasksTrackerProps> = ({ setActiveTab }) => {
  const { 
    tasks, 
    userVisibleTasks, 
    updateTaskStatus, 
    currentUser, 
    createManualTask, 
    showToast 
  } = useApp();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<ObligationType>('Delivery');
  const [newRole, setNewRole] = useState<Role>('Employee');
  const [newPriority, setNewPriority] = useState<TaskPriority>('Medium');
  const [newDueDate, setNewDueDate] = useState('2026-11-15');
  const [newAmount, setNewAmount] = useState<string>('');

  const kanbanColumns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'To Do', label: 'To Do', color: 'var(--muted)' },
    { id: 'In Progress', label: 'In Progress', color: 'var(--accent)' },
    { id: 'In Review', label: 'In Review', color: 'var(--warning)' },
    { id: 'Completed', label: 'Completed', color: 'var(--success)' },
    { id: 'Blocked', label: 'Blocked / Guarded', color: 'var(--danger)' },
  ];

  const filteredTasks = userVisibleTasks.filter(t => {
    if (selectedRoleFilter !== 'all' && t.assigned_role !== selectedRoleFilter) return false;
    if (selectedPriorityFilter !== 'all' && t.priority !== selectedPriorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.contract_title.toLowerCase().includes(q) ||
        t.clause_reference.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportTasksToCSV = () => {
    if (filteredTasks.length === 0) {
      showToast('No tasks to export.', 'warning');
      return;
    }

    const headers = [
      'Task ID',
      'Contract Title',
      'Clause Reference',
      'Task Title',
      'Type',
      'Status',
      'Priority',
      'Assigned Role',
      'Due Date',
      'Amount',
      'Currency',
      'Locked',
      'Prerequisites',
    ];

    const rows = filteredTasks.map(t => [
      `"${t.id}"`,
      `"${t.contract_title.replace(/"/g, '""')}"`,
      `"${t.clause_reference}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.type}"`,
      `"${t.status}"`,
      `"${t.priority}"`,
      `"${t.assigned_role}"`,
      `"${t.due_date}"`,
      t.amount !== undefined ? t.amount : '',
      `"${t.currency || ''}"`,
      `"${t.is_locked ? 'Yes' : 'No'}"`,
      `"${(t.prerequisites || []).join(';')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Contract2Action_Tasks_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Exported tasks to CSV successfully.', 'success');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Please enter a task title', 'warning');
      return;
    }

    createManualTask({
      contract_id: 'contract_manual',
      contract_title: 'Manual Operational Task',
      obligation_id: `obl_manual_${Date.now()}`,
      clause_reference: 'Section Operational',
      page: 1,
      source_quote: 'Manual operational instruction authorized by management.',
      title: newTitle,
      description: newDesc,
      type: newType,
      status: 'To Do',
      priority: newPriority,
      assigned_role: newRole,
      assigned_user: newRole === 'Employee' ? 'user_employee' : currentUser.id,
      due_date: newDueDate,
      amount: newAmount ? parseFloat(newAmount) : undefined,
      currency: newAmount ? 'USD' : undefined,
      is_locked: false,
      prerequisites: [],
    });

    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDesc('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            <span>Operational Execution</span>
            <span>•</span>
            <span style={{ color: 'var(--accent)' }}>Conditional Workflow Guard</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Obligations & Tasks Tracker
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage contractual deliverables, track milestone deadlines, and execute conditional payment unlocks.
          </p>
        </div>

        {/* View Mode Toggle & CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div 
            className="inline-flex rounded-xl p-0.5 border"
            style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
          >
            <button
              onClick={() => setViewMode('kanban')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              style={{
                backgroundColor: viewMode === 'kanban' ? 'var(--surface)' : 'transparent',
                color: viewMode === 'kanban' ? 'var(--accent)' : 'var(--text-secondary)',
                boxShadow: viewMode === 'kanban' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              style={{
                backgroundColor: viewMode === 'list' ? 'var(--surface)' : 'transparent',
                color: viewMode === 'list' ? 'var(--accent)' : 'var(--text-secondary)',
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={exportTasksToCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Add Task Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Role Notice for Employee */}
      {currentUser.role === 'Employee' && (
        <div 
          className="p-3.5 rounded-2xl border text-xs flex items-center justify-between"
          style={{ backgroundColor: 'var(--accent-subtle)', borderColor: 'var(--accent)', color: 'var(--accent)' }}
        >
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>
              <strong>Employee View Active:</strong> Showing only tasks assigned to your role ({userVisibleTasks.length} visible). Switch role in header to view all team tasks.
            </span>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div 
        className="p-4 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-3"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, contracts, or clauses..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>

        <select
          value={selectedRoleFilter}
          onChange={(e) => setSelectedRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <option value="all">All Roles</option>
          <option value="Employee">Employee</option>
          <option value="Manager">Manager</option>
          <option value="Approver">Approver</option>
          <option value="Admin">Admin</option>
        </select>

        <select
          value={selectedPriorityFilter}
          onChange={(e) => setSelectedPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <option value="all">All Priorities</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Main View: KANBAN BOARD */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          {kanbanColumns.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            return (
              <div 
                key={col.id} 
                className="rounded-2xl border p-3.5 flex flex-col min-h-[500px]"
                style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="font-bold text-xs" style={{ color: 'var(--text)' }}>
                      {col.label}
                    </span>
                  </div>
                  <span 
                    className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--muted)' }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards in Column */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-[11px] text-center border-2 border-dashed rounded-xl" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                      No tasks
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const deadline = computeDeadlineStatus(task.due_date);
                      const isLocked = task.is_locked;

                      return (
                        <div
                          key={task.id}
                          className="p-3.5 rounded-xl border shadow-xs space-y-2.5 transition-all group relative"
                          style={{
                            backgroundColor: isLocked ? 'var(--surface-raised)' : 'var(--surface)',
                            borderColor: isLocked ? 'var(--danger)' : 'var(--border)',
                            opacity: isLocked ? 0.9 : 1,
                          }}
                        >
                          {/* Top Badges */}
                          <div className="flex items-center justify-between">
                            <span 
                              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: task.priority === 'Urgent' ? 'var(--danger-subtle)' :
                                                task.priority === 'High' ? 'var(--warning-subtle)' : 'var(--surface-raised)',
                                color: task.priority === 'Urgent' ? 'var(--danger)' :
                                       task.priority === 'High' ? 'var(--warning)' : 'var(--muted)'
                              }}
                            >
                              {task.priority}
                            </span>

                            {isLocked ? (
                              <span 
                                className="inline-flex items-center space-x-1 text-[9px] font-bold px-1.5 py-0.5 rounded border"
                                style={{
                                  backgroundColor: 'var(--danger-subtle)',
                                  color: 'var(--danger)',
                                  borderColor: 'var(--danger)'
                                }}
                              >
                                <Lock className="w-2.5 h-2.5" />
                                <span>Locked</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--muted)' }}>
                                {task.clause_reference}
                              </span>
                            )}
                          </div>

                          {/* Task Title */}
                          <h4 className="text-xs font-bold leading-tight" style={{ color: 'var(--text)' }}>
                            {task.title}
                          </h4>

                          {/* Lock Warning Banner if Locked */}
                          {isLocked && (
                            <div 
                              className="p-2 rounded-lg text-[10px] leading-tight flex items-start space-x-1.5 border"
                              style={{ backgroundColor: 'var(--danger-subtle)', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                            >
                              <Lock className="w-3 h-3 shrink-0 mt-0.5" />
                              <span>{task.lock_reason || 'Locked until preceding delivery/inspection milestones are completed.'}</span>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="pt-1 border-t space-y-1 text-[10px]" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                            <div className="flex items-center justify-between">
                              <span>Role: <strong style={{ color: 'var(--text)' }}>{task.assigned_role}</strong></span>
                              {task.amount && (
                                <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>
                                  ${task.amount.toLocaleString()} {task.currency}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span style={{ color: deadline.isOverdue ? 'var(--danger)' : 'var(--muted)' }}>
                                {deadline.formattedText}
                              </span>
                              <span>Due {task.due_date}</span>
                            </div>
                          </div>

                          {/* Status Shift Action Menu */}
                          <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                              Move status:
                            </span>
                            <div className="flex items-center space-x-1">
                              {task.status !== 'In Progress' && task.status !== 'Completed' && !isLocked && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'In Progress')}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded border transition-colors hover:bg-accent-subtle"
                                  style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}
                                >
                                  Start
                                </button>
                              )}
                              {task.status !== 'Completed' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'Completed')}
                                  disabled={isLocked}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded transition-colors flex items-center space-x-1 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                  style={{ backgroundColor: 'var(--success)', color: 'var(--accent-foreground)' }}
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>Done</span>
                                </button>
                              )}
                              {task.status === 'Completed' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'In Progress')}
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded border text-muted"
                                  style={{ borderColor: 'var(--border)' }}
                                >
                                  Reopen
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST / TABLE VIEW */
        <div 
          className="rounded-2xl border shadow-xs overflow-hidden"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead 
                className="border-b uppercase font-bold text-[10px] tracking-wider"
                style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                <tr>
                  <th className="py-3 px-4">Task Details</th>
                  <th className="py-3 px-4">Contract Clause</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted">
                      No tasks match current search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map(task => {
                    const deadline = computeDeadlineStatus(task.due_date);
                    return (
                      <tr key={task.id} className="hover:bg-surface-raised transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold" style={{ color: 'var(--text)' }}>
                            {task.title}
                          </div>
                          <div className="text-[11px] truncate max-w-xs" style={{ color: 'var(--muted)' }}>
                            {task.contract_title}
                          </div>
                          {task.is_locked && (
                            <div className="text-[10px] font-semibold mt-0.5 flex items-center space-x-1" style={{ color: 'var(--danger)' }}>
                              <Lock className="w-3 h-3" />
                              <span>{task.lock_reason}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {task.clause_reference} (P.{task.page})
                        </td>
                        <td className="py-3.5 px-4">
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
                          >
                            {task.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold" style={{ color: 'var(--text)' }}>
                          {task.assigned_role}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold" style={{ color: deadline.isOverdue ? 'var(--danger)' : 'var(--text)' }}>
                            {task.due_date}
                          </div>
                          <div className="text-[10px]" style={{ color: deadline.isOverdue ? 'var(--danger)' : 'var(--muted)' }}>
                            {deadline.formattedText}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span 
                            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
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
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {task.status !== 'Completed' ? (
                            <button
                              onClick={() => updateTaskStatus(task.id, 'Completed')}
                              disabled={task.is_locked}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ backgroundColor: 'var(--success)', color: 'var(--accent-foreground)' }}
                            >
                              Complete
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--success)' }}>
                              ✓ Done
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Task Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateSubmit}
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                Create Custom Operational Task
              </h3>
              <button 
                type="button" 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Conduct compliance security review..."
                  className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="Actionable steps..."
                  className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ObligationType)}
                    className="w-full px-3 py-2 rounded-xl border"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <option value="Delivery">Delivery</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Payment">Payment</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Reporting">Reporting</option>
                    <option value="SLA">SLA</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Assigned Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className="w-full px-3 py-2 rounded-xl border"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="Approver">Approver</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl border"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border"
                style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
