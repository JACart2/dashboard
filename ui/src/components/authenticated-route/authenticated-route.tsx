import { useAuth } from "react-oidc-context";

export default function AuthenticatedRoute({ children }: React.PropsWithChildren<{}>) {
	if (import.meta.env.MODE == 'dev') {
		return children;
	}

	const auth = useAuth();

	if (auth.isLoading) return <div>Loading...</div>;
	if (auth.error) return <div>Auth error: {auth.error.message}</div>;

	if (!auth.isAuthenticated) {
		auth.signinRedirect();  // Redirect to Cognito
		return null;
	}

	return children;
}
