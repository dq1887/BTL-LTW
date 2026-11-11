import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layouts/MainLayout";
import Dashboard from "./components/layouts/Dashboard";
import { Shifts } from "./pages/Shifts";
import { Login } from "./pages/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Employees } from "./pages/Employees";
import { Departments } from "./pages/Departments";
import Profile from "./pages/Profile";
import AttendancePage from "./pages/AttendancePage";
import AdjustmentsPage from "./pages/AdjustmentsPage";

function App() {
  return (
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
  );
}

export default App;
