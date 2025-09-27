import { AuthContext } from '../contexts/auth-context';
import { useSession } from '../stores/auth-store';

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
