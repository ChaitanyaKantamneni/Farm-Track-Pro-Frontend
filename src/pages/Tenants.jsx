import { useEffect, useState } from "react";
import {
  Plus,
  Search
} from "lucide-react";

import {
  createTenant,
  getTenants
}
from "../services/tenantService";

import AppShell from "../components/AppShell";
import "../styles/tenants.css";

function Tenants() {

  const [tenants, setTenants] =
  useState([]);

  const [form, setForm] =
  useState({

    tenant_code: "",
    farm_name: "",
    owner_name: "",
    phone: "",
    email: "",

    admin_name: "",
    admin_email: "",
    admin_phone: ""

  });

  useEffect(() => {

    loadTenants();

  }, []);

  const loadTenants =
  async () => {

    try {

      const response =
      await getTenants();

      setTenants(
        response.data
      );

    }
    catch(error){

      console.log(error);

    }

  };

  const handleChange =
  (e) => {

    setForm({

      ...form,

      [e.target.name]:
      e.target.value

    });

  };

  const saveTenant =
  async () => {

    try {

      const response =
      await createTenant(
        form
      );

      alert(

`Tenant Created Successfully

Admin Email:
${response.data.credentials.email}

Password:
${response.data.credentials.password}`

      );

      setForm({

        tenant_code: "",
        farm_name: "",
        owner_name: "",
        phone: "",
        email: "",

        admin_name: "",
        admin_email: "",
        admin_phone: ""

      });

      loadTenants();

    }
    catch(error){

      console.log(error);

      alert(
        error.response?.data?.message
      );

    }

  };

  return (
    <AppShell
      title="Tenant Management"
      variant="super"
    >
      <div className="tenant-grid">
        <section className="panel tenant-form-card">
          <div className="panel-heading">
            <h2>Create Tenant</h2>
            <p>Farm details and first admin account</p>
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
              placeholder="Farm Name"
              value={form.farm_name}
              onChange={handleChange}
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

            <div className="form-divider" />

            <input
              name="admin_name"
              placeholder="Admin Name"
              value={form.admin_name}
              onChange={handleChange}
            />

            <input
              name="admin_email"
              placeholder="Admin Email"
              value={form.admin_email}
              onChange={handleChange}
            />

            <input
              name="admin_phone"
              placeholder="Admin Phone"
              value={form.admin_phone}
              onChange={handleChange}
            />

            <button
              className="primary-btn"
              type="button"
              onClick={saveTenant}
            >
              <Plus size={17} />
              Create Tenant
            </button>
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
              <span>Search tenants</span>
            </div>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Code</th>
                  <th>Farm</th>
                  <th>Owner</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {
                  tenants.map(
                    (tenant) => (
                      <tr key={tenant.id}>
                        <td>{tenant.id}</td>
                        <td>{tenant.tenant_code}</td>
                        <td>{tenant.farm_name}</td>
                        <td>{tenant.owner_name}</td>
                        <td>
                          <span className={
                            tenant.status === "ACTIVE"
                              ? "active-badge"
                              : "inactive-badge"
                          }
                          >
                            {tenant.status}
                          </span>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>

  );

}

export default Tenants;
