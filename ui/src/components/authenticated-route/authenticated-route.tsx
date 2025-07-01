import { useAuth } from "react-oidc-context";
import { Navigate } from "react-router-dom";

export default function AunthenticatedRoute({ children }) {
	const auth = useAuth();

	if (auth.isLoading) return <div>Loading...</div>;
	if (auth.error) return <div>Auth error: {auth.error.message}</div>;

	if (!auth.isAuthenticated) {
		auth.signinRedirect();  // Redirect to Cognito
		return null;
	}

	return children;
}
