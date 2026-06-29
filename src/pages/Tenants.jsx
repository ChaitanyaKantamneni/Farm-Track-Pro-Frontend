import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Upload,
  Edit2
} from "lucide-react";

import {
  createTenant,
  getTenants,
  updateTenantLogo,
  updateTenantDetails
} from "../services/tenantService";

import AppShell from "../components/AppShell";
import "../styles/tenants.css";

function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tenantLogos, setTenantLogos] = useState(() => {
    return JSON.parse(localStorage.getItem("tenant_logos") || "{}");
  });

  const [editingId, setEditingId] = useState(null);
  const [logo, setLogo] = useState("");
  const [form, setForm] = useState({
    tenant_code: "",
    farm_name: "",
    owner_name: "",
    phone: "",
    email: "",
    admin_name: "",
    admin_email: "",
    admin_phone: "",
    admin_password: ""
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const response = await getTenants();
      setTenants(response.data);
      
      const logosMap = {};
      response.data.forEach(t => {
        if (t.logo) {
          logosMap[t.id] = t.logo;
        }
      });
      setTenantLogos(logosMap);
      localStorage.setItem("tenant_logos", JSON.stringify(logosMap));
    } catch (error) {
      console.log(error);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const startEdit = (tenant) => {
    setEditingId(tenant.id);
    setForm({
      tenant_code: tenant.tenant_code || "",
      farm_name: tenant.farm_name || "",
      owner_name: tenant.owner_name || "",
      phone: tenant.phone || "",
      email: tenant.email || "",
      admin_name: tenant.admin_name || "",
      admin_email: tenant.admin_email || "",
      admin_phone: tenant.admin_phone || "",
      admin_password: "" // Optional: leave blank to keep current password
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      tenant_code: "",
      farm_name: "",
      owner_name: "",
      phone: "",
      email: "",
      admin_name: "",
      admin_email: "",
      admin_phone: "",
      admin_password: ""
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogo(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadForExisting = async (tenantId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Logo = reader.result;
        await updateTenantLogo(tenantId, base64Logo);
        setTenantLogos(prev => {
          const next = { ...prev, [tenantId]: base64Logo };
          localStorage.setItem("tenant_logos", JSON.stringify(next));
          return next;
        });
      } catch (err) {
        alert("Error saving logo to database");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async (tenantId) => {
    if (!confirm("Are you sure you want to remove this tenant logo?")) return;
    try {
      await updateTenantLogo(tenantId, null);
      setTenantLogos(prev => {
        const next = { ...prev };
        delete next[tenantId];
        localStorage.setItem("tenant_logos", JSON.stringify(next));
        return next;
      });
    } catch (err) {
      alert("Error removing logo");
    }
  };

  const saveTenant = async () => {
    if (!form.farm_name || !form.farm_name.trim()) {
      alert("Farm Name is required");
      return;
    }
    if (!form.admin_name || !form.admin_name.trim()) {
      alert("Admin Name is required");
      return;
    }
    if (!form.admin_email || !form.admin_email.trim()) {
      alert("Admin Email is required");
      return;
    }

    try {
      if (editingId) {
        const payload = { ...form };
        if (!payload.admin_password) {
          delete payload.admin_password;
        }
        await updateTenantDetails(editingId, payload);
        alert("Tenant details updated successfully");
        cancelEdit();
      } else {
        const response = await createTenant({ ...form, logo });
        const newTenantId = response.data?.tenant?.id || response.data?.id || response.data?.tenantId;
        if (newTenantId && logo) {
          setTenantLogos(prev => {
            const next = { ...prev, [newTenantId]: logo };
            localStorage.setItem("tenant_logos", JSON.stringify(next));
            return next;
          });
        }
        setLogo("");

        alert(
          `Tenant Created Successfully\n\nAdmin Email:\n${response.data.credentials.email}\n\nPassword:\n${response.data.credentials.password}`
        );

        setForm({
          tenant_code: "",
          farm_name: "",
          owner_name: "",
          phone: "",
          email: "",
          admin_name: "",
          admin_email: "",
          admin_phone: "",
          admin_password: ""
        });
      }

      loadTenants();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Error saving tenant");
    }
  };

  return (
    <AppShell title="Tenant Management" variant="super">
      <div className="tenant-grid">
        <section className="panel tenant-form-card">
          <div className="panel-heading">
            <h2>{editingId ? "Edit Tenant" : "Create Tenant"}</h2>
            <p>{editingId ? "Modify details or reset admin password" : "Farm details and first admin account"}</p>
          </div>

          <div className="form-grid">
            <input
              name="tenant_code"
              placeholder="Tenant Code"
              value={form.tenant_code}
              onChange={handleChange}
            />

            <input
              name="farm_name"
              placeholder="Farm Name *"
              value={form.farm_name}
              onChange={handleChange}
              required
            />

            <input
              name="owner_name"
              placeholder="Owner Name"
              value={form.owner_name}
              onChange={handleChange}
            />

            <input
              name="phone"
              placeholder="Phone"
              value={form.phone}
              onChange={handleChange}
            />

            <input
              name="email"
              placeholder="Farm Email"
              value={form.email}
              onChange={handleChange}
            />

            <div className="form-field">
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '600', marginBottom: '4px' }}>Farm Brand Logo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--line-strong)', borderRadius: '8px', background: '#f8fafc', fontSize: '12px', height: 'auto' }}
              />
              {logo && (
                <div style={{ marginTop: '10px' }}>
                  <img src={logo} alt="Preview" style={{ height: '40px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--line)' }} />
                </div>
              )}
            </div>

            <div className="form-divider" />

            <input
              name="admin_name"
              placeholder="Admin Name *"
              value={form.admin_name}
              onChange={handleChange}
              required
            />

            <input
              name="admin_email"
              placeholder="Admin Email *"
              value={form.admin_email}
              onChange={handleChange}
              required
            />

            <input
              name="admin_phone"
              placeholder="Admin Phone"
              value={form.admin_phone}
              onChange={handleChange}
            />

            {editingId && (
              <input
                name="admin_password"
                type="password"
                placeholder="New Password (Leave blank to keep current)"
                value={form.admin_password}
                onChange={handleChange}
                style={{ border: '1.5px solid var(--blue-light, #0284c7)' }}
              />
            )}

            <button
              className="primary-btn"
              type="button"
              onClick={saveTenant}
            >
              {editingId ? "Save Changes" : <>
                <Plus size={17} />
                Create Tenant
              </>}
            </button>

            {editingId && (
              <button
                className="secondary-btn"
                type="button"
                onClick={cancelEdit}
                style={{ width: '100%', minHeight: '38px', height: '38px', borderRadius: '8px', border: '1.5px solid var(--line-strong)', background: '#f1f5f9', color: 'var(--text)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </section>

        <section className="panel tenant-list-card">
          <div className="table-toolbar">
            <div className="panel-heading">
              <h2>Existing Tenants</h2>
              <p>{tenants.length} tenant accounts</p>
            </div>
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%' }}
              />
            </div>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Logo</th>
                  <th>ID</th>
                  <th>Code</th>
                  <th>Farm</th>
                  <th>Owner</th>
                  <th>Admin Password</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {tenants.filter(t => 
                  t.farm_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.tenant_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.email?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((tenant) => (
                  <tr key={tenant.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {tenantLogos[tenant.id] ? (
                          <img src={tenantLogos[tenant.id]} alt="Logo" style={{ height: '28px', width: '28px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--line-strong)' }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px', background: 'var(--surface-soft)', borderRadius: '4px', display: 'grid', placeItems: 'center', fontSize: '10px', color: 'var(--blue)', fontWeight: 'bold', border: '1px solid var(--line-strong)' }}>FT</div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          id={`upload-${tenant.id}`}
                          style={{ display: 'none' }}
                          onChange={(e) => handleUploadForExisting(tenant.id, e)}
                        />
                        <label htmlFor={`upload-${tenant.id}`} style={{ fontSize: '11px', color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Upload size={12} /> Change
                        </label>
                        {tenantLogos[tenant.id] && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLogo(tenant.id)}
                            style={{ border: 'none', background: 'none', fontSize: '11px', color: 'var(--red)', cursor: 'pointer', textDecoration: 'underline', padding: 0, display: 'flex', alignItems: 'center' }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                    <td>{tenant.id}</td>
                    <td><code>{tenant.tenant_code}</code></td>
                    <td>{tenant.farm_name}</td>
                    <td>{tenant.owner_name}</td>
                    <td>
                      <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                        {tenant.admin_password || "N/A"}
                      </code>
                    </td>
                    <td>
                      <span className={tenant.status === "ACTIVE" ? "active-badge" : "inactive-badge"}>
                        {tenant.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="primary-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px', height: '28px', minHeight: '28px', fontSize: '12px', cursor: 'pointer' }}
                        onClick={() => startEdit(tenant)}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default Tenants;
