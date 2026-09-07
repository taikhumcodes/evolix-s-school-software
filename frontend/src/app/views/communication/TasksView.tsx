import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  Filter,
  Shield,
} from 'lucide-react';
import {
  useAutomationTasks,
  useUpdateTaskStatus,
  AutomationTask,
} from '../../../lib/api/communication';

export const TasksView: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const { data, isLoading } = useAutomationTasks(selectedStatus === 'ALL' ? undefined : selectedStatus);
  const updateStatusMutation = useUpdateTaskStatus();

  const tasks = data?.items || [];
  const total = data?.total || 0;

  const statuses = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CANCELLED':
        return 'bg-zinc-100 text-zinc-500 border-zinc-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const handleStatusChange = (task: AutomationTask, newStatus: string) => {
    updateStatusMutation.mutate({ id: task.id, status: newStatus });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-mehndi-50 text-mehndi-700">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">Internal Automated Tasks</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-700">
                {total} tasks
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Staff workflow actions generated automatically by domain rules and event triggers
            </p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedStatus === st
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-zinc-200/80">
          <Clock className="w-8 h-8 text-zinc-300 animate-spin mb-3" />
          <p className="text-sm font-medium text-zinc-500">Loading automated tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-zinc-200/80 text-center">
          <CheckCircle2 className="w-10 h-10 text-zinc-300 mb-3" />
          <h3 className="text-sm font-bold text-zinc-900">No tasks found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1">
            {selectedStatus !== 'ALL'
              ? `There are no tasks with status "${selectedStatus}".`
              : 'Tasks will be automatically created when automation rules trigger a "CREATE_TASK" action.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-4 bg-white rounded-2xl border border-zinc-200/80 hover:border-zinc-300 transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getPriorityBadgeClass(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadgeClass(
                      task.status
                    )}`}
                  >
                    {task.status}
                  </span>
                  <h3 className="text-sm font-bold text-zinc-900">{task.title}</h3>
                </div>

                {task.description && (
                  <p className="text-xs text-zinc-600 max-w-3xl leading-relaxed whitespace-pre-line">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-4 pt-1 text-[11px] text-zinc-400 flex-wrap">
                  {task.assignedRole && (
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-zinc-500" />
                      Role: <strong className="text-zinc-600 font-semibold">{task.assignedRole}</strong>
                    </span>
                  )}
                  {task.assignedUser && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-zinc-500" />
                      Assigned: {task.assignedUser.firstName} {task.assignedUser.lastName}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    Created: {new Date(task.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Status Action Dropdown */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <select
                  value={task.status}
                  disabled={updateStatusMutation.isPending}
                  onChange={(e) => handleStatusChange(task, e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 hover:bg-zinc-100 transition focus:outline-none focus:ring-2 focus:ring-mehndi-500"
                >
                  <option value="PENDING">Mark Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TasksView;
