import React, { useEffect, useState } from 'react';
import apiClient from '../../../lib/api-client';

export const ReportBuilder: React.FC = () => {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const response = await apiClient.get('/reports/datasets');
        setDatasets(response.data);
      } catch (error) {
        console.error('Failed to load datasets', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDatasets();
  }, []);

  const executeReport = async () => {
    if (!selectedDataset) return;
    const dataset = datasets.find(d => d.id === selectedDataset);
    if (!dataset) return;

    try {
      const payload = {
        dataset: selectedDataset,
        dimensions: dataset.dimensions.map((d: any) => d.id),
        metrics: dataset.metrics.map((m: any) => m.id),
        filters: [],
        sort: [],
        limit: 100,
        offset: 0
      };
      const response = await apiClient.post('/reports/execute', payload);
      setResults(response.data.results);
    } catch (error) {
      console.error('Failed to execute report', error);
    }
  };

  if (loading) return <div className="p-8">Loading Report Builder...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Report Builder</h1>
      
      <div className="bg-white p-4 shadow rounded border space-y-4">
        <h3 className="text-lg font-bold">Select Dataset</h3>
        <select 
          className="w-full p-2 border rounded"
          value={selectedDataset} 
          onChange={e => setSelectedDataset(e.target.value)}
        >
          <option value="">-- Select a Dataset --</option>
          {datasets.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={executeReport} 
          disabled={!selectedDataset}
        >
          Run Report
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-white p-4 shadow rounded border">
          <h3 className="text-lg font-bold mb-4">Results ({results.length})</h3>
          <div className="overflow-auto">
            <table className="w-full text-sm text-left border">
              <thead className="bg-gray-100">
                <tr>
                  {Object.keys(results[0]).map(k => (
                    <th key={k} className="p-2 border-b border-r">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i} className="border-b">
                    {Object.values(row).map((v: any, j) => (
                      <td key={j} className="p-2 border-r">{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
