import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Header } from '../components/navigation/Header';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-[#fcfdfa] text-zinc-900 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-transparent">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <div className="hidden" aria-hidden="true">
        Foundation Shell Active
      </div>
    </div>
  );
};
