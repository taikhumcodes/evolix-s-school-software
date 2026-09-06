import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Trophy,
  Plus,
  Search,
  Calendar,
  MapPin,
} from 'lucide-react';
import {
  useSchoolEvents,
  useActivityCategories,
  useCreateSchoolEvent,
  useRegisterEventParticipant,
  SchoolEvent,
} from '../../../lib/api/operations';

export const EventsView: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Queries
  const { data: eventsData, isLoading } = useSchoolEvents({
    search: search || undefined,
    categoryId: selectedCategory || undefined,
  });
  const { data: categories = [] } = useActivityCategories();

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Mutations
  const createEventMutation = useCreateSchoolEvent();
  const registerParticipantMutation = useRegisterEventParticipant();

  const [eventForm, setEventForm] = useState({
    title: '',
    categoryId: '',
    venue: '',
    startDateTime: '',
    endDateTime: '',
    capacity: 100,
    estimatedBudget: 0,
    status: 'PUBLISHED' as 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED',
  });

  const [participantForm, setParticipantForm] = useState({
    studentId: '',
    teamName: '',
    houseName: '',
    participantType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'TEAM' | 'HOUSE',
  });

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEventMutation.mutateAsync({
      ...eventForm,
      capacity: Number(eventForm.capacity) || null,
      estimatedBudget: Number(eventForm.estimatedBudget) || null,
    });
    setShowCreateModal(false);
    setEventForm({
      title: '',
      categoryId: '',
      venue: '',
      startDateTime: '',
      endDateTime: '',
      capacity: 100,
      estimatedBudget: 0,
      status: 'PUBLISHED',
    });
  };

  const handleRegisterParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    await registerParticipantMutation.mutateAsync({
      eventId: selectedEvent.id,
      data: participantForm,
    });
    setShowRegisterModal(false);
    setParticipantForm({
      studentId: '',
      teamName: '',
      houseName: '',
      participantType: 'INDIVIDUAL',
    });
  };

  const events: SchoolEvent[] = Array.isArray(eventsData) ? (eventsData as any) : (eventsData?.items || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-rose-600" />
            {t('operations.events.title', 'School Activities & Events')}
          </h1>
          <p className="text-xs text-zinc-500">
            {t(
              'operations.events.subtitle',
              'Event scheduling, capacity concurrency control, student participation, achievements, and finance reference linking.'
            )}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-mehndi-600 text-white text-xs font-semibold hover:bg-mehndi-700 flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New School Event</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search', 'Search events by title, code, venue...')}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-mehndi-500/20"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs border border-zinc-200 bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Events Grid / Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-zinc-500">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-zinc-500 space-y-2 border border-zinc-200">
          <Trophy className="w-8 h-8 mx-auto text-zinc-300" />
          <p className="text-sm font-medium">No events scheduled yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((evt) => {
            const participantCount = evt._count?.participants || 0;
            const isFull = evt.capacity !== null && evt.capacity !== undefined && participantCount >= evt.capacity;

            return (
              <div
                key={evt.id}
                className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                      {evt.category?.name}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        evt.status === 'PUBLISHED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : evt.status === 'IN_PROGRESS'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {evt.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-zinc-900 tracking-tight">{evt.title}</h3>
                    <span className="text-[10px] font-mono text-zinc-400">Code: {evt.eventCode}</span>
                  </div>

                  <div className="space-y-1 text-xs text-zinc-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{new Date(evt.startDateTime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{evt.venue}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Participants:</span>
                    <span className={`font-bold ${isFull ? 'text-red-600' : 'text-zinc-900'}`}>
                      {participantCount} {evt.capacity ? `/ ${evt.capacity}` : ''}
                      {isFull && ' (FULL)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedEvent(evt);
                        setShowRegisterModal(true);
                      }}
                      disabled={Boolean(isFull)}
                      className="flex-1 py-2 text-center rounded-xl bg-mehndi-50 hover:bg-mehndi-100 text-mehndi-800 text-xs font-semibold transition-all disabled:opacity-40"
                    >
                      Register Student
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-900">Schedule School Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Inter-School Debate 2026"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Category *</label>
                  <select
                    required
                    value={eventForm.categoryId}
                    onChange={(e) => setEventForm({ ...eventForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Venue *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Auditorium"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.startDateTime}
                    onChange={(e) => setEventForm({ ...eventForm, startDateTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.endDateTime}
                    onChange={(e) => setEventForm({ ...eventForm, endDateTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Capacity Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={eventForm.capacity}
                    onChange={(e) => setEventForm({ ...eventForm, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Estimated Budget</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={eventForm.estimatedBudget}
                    onChange={(e) => setEventForm({ ...eventForm, estimatedBudget: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 text-white font-semibold hover:bg-mehndi-700 disabled:opacity-50"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Participant Modal */}
      {showRegisterModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-900">
              Register Participant — {selectedEvent.title}
            </h3>
            <form onSubmit={handleRegisterParticipant} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Student ID (UUID) *</label>
                <input
                  type="text"
                  required
                  placeholder="Paste Student UUID"
                  value={participantForm.studentId}
                  onChange={(e) => setParticipantForm({ ...participantForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Team Name</label>
                  <input
                    type="text"
                    placeholder="Optional team name"
                    value={participantForm.teamName}
                    onChange={(e) => setParticipantForm({ ...participantForm, teamName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">House Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Red House"
                    value={participantForm.houseName}
                    onChange={(e) => setParticipantForm({ ...participantForm, houseName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerParticipantMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsView;
