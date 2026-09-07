import React, { useEffect, useState } from 'react';
import apiClient from '../../../lib/api-client';

export const SystemHealth: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, healthRes] = await Promise.all([
          apiClient.get('/platform/overview'),
          apiClient.get('/platform/health?type=detailed')
        ]);
        setOverview(overviewRes.data);
        setHealth(healthRes.data);
      } catch (error) {
        console.error('Failed to load system data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const triggerBackup = async () => {
    try {
      await apiClient.post('/platform/backups', { type: 'FULL' });
      alert('Backup initiated successfully!');
    } catch (error) {
      console.error('Backup failed', error);
      alert('Failed to initiate backup');
    }
  };

  if (loading) return <div className="p-8">Loading System Health...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">System Health & Platform</h1>
        <button 
          className="border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-50"
          onClick={triggerBackup}
        >
          Trigger Full Backup
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 shadow rounded border">
          <h3 className="text-sm font-medium text-gray-500">App Version</h3>
          <div className="text-2xl font-bold mt-2">{overview?.version}</div>
        </div>
        
        <div className="bg-white p-4 shadow rounded border">
          <h3 className="text-sm font-medium text-gray-500">Database Status</h3>
          <div className="text-2xl font-bold text-green-600 mt-2">{health?.db || 'Unknown'}</div>
        </div>

        <div className="bg-white p-4 shadow rounded border">
          <h3 className="text-sm font-medium text-gray-500">Active Jobs</h3>
          <div className="text-2xl font-bold mt-2">{health?.jobs?.active ?? 0}</div>
          <p className="text-xs text-gray-400 mt-1">Failed recently: {health?.jobs?.recentFailures ?? 0}</p>
        </div>
      </div>

      <div className="bg-white p-4 shadow rounded border space-y-2">
        <h3 className="text-lg font-bold mb-4">System Information</h3>
        <p><strong>Uptime:</strong> {health?.system?.uptime ? Math.round(health.system.uptime / 3600) : 0} hours</p>
        <p><strong>Registered Users:</strong> {overview?.usersCount ?? 0}</p>
        <p><strong>Registered Schools:</strong> {overview?.schoolsCount ?? 0}</p>
      </div>
    </div>
  );
};
