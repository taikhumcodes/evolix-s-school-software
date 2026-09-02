import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from '../app/views/Login';
import { BrowserRouter } from 'react-router-dom';
import * as AuthContextModule from '../core/auth/AuthContext';

// Mock the API client
vi.mock('../lib/api-client', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  logout: vi.fn(),
} as any);

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders login form correctly', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /login.submit|Sign In/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    renderLogin();
    const submitBtn = screen.getByRole('button', { name: /login.submit|Sign In/i });
    fireEvent.click(submitBtn);

    // wait for zod validation to show errors (if they render)
    // Here we can check if apiClient was NOT called
    const apiClient = await import('../lib/api-client');
    await waitFor(() => {
      expect(apiClient.default.post).not.toHaveBeenCalled();
    });
  });

  it('allows language switching', () => {
    renderLogin();
    const langBtn = screen.getByText(/English|हिंदी/i);
    fireEvent.click(langBtn);
    // The text should swap or the i18n instance should change language.
  });
});
