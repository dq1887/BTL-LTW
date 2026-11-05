import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layouts/MainLayout";
import Dashboard from "./components/layouts/Dashboard";
import { Shifts } from "./pages/Shifts";

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/shifts" element={<Shifts />} />{" "}
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
