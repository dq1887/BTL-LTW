import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layouts/MainLayout";
import Dashboard from "./components/layouts/Dashboard";
import { Shifts } from "./pages/Shifts";
import { Login } from "./pages/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";

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
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/shifts" element={<Shifts />} />
                  {/* Fallback điều hướng về dashboard */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
