import { createContext, useContext } from 'react';

import { useSession } from '../stores/auth-store';

interface AuthContextType {
	isAuthenticated: boolean;
	isLoading: boolean;
	session: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const { data: session, isPending } = useSession();
	const isAuthenticated = !!session?.user;

	return (
		<AuthContext.Provider
			value={{
				isAuthenticated,
				isLoading: isPending,
				session,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
