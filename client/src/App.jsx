import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import NavBar from './components/NavBar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import api from './api.js';
import { configureCognito } from './cognito.config.js';

export const ToastContext = createContext(() => { });

export const useToast = () => React.useContext(ToastContext);

function App() {
  const [token, setToken] = useState(() => window.localStorage.getItem('jwt') || '');
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(Boolean(token));
  const [toast, setToast] = useState(null);
  const [cognitoReady, setCognitoReady] = useState(false);

  const notify = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Initialize Cognito configuration (non-blocking for hybrid auth)
  useEffect(() => {
    const initializeCognito = async () => {
      try {
        const config = await api.getConfig();
        const success = await configureCognito(config.cognito);
        setCognitoReady(success);
        if (!success) {
          console.warn('Cognito initialization failed - registration may not work');
        }
      } catch (error) {
        console.error('Failed to initialize Cognito:', error);
        setCognitoReady(false);
      }
    };

    // Set cognitoReady to true immediately for hybrid auth (login works without Cognito)
    setCognitoReady(true);

    // Initialize Cognito in background for registration feature
    initializeCognito();
  }, [notify]);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setLoadingUser(false);
      return;
    }
    setLoadingUser(true);
    api
      .getMe(token)
      .then(({ user: fetched }) => {
        if (!cancelled) {
          setUser(fetched);
        }
      })
      .catch(() => {
        if (!cancelled) {
          notify('Session expired. Please log in again.', 'error');
          setToken('');
          window.localStorage.removeItem('jwt');
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingUser(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, notify]);

  const handleAuthenticated = (jwt, userData) => {
    window.localStorage.setItem('jwt', jwt);
    setToken(jwt);
    setUser(userData);
    notify(`Welcome back, ${userData.username}!`, 'success');
  };

  const handleLogout = () => {
    window.localStorage.removeItem('jwt');
    setToken('');
    setUser(null);
    notify('Logged out', 'info');
  };

  const toastValue = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={toastValue}>
      <div className="app">
        <NavBar user={user} onLogout={handleLogout} />
        <main className="container">
          {!cognitoReady ? (
            <div className="auth-card">
              <h2>Initializing...</h2>
              <p>Setting up authentication service...</p>
            </div>
          ) : token && user ? (
            <Dashboard token={token} user={user} />
          ) : (
            <Login onAuthenticated={handleAuthenticated} loading={loadingUser} />
          )}
        </main>
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export default App;
