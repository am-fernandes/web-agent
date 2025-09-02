import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import './index.css';
import App from './App.jsx';

function RedirectToNewChat() {
  const newSessionId = uuidv4();
  return <Navigate to={`/chat/${newSessionId}`} replace />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/chat" replace />,
  },
  {
    path: '/chat',
    element: <RedirectToNewChat />,
  },
  {
    path: '/chat/:sessionId',
    element: <App />,
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);