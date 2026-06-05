import { Navigate } from "react-router-dom";

function ProtectedRoute({
  children,
  allowedRoles
}) {

  const token =
    localStorage.getItem("token");

  const user =
    JSON.parse(
      localStorage.getItem("user")
    );

  if (!token) {

    return <Navigate to="/" />;

  }

  if (
    allowedRoles &&
    !allowedRoles.includes(user?.role)
  ) {

    return <Navigate to="/" />;

  }

  return children;

}

export default ProtectedRoute;