import { createContext } from 'react';

import { useSession } from '../stores/auth-store';

type SessionData = ReturnType<typeof useSession> extends { data: infer D } ? D : null;

export interface AuthContextType {
	isAuthenticated: boolean;
	isLoading: boolean;
	session: SessionData;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
