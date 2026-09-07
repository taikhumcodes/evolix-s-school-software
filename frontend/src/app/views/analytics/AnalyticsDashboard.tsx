import React, { useEffect, useState } from 'react';
import apiClient from '../../../lib/api-client';

export const AnalyticsDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const response = await apiClient.get('/analytics/executive-kpi');
        setKpis(response.data);
      } catch (error) {
        console.error('Failed to load KPIs', error);
      } finally {
        setLoading(false);
      }
    };
    fetchKpis();
  }, []);

  if (loading) return <div className="p-8">Loading Analytics...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 shadow rounded border">
          <h3 className="text-sm font-medium text-gray-500">Active Students</h3>
          <div className="text-2xl font-bold mt-2">{kpis?.activeStudents ?? 0}</div>
        </div>
        
        <div className="bg-white p-4 shadow rounded border">
          <h3 className="text-sm font-medium text-gray-500">Attendance %</h3>
          <div className="text-2xl font-bold mt-2">{kpis?.attendancePercentage ?? '0.00'}%</div>
        </div>
        
        <div className="bg-white p-4 shadow rounded border">
          <h3 className="text-sm font-medium text-gray-500">Outstanding Finance</h3>
          <div className="text-2xl font-bold mt-2">${kpis?.outstandingAmount ?? '0.00'}</div>
        </div>
        
        <div className="bg-white p-4 shadow rounded border">
          <h3 className="text-sm font-medium text-gray-500">Total Payroll Cost</h3>
          <div className="text-2xl font-bold mt-2">${kpis?.payrollCost ?? '0.00'}</div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 shadow rounded border min-h-[300px] flex flex-col">
          <h3 className="text-lg font-bold">Enrollment Trends</h3>
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Chart Integration Pending
          </div>
        </div>

        <div className="bg-white p-4 shadow rounded border min-h-[300px] flex flex-col">
          <h3 className="text-lg font-bold">Financial Collections</h3>
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Chart Integration Pending
          </div>
        </div>
      </div>
    </div>
  );
};
