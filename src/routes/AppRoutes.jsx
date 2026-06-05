import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import SuperAdminDashboard from "../pages/SuperAdminDashboard";
import AdminDashboard from "../pages/AdminDashboard";
import Tenants from "../pages/Tenants";

import ProtectedRoute from "./ProtectedRoute";

function AppRoutes() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/super-admin/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["SUPER_ADMIN"]}
            >
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN"]}
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tenants"
          element={
            <ProtectedRoute
              allowedRoles={["SUPER_ADMIN"]}
            >
              <Tenants />
            </ProtectedRoute>
          }
        />

      </Routes>

    </BrowserRouter>

  );

}

export default AppRoutes;