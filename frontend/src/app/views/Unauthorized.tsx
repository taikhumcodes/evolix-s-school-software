import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50">
      <div className="text-center p-8 bg-white border border-zinc-200 rounded-xl shadow-sm max-w-md w-full">
        <h1 className="text-4xl font-black text-red-600 mb-2">403</h1>
        <h2 className="text-xl font-bold text-zinc-900 mb-4">Unauthorized Access</h2>
        <p className="text-sm text-zinc-600 mb-6">
          You do not have permission to view this resource.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-4 py-2 bg-zinc-900 text-white rounded-md text-sm font-semibold hover:bg-zinc-800"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
