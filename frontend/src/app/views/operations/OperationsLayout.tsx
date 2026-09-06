import React from 'react';
import { Outlet } from 'react-router-dom';
import { OperationsNav } from './OperationsNav';

export const OperationsLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-full bg-zinc-50/50">
      <OperationsNav />
      <div className="flex-1 p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default OperationsLayout;
