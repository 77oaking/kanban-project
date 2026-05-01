'use client';

import { useEffect } from 'react';
import { useAuth } from '@/store/auth';

/**
 * Mounted once at the root layout — fetches /auth/me on first load so the
 * Zustand auth store knows whether we're logged in. Renders nothing.
 */
export function AuthBoot() {
  const bootstrap = useAuth((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);
  return null;
}
