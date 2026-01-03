import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import { Toaster } from "./components/ui/sonner";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("dti_token");
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem("dti_token", token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("dti_token");
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col">
      <BrowserRouter>
        <div className="flex-1">
          <Routes>
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <LoginPage onLogin={handleLogin} />
                )
              }
            />
            <Route
              path="/dashboard/*"
              element={
                isAuthenticated ? (
                  <DashboardPage onLogout={handleLogout} />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/"
              element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
            />
          </Routes>
        </div>
        {/* Footer */}
        <footer className="py-4 text-center border-t border-slate-800/50">
          <div className="flex flex-col items-center gap-2">
            <img
              src="https://customer-assets.emergentagent.com/job_0ee3498b-2246-478c-8296-16fc3fbd03a6/artifacts/6bplvhii_logo%20piccolo%20dti.jpg"
              alt="Digital Twins Italia"
              className="h-8 w-auto rounded"
            />
            <p className="text-slate-500 text-xs">Made Antonio Deiana ©</p>
          </div>
        </footer>
        {/* Cover Emergent badge */}
        <div className="fixed bottom-0 right-0 z-[99999] bg-white px-2 py-1 rounded-tl-lg shadow-lg" style={{ minWidth: '160px' }}>
          <img
            src="https://customer-assets.emergentagent.com/job_digitalsoci/artifacts/bko42cjg_TRIVOR_Logo_Oro%20con%20sfondo%20wite.png"
            alt="Trivor"
            className="h-10 w-auto"
          />
        </div>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
