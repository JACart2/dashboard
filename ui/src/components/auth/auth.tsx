import { useAuth } from "react-oidc-context";

function Auth() {
	const auth = useAuth();

	const signOutRedirect = () => {
		const clientId = "3ksj5dmnec4gnflca1hejdg5u3";
		const logoutUri = window.location.origin;
		const cognitoDomain = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_A8zO9jTLK";
		window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
	};

	if (auth.isLoading) {
		return <div>Loading...</div>;
	}

	if (auth.error) {
		return <div>Encountering error... {auth.error.message}</div>;
	}

	if (auth.isAuthenticated) {
		return (
			<div>
				<pre> Hello: {auth.user?.profile.email} </pre>
				<pre> ID Token: {auth.user?.id_token} </pre>
				<pre> Access Token: {auth.user?.access_token} </pre>
				<pre> Refresh Token: {auth.user?.refresh_token} </pre>

				<button onClick={() => auth.removeUser()}>Sign out</button>
			</div>
		);
	}

	return (
		<div>
			<button onClick={() => auth.signinRedirect()}>Sign in</button>
			<button onClick={() => signOutRedirect()}>Sign out</button>
		</div>
	);
}

export default Auth;
