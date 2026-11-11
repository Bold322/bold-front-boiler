import { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import type { Role, Session } from '@app/api';

export interface AuthState {
  session: Session | undefined;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ value, children }: PropsWithChildren<{ value: AuthState }>) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}

export function hasRole(session: Session | undefined, role: Role): boolean {
  return session?.user?.roles.includes(role) ?? false;
}

export function hasAnyRole(session: Session | undefined, roles: Role[]): boolean {
  return roles.some((role) => hasRole(session, role));
}

export function requireRoles(session: Session | undefined, roles: Role[]): void {
  if (!session?.user) {
    throw new Error('Authentication required');
  }

  if (!hasAnyRole(session, roles)) {
    throw new Error('Permission denied');
  }
}
