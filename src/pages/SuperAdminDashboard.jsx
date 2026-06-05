import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeIndianRupee,
  ChartNoAxesColumn,
  LayoutDashboard,
  Store,
  WalletCards
} from "lucide-react";

import AppShell from "../components/AppShell";
import { getTenants } from "../services/tenantService";

const sections = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", section: "dashboard", icon: LayoutDashboard },
      { label: "Tenant Management", to: "/tenants", icon: Store }
    ]
  },
  {
    title: "Platform",
    items: [
      { label: "Subscriptions", section: "subscriptions", icon: WalletCards },
      { label: "Billing", section: "billing", icon: BadgeIndianRupee },
      { label: "Reports", section: "reports", icon: ChartNoAxesColumn }
    ]
  }
];

function SuperAdminDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const navigate = useNavigate();
  const [active, setActive] = useState("dashboard");
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    getTenants()
      .then((response) => setTenants(response.data))
      .catch(() => setTenants([]));
  }, []);

  const stats = useMemo(() => {
    const activeTenants = tenants.filter((tenant) => tenant.status === "ACTIVE").length;
    const inactiveTenants = tenants.length - activeTenants;
    return {
      activeTenants,
      inactiveTenants,
      monthlyRevenue: activeTenants * 1999,
      annualRevenue: activeTenants * 1999 * 12
    };
  }, [tenants]);

  const title = sections.flatMap((section) => section.items).find((item) => item.section === active)?.label || "Dashboard";

  return (
    <AppShell
      title={title}
      variant="super"
      sections={sections}
      activeSection={active}
      onSectionChange={setActive}
    >
      {active === "dashboard" && (
        <>
          <section className="metric-grid super-grid">
            <article className="metric-card metric-blue">
              <span>Total Tenants</span>
              <strong>{tenants.length}</strong>
              <p>Farm accounts created</p>
            </article>
            <article className="metric-card metric-green">
              <span>Active Plans</span>
              <strong>{stats.activeTenants}</strong>
              <p>Billing in good standing</p>
            </article>
            <article className="metric-card metric-amber">
              <span>Inactive Farms</span>
              <strong>{stats.inactiveTenants}</strong>
              <p>Need follow-up</p>
            </article>
            <article className="metric-card metric-purple">
              <span>Platform Admin</span>
              <strong>{user?.fullName || "Admin"}</strong>
              <p>Full access control</p>
            </article>
          </section>

          <section className="panel welcome-panel">
            <div>
              <h2>Tenant operations</h2>
              <p>Create farm tenants, issue admin credentials, and monitor account status from one clean workspace.</p>
            </div>
            <button className="primary-btn" type="button" onClick={() => navigate("/tenants")}>
              Tenant Management
            </button>
          </section>
        </>
      )}

      {active === "subscriptions" && (
        <section className="panel tenant-list-card">
          <div className="panel-heading">
            <h2>Subscriptions</h2>
            <p>Current plan status for each tenant.</p>
          </div>
          <div className="table-shell">
            <table>
              <thead><tr><th>Farm</th><th>Tenant Code</th><th>Plan</th><th>Status</th><th>Monthly Fee</th></tr></thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>{tenant.farm_name}</td>
                    <td>{tenant.tenant_code}</td>
                    <td>FarmTrack Pro</td>
                    <td><span className={tenant.status === "ACTIVE" ? "badge badge-green" : "badge badge-red"}>{tenant.status}</span></td>
                    <td>₹1,999.00</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {active === "billing" && (
        <section className="metric-grid super-grid">
          <article className="metric-card metric-green"><span>Monthly Recurring</span><strong>₹{stats.monthlyRevenue.toLocaleString("en-IN")}</strong><p>Active tenants x plan fee</p></article>
          <article className="metric-card metric-blue"><span>Annual Run Rate</span><strong>₹{stats.annualRevenue.toLocaleString("en-IN")}</strong><p>Projected platform billing</p></article>
          <article className="metric-card metric-amber"><span>Pending Review</span><strong>{stats.inactiveTenants}</strong><p>Inactive or paused accounts</p></article>
          <article className="metric-card metric-purple"><span>Plan Price</span><strong>₹1,999</strong><p>Default monthly subscription</p></article>
        </section>
      )}

      {active === "reports" && (
        <section className="two-column">
          <section className="panel tenant-list-card">
            <div className="panel-heading"><h2>Tenant Status Report</h2><p>Platform account distribution.</p></div>
            <div className="report-list">
              <div><span>Active tenants</span><strong>{stats.activeTenants}</strong></div>
              <div><span>Inactive tenants</span><strong>{stats.inactiveTenants}</strong></div>
              <div><span>Total tenants</span><strong>{tenants.length}</strong></div>
            </div>
          </section>
          <section className="panel tenant-list-card">
            <div className="panel-heading"><h2>Billing Report</h2><p>Estimated platform revenue.</p></div>
            <div className="report-list">
              <div><span>Monthly revenue</span><strong>₹{stats.monthlyRevenue.toLocaleString("en-IN")}</strong></div>
              <div><span>Annual revenue</span><strong>₹{stats.annualRevenue.toLocaleString("en-IN")}</strong></div>
              <div><span>Average per tenant</span><strong>₹1,999</strong></div>
            </div>
          </section>
        </section>
      )}
    </AppShell>
  );
}

export default SuperAdminDashboard;
