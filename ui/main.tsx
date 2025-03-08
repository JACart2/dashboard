import ReactDOM from "react-dom/client";
import Dashboard from "./src/components/dashboard/dashboard";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import React from "react";

const router = createBrowserRouter(
    [
        {
            path: "/",
            element: <Dashboard />,
        },
    ]
);

const domNode = document.getElementById('root')!;
ReactDOM.createRoot(domNode).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>,
)
