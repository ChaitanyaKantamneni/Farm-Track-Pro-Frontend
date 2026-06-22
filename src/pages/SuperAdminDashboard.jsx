import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BadgeIndianRupee,
  ChartNoAxesColumn,
  LayoutDashboard,
  Store,
  WalletCards,
  CalendarDays,
  Shield,
  Clock,
  Plus,
  Trash2
} from "lucide-react";

import AppShell from "../components/AppShell";
import { getTenants, updateTenantSubscription, getPlatformStats } from "../services/tenantService";

const parseUTC = (str) => {
  if (!str) return null;
  let s = String(str);
  if (!s.endsWith("Z") && !s.includes("+") && s.includes(" ")) {
    s = s.replace(" ", "T") + "Z";
  }
  return new Date(s);
};

const sections = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", section: "dashboard", icon: LayoutDashboard },
      { label: "Tenant Management", to: "/tenants", icon: Store }
    ]
  },
  {
    title: "Platform Analytics",
    items: [
      { label: "Subscriptions", section: "subscriptions", icon: WalletCards },
      { label: "Pending Approvals", section: "pending_approvals", icon: Clock },
      { label: "Billing & Plans", section: "billing", icon: BadgeIndianRupee },
      { label: "Reports", section: "reports", icon: ChartNoAxesColumn }
    ]
  }
];

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [active, setActive] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || "dashboard";
  });

  const [tenants, setTenants] = useState([]);
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
  const [platformStats, setPlatformStats] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab") || "dashboard";
    setActive(tab);
  }, [location.search]);

  const handleTabChange = (tab) => {
    setActive(tab);
    navigate(`/super-admin/dashboard?tab=${tab}`);
  };

  // Local storage persisted plans configuration
  const [plans, setPlans] = useState(() => {
    const saved = localStorage.getItem("platform_plans");
    if (saved) return JSON.parse(saved);
    return {
      Basic: { price: 999, features: ["Up to 2,000 Birds", "Egg Collection Registry", "Basic Day Book", "Sales Registry", "Single User Account"] },
      Pro: { price: 1999, features: ["Up to 10,000 Birds", "Egg Collection Registry", "Purchase & Expense Registry", "Vendor & Customer Directories", "Egg & Financial Reports", "Staff & Salary Registry (Up to 5)", "Up to 3 Team Accounts"] },
      Enterprise: { price: 4999, features: ["Unlimited Birds", "Purchase & Expense Registry", "Disposed Inventory Management", "Advanced Analytics Dashboard", "Multi-Warehouse / Shed Inventory", "Unlimited Staff & Audit Logs", "Priority Support & API"] },
      Testing: { price: 0, features: ["All Features Included", "Developer Settings & Logs", "Mock Transactions Enabled", "Multi-Tenant Verification"] }
    };
  });

  // Local storage persisted tenant subscription details
  const [tenantMetadata, setTenantMetadata] = useState(() => {
    const saved = localStorage.getItem("tenant_subscription_meta");
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedPlanToEdit, setSelectedPlanToEdit] = useState("Pro");
  const [newFeatureText, setNewFeatureText] = useState("");

  useEffect(() => {
    getTenants()
      .then((response) => {
        setTenants(response.data);
        // Sync metadata from backend database fields
        setTenantMetadata((prev) => {
          const updated = { ...prev };
          response.data.forEach((tenant) => {
            updated[tenant.id] = {
              plan: tenant.plan || "Pro",
              billingStatus: tenant.billingStatus || "Collected",
              endsInDays: tenant.endsInDays !== undefined ? Number(tenant.endsInDays) : 30,
              status: tenant.status || "ACTIVE",
              subscriptionUpdatedAt: tenant.subscriptionUpdatedAt
            };
          });
          localStorage.setItem("tenant_subscription_meta", JSON.stringify(updated));
          return updated;
        });
      })
      .catch(() => setTenants([]));

    getPlatformStats()
      .then((response) => setPlatformStats(response.data))
      .catch((err) => console.error("Failed to load platform operational stats", err));
  }, []);

  // Merged state for computation
  const mergedTenants = useMemo(() => {
    return tenants.map((t) => ({
      ...t,
      plan: tenantMetadata[t.id]?.plan || "Pro",
      billingStatus: tenantMetadata[t.id]?.billingStatus || "Collected",
      endsInDays: tenantMetadata[t.id]?.endsInDays ?? 15,
      status: tenantMetadata[t.id]?.status || t.status || "ACTIVE",
      subscriptionUpdatedAt: tenantMetadata[t.id]?.subscriptionUpdatedAt || t.subscriptionUpdatedAt
    }));
  }, [tenants, tenantMetadata]);

  // Derived analytics
  const stats = useMemo(() => {
    let activeTenants = 0;
    let inactiveTenants = 0;
    let collectedRevenue = 0;
    let pendingRevenue = 0;
    let expiringSoon = 0;

    mergedTenants.forEach((tenant) => {
      const planPrice = plans[tenant.plan]?.price || 1999;
      if (tenant.status === "ACTIVE") {
        activeTenants++;
        if (tenant.billingStatus === "Collected") {
          collectedRevenue += planPrice;
        } else {
          pendingRevenue += planPrice;
        }
        if (tenant.endsInDays <= 7) {
          expiringSoon++;
        }
      } else {
        inactiveTenants++;
      }
    });

    return {
      activeTenants,
      inactiveTenants,
      collectedRevenue,
      pendingRevenue,
      expiringSoon,
      monthlyRevenue: collectedRevenue + pendingRevenue,
      annualRevenue: (collectedRevenue + pendingRevenue) * 12
    };
  }, [mergedTenants, plans]);

  const detailedUtilizationReport = useMemo(() => {
    let totalMonths = 0;
    let totalRevenue = 0;
    let totalCollected = 0;

    const items = mergedTenants.flatMap((t) => {
      const history = t.subscriptionHistory || [];

      return history.map((segment, index) => {
        const segStart = segment.startDate ? new Date(segment.startDate) : new Date();
        const segEnd = segment.endDate ? new Date(segment.endDate) : new Date();

        if (reportToDate && segStart > new Date(reportToDate)) {
          return null;
        }
        if (reportFromDate && segment.endDate && new Date(segment.endDate) < new Date(reportFromDate)) {
          return null;
        }

        const start = new Date(Math.max(segStart, reportFromDate ? new Date(reportFromDate) : segStart));
        const end = new Date(Math.min(segment.endDate ? segEnd : new Date(), reportToDate ? new Date(reportToDate) : new Date()));

        let months = 0;
        if (end >= start) {
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          months = Math.max(1, parseFloat((diffDays / 30).toFixed(1)));
        } else {
          return null;
        }

        const planPrice = plans[segment.plan]?.price || 0;
        const revenue = Math.round(months * planPrice);
        const collected = segment.billingStatus === "Collected" ? revenue : 0;

        totalRevenue += revenue;
        totalCollected += collected;

        return {
          ...t,
          uniqueKey: `${t.id}-${segment.id || index}`,
          regDate: segStart,
          plan: segment.plan,
          billingStatus: segment.billingStatus,
          months,
          revenue,
          collected
        };
      });
    }).filter(Boolean);

    // Calculate totalMonths based on unique tenants' overall active duration from their registration (creation) date
    const uniqueTenantsMonths = {};
    mergedTenants.forEach((t) => {
      const regDate = t.createdAt ? new Date(t.createdAt) : new Date();
      if (reportToDate && regDate > new Date(reportToDate)) {
        return;
      }
      const start = new Date(Math.max(regDate, reportFromDate ? new Date(reportFromDate) : regDate));
      const end = reportToDate ? new Date(reportToDate) : new Date();
      
      let months = 0;
      if (end >= start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        months = Math.max(1, parseFloat((diffDays / 30).toFixed(1)));
      }
      uniqueTenantsMonths[t.id] = months;
    });
    totalMonths = Object.values(uniqueTenantsMonths).reduce((sum, val) => sum + val, 0);

    return {
      items,
      stats: {
        totalMonths: parseFloat(totalMonths.toFixed(1)),
        totalRevenue,
        totalCollected
      }
    };
  }, [mergedTenants, reportFromDate, reportToDate, plans]);

  // Update handler for tenant subscription metadata
  const handleUpdateTenantMeta = (tenantId, key, value) => {
    setTenantMetadata((prev) => {
      const tenantMeta = prev[tenantId] || {
        plan: "Pro",
        billingStatus: "Collected",
        endsInDays: 30,
        status: "ACTIVE"
      };
      const newMeta = { ...tenantMeta, [key]: value };
      const updated = {
        ...prev,
        [tenantId]: newMeta
      };
      localStorage.setItem("tenant_subscription_meta", JSON.stringify(updated));
      
      // Save to database
      updateTenantSubscription(tenantId, newMeta)
        .catch((err) => console.error("Failed to sync subscription change to backend database", err));
        
      return updated;
    });
  };

  // Plans Management
  const handleUpdatePlanPrice = (price) => {
    setPlans((prev) => {
      const updated = {
        ...prev,
        [selectedPlanToEdit]: {
          ...prev[selectedPlanToEdit],
          price: parseInt(price) || 0
        }
      };
      localStorage.setItem("platform_plans", JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setPlans((prev) => {
      const updated = {
        ...prev,
        [selectedPlanToEdit]: {
          ...prev[selectedPlanToEdit],
          features: [...prev[selectedPlanToEdit].features, newFeatureText.trim()]
        }
      };
      localStorage.setItem("platform_plans", JSON.stringify(updated));
      return updated;
    });
    setNewFeatureText("");
  };

  const handleRemoveFeature = (index) => {
    setPlans((prev) => {
      const updated = {
        ...prev,
        [selectedPlanToEdit]: {
          ...prev[selectedPlanToEdit],
          features: prev[selectedPlanToEdit].features.filter((_, i) => i !== index)
        }
      };
      localStorage.setItem("platform_plans", JSON.stringify(updated));
      return updated;
    });
  };

  const title = sections.flatMap((section) => section.items).find((item) => item.section === active)?.label || "Dashboard";

  return (
    <AppShell
      title={title}
      variant="super"
      sections={sections}
      activeSection={active}
      onSectionChange={handleTabChange}
    >
      {active === "dashboard" && (
        <>
          <div className="page-description-banner">
            <p>
              <strong>Super Admin Control Center:</strong> Monitor multi-tenant poultry farms, evaluate subscription revenue analytics, track active licensing, and handle provisioning of new farm tenants.
            </p>
          </div>

          <section className="metric-grid super-grid">
            <article className="metric-card metric-green">
              <span>Active Plans</span>
              <strong>{stats.activeTenants}</strong>
              <p>Billing in good standing</p>
            </article>
            <article className="metric-card metric-blue">
              <span>Total Tenants</span>
              <strong>{tenants.length}</strong>
              <p>Farm accounts created</p>
            </article>
            <article className="metric-card metric-amber">
              <span>Inactive Farms</span>
              <strong>{stats.inactiveTenants}</strong>
              <p>Need follow-up</p>
            </article>
            <article className="metric-card metric-purple">
              <span>Monthly Revenue</span>
              <strong>₹{stats.monthlyRevenue.toLocaleString("en-IN")}</strong>
              <p>Active plan billings</p>
            </article>
          </section>


          <div className="two-column" style={{ marginTop: '24px' }}>
            <section className="panel ledger-panel">
              <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <h2>Tenant Registry Preview</h2>
                  <p>Latest registered poultry farm tenants.</p>
                </div>
                <button className="primary-btn" style={{ minHeight: '36px', height: '36px' }} type="button" onClick={() => navigate("/tenants")}>
                  Manage Tenants
                </button>
              </div>
              
              <div className="table-shell" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Farm Name</th>
                      <th>Code</th>
                      <th>Plan</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedTenants.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="empty-row">No tenants registered yet.</td>
                      </tr>
                    ) : (
                      mergedTenants.slice(0, 5).map((tenant) => (
                        <tr key={tenant.id}>
                          <td style={{ fontWeight: '600' }}>{tenant.farm_name}</td>
                          <td><code>{tenant.tenant_code}</code></td>
                          <td>{tenant.plan}</td>
                          <td>
                            <span className={tenant.status === "ACTIVE" ? "badge badge-green" : "badge badge-red"}>
                              {tenant.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel ledger-panel">
              <div className="panel-heading" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '16px' }}>
                <h2>Platform Revenue Analysis</h2>
                <p>Calculated subscription revenue runs.</p>
              </div>

              <div className="ledger-list" style={{ marginTop: '0px' }}>
                <div className="ledger-item ledger-amber" style={{ background: '#fef7ed', borderLeft: '4px solid #f97316' }}>
                  <div>
                    <strong>Collected Revenue</strong>
                    <span>Fees successfully received</span>
                  </div>
                  <b style={{ color: '#ea580c', background: '#ffedd5', fontSize: '13px', fontWeight: '700' }}>
                    ₹{stats.collectedRevenue.toLocaleString("en-IN")}
                  </b>
                </div>

                <div className="ledger-item ledger-green" style={{ background: '#ecfdf5', borderLeft: '4px solid #10b981', marginTop: '12px' }}>
                  <div>
                    <strong>Pending Revenue</strong>
                    <span>Invoices awaiting payment</span>
                  </div>
                  <b style={{ color: '#047857', background: '#d1fae5', fontSize: '13px', fontWeight: '700' }}>
                    ₹{stats.pendingRevenue.toLocaleString("en-IN")}
                  </b>
                </div>
                
                <div className="ledger-item ledger-red" style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', marginTop: '12px' }}>
                  <div>
                    <strong>Expiring Licensing</strong>
                    <span>Expires in next 7 days</span>
                  </div>
                  <b style={{ color: '#b91c1c', background: '#fee2e2', fontSize: '13px', fontWeight: '700' }}>
                    {stats.expiringSoon} Farms
                  </b>
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      {active === "subscriptions" && (
        <section className="panel ledger-panel">
          <div className="panel-heading" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '16px' }}>
            <h2>Active Subscriptions & Licensing</h2>
            <p>Manage subscription plans, billing status, remaining days, and operational states for each tenant.</p>
          </div>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Farm Name</th>
                  <th>Tenant Code</th>
                  <th>Subscription Plan</th>
                  <th>Billing Status</th>
                  <th>Ends in Days</th>
                  <th>Account Status</th>
                </tr>
              </thead>
              <tbody>
                {mergedTenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td style={{ fontWeight: '600' }}>{tenant.farm_name}</td>
                    <td><code>{tenant.tenant_code}</code></td>
                    <td>
                      <select
                        style={{ height: '30px', padding: '0 8px', border: '1px solid var(--line-strong)', borderRadius: '6px', fontSize: '12px' }}
                        value={tenant.plan}
                        onChange={(e) => handleUpdateTenantMeta(tenant.id, "plan", e.target.value)}
                      >
                        <option value="Basic">Basic (₹{plans.Basic.price})</option>
                        <option value="Pro">Pro (₹{plans.Pro.price})</option>
                        <option value="Enterprise">Enterprise (₹{plans.Enterprise.price})</option>
                        <option value="Testing">Testing (₹{plans.Testing?.price ?? 0})</option>
                      </select>
                    </td>
                    <td>
                      <select
                        style={{ height: '30px', padding: '0 8px', border: '1px solid var(--line-strong)', borderRadius: '6px', fontSize: '12px' }}
                        value={tenant.billingStatus}
                        onChange={(e) => handleUpdateTenantMeta(tenant.id, "billingStatus", e.target.value)}
                      >
                        <option value="Collected">Collected</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          style={{ height: '30px', width: '60px', padding: '0 6px', border: '1px solid var(--line-strong)', borderRadius: '6px', fontSize: '12px' }}
                          value={tenant.endsInDays}
                          onChange={(e) => handleUpdateTenantMeta(tenant.id, "endsInDays", Math.max(0, parseInt(e.target.value) || 0))}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>days</span>
                      </div>
                    </td>
                    <td>
                      <select
                        style={{ height: '30px', padding: '0 8px', border: '1px solid var(--line-strong)', borderRadius: '6px', fontSize: '12px' }}
                        value={tenant.status}
                        onChange={(e) => handleUpdateTenantMeta(tenant.id, "status", e.target.value)}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {active === "billing" && (
        <div className="two-column" style={{ marginTop: '0px' }}>
          <section className="panel ledger-panel">
            <div className="panel-heading" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '16px' }}>
              <h2>Configure Plan Prices & Features</h2>
              <p>Set custom pricing and feature lists for each of the subscription tiers.</p>
            </div>
            
            <div className="form-field" style={{ marginBottom: '16px' }}>
              <span>Select Subscription Tier</span>
              <select
                style={{ height: '38px', padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: '8px', fontSize: '13px' }}
                value={selectedPlanToEdit}
                onChange={(e) => setSelectedPlanToEdit(e.target.value)}
              >
                <option value="Basic">Basic Tier</option>
                <option value="Pro">Professional Tier</option>
                <option value="Enterprise">Enterprise Tier</option>
                <option value="Testing">Testing Tier</option>
              </select>
            </div>

            <div className="form-field" style={{ marginBottom: '20px' }}>
              <span>Monthly Subscription Cost (₹)</span>
              <input
                type="number"
                style={{ height: '38px', padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: '8px', fontSize: '13px' }}
                value={plans[selectedPlanToEdit].price}
                onChange={(e) => handleUpdatePlanPrice(e.target.value)}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: '#052012' }}>Edit Tier Features</h3>
              <ul style={{ paddingLeft: '16px', margin: '0 0 16px', fontSize: '13px', color: '#526b5c', display: 'grid', gap: '8px' }}>
                {plans[selectedPlanToEdit].features.map((feature, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{feature}</span>
                    <button
                      type="button"
                      style={{ background: 'transparent', border: 0, padding: 0, color: 'var(--red)', cursor: 'pointer' }}
                      onClick={() => handleRemoveFeature(idx)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Add new feature..."
                  style={{ flex: 1, height: '36px', padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: '8px', fontSize: '13px' }}
                  value={newFeatureText}
                  onChange={(e) => setNewFeatureText(e.target.value)}
                />
                <button className="primary-btn" style={{ minHeight: '36px', height: '36px' }} type="button" onClick={handleAddFeature}>
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </section>

          <section className="panel ledger-panel">
            <div className="panel-heading" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '16px' }}>
              <h2>Platform Subscription Matrix</h2>
              <p>Distribution overview across tiers.</p>
            </div>
            
            <div className="ledger-list" style={{ marginTop: '0px' }}>
              <div className="ledger-item" style={{ borderLeft: '4px solid #10b981', background: 'var(--surface-soft)' }}>
                <div>
                  <strong>Basic Tier (₹{plans.Basic.price})</strong>
                  <span>{mergedTenants.filter(t => t.plan === "Basic" && t.status === "ACTIVE").length} Active subscribers</span>
                </div>
              </div>
              <div className="ledger-item" style={{ borderLeft: '4px solid var(--blue)', background: 'var(--surface-soft)', marginTop: '12px' }}>
                <div>
                  <strong>Professional Tier (₹{plans.Pro.price})</strong>
                  <span>{mergedTenants.filter(t => t.plan === "Pro" && t.status === "ACTIVE").length} Active subscribers</span>
                </div>
              </div>
              <div className="ledger-item" style={{ borderLeft: '4px solid var(--purple)', background: 'var(--surface-soft)', marginTop: '12px' }}>
                <div>
                  <strong>Enterprise Tier (₹{plans.Enterprise.price})</strong>
                  <span>{mergedTenants.filter(t => t.plan === "Enterprise" && t.status === "ACTIVE").length} Active subscribers</span>
                </div>
              </div>
              <div className="ledger-item" style={{ borderLeft: '4px solid var(--amber)', background: 'var(--surface-soft)', marginTop: '12px' }}>
                <div>
                  <strong>Testing Tier (₹{plans.Testing?.price ?? 0})</strong>
                  <span>{mergedTenants.filter(t => t.plan === "Testing" && t.status === "ACTIVE").length} Active subscribers</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {active === "pending_approvals" && (
        <section className="panel ledger-panel">
          <div className="panel-heading" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '16px' }}>
            <h2>Pending Subscription Approvals</h2>
            <p>Verify and approve newly raised payment requests and self-renewals submitted by tenants.</p>
          </div>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Farm Name</th>
                  <th>Tenant Code</th>
                  <th>Requested Plan</th>
                  <th>Request Date</th>
                  <th>Days Remaining</th>
                  <th>Approval Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mergedTenants.filter(t => t.billingStatus === "Pending").length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-row">No pending subscription approvals found.</td>
                  </tr>
                ) : (
                  mergedTenants.filter(t => t.billingStatus === "Pending").map((tenant) => {
                    const isNewRequest = tenant.endsInDays >= 28;
                    const requestDate = tenant.subscriptionUpdatedAt
                      ? parseUTC(tenant.subscriptionUpdatedAt).toLocaleDateString("en-GB", {
                          timeZone: "Asia/Kolkata",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                      : "N/A";
                    return (
                      <tr key={tenant.id}>
                        <td style={{ fontWeight: '600' }}>{tenant.farm_name}</td>
                        <td><code>{tenant.tenant_code}</code></td>
                        <td>
                          <span style={{ fontWeight: '600', color: '#16462c' }}>
                            {tenant.plan} (₹{plans[tenant.plan]?.price || 0})
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--muted)' }}>{requestDate}</td>
                        <td>{tenant.endsInDays} days</td>
                        <td>
                          {isNewRequest ? (
                            <span className="badge badge-amber" style={{ background: '#fef3c7', color: '#d97706', fontWeight: '700' }}>
                              Newly Raised
                            </span>
                          ) : (
                            <span className="badge badge-amber">Awaiting Review</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="primary-btn"
                              style={{ background: '#10b981', minHeight: '30px', height: '30px', padding: '0 12px', fontSize: '12px' }}
                              onClick={() => handleUpdateTenantMeta(tenant.id, "billingStatus", "Collected")}
                            >
                              Approve & Unlock
                            </button>
                            <button
                              type="button"
                              className="primary-btn"
                              style={{ background: '#ef4444', minHeight: '30px', height: '30px', padding: '0 12px', fontSize: '12px' }}
                              onClick={() => {
                                handleUpdateTenantMeta(tenant.id, "billingStatus", "Pending");
                                handleUpdateTenantMeta(tenant.id, "status", "INACTIVE");
                              }}
                            >
                              Decline / Suspend
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {active === "reports" && (
        <>
          <div className="page-description-banner">
            <p>
              <strong>Platform Billing Reports:</strong> Detailed breakdown of revenue collections, pending invoice records, and license expiry periods.
            </p>
          </div>
          
          <section className="two-column">
            <section className="panel ledger-panel">
              <div className="panel-heading" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '16px' }}>
                <h2>Collection Overview</h2>
                <p>Billing status distribution for all active farm accounts.</p>
              </div>
              <div className="report-list">
                <div><span>Collected Payments</span><strong style={{ color: 'var(--blue)' }}>₹{stats.collectedRevenue.toLocaleString("en-IN")}</strong></div>
                <div><span>Pending Payments</span><strong style={{ color: 'var(--amber)' }}>₹{stats.pendingRevenue.toLocaleString("en-IN")}</strong></div>
                <div><span>Total Revenue Run</span><strong>₹{stats.monthlyRevenue.toLocaleString("en-IN")}</strong></div>
              </div>
            </section>

            <section className="panel ledger-panel">
              <div className="panel-heading" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '16px' }}>
                <h2>Operational License Alert</h2>
                <p>Expiration metrics for tenant licensing.</p>
              </div>
              <div className="report-list">
                <div><span>Critical Expiry (7 days or less)</span><strong style={{ color: 'var(--red)' }}>{stats.expiringSoon} Farms</strong></div>
                <div><span>Stable Licensing (8+ days remaining)</span><strong>{stats.activeTenants - stats.expiringSoon} Farms</strong></div>
                <div><span>Suspended Licenses</span><strong>{stats.inactiveTenants} Farms</strong></div>
              </div>
            </section>
          </section>

          <section className="panel ledger-panel" style={{ marginTop: '24px' }}>
            <div className="panel-heading" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '16px' }}>
              <h2>Billing Ledger & Expiration Status</h2>
              <p>In-depth list showing collected/pending status and remaining active days for each registered farm tenant.</p>
            </div>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Farm Name</th>
                    <th>Plan Tier</th>
                    <th>Plan Cost</th>
                    <th>Billing Status</th>
                    <th>Days Remaining</th>
                    <th>Action Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedTenants.map((tenant) => {
                    const price = plans[tenant.plan]?.price || 0;
                    const isExpiring = tenant.endsInDays <= 7 && tenant.status === "ACTIVE";
                    return (
                      <tr key={tenant.id}>
                        <td style={{ fontWeight: '600' }}>{tenant.farm_name}</td>
                        <td>{tenant.plan}</td>
                        <td>₹{price.toLocaleString("en-IN")}</td>
                        <td>
                          <span className={tenant.billingStatus === "Collected" ? "badge badge-green" : "badge badge-amber"}>
                            {tenant.billingStatus}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: isExpiring ? 'var(--red)' : 'inherit', fontWeight: isExpiring ? '700' : 'normal' }}>
                            <Clock size={13} />
                            <span>{tenant.status === "ACTIVE" ? `${tenant.endsInDays} days` : "Suspended"}</span>
                          </div>
                        </td>
                        <td>
                          {tenant.status !== "ACTIVE" ? (
                            <span style={{ color: 'var(--muted)', fontWeight: '600' }}>Suspended</span>
                          ) : isExpiring ? (
                            <span className="badge badge-red">Critical (Renew Soon)</span>
                          ) : tenant.billingStatus === "Pending" ? (
                            <span className="badge badge-amber">Invoice Unpaid</span>
                          ) : (
                            <span className="badge badge-green">Account Safe</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel ledger-panel" style={{ marginTop: '24px' }}>
            <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2>Detailed Tenant Utilization & Billing Report</h2>
                <p>Track cumulative farm active months, total revenue generated, and verified collected subscriptions.</p>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#526b5c', fontWeight: '600' }}>From:</span>
                <input 
                  type="date" 
                  value={reportFromDate} 
                  onChange={(e) => setReportFromDate(e.target.value)} 
                  style={{ padding: '2px 8px', height: '28px', fontSize: '12px', border: '1px solid var(--line-strong)', borderRadius: '6px', color: 'var(--text)', background: '#ffffff', outline: 'none' }} 
                />
                <span style={{ fontSize: '13px', color: '#526b5c', fontWeight: '600' }}>To:</span>
                <input 
                  type="date" 
                  value={reportToDate} 
                  onChange={(e) => setReportToDate(e.target.value)} 
                  style={{ padding: '2px 8px', height: '28px', fontSize: '12px', border: '1px solid var(--line-strong)', borderRadius: '6px', color: 'var(--text)', background: '#ffffff', outline: 'none' }} 
                />
              </div>
            </div>

            <section className="metric-grid super-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px', gap: '16px' }}>
              <article className="metric-card metric-blue">
                <span>Cumulative Active Months</span>
                <strong>{detailedUtilizationReport.stats.totalMonths} months</strong>
                <p>Across active billing periods</p>
              </article>
              <article className="metric-card metric-purple">
                <span>Total Generated Revenue</span>
                <strong>₹{detailedUtilizationReport.stats.totalRevenue.toLocaleString("en-IN")}</strong>
                <p>Based on tier plan prices</p>
              </article>
              <article className="metric-card metric-green">
                <span>Verified Amounts Collected</span>
                <strong>₹{detailedUtilizationReport.stats.totalCollected.toLocaleString("en-IN")}</strong>
                <p>Confirmed platform payments</p>
              </article>
            </section>

            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Farm Name</th>
                    <th>Tenant Code</th>
                    <th>Registration Date</th>
                    <th>Active Months</th>
                    <th>Subscription Plan</th>
                    <th>Calculated Revenue</th>
                    <th>Amount Collected</th>
                    <th>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedUtilizationReport.items.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-row">No records found matching date criteria.</td>
                    </tr>
                  ) : (
                    detailedUtilizationReport.items.map((tenant) => (
                      <tr key={tenant.uniqueKey}>
                        <td style={{ fontWeight: '600' }}>{tenant.farm_name}</td>
                        <td><code>{tenant.tenant_code}</code></td>
                        <td>
                          {tenant.regDate 
                            ? parseUTC(tenant.regDate).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) 
                            : "N/A"}
                        </td>
                        <td>{tenant.months} months</td>
                        <td>{tenant.plan}</td>
                        <td style={{ fontWeight: '600' }}>₹{tenant.revenue.toLocaleString("en-IN")}</td>
                        <td style={{ fontWeight: '600', color: tenant.collected > 0 ? 'var(--blue)' : 'inherit' }}>
                          ₹{tenant.collected.toLocaleString("en-IN")}
                        </td>
                        <td>
                          <span className={tenant.billingStatus === "Collected" ? "badge badge-green" : "badge badge-amber"}>
                            {tenant.billingStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

export default SuperAdminDashboard;
