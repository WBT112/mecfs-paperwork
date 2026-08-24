import React from 'react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';

/**
 * A shared MemoryRouter wrapper for component tests.
 */
export function TestRouter({
  children,
  ...props
}: MemoryRouterProps & { children: React.ReactNode }) {
  return <MemoryRouter {...props}>{children}</MemoryRouter>;
}
