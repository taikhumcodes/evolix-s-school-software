import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProtectedRoute from '../routes/ProtectedRoute';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../core/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));
import { useAuth } from '../core/auth/AuthContext';

const renderWithAuth = (isAuthenticated: boolean) => {
  if (isAuthenticated) {
    localStorage.setItem('access_token', 'test-token');
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: null,
      hasPermission: vi.fn().mockReturnValue(true),
      logout: vi.fn(),
    });
  } else {
    localStorage.removeItem('access_token');
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      hasPermission: vi.fn().mockReturnValue(false),
      logout: vi.fn(),
    });
  }

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<ProtectedRoute />}>
          <Route path="protected" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('ProtectedRoute', () => {
  it('redirects to /login if not authenticated', () => {
    renderWithAuth(false);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children if authenticated', () => {
    renderWithAuth(true);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
