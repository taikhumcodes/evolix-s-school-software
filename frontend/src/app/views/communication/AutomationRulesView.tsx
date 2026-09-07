import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  XCircle,
  Trash2,
  Zap,
  X,
  PlusCircle,
} from 'lucide-react';
import {
  useAutomationRules,
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
  useTriggerTestEvent,
  AutomationRule,
} from '../../../lib/api/communication';

export const AutomationRulesView: React.FC = () => {
  const { data: rules, isLoading, refetch } = useAutomationRules();
  const createRuleMutation = useCreateRule();
  const updateRuleMutation = useUpdateRule();
  const deleteRuleMutation = useDeleteRule();
  const triggerTestMutation = useTriggerTestEvent();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTestEventOpen, setIsTestEventOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formEventType, setFormEventType] = useState('STUDENT_ABSENT');
  const [formDescription, setFormDescription] = useState('');
  const [conditions, setConditions] = useState<any[]>([]);
  const actions = [
    { actionType: 'SEND_COMMUNICATION', channel: 'SMS', templateCode: 'ATTENDANCE_ABSENT_GUARDIAN_SMS', recipientType: 'STUDENT_GUARDIAN' },
  ];

  // Test Event State
  const [testEventType, setTestEventType] = useState('STUDENT_ABSENT');
  const [testPayload, setTestPayload] = useState('{\n  "status": "ABSENT",\n  "studentName": "Aarav Sharma",\n  "attendanceDate": "2026-09-07"\n}');

  const handleToggleActive = async (rule: AutomationRule) => {
    await updateRuleMutation.mutateAsync({
      id: rule.id,
      isActive: !rule.isActive,
    });
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this automation rule?')) {
      await deleteRuleMutation.mutateAsync(id);
      refetch();
    }
  };

  const addCondition = () => {
    setConditions([...conditions, { field: 'status', operator: 'EQUALS', value: 'ABSENT', dataType: 'STRING' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, key: string, val: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [key]: val };
    setConditions(updated);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRuleMutation.mutateAsync({
      code: formCode.toUpperCase().trim(),
      name: formName,
      eventType: formEventType,
      description: formDescription || undefined,
      conditions,
      actions,
      isActive: false,
    });
    setIsCreateOpen(false);
    refetch();
  };

  const handleTriggerTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(testPayload);
      await triggerTestMutation.mutateAsync({
        eventType: testEventType,
        sourceType: 'TestSimulation',
        payload: parsed,
      });
      alert('Test domain event emitted successfully (isTest = true)');
      setIsTestEventOpen(false);
    } catch {
      alert('Invalid JSON in payload');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-zinc-900">Event-Driven Automation Workflows</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Automate communications, reminders, and tasks when ERP events occur</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTestEventOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Trigger Test Event
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold text-xs shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New Rule
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-zinc-400 text-xs">Loading automation rules...</div>
        ) : rules?.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-xs bg-white rounded-2xl border border-zinc-200">
            No automation rules configured yet. Create one or seed defaults.
          </div>
        ) : (
          rules?.map((r) => (
            <div
              key={r.id}
              className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-bold text-sm text-zinc-900">{r.name}</h3>
                  <span className="font-mono text-[10px] text-zinc-400">({r.code})</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                    v{r.version}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{r.description || 'No description provided'}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-mehndi-50 text-mehndi-800 font-semibold">
                    Event: {r.eventType}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-medium">
                    {r.conditions?.length || 0} Condition(s)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-medium">
                    {r.actions?.length || 0} Action(s)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleToggleActive(r)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    r.isActive
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {r.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{r.isActive ? 'Active' : 'Disabled'}</span>
                </button>

                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete Rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Rule Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-black text-zinc-900">Create Automation Rule</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700">Rule Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Absent Student SMS Alert"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700">Unique Code</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="RULE_ABSENT_ALERT"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700">Description (Optional)</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional rule purpose notes"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700">Triggering Domain Event</label>
                <select
                  value={formEventType}
                  onChange={(e) => setFormEventType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800"
                >
                  <option value="STUDENT_ABSENT">Student Marked Absent</option>
                  <option value="FEE_INVOICE_GENERATED">Fee Invoice Generated</option>
                  <option value="PAYMENT_RECEIVED">Fee Payment Received</option>
                  <option value="EXAM_RESULT_PUBLISHED">Exam Result Published</option>
                  <option value="PAYSLIP_GENERATED">Payslip Generated</option>
                  <option value="STUDENT_NOT_BOARDED_BUS">Student Not Boarded Bus</option>
                  <option value="EVENT_SCHEDULED">School Event Scheduled</option>
                  <option value="GATE_VISITOR_CHECKED_IN">Gate Visitor Checked In</option>
                  <option value="CUSTOM">Custom Event</option>
                </select>
              </div>

              {/* Typed Conditions Builder (Rule 38 & 39) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-zinc-700">Typed Conditions (AND evaluation)</label>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="text-xs font-bold text-mehndi-600 hover:text-mehndi-700 flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add Condition
                  </button>
                </div>

                {conditions.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                    No conditions added. This rule will trigger on every occurrence of this event.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {conditions.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                        <input
                          type="text"
                          value={c.field}
                          onChange={(e) => updateCondition(i, 'field', e.target.value)}
                          placeholder="field"
                          className="w-1/4 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs"
                        />
                        <select
                          value={c.operator}
                          onChange={(e) => updateCondition(i, 'operator', e.target.value)}
                          className="w-1/4 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs"
                        >
                          <option value="EQUALS">Equals</option>
                          <option value="NOT_EQUALS">Not Equals</option>
                          <option value="GREATER_THAN">&gt;</option>
                          <option value="LESS_THAN">&lt;</option>
                          <option value="CONTAINS">Contains</option>
                        </select>
                        <input
                          type="text"
                          value={c.value}
                          onChange={(e) => updateCondition(i, 'value', e.target.value)}
                          placeholder="value"
                          className="w-1/4 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs"
                        />
                        <select
                          value={c.dataType}
                          onChange={(e) => updateCondition(i, 'dataType', e.target.value)}
                          className="w-1/5 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs"
                        >
                          <option value="STRING">STRING</option>
                          <option value="NUMBER">NUMBER</option>
                          <option value="DECIMAL">DECIMAL</option>
                          <option value="BOOLEAN">BOOLEAN</option>
                          <option value="DATE">DATE</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeCondition(i)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRuleMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold disabled:opacity-50"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trigger Test Event Modal (Rule 78) */}
      {isTestEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-black text-zinc-900">Trigger Test Event</h3>
                <p className="text-[11px] text-zinc-400">Emits test event with isTest=true (Rule 78)</p>
              </div>
              <button onClick={() => setIsTestEventOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTriggerTest} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700">Event Type</label>
                <select
                  value={testEventType}
                  onChange={(e) => setTestEventType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                >
                  <option value="STUDENT_ABSENT">STUDENT_ABSENT</option>
                  <option value="FEE_INVOICE_GENERATED">FEE_INVOICE_GENERATED</option>
                  <option value="PAYMENT_RECEIVED">PAYMENT_RECEIVED</option>
                  <option value="EXAM_RESULT_PUBLISHED">EXAM_RESULT_PUBLISHED</option>
                  <option value="PAYSLIP_GENERATED">PAYSLIP_GENERATED</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-700">JSON Payload</label>
                <textarea
                  rows={5}
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestEventOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={triggerTestMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50"
                >
                  Emit Test Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationRulesView;
