import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import App from '../App';

describe('App Routing Tests', () => {
  test('renders login page for unauthenticated users', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route path="/*" element={<App />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
  });

  test('redirects to dashboard for authenticated users', () => {
    // Mock localStorage
    const mockUser = { id: 1, name: 'John Doe', role: 'employee' };
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/*" element={<App />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    // Should redirect to dashboard
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });
});