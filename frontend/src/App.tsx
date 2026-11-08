import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layouts/MainLayout";
import Dashboard from "./components/layouts/Dashboard";
import { Shifts } from "./pages/Shifts";
import { Login } from "./pages/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";

// 1. Import 2 màn hình của TV3
import AttendancePage from "./pages/AttendancePage";
import AdjustmentsPage from "./pages/AdjustmentsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route công khai: Đăng nhập */}
        <Route path="/login" element={<Login />} />

        {/* Các route yêu cầu đăng nhập */}
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
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/shifts" element={<Shifts />} />

                  {/* 2. Đăng ký 2 route của TV3 tại đây */}
                  <Route path="/attendance" element={<AttendancePage />} />
                  <Route
                    path="/attendance-adjustments"
                    element={<AdjustmentsPage />}
                  />

                  {/* Fallback điều hướng về dashboard */}
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
