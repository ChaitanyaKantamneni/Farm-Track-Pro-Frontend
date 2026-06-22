import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Phone } from "lucide-react";

import { AuthContext } from "../context/AuthContext";
import { loginUser } from "../services/authService";
import FarmTrackLogo from "../components/FarmTrackLogo";
import { updateTenantSubscription } from "../services/tenantService";

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

  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [expiredTenantId, setExpiredTenantId] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("Pro");
  const [isRenewing, setIsRenewing] = useState(false);

  const submit = async () => {
    try {

      setLoading(true);

      const response =
        await loginUser({
          email,
          password
        });

      const user = response.data.user;

      if (user.role !== "SUPER_ADMIN" && user.tenantId) {
        if (user.status === "INACTIVE" || Number(user.endsInDays) <= 0 || user.billingStatus === "Pending") {
          if (user.billingStatus === "Pending") {
            alert("Your subscription payment is pending verification by the administrator. Access will be unlocked shortly.");
          } else {
            setExpiredTenantId(user.tenantId);
            setShowRenewalModal(true);
          }
          setLoading(false);
          return;
        }
      }

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

      if (error.response?.status === 403 && error.response?.data?.isExpired) {
        setExpiredTenantId(error.response.data.tenantId);
        setShowRenewalModal(true);
      } else {
        alert(
          error.response?.data?.message ||
          "Login Failed"
        );
      }

    } finally {

      setLoading(false);

    }
  };

  const handleRenew = async () => {
    if (!expiredTenantId) return;
    try {
      setIsRenewing(true);
      await updateTenantSubscription(expiredTenantId, {
        plan: selectedPlan,
        billingStatus: "Pending", // Mark as Pending so Super Admin knows verification is required
        endsInDays: 30,
        status: "ACTIVE"
      });

      // Update local storage settings
      const meta = JSON.parse(localStorage.getItem("tenant_subscription_meta") || "{}");
      meta[expiredTenantId] = {
        plan: selectedPlan,
        billingStatus: "Pending",
        endsInDays: 30,
        status: "ACTIVE"
      };
      localStorage.setItem("tenant_subscription_meta", JSON.stringify(meta));

      setShowRenewalModal(false);
      alert(`Subscription successfully activated under the ${selectedPlan.toUpperCase()} tier! Logging you in...`);
      submit();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to renew subscription.");
    } finally {
      setIsRenewing(false);
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

        <div className="demo-box" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#374151', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '28px', padding: '16px', borderRadius: '10px', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={16} style={{ color: '#7b8794' }} />
            <span style={{ fontWeight: '500' }}>Support Email:</span>
            <a href="mailto:support@geniusmindstech.com" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: '600' }}>support@geniusmindstech.com</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={16} style={{ transform: 'rotate(15deg)', color: '#7b8794' }} />
            <span style={{ fontWeight: '500' }}>Support Mobile:</span>
            <a href="tel:7075867027" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: '600' }}>7075867027</a>
          </div>
        </div>

      </div>

      {showRenewalModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(5, 32, 18, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 24px 48px rgba(0, 0, 0, 0.15)",
            width: "100%",
            maxWidth: "600px",
            padding: "32px",
            fontFamily: "'Outfit', sans-serif",
            border: "1px solid #e2ece7"
          }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#052012", margin: "0 0 8px", textAlign: "center" }}>
              Subscription Expired
            </h2>
            <p style={{ fontSize: "14px", color: "#526b5c", margin: "0 0 24px", textAlign: "center", lineHeight: "1.5" }}>
              Your FarmTrack subscription has expired. Select a plan below to instantly reactivate your farm operations portal.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
              {[
                { name: "Basic", price: 999, desc: "Essential tracking for small farms" },
                { name: "Pro", price: 1999, desc: "Full features for growing operations" },
                { name: "Enterprise", price: 4999, desc: "Unlimited power & priority support" }
              ].map((p) => {
                const isSelected = selectedPlan === p.name;
                return (
                  <div
                    key={p.name}
                    onClick={() => setSelectedPlan(p.name)}
                    style={{
                      border: isSelected ? "2px solid #00a86b" : "1px solid #d0dfd7",
                      borderRadius: "12px",
                      padding: "16px",
                      cursor: "pointer",
                      textAlign: "center",
                      background: isSelected ? "#f0fdf4" : "#ffffff",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: "700", color: isSelected ? "#008756" : "#728f7d", textTransform: "uppercase", marginBottom: "4px" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: "700", color: "#052012" }}>
                      ₹{p.price}
                    </div>
                    <div style={{ fontSize: "10px", color: "#6c8c78", marginTop: "6px", lineHeight: "1.3" }}>
                      {p.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: "#f8faf9", borderRadius: "10px", padding: "16px", marginBottom: "24px", border: "1px solid #e9efec" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#052012", textTransform: "uppercase", marginBottom: "8px" }}>
                Included Features ({selectedPlan} Tier):
              </div>
              <ul style={{ fontSize: "12px", color: "#526b5c", margin: 0, paddingLeft: "16px", display: "grid", gap: "6px" }}>
                {selectedPlan === "Basic" && (
                  <>
                    <li>Capacity limit: Up to 2,000 birds</li>
                    <li>Egg collection registry and logs</li>
                    <li>Basic Cash Day Book</li>
                    <li>Sales Registry</li>
                  </>
                )}
                {selectedPlan === "Pro" && (
                  <>
                    <li>Capacity limit: Up to 10,000 birds</li>
                    <li>Egg collection, Purchases & Expense Registry</li>
                    <li>Vendor & Customer Directories</li>
                    <li>Egg reports and PDF downloads</li>
                    <li>Staff & Salary payroll (up to 5 workers)</li>
                  </>
                )}
                {selectedPlan === "Enterprise" && (
                  <>
                    <li>Capacity limit: Unlimited birds</li>
                    <li>Disposed Inventory & Mortality logs</li>
                    <li>Advanced Analytics Dashboard and metrics</li>
                    <li>Multi-Warehouse/Shed Inventory</li>
                    <li>Audit logging and priority API access</li>
                  </>
                )}
              </ul>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowRenewalModal(false)}
                style={{
                  flex: 1,
                  height: "42px",
                  borderRadius: "8px",
                  border: "1px solid #d0dfd7",
                  background: "#ffffff",
                  color: "#526b5c",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRenew}
                disabled={isRenewing}
                style={{
                  flex: 2,
                  height: "42px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#00a86b",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 6px 12px rgba(0, 168, 107, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                {isRenewing ? "Activating plan..." : "Purchase & Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Login;
