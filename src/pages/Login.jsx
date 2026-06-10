import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";
import { loginUser } from "../services/authService";
import FarmTrackLogo from "../components/FarmTrackLogo";

import "../styles/login.css";

function Login() {
  const navigate = useNavigate();

  const { login } =
    useContext(AuthContext);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const submit = async () => {
    try {

      setLoading(true);

      const response =
        await loginUser({
          email,
          password
        });

      login(
        response.data.user,
        response.data.token
      );

      const role =
        response.data.user.role;

      if (
        role === "SUPER_ADMIN"
      ) {
        navigate(
          "/super-admin/dashboard"
        );
      }
      else if (
        role === "ADMIN" || role === "MANAGER"
      ) {
        navigate(
          "/admin/dashboard"
        );
      }

    } catch (error) {

      alert(
        error.response?.data?.message ||
        "Login Failed"
      );

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        <FarmTrackLogo />

        <div className="login-subtitle">
          Multi-Tenant Poultry ERP Platform
        </div>

        <div className="input-group">

          <label className="input-label">
            Email Address
          </label>

          <input
            type="email"
            className="login-input"
            placeholder="Enter email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
          />

        </div>

        <div className="input-group">

          <label className="input-label">
            Password
          </label>

          <input
            type="password"
            className="login-input"
            placeholder="Enter password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
          />

        </div>

        <button
          className="login-btn"
          onClick={submit}
          disabled={loading}
        >
          {
            loading
              ? "Signing In..."
              : "Login"
          }
        </button>

        <div className="demo-box">

          <div className="demo-title">
            Demo Credentials
          </div>

          <div>
            Email:
            admin@farmtrackpro.com
          </div>

          <div>
            Password:
            password
          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;
