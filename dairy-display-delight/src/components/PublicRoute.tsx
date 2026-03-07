import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

export default PublicRoute;
