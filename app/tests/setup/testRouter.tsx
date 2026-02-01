import React from 'react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';

/**
 * Router props with React Router v7 future flags enabled.
 * This ensures tests don't produce deprecation warnings about v7 migration.
 */
const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

/**
 * A MemoryRouter wrapper that enables React Router v7 future flags by default.
 * Use this in tests to avoid deprecation warnings.
 */
export function TestRouter({
  children,
  ...props
}: MemoryRouterProps & { children: React.ReactNode }) {
  return (
    <MemoryRouter {...props} future={ROUTER_FUTURE_FLAGS}>
      {children}
    </MemoryRouter>
  );
}
