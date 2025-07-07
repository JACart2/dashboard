import ReactDOM from "react-dom/client";
import Dashboard from "./src/components/dashboard/dashboard";
import AuthenticatedRoute from "./src/components/authenticated-route/authenticated-route";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import React from "react";
import { AuthProvider } from "react-oidc-context";

const cognitoAuthConfig = {
    authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_A8zO9jTLK",
    client_id: "3ksj5dmnec4gnflca1hejdg5u3",
    redirect_uri: "https://35.153.174.48/",
    response_type: "code",
    scope: "phone openid email",
    onSigninCallback: () => {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

const router = createBrowserRouter(
    [
        {
            path: "/",
            element: <AuthenticatedRoute>
                <Dashboard />
            </AuthenticatedRoute>,
        },
    ]
);

const domNode = document.getElementById('root')!;
ReactDOM.createRoot(domNode).render(
    <React.StrictMode>
        <AuthProvider {...cognitoAuthConfig}>
            <RouterProvider router={router} />
        </AuthProvider>
    </React.StrictMode>,
)
