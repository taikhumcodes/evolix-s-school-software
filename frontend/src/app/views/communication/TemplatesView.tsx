import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Eye,
  X,
  Languages,
} from 'lucide-react';
import {
  useCommunicationTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  CommunicationTemplate,
} from '../../../lib/api/communication';

export const TemplatesView: React.FC = () => {
  const { data: templates, isLoading, refetch } = useCommunicationTemplates();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CommunicationTemplate | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState('GENERAL');
  const [formChannel, setFormChannel] = useState('SMS');
  const [formLanguage, setFormLanguage] = useState('ENGLISH');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [changeDescription, setChangeDescription] = useState('');

  const openCreateModal = () => {
    setFormName('');
    setFormCode('');
    setFormCategory('GENERAL');
    setFormChannel('SMS');
    setFormLanguage('ENGLISH');
    setFormSubject('');
    setFormBody('');
    setIsCreateOpen(true);
  };

  const openEditModal = (t: CommunicationTemplate) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormSubject(t.subject || '');
    setFormBody(t.body);
    setFormLanguage(t.language);
    setChangeDescription('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      name: formName,
      code: formCode.toUpperCase().trim(),
      category: formCategory,
      channel: formChannel,
      language: formLanguage,
      subject: formSubject || undefined,
      body: formBody,
    });
    setIsCreateOpen(false);
    refetch();
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    await updateMutation.mutateAsync({
      id: editingTemplate.id,
      name: formName,
      subject: formSubject || undefined,
      body: formBody,
      language: formLanguage,
      changeDescription: changeDescription || undefined,
    });
    setEditingTemplate(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-zinc-900">Message Templates</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Reusable communication formats with safe variable interpolation</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold text-xs shadow-xs transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> New Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center text-zinc-400 text-xs">Loading templates...</div>
        ) : templates?.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-zinc-400 text-xs">No templates configured</div>
        ) : (
          templates?.map((t) => (
            <div
              key={t.id}
              className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900">{t.name}</h3>
                    <p className="text-[11px] font-mono text-zinc-400 mt-0.5">{t.code}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-mehndi-100 text-mehndi-800 shrink-0">
                    v{t.version}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 font-semibold text-zinc-600">
                    {t.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 font-semibold text-zinc-600">
                    {t.channel}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 font-semibold text-zinc-600 flex items-center gap-1">
                    <Languages className="w-3 h-3" /> {t.language}
                  </span>
                </div>

                <div className="mt-3.5 p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs text-zinc-600 font-mono line-clamp-3 leading-relaxed">
                  {t.body}
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-zinc-100 flex items-center justify-between">
                <button
                  onClick={() => setPreviewTemplate(t)}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button
                  onClick={() => openEditModal(t)}
                  className="flex items-center gap-1 text-xs font-bold text-mehndi-600 hover:text-mehndi-700"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-black text-zinc-900">Create Message Template</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-zinc-700">Template Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Student Absence Notice"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700">Unique Code</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="ATTENDANCE_ABSENT"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700">Language</label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                  >
                    <option value="ENGLISH">English</option>
                    <option value="HINDI">Hindi</option>
                    <option value="HINGLISH">Hinglish</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                  >
                    <option value="ATTENDANCE">Attendance</option>
                    <option value="FEES">Fees</option>
                    <option value="ACADEMIC">Academic</option>
                    <option value="EXAM">Exam</option>
                    <option value="RESULT">Result</option>
                    <option value="HR">HR</option>
                    <option value="PAYROLL">Payroll</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="EVENT">Event</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-700">Channel</label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                  >
                    <option value="SMS">SMS</option>
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="IN_APP">In-App Notification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700">Subject (Optional / Email)</label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="e.g. Attendance update for {{student.name}}"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700">Message Body</label>
                <textarea
                  rows={4}
                  required
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Dear Guardian, {{student.name}} was marked absent today..."
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-mono"
                />
                <p className="text-[11px] text-zinc-400 mt-1">Variables supported: &#123;&#123;student.name&#125;&#125;, &#123;&#123;amount&#125;&#125;, &#123;&#123;dueDate&#125;&#125;, etc.</p>
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
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold disabled:opacity-50"
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-black text-zinc-900">Edit Template: {editingTemplate.code}</h3>
                <p className="text-[11px] text-zinc-400">Updates create an immutable new version (Rule 17)</p>
              </div>
              <button onClick={() => setEditingTemplate(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-zinc-700">Template Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700">Subject</label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700">Message Body</label>
                <textarea
                  rows={4}
                  required
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700">Change Summary / Audit Note</label>
                <input
                  type="text"
                  value={changeDescription}
                  onChange={(e) => setChangeDescription(e.target.value)}
                  placeholder="e.g. Added contact details for support"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold disabled:opacity-50"
                >
                  Save Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-black text-zinc-900">Preview: {previewTemplate.name}</h3>
              <button onClick={() => setPreviewTemplate(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Channel</span>
                <p className="font-bold text-zinc-800">{previewTemplate.channel}</p>
              </div>

              {previewTemplate.subject && (
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Subject</span>
                  <p className="font-bold text-zinc-900 mt-0.5">{previewTemplate.subject}</p>
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Body Content</span>
                <div className="mt-1 p-3.5 bg-zinc-900 text-zinc-100 rounded-2xl font-mono text-xs whitespace-pre-wrap leading-relaxed">
                  {previewTemplate.body}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 font-bold text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesView;
