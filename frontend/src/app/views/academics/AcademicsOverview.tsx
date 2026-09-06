import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CalendarRange,
  BookOpenCheck,
  Award,
  GraduationCap,
  TrendingUp,
  ArrowRight,
  Plus,
  PenLine,
} from 'lucide-react';
import { AcademicsNav } from './AcademicsNav';
import { useAcademicsOverview } from '../../../lib/api/academics';

export const AcademicsOverview: React.FC = () => {
  const { t } = useTranslation();
  const { data: overview, isLoading } = useAcademicsOverview();

  const stats = [
    {
      title: t('academics.overview.terms', 'Academic Terms'),
      value: overview?.termsCount ?? 0,
      icon: CalendarDays,
      link: '/academics/terms',
      color: 'text-sky-600 bg-sky-50 border-sky-200',
    },
    {
      title: t('academics.overview.timetableSlots', 'Timetable Slots'),
      value: overview?.timetableSlotsCount ?? 0,
      icon: CalendarRange,
      link: '/academics/timetable',
      color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
    {
      title: t('academics.overview.homeworkActive', 'Active Homework'),
      value: overview?.activeHomeworkCount ?? 0,
      icon: BookOpenCheck,
      link: '/academics/homework',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      title: t('academics.overview.totalExams', 'Total Exams'),
      value: overview?.examsCount ?? 0,
      icon: Award,
      link: '/academics/exams',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      title: t('academics.overview.publishedExams', 'Published Results'),
      value: overview?.publishedExamsCount ?? 0,
      icon: GraduationCap,
      link: '/academics/results',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    },
    {
      title: t('academics.overview.promotionsReady', 'Promotions Active'),
      value: overview?.promotionsCount ?? 0,
      icon: TrendingUp,
      link: '/academics/promotions',
      color: 'text-rose-600 bg-rose-50 border-rose-200',
    },
  ];

  const quickActions = [
    {
      title: t('academics.overview.createExam', 'Schedule New Exam'),
      description: t('academics.overview.createExamDesc', 'Define exam sessions, assign classes, and set grading criteria'),
      link: '/academics/exams',
      icon: Plus,
      color: 'bg-emerald-600 text-white',
    },
    {
      title: t('academics.overview.enterMarks', 'Marks Entry Register'),
      description: t('academics.overview.enterMarksDesc', 'Bulk enter raw theory, practical, and activity marks with keyboard navigation'),
      link: '/academics/marks',
      icon: PenLine,
      color: 'bg-indigo-600 text-white',
    },
    {
      title: t('academics.overview.viewReportCards', 'Print Report Cards'),
      description: t('academics.overview.viewReportCardsDesc', 'Generate official CBSE/Board compliant student progress cards with attendance'),
      link: '/academics/results',
      icon: GraduationCap,
      color: 'bg-sky-600 text-white',
    },
    {
      title: t('academics.overview.manageTimetable', 'Weekly Class Schedule'),
      description: t('academics.overview.manageTimetableDesc', 'Organize periods, detect double-booking conflicts, and assign teachers'),
      link: '/academics/timetable',
      icon: CalendarRange,
      color: 'bg-purple-600 text-white',
    },
  ];

  return (
    <div className="space-y-6">
      <AcademicsNav />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Link
              key={idx}
              to={stat.link}
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm hover:border-zinc-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-600 transition-colors" />
              </div>
              <div className="text-2xl font-black text-zinc-900 tracking-tight">
                {isLoading ? '-' : stat.value}
              </div>
              <div className="text-xs font-medium text-zinc-500 mt-0.5 truncate">{stat.title}</div>
            </Link>
          );
        })}
      </div>

      {/* Quick Workflows Section */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <h2 className="text-base font-bold text-zinc-900 mb-1">
          {t('academics.overview.quickWorkflows', 'Academic Operations & Workflows')}
        </h2>
        <p className="text-xs text-zinc-500 mb-4">
          {t('academics.overview.quickWorkflowsDesc', 'Essential daily tasks for academic administrators, examination heads, and educators')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Link
                key={idx}
                to={action.link}
                className="p-4 rounded-xl border border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${action.color} shadow-sm`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    {action.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-4">
                  <span>{t('common.open', 'Launch')}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Exams Snapshot */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {t('academics.overview.activeExamsTitle', 'Exams & Assessment Status')}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t('academics.overview.activeExamsDesc', 'Current examination lifecycle status and grading progression')}
            </p>
          </div>
          <Link
            to="/academics/exams"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>{t('common.viewAll', 'View All Exams')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {overview?.recentExams && overview.recentExams.length > 0 ? (
          <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden">
            {overview.recentExams.map((exam: any) => (
              <div key={exam.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center font-bold text-zinc-700 text-sm">
                    {exam.code}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">{exam.name}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(exam.startDate).toLocaleDateString()} — {new Date(exam.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      exam.status === 'PUBLISHED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : exam.status === 'FINALIZED'
                        ? 'bg-blue-100 text-blue-800'
                        : exam.status === 'IN_PROGRESS'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {exam.status}
                  </span>
                  <Link
                    to={`/academics/marks?examId=${exam.id}`}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100"
                    title={t('academics.marks.openRegister', 'Open Register')}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed border-zinc-200 rounded-xl">
            <Award className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-zinc-600">
              {t('academics.overview.noExamsYet', 'No examinations scheduled yet.')}
            </p>
            <Link
              to="/academics/exams"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-3 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('academics.overview.scheduleFirstExam', 'Schedule First Exam')}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicsOverview;
