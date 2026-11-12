import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layouts/MainLayout";
import Dashboard from "./components/layouts/Dashboard";
import { Shifts } from "./pages/Shifts";
import { Login } from "./pages/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Employees } from "./pages/Employees";
import { Departments } from "./pages/Departments";
import Profile from "./pages/Profile";
import AccountSettings from "./pages/AccountSettings";
import AttendancePage from "./pages/AttendancePage";
import AdjustmentsPage from "./pages/AdjustmentsPage";
import PayrollPage from "./pages/PayrollPage";

import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/*"
              element={
                <MainLayout>
                  <Routes>
                    <Route
                      path="/"
                      element={<Navigate to="/dashboard" replace />}
                    />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/employees" element={<Employees />} />
                    <Route path="/departments" element={<Departments />} />
                    <Route path="/shifts" element={<Shifts />} />
                    <Route path="/attendance" element={<AttendancePage />} />
                    <Route
                      path="/attendance-adjustments"
                      element={<AdjustmentsPage />}
                    />
                    <Route path="/payroll" element={<PayrollPage />} />
                    <Route path="/settings" element={<AccountSettings />} />
                    <Route
                      path="*"
                      element={<Navigate to="/dashboard" replace />}
                    />
                  </Routes>
                </MainLayout>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;