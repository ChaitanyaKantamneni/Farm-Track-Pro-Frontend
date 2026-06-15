import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChartNoAxesColumn,
  CreditCard,
  Egg,
  LayoutDashboard,
  Package,
  Plus,
  ShoppingCart,
  Tag,
  UserRound,
  Users,
  Warehouse,
  Shield
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import AppShell from "../components/AppShell";
import {
  createResource,
  deleteResource,
  getDashboard,
  listResource,
  updateResource,
  listDisposals,
  createDisposal,
  updateDisposal,
  deleteDisposal,
  restoreDisposal,
  getSettings,
  updateSettings
} from "../services/farmService";

const today = () => new Date().toISOString().slice(0, 10);
const month = () => new Date().toISOString().slice(0, 7);
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n) => Number(n || 0);

const sections = [
  { title: "Overview", items: [{ label: "Dashboard", section: "dashboard", icon: LayoutDashboard }] },
  {
    title: "Transactions",
    items: [
      { label: "Sales", section: "sales", icon: Tag },
      { label: "Purchases", section: "purchases", icon: ShoppingCart },
      { label: "Payments", section: "payments", icon: CreditCard },
      { label: "Day Book", section: "daybook", icon: BookOpen },
      { label: "Eggs Collection", section: "egg_collections", icon: Egg },
      { label: "Disposed Inventory", section: "disposed_inventory", icon: Package }
    ]
  },
  { title: "Staff", items: [{ label: "Staff & Salary", section: "staff", icon: Users }] },
  {
    title: "Master Data",
    items: [
      { label: "Customers", section: "customers", icon: UserRound },
      { label: "Vendors", section: "vendors", icon: UserRound },
      { label: "Items", section: "items", icon: Package },
      { label: "Sheds", section: "sheds", icon: Warehouse }
    ]
  },
  {
    title: "Analytics",
    items: [
      { label: "Reports", section: "reports", icon: ChartNoAxesColumn },
      { label: "Eggs Collection", section: "egg_reports", icon: Egg },
      { label: "Disposed Inventory", section: "disposal_reports", icon: Package }
    ]
  },
  { title: "Settings", items: [{ label: "App Settings", section: "settings", icon: Shield }, { label: "System Users", section: "users", icon: Shield }] }
];

const empty = {
  items: [],
  customers: [],
  vendors: [],
  sales: [],
  purchases: [],
  payments: [],
  daybook: [],
  staff: [],
  advances: [],
  salaries: [],
  attendance: [],
  sheds: [],
  egg_collections: [],
  users: [],
  disposals: [],
  settings: { standard_egg_cost: 0 }
};

function MetricCard({ label, value, helper, tone }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <p>{helper}</p>}
    </article>
  );
}

function Field({ label, children }) {
  const isRequired = React.Children.toArray(children).some(c => c?.props?.required);
  return (
    <label className="form-field">
      <span>{label}{isRequired && <span style={{ color: "#e04b46", marginLeft: "4px" }}>*</span>}</span>
      {children}
    </label>
  );
}

function Table({ cols, rows, emptyText = "No records yet" }) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>{cols.map((col) => <th key={col}>{col}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows : <tr><td className="empty-row" colSpan={cols.length}>{emptyText}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function AdminDashboard() {
  const [active, setActive] = useState("dashboard");
  const [data, setData] = useState(empty);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const userRole = storedUser?.role || "ADMIN";

  const visibleSections = useMemo(() => {
    if (userRole === "MANAGER") {
      return [
        {
          title: "Transactions",
          items: sections.find((s) => s.title === "Transactions").items.filter((i) => ["egg_collections", "disposed_inventory"].includes(i.section))
        },
        {
          title: "Staff",
          items: sections.find((s) => s.title === "Staff").items
        },
        {
          title: "Master Data",
          items: sections.find((s) => s.title === "Master Data").items.filter((i) => i.section === "sheds")
        }
      ];
    }
    return sections;
  }, [userRole]);

  useEffect(() => {
    if (userRole === "MANAGER" && !["egg_collections", "staff", "sheds", "disposed_inventory"].includes(active)) {
      setActive("egg_collections");
    }
  }, [userRole, active]);

  const title = visibleSections.flatMap((s) => s.items).find((i) => i.section === active)?.label || "Dashboard";

  const load = async () => {
    setLoading(true);
    const names = Object.keys(empty).filter(x => x !== 'disposals' && x !== 'settings');
    const responses = await Promise.all(names.map((name) => listResource(name)));
    const dispRes = await listDisposals();
    const setRes = await getSettings();
    const next = { disposals: dispRes.data, settings: setRes.data };
    names.forEach((name, index) => {
      next[name] = responses[index].data;
    });
    setData(next);
    const dash = await getDashboard();
    setDashboard(dash.data);
    setLoading(false);
  };

  useEffect(() => {
    load().catch((error) => {
      setLoading(false);
      alert(error.response?.data?.message || "Unable to load farm data");
    });
  }, []);

  const totals = useMemo(() => {
    const salesPaid = data.sales.reduce((s, x) => s + num(x.paid), 0);
    const purchasesPaid = data.purchases.reduce((s, x) => s + num(x.paid), 0);
    const dayIncome = data.daybook.filter((d) => d.kind === "income").reduce((s, x) => s + num(x.amount), 0);
    const dayExpense = data.daybook.filter((d) => d.kind === "expense").reduce((s, x) => s + num(x.amount), 0);
    const salaryPaid = data.salaries.reduce((s, x) => s + num(x.net), 0);
    const income = salesPaid + dayIncome;
    const expense = purchasesPaid + dayExpense + salaryPaid;
    return {
      income,
      expense,
      profit: income - expense,
      receivables: data.sales.reduce((s, x) => s + num(x.balance), 0),
      payables: data.purchases.reduce((s, x) => s + num(x.balance), 0),
      salaryPaid
    };
  }, [data]);

  const chartData = useMemo(() => {
    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const year = new Date().getFullYear();
    return labels.map((name, index) => {
      const inMonth = (date) => {
        const d = new Date(date);
        return d.getFullYear() === year && d.getMonth() === index;
      };
      return {
        label: name,
        income:
          data.sales.filter((x) => inMonth(x.date)).reduce((s, x) => s + num(x.paid), 0) +
          data.daybook.filter((x) => x.kind === "income" && inMonth(x.date)).reduce((s, x) => s + num(x.amount), 0),
        expenses:
          data.purchases.filter((x) => inMonth(x.date)).reduce((s, x) => s + num(x.paid), 0) +
          data.daybook.filter((x) => x.kind === "expense" && inMonth(x.date)).reduce((s, x) => s + num(x.amount), 0) +
          data.salaries.filter((x) => x.month === `${year}-${String(index + 1).padStart(2, "0")}`).reduce((s, x) => s + num(x.net), 0)
      };
    });
  }, [data]);

  const save = async (resource, payload) => {
    await createResource(resource, normalizePayload(payload));
    await load();
  };

  const update = async (resource, id, payload) => {
    await updateResource(resource, id, normalizePayload(payload));
    await load();
  };

  const remove = async (resource, id) => {
    if (!confirm("Delete this record?")) return;
    await deleteResource(resource, id);
    await load();
  };

  return (
    <AppShell
      title={title}
      activeSection={active}
      onSectionChange={setActive}
      sections={visibleSections}
    >
      {loading ? <section className="panel loading-panel">Loading farm workspace...</section> : null}
      {!loading && active === "dashboard" && (
        <DashboardView
          totals={dashboard?.metrics || totals}
          pending={dashboard?.pendingReceivables || data.sales.filter((x) => num(x.balance) > 0)}
          payables={dashboard?.outstandingPayables || data.purchases.filter((x) => num(x.balance) > 0)}
          chartData={chartData}
          inventoryLoss={data.disposals?.filter(x => x.status === 'ACTIVE').reduce((s, x) => s + num(x.total_loss), 0) || 0}
        />
      )}
      {!loading && active === "sales" && <SalesView data={data} save={save} remove={remove} />}
      {!loading && active === "purchases" && <PurchasesView data={data} save={save} remove={remove} />}
      {!loading && active === "payments" && <PaymentsView data={data} save={save} remove={remove} />}
      {!loading && active === "daybook" && <DaybookView data={data} save={save} remove={remove} />}
      {!loading && active === "egg_collections" && <EggCollectionsView data={data} save={save} remove={remove} />}
      {!loading && active === "staff" && <StaffView data={data} save={save} remove={remove} userRole={userRole} />}
      {!loading && active === "customers" && <MasterView title="Customers" resource="customers" records={data.customers} save={save} remove={remove} update={update} />}
      {!loading && active === "vendors" && <MasterView title="Vendors" resource="vendors" records={data.vendors} save={save} remove={remove} update={update} />}
      {!loading && active === "items" && <ItemsView data={data} save={save} remove={remove} update={update} />}
      {!loading && active === "sheds" && <ShedsView data={data} save={save} remove={remove} userRole={userRole} />}
      {!loading && active === "reports" && <ReportsView totals={totals} chartData={chartData} data={data} />}
      {!loading && active === "egg_reports" && <EggReportsView data={data} />}
      {!loading && active === "disposal_reports" && <DisposalReportsView data={data} />}
      {!loading && active === "disposed_inventory" && (
        <DisposedInventoryView 
          data={data} 
          saveDisposal={createDisposal} 
          updateDisposal={updateDisposal} 
          voidDisposal={deleteDisposal} 
          restoreDisposal={restoreDisposal} 
          reload={load} 
          userRole={userRole}
        />
      )}
      {!loading && active === "settings" && <SettingsView settings={data.settings} updateSettings={updateSettings} reload={load} />}
      {!loading && active === "users" && <SystemUsersView data={data} save={save} remove={remove} />}
    </AppShell>
  );
}

function normalizePayload(payload) {
  const numericKeys = new Set([
    "qty",
    "price",
    "paid",
    "total",
    "balance",
    "cost",
    "amount",
    "salary",
    "work_days",
    "present_days",
    "gross",
    "advance_deducted",
    "net",
    "capacity"
  ]);

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      numericKeys.has(key) && value === "" ? 0 : value
    ])
  );
}

function SettingsView({ settings, updateSettings, reload }) {
  const [form, setForm] = useState({ standard_egg_cost: settings?.standard_egg_cost || 0 });

  const handleSave = async () => {
    try {
      await updateSettings(form);
      await reload();
      alert("Settings saved successfully.");
    } catch (err) {
      alert(err.response?.data?.error || "Error saving settings.");
    }
  };

  return (
    <CrudPanel title="App Settings" button="" onSubmit={handleSave}>
      <div style={{ padding: '20px', maxWidth: '600px' }}>
        <Field label="Standard Egg Disposal Cost (₹)">
          <input 
            type="number" 
            step="0.01" 
            min="0" 
            value={form.standard_egg_cost} 
            onChange={e => setForm({...form, standard_egg_cost: e.target.value})} 
            required 
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Used to calculate financial loss when disposing eggs.</p>
        </Field>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '20px' }}>Save Settings</button>
      </div>
    </CrudPanel>
  );
}

function DisposedInventoryView({ data, saveDisposal, updateDisposal, voidDisposal, restoreDisposal, reload, userRole }) {
  const [tab, setTab] = useState('EGG');
  const [form, setForm] = useState({ disposal_date: today(), disposal_reason: "", quantity: "", notes: "", source_id: "" });
  
  // Egg calculations
  const totalCollected = data.egg_collections.reduce((s, x) => s + num(x.qty), 0);
  const totalSold = data.sales.filter(x => x.item_name === 'Eggs').reduce((s, x) => s + num(x.qty), 0);
  const activeEggDisposals = data.disposals.filter(x => x.disposal_type === 'EGG' && x.status === 'ACTIVE');
  const totalEggDisposed = activeEggDisposals.reduce((s, x) => s + num(x.quantity), 0);
  const availableEggs = totalCollected - totalSold - totalEggDisposed;
  const eggLoss = activeEggDisposals.reduce((s, x) => s + num(x.total_loss), 0);

  // Item calculations
  const activeItemDisposals = data.disposals.filter(x => x.disposal_type === 'PURCHASE_ITEM' && x.status === 'ACTIVE');
  const totalItemDisposed = activeItemDisposals.reduce((s, x) => s + num(x.quantity), 0);
  const itemLoss = activeItemDisposals.reduce((s, x) => s + num(x.total_loss), 0);
  
  const totalFinancialLoss = eggLoss + itemLoss;
  const totalTransactions = data.disposals.length;

  const handleSave = async () => {
    try {
      const payload = { ...form, disposal_type: tab, item_snapshot_name: tab === 'EGG' ? 'Eggs' : data.purchases.find(p => String(p.id) === String(form.source_id))?.item_name || 'Unknown Item' };
      await saveDisposal(payload);
      setForm({ disposal_date: today(), disposal_reason: "", quantity: "", notes: "", source_id: "" });
      await reload();
    } catch (err) {
      alert(err.response?.data?.error || "Error recording disposal.");
    }
  };

  const handleAction = async (action, id) => {
    if (action === 'void' && confirm("Void this disposal record?")) {
      await voidDisposal(id);
      await reload();
    } else if (action === 'restore' && confirm("Restore this disposal record?")) {
      try {
        await restoreDisposal(id);
        await reload();
      } catch (err) {
        alert(err.response?.data?.error || "Error restoring disposal.");
      }
    }
  };

  const reasons = tab === 'EGG' ? ['Broken', 'Cracked', 'Spoiled', 'Rejected', 'Quality Issue', 'Other'] : ['Damaged', 'Expired', 'Lost', 'Wastage', 'Quality Issue', 'Other'];

  return (
    <div>
      {userRole !== 'MANAGER' && (
        <section className="metric-grid" style={{ marginBottom: '24px' }}>
          <MetricCard label="Total Collected (Eggs)" value={totalCollected} tone="blue" />
          <MetricCard label="Available Stock (Eggs)" value={availableEggs} tone="green" />
          <MetricCard label="Disposed (Eggs)" value={totalEggDisposed} tone="red" helper={`Loss: ${money(eggLoss)}`} />
          
          <MetricCard label="Disposed (Items)" value={totalItemDisposed} tone="red" helper={`Loss: ${money(itemLoss)}`} />
          <MetricCard label="Total Transactions" value={totalTransactions} tone="purple" />
          <MetricCard label="Total Financial Loss" value={money(totalFinancialLoss)} tone="red" />
        </section>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button className={`btn ${tab === 'EGG' ? 'btn-primary' : ''}`} onClick={() => setTab('EGG')}>Dispose Eggs</button>
        <button className={`btn ${tab === 'PURCHASE_ITEM' ? 'btn-primary' : ''}`} onClick={() => setTab('PURCHASE_ITEM')}>Dispose Purchased Items</button>
      </div>

      <CrudPanel title={`Record ${tab === 'EGG' ? 'Egg' : 'Item'} Disposal`} button="Save Record" onSubmit={handleSave}>
        <Field label="Date"><input type="date" value={form.disposal_date} onChange={e => setForm({...form, disposal_date: e.target.value})} required /></Field>
        {tab === 'PURCHASE_ITEM' && (
          <Field label="Purchase Source">
            <select value={form.source_id} onChange={e => setForm({...form, source_id: e.target.value})} required>
              <option value="">Select Purchase Batch</option>
              {data.purchases.map(p => {
                const batchDisposed = activeItemDisposals.filter(d => String(d.source_id) === String(p.id)).reduce((s, x) => s + num(x.quantity), 0);
                const available = num(p.qty) - batchDisposed;
                return <option key={p.id} value={p.id}>{p.item_name} (Avail: {available} {p.unit}) - {p.date}</option>;
              })}
            </select>
          </Field>
        )}
        <Field label="Reason">
          <select value={form.disposal_reason} onChange={e => setForm({...form, disposal_reason: e.target.value})} required>
            <option value="">Select Reason</option>
            {reasons.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Quantity"><input type="number" min="0.01" step="any" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required /></Field>
        <Field label="Notes"><input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes" /></Field>
      </CrudPanel>

      <div style={{ marginTop: '24px' }}>
        <h3>Disposal History</h3>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Type</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Cost</th>
                <th>Loss</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.disposals.map(d => (
                <tr key={d.id} style={{ opacity: d.status === 'VOID' ? 0.6 : 1 }}>
                  <td>{d.disposal_number}</td>
                  <td>{d.disposal_date.slice(0, 10)}</td>
                  <td>{d.disposal_type}</td>
                  <td>{d.item_snapshot_name}</td>
                  <td>{d.quantity} {d.unit || ''}</td>
                  <td>{money(d.unit_cost)}</td>
                  <td>{money(d.total_loss)}</td>
                  <td>{d.disposal_reason}</td>
                  <td><strong>{d.status}</strong></td>
                  <td>
                    {d.status === 'ACTIVE' ? (
                      <button type="button" className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleAction('void', d.id)}>Void</button>
                    ) : (
                      <button type="button" className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleAction('restore', d.id)}>Restore</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DisposalReportsView({ data }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredDisposals = useMemo(() => {
    return (data.disposals || [])
      .filter(x => x.status === 'ACTIVE')
      .filter(x => (!fromDate || x.disposal_date >= fromDate) && (!toDate || x.disposal_date <= toDate));
  }, [data.disposals, fromDate, toDate]);

  const totals = useMemo(() => {
    let eggQty = 0;
    let itemQty = 0;
    let eggLoss = 0;
    let itemLoss = 0;
    filteredDisposals.forEach(d => {
      if (d.disposal_type === 'EGG') {
        eggQty += num(d.quantity);
        eggLoss += num(d.total_loss);
      } else {
        itemQty += num(d.quantity);
        itemLoss += num(d.total_loss);
      }
    });
    return { eggQty, itemQty, eggLoss, itemLoss, totalLoss: eggLoss + itemLoss };
  }, [filteredDisposals]);

  const topItems = useMemo(() => {
    const map = {};
    filteredDisposals.forEach(d => {
      map[d.item_snapshot_name] ||= { name: d.item_snapshot_name, qty: 0, loss: 0 };
      map[d.item_snapshot_name].qty += num(d.quantity);
      map[d.item_snapshot_name].loss += num(d.total_loss);
    });
    return Object.values(map).sort((a, b) => b.loss - a.loss);
  }, [filteredDisposals]);

  const topReasons = useMemo(() => {
    const map = {};
    filteredDisposals.forEach(d => {
      map[d.disposal_reason] ||= { name: d.disposal_reason, qty: 0, loss: 0 };
      map[d.disposal_reason].qty += num(d.quantity);
      map[d.disposal_reason].loss += num(d.total_loss);
    });
    return Object.values(map).sort((a, b) => b.loss - a.loss);
  }, [filteredDisposals]);

  const chartData = useMemo(() => {
    if (filteredDisposals.length === 0) return [];
    
    let minDate = "9999-12-31";
    let maxDate = "0000-01-01";
    filteredDisposals.forEach(x => {
      if (x.disposal_date < minDate) minDate = x.disposal_date;
      if (x.disposal_date > maxDate) maxDate = x.disposal_date;
    });

    const start = fromDate ? new Date(fromDate) : new Date(minDate);
    const end = toDate ? new Date(toDate) : new Date(maxDate);
    const diffDays = Math.abs(end - start) / (1000 * 60 * 60 * 24);

    const map = {};
    filteredDisposals.forEach(d => {
      const dateKey = diffDays <= 60 ? d.disposal_date : d.disposal_date.slice(0, 7);
      map[dateKey] ||= { key: dateKey, loss: 0 };
      map[dateKey].loss += num(d.total_loss);
    });

    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).map(x => {
      const d = new Date(x.key + (diffDays <= 60 ? "" : "-01"));
      return {
        label: diffDays <= 60 ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        "Financial Loss": x.loss
      };
    });
  }, [filteredDisposals, fromDate, toDate]);

  return (
    <>
      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', color: '#4f5e7b', fontWeight: '500' }}>From:</label>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '0.4rem 0.6rem', border: '1px solid #dfe5ee', borderRadius: '6px', color: '#101623' }} />
        <label style={{ fontSize: '0.85rem', color: '#4f5e7b', fontWeight: '500' }}>To:</label>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '0.4rem 0.6rem', border: '1px solid #dfe5ee', borderRadius: '6px', color: '#101623' }} />
      </div>

      <section className="metric-grid">
        <MetricCard label="Total Loss" value={money(totals.totalLoss)} tone="red" />
        <MetricCard label="Egg Loss" value={money(totals.eggLoss)} helper={`${totals.eggQty} Eggs Disposed`} tone="amber" />
        <MetricCard label="Item Loss" value={money(totals.itemLoss)} helper={`${totals.itemQty} Items Disposed`} tone="purple" />
      </section>

      {chartData.length > 0 && (
        <section className="panel chart-panel" style={{ height: "350px", marginBottom: "1.5rem" }}>
          <div className="panel-heading"><h2>Loss Trend</h2></div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dx={-10} tickFormatter={(val) => `₹${val}`} />
              <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(value) => money(value)} />
              <Bar dataKey="Financial Loss" fill="#e04b46" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      <section className="two-column">
        <section className="panel tenant-list-card">
          <div className="panel-heading"><h2>Loss by Item</h2></div>
          <Table cols={["Item", "Quantity", "Total Loss"]} rows={topItems.map((x) => <tr key={x.name}><td>{x.name}</td><td>{x.qty}</td><td>{money(x.loss)}</td></tr>)} />
        </section>
        <section className="panel tenant-list-card">
          <div className="panel-heading"><h2>Loss by Reason</h2></div>
          <Table cols={["Reason", "Quantity", "Total Loss"]} rows={topReasons.map((x) => <tr key={x.name}><td>{x.name}</td><td>{x.qty}</td><td>{money(x.loss)}</td></tr>)} />
        </section>
      </section>
    </>
  );
}

function DashboardView({ totals, pending, payables, chartData, inventoryLoss }) {
  return (
    <>
      <section className="metric-grid">
        <MetricCard label="Total Income" value={money(totals.income)} helper="Sales + misc income" tone="green" />
        <MetricCard label="Total Expenses" value={money(totals.expense)} helper="Purchases + daybook + salary" tone="red" />
        <MetricCard label="Net Profit" value={money(totals.income - totals.expense)} helper="Income - expenses" tone={totals.income >= totals.expense ? "green" : "red"} />
        <MetricCard label="Receivables" value={money(totals.receivables)} helper="Customers owe you" tone="amber" />
        <MetricCard label="Payables" value={money(totals.payables)} helper="You owe vendors" tone="amber" />
        <MetricCard label="Inventory Loss" value={money(inventoryLoss)} helper="Value of disposed items" tone="red" />
      </section>
      <section className="two-column">
        <Ledger title="Pending Receivables" subtitle="Customers who owe you" rows={pending} nameKey="customer_name" amountKey="balance" tone="amber" />
        <Ledger title="Outstanding Payables" subtitle="What you owe vendors" rows={payables} nameKey="vendor_name" amountKey="balance" tone="red" />
      </section>
      <ChartPanel chartData={chartData} />
    </>
  );
}

function Ledger({ title, subtitle, rows, nameKey, amountKey, tone }) {
  return (
    <section className="panel ledger-panel">
      <div className="panel-heading"><h2>{title}</h2><p>{subtitle}</p></div>
      <div className="ledger-list">
        {rows.length ? rows.map((row) => (
          <div className={`ledger-item ledger-${tone}`} key={row.id}>
            <div><strong>{row[nameKey]}</strong><span>{row.item_name} · {row.date}</span></div>
            <b>{money(row[amountKey])}</b>
          </div>
        )) : <div className="empty-box">All clear</div>}
      </div>
    </section>
  );
}

function ChartPanel({ chartData }) {
  return (
    <section className="panel chart-panel">
      <div className="panel-heading"><h2>Income vs Expenses — This Year</h2></div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="#dfe5ee" strokeOpacity={0.65} />
            <XAxis dataKey="label" tick={{ fill: "#8b97b0", fontSize: 11 }} axisLine={{ stroke: "#d7dee8" }} tickLine={false} />
            <YAxis tick={{ fill: "#8b97b0", fontSize: 11 }} axisLine={{ stroke: "#d7dee8" }} tickLine={false} />
            <Tooltip cursor={{ fill: "rgba(79, 156, 249, 0.08)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income" name="Income" fill="#9bd9ba" stroke="#2faa6e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#ffb4ad" stroke="#e04b46" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function SalesView({ data, save, remove }) {
  const [form, setForm] = useState({ date: today(), customer_id: "", item_id: "", qty: "", price: "", paid: "", notes: "" });
  const item = data.items.find((x) => String(x.id) === String(form.item_id));
  const customer = data.customers.find((x) => String(x.id) === String(form.customer_id));
  const total = num(form.qty) * num(form.price);
  return (
    <CrudPanel title="New Sale" button="Save Sale" onSubmit={() => save("sales", { ...form, customer_name: customer?.name, item_name: item?.name, unit: item?.unit, total, balance: total - num(form.paid) })}>
      <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></Field>
      <Field label="Customer"><select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required><option value="">Select Customer</option>{data.customers.map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Item"><select value={form.item_id} onChange={(e) => { const it = data.items.find((x) => String(x.id) === e.target.value); setForm({ ...form, item_id: e.target.value, price: it?.price || "" }); }} required><option value="">Select Item</option>{data.items.map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Qty"><input type="number" min="0" step="any" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="Quantity" required /></Field>
      <Field label="Price"><input type="number" min="0" step="any" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price" required /></Field>
      <Field label="Paid"><input type="number" min="0" step="any" value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} placeholder="Paid" required /></Field>
      <Field label="Total"><input readOnly value={money(total)} placeholder="Total" /></Field>
      <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></Field>
      <Records
        cols={["Date", "Customer", "Item", "Qty", "Total", "Paid", "Balance", ""]}
        rows={data.sales.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.customer_name}</td><td>{x.item_name}</td><td>{x.qty} {x.unit}</td><td>{money(x.total)}</td><td>{money(x.paid)}</td><td>{money(x.balance)}</td><td><button className="btn btn-danger" onClick={() => remove("sales", x.id)}>Delete</button></td></tr>)}
      />
    </CrudPanel>
  );
}

function PurchasesView({ data, save, remove }) {
  const [form, setForm] = useState({ date: today(), vendor_id: "", item_id: "", qty: "", price: "", paid: "", notes: "" });
  const item = data.items.find((x) => String(x.id) === String(form.item_id));
  const vendor = data.vendors.find((x) => String(x.id) === String(form.vendor_id));
  const cost = num(form.qty) * num(form.price);
  return (
    <CrudPanel title="New Purchase" button="Save Purchase" onSubmit={() => save("purchases", { ...form, vendor_name: vendor?.name, item_name: item?.name, unit: item?.unit, cost, balance: cost - num(form.paid) })}>
      <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></Field>
      <Field label="Vendor"><select value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} required><option value="">Select Vendor</option>{data.vendors.map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Item"><select value={form.item_id} onChange={(e) => { const it = data.items.find((x) => String(x.id) === e.target.value); setForm({ ...form, item_id: e.target.value, price: it?.price || "" }); }} required><option value="">Select Item</option>{data.items.map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Qty"><input type="number" min="0" step="any" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="Quantity" required /></Field>
      <Field label="Price"><input type="number" min="0" step="any" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price" required /></Field>
      <Field label="Paid"><input type="number" min="0" step="any" value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} placeholder="Paid" required /></Field>
      <Field label="Cost"><input readOnly value={money(cost)} placeholder="Cost" /></Field>
      <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></Field>
      <Records cols={["Date", "Vendor", "Item", "Qty", "Cost", "Paid", "Balance", ""]} rows={data.purchases.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.vendor_name}</td><td>{x.item_name}</td><td>{x.qty} {x.unit}</td><td>{money(x.cost)}</td><td>{money(x.paid)}</td><td>{money(x.balance)}</td><td><button className="btn btn-danger" onClick={() => remove("purchases", x.id)}>Delete</button></td></tr>)} />
    </CrudPanel>
  );
}

function PaymentsView({ data, save, remove }) {
  const [form, setForm] = useState({ date: today(), type: "sale", ref_id: "", amount: "", notes: "" });
  const refs = form.type === "sale" ? data.sales.filter((x) => num(x.balance) > 0) : data.purchases.filter((x) => num(x.balance) > 0);
  const ref = refs.find((x) => String(x.id) === String(form.ref_id));
  return (
    <CrudPanel title="Record Payment" button="Save Payment" onSubmit={() => save("payments", { ...form, ref_name: ref?.customer_name || ref?.vendor_name })}>
      <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></Field>
      <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, ref_id: "" })} required><option value="sale">Customer Payment</option><option value="purchase">Vendor Payment</option></select></Field>
      <Field label="Pending Bill"><select value={form.ref_id} onChange={(e) => setForm({ ...form, ref_id: e.target.value })} required><option value="">Select Bill</option>{refs.map((x) => <option value={x.id} key={x.id}>{x.customer_name || x.vendor_name} · {money(x.balance)}</option>)}</select></Field>
      <Field label="Amount"><input type="number" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount" required /></Field>
      <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></Field>
      <Records cols={["Date", "Type", "Name", "Amount", "Notes", ""]} rows={data.payments.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.type}</td><td>{x.ref_name}</td><td>{money(x.amount)}</td><td>{x.notes}</td><td><button className="btn btn-danger" onClick={() => remove("payments", x.id)}>Delete</button></td></tr>)} />
    </CrudPanel>
  );
}

function DaybookView({ data, save, remove }) {
  const [form, setForm] = useState({ date: today(), kind: "expense", category: "", amount: "", notes: "" });
  return (
    <CrudPanel title="Day Book Entry" button="Save Entry" onSubmit={() => save("daybook", form)}>
      <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></Field>
      <Field label="Kind"><select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} required><option value="income">Income</option><option value="expense">Expense</option></select></Field>
      <Field label="Category"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Transport, medicine, misc..." required /></Field>
      <Field label="Amount"><input type="number" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount" required /></Field>
      <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></Field>
      <Records cols={["Date", "Kind", "Category", "Amount", "Notes", ""]} rows={data.daybook.map((x) => <tr key={x.id}><td>{x.date}</td><td><span className={`badge ${x.kind === "income" ? "badge-green" : "badge-red"}`}>{x.kind}</span></td><td>{x.category}</td><td>{money(x.amount)}</td><td>{x.notes}</td><td><button className="btn btn-danger" onClick={() => remove("daybook", x.id)}>Delete</button></td></tr>)} />
    </CrudPanel>
  );
}

function StaffView({ data, save, remove, userRole }) {
  const [staff, setStaff] = useState({ name: "", phone: "", role_title: "", salary: "", join_date: today(), status: "ACTIVE" });
  const [attendance, setAttendance] = useState({ staff_id: "", date: today(), status: "PRESENT", work_days: "1", notes: "" });
  const [advance, setAdvance] = useState({ staff_id: "", date: today(), amount: "", notes: "" });
  const [salary, setSalary] = useState({ staff_id: "", month: month(), work_days: "", present_days: "", gross: "", advance_deducted: "", date: today(), notes: "" });
  const staffMember = data.staff.find((x) => String(x.id) === String(salary.staff_id));
  const attMember = data.staff.find((x) => String(x.id) === String(attendance.staff_id));
  const advMember = data.staff.find((x) => String(x.id) === String(advance.staff_id));

  const attendanceSummary = (staffId, salaryMonth) => {
    const rows = data.attendance.filter((row) =>
      String(row.staff_id) === String(staffId) &&
      row.date?.startsWith(salaryMonth)
    );
    return {
      workDays: rows.reduce((sum, row) => sum + num(row.work_days), 0),
      presentDays: rows.reduce((sum, row) => sum + (row.status === "ABSENT" ? 0 : num(row.work_days)), 0)
    };
  };

  const updateSalaryStaff = (staffId, salaryMonth = salary.month) => {
    const selected = data.staff.find((x) => String(x.id) === String(staffId));
    const summary = attendanceSummary(staffId, salaryMonth);
    setSalary({
      ...salary,
      staff_id: staffId,
      month: salaryMonth,
      gross: selected?.salary || "",
      work_days: summary.workDays || "",
      present_days: summary.presentDays || ""
    });
  };

  return (
    <>
      {userRole !== "MANAGER" && (
        <CrudPanel title="Staff Member" button="Add Staff" onSubmit={() => save("staff", staff)}>
          <Field label="Name"><input value={staff.name} onChange={(e) => setStaff({ ...staff, name: e.target.value })} placeholder="Full name" required /></Field>
          <Field label="Phone"><input type="tel" pattern="[0-9]{10}" title="10-digit phone number" value={staff.phone} onChange={(e) => setStaff({ ...staff, phone: e.target.value })} placeholder="Phone number" required /></Field>
          <Field label="Role"><input value={staff.role_title} onChange={(e) => setStaff({ ...staff, role_title: e.target.value })} placeholder="Job title" required /></Field>
          <Field label="Salary"><input type="number" min="0" step="any" value={staff.salary} onChange={(e) => setStaff({ ...staff, salary: e.target.value })} placeholder="Monthly salary" required /></Field>
          <Field label="Join Date"><input type="date" value={staff.join_date} onChange={(e) => setStaff({ ...staff, join_date: e.target.value })} required /></Field>
        </CrudPanel>
      )}
      <CrudPanel title="Attendance" button="Mark Attendance" onSubmit={() => save("attendance", { ...attendance, staff_name: attMember?.name })}>
        <StaffSelect data={data.staff} value={attendance.staff_id} onChange={(v) => setAttendance({ ...attendance, staff_id: v })} />
        <Field label="Date"><input type="date" value={attendance.date} onChange={(e) => setAttendance({ ...attendance, date: e.target.value })} required /></Field>
        <Field label="Status"><select value={attendance.status} onChange={(e) => setAttendance({ ...attendance, status: e.target.value, work_days: e.target.value === "HALF_DAY" ? "0.5" : e.target.value === "ABSENT" ? "0" : "1" })} required><option value="PRESENT">Present</option><option value="HALF_DAY">Half Day</option><option value="ABSENT">Absent</option><option value="PAID_LEAVE">Paid Leave</option></select></Field>
        <Field label="Working Days"><input type="number" step="0.5" min="0" value={attendance.work_days} onChange={(e) => setAttendance({ ...attendance, work_days: e.target.value })} placeholder="Work days" required /></Field>
        <Field label="Notes"><input value={attendance.notes} onChange={(e) => setAttendance({ ...attendance, notes: e.target.value })} placeholder="Optional notes" /></Field>
      </CrudPanel>
      {userRole !== "MANAGER" && (
        <div className="two-column">
          <CrudPanel title="Advance" button="Record Advance" onSubmit={() => save("advances", { ...advance, staff_name: advMember?.name })}>
            <StaffSelect data={data.staff} value={advance.staff_id} onChange={(v) => setAdvance({ ...advance, staff_id: v })} />
            <Field label="Date"><input type="date" value={advance.date} onChange={(e) => setAdvance({ ...advance, date: e.target.value })} required /></Field>
            <Field label="Amount"><input type="number" min="0" step="any" value={advance.amount} onChange={(e) => setAdvance({ ...advance, amount: e.target.value })} placeholder="Amount" required /></Field>
            <Field label="Notes"><input value={advance.notes} onChange={(e) => setAdvance({ ...advance, notes: e.target.value })} placeholder="Optional notes" /></Field>
          </CrudPanel>
          <CrudPanel title="Salary Payment" button="Pay Salary" onSubmit={() => save("salaries", { ...salary, staff_name: staffMember?.name, gross: salary.gross || staffMember?.salary })}>
            <StaffSelect data={data.staff} value={salary.staff_id} onChange={(v) => updateSalaryStaff(v)} />
            <Field label="Month"><input type="month" value={salary.month} onChange={(e) => updateSalaryStaff(salary.staff_id, e.target.value)} required /></Field>
            <Field label="Working Days"><input type="number" step="0.5" min="0" value={salary.work_days} onChange={(e) => setSalary({ ...salary, work_days: e.target.value })} placeholder="Work days" required /></Field>
            <Field label="Present Days"><input type="number" step="0.5" min="0" value={salary.present_days} onChange={(e) => setSalary({ ...salary, present_days: e.target.value })} placeholder="Present days" required /></Field>
            <Field label="Gross"><input type="number" min="0" step="any" value={salary.gross} onChange={(e) => setSalary({ ...salary, gross: e.target.value })} placeholder="Gross salary" required /></Field>
            <Field label="Advance Deducted"><input type="number" min="0" step="any" value={salary.advance_deducted} onChange={(e) => setSalary({ ...salary, advance_deducted: e.target.value })} placeholder="Deductions" required /></Field>
            <Field label="Net"><input readOnly value={money(num(salary.gross) - num(salary.advance_deducted))} placeholder="Net salary" /></Field>
          </CrudPanel>
        </div>
      )}
      {userRole !== "MANAGER" && <Records cols={["Name", "Role", "Phone", "Salary", "Status", ""]} rows={data.staff.map((x) => <tr key={x.id}><td>{x.name}</td><td>{x.role_title}</td><td>{x.phone}</td><td>{money(x.salary)}</td><td><span className="badge badge-green">{x.status}</span></td><td><button className="btn btn-danger" onClick={() => remove("staff", x.id)}>Delete</button></td></tr>)} />}
      <Records cols={userRole === "MANAGER" ? ["Date", "Staff", "Status", "Working Days", "Notes"] : ["Date", "Staff", "Status", "Working Days", "Notes", ""]} rows={data.attendance.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.staff_name}</td><td><span className={x.status === "ABSENT" ? "badge badge-red" : "badge badge-green"}>{x.status?.replace("_", " ")}</span></td><td>{x.work_days}</td><td>{x.notes}</td>{userRole !== "MANAGER" && <td><button className="btn btn-danger" onClick={() => remove("attendance", x.id)}>Delete</button></td>}</tr>)} />
      {userRole !== "MANAGER" && <Records cols={["Date", "Staff", "Month", "Days", "Gross", "Deducted", "Net", ""]} rows={data.salaries.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.staff_name}</td><td>{x.month}</td><td>{x.present_days}/{x.work_days}</td><td>{money(x.gross)}</td><td>{money(x.advance_deducted)}</td><td>{money(x.net)}</td><td><button className="btn btn-danger" onClick={() => remove("salaries", x.id)}>Delete</button></td></tr>)} />}
    </>
  );
}

function StaffSelect({ data, value, onChange }) {
  return <Field label="Staff"><select value={value} onChange={(e) => onChange(e.target.value)} required><option value="">Select Staff</option>{data.map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></Field>;
}

function MasterView({ title, resource, records, save, remove, update }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  const filteredRecords = records.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async () => {
    if (editId) {
      await update(resource, editId, form);
      setEditId(null);
    } else {
      await save(resource, form);
    }
    setForm({ name: "", phone: "", email: "", address: "" });
  };

  const handleEdit = (record) => {
    setEditId(record.id);
    setForm({ name: record.name, phone: record.phone || "", email: record.email || "", address: record.address || "" });
  };

  return (
    <CrudPanel title={editId ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`} button={editId ? `Update ${title.slice(0, -1)}` : `Save ${title.slice(0, -1)}`} onSubmit={handleSubmit}>
      <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" required /></Field>
      <Field label="Phone"><input type="tel" pattern="[0-9]{10}" title="10-digit phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" /></Field>
      <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" /></Field>
      <Field label="Address"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" /></Field>
      {editId && <Field label="Actions"><button type="button" className="btn" onClick={() => { setEditId(null); setForm({ name: "", phone: "", email: "", address: "" }); }}>Cancel Edit</button></Field>}
      
      <Records 
        headerRight={<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}...`} style={{ padding: '0.4rem 0.8rem', border: '1px solid #dfe5ee', borderRadius: '6px', width: '250px' }} />}
        cols={["Name", "Phone", "Email", "Address", ""]} 
        rows={filteredRecords.map((x) => <tr key={x.id}><td>{x.name}</td><td>{x.phone}</td><td>{x.email}</td><td>{x.address}</td><td><div style={{display:'flex',gap:'0.5rem'}}><button className="btn" onClick={() => handleEdit(x)}>Edit</button><button className="btn btn-danger" onClick={() => remove(resource, x.id)}>Delete</button></div></td></tr>)} 
      />
    </CrudPanel>
  );
}

function ItemsView({ data, save, remove, update }) {
  const [form, setForm] = useState({ name: "", unit: "kg", price: "" });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  const filteredItems = data.items.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async () => {
    if (editId) {
      await update("items", editId, form);
      setEditId(null);
    } else {
      await save("items", form);
    }
    setForm({ name: "", unit: "kg", price: "" });
  };

  const handleEdit = (record) => {
    setEditId(record.id);
    setForm({ name: record.name, unit: record.unit, price: record.price });
  };

  return (
    <CrudPanel title={editId ? "Edit Item" : "New Item"} button={editId ? "Update Item" : "Save Item"} onSubmit={handleSubmit}>
      <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" required /></Field>
      <Field label="Unit"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. kg, liters, tray" required /></Field>
      <Field label="Default Price"><input type="number" min="0" step="any" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Default price" required /></Field>
      {editId && <Field label="Actions"><button type="button" className="btn" onClick={() => { setEditId(null); setForm({ name: "", unit: "kg", price: "" }); }}>Cancel Edit</button></Field>}
      
      <Records 
        headerRight={<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." style={{ padding: '0.4rem 0.8rem', border: '1px solid #dfe5ee', borderRadius: '6px', width: '250px' }} />}
        cols={["Name", "Unit", "Default Price", ""]} 
        rows={filteredItems.map((x) => <tr key={x.id}><td>{x.name}</td><td>{x.unit}</td><td>{money(x.price)}</td><td><div style={{display:'flex',gap:'0.5rem'}}><button className="btn" onClick={() => handleEdit(x)}>Edit</button><button className="btn btn-danger" onClick={() => remove("items", x.id)}>Delete</button></div></td></tr>)} 
      />
    </CrudPanel>
  );
}

function ShedsView({ data, save, remove, userRole }) {
  const [form, setForm] = useState({ name: "", capacity: "" });
  return (
    <CrudPanel title="New Shed" button="Save Shed" onSubmit={() => save("sheds", form)}>
      <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Shed name" required /></Field>
      <Field label="Capacity"><input type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="Capacity" required /></Field>
      <Records cols={userRole === "MANAGER" ? ["Name", "Capacity"] : ["Name", "Capacity", ""]} rows={data.sheds.map((x) => <tr key={x.id}><td>{x.name}</td><td>{x.capacity}</td>{userRole !== "MANAGER" && <td><button className="btn btn-danger" onClick={() => remove("sheds", x.id)}>Delete</button></td>}</tr>)} />
    </CrudPanel>
  );
}

function EggCollectionsView({ data, save, remove }) {
  const [form, setForm] = useState({ date: today(), shed_id: "", qty: "", notes: "" });
  const shed = data.sheds.find((x) => String(x.id) === String(form.shed_id));
  return (
    <CrudPanel title="New Eggs Collection" button="Save Collection" onSubmit={() => save("egg_collections", { ...form, shed_name: shed?.name })}>
      <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></Field>
      <Field label="Shed"><select value={form.shed_id} onChange={(e) => setForm({ ...form, shed_id: e.target.value })} required><option value="">Select Shed</option>{data.sheds.map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Quantity"><input type="number" min="0" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="Eggs collected" required /></Field>
      <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></Field>
      <Records cols={["Date", "Shed", "Quantity", "Notes", ""]} rows={data.egg_collections.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.shed_name}</td><td>{x.qty}</td><td>{x.notes}</td><td><button className="btn btn-danger" onClick={() => remove("egg_collections", x.id)}>Delete</button></td></tr>)} />
    </CrudPanel>
  );
}

function ReportsView({ totals: defaultTotals, chartData, data }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredSales = useMemo(() => data.sales.filter(x => (!fromDate || x.date >= fromDate) && (!toDate || x.date <= toDate)), [data.sales, fromDate, toDate]);
  const filteredPurchases = useMemo(() => data.purchases.filter(x => (!fromDate || x.date >= fromDate) && (!toDate || x.date <= toDate)), [data.purchases, fromDate, toDate]);
  const filteredDaybook = useMemo(() => data.daybook.filter(x => (!fromDate || x.date >= fromDate) && (!toDate || x.date <= toDate)), [data.daybook, fromDate, toDate]);

  const totals = useMemo(() => {
    if (!fromDate && !toDate) return defaultTotals;
    const salesPaid = filteredSales.reduce((s, x) => s + num(x.paid), 0);
    const purchasesPaid = filteredPurchases.reduce((s, x) => s + num(x.paid), 0);
    const dayIncome = filteredDaybook.filter((d) => d.kind === "income").reduce((s, x) => s + num(x.amount), 0);
    const dayExpense = filteredDaybook.filter((d) => d.kind === "expense").reduce((s, x) => s + num(x.amount), 0);
    const income = salesPaid + dayIncome;
    const expense = purchasesPaid + dayExpense;
    return {
      income,
      expense,
      profit: income - expense,
      receivables: filteredSales.reduce((s, x) => s + num(x.balance), 0),
      payables: filteredPurchases.reduce((s, x) => s + num(x.balance), 0),
    };
  }, [filteredSales, filteredPurchases, filteredDaybook, defaultTotals, fromDate, toDate]);

  const topCustomers = Object.values(filteredSales.reduce((acc, row) => {
    acc[row.customer_name] ||= { name: row.customer_name, total: 0, balance: 0 };
    acc[row.customer_name].total += num(row.total);
    acc[row.customer_name].balance += num(row.balance);
    return acc;
  }, {}));
  const topVendors = Object.values(filteredPurchases.reduce((acc, row) => {
    acc[row.vendor_name] ||= { name: row.vendor_name, total: 0, balance: 0 };
    acc[row.vendor_name].total += num(row.cost);
    acc[row.vendor_name].balance += num(row.balance);
    return acc;
  }, {}));

  const dynamicChartData = useMemo(() => {
    if (!fromDate && !toDate) return chartData;

    let minDate = "9999-12-31";
    let maxDate = "0000-01-01";
    const checkDate = (d) => { if(d) { if(d < minDate) minDate = d; if(d > maxDate) maxDate = d; } };
    
    filteredSales.forEach(x => checkDate(x.date));
    filteredPurchases.forEach(x => checkDate(x.date));

    const start = fromDate ? new Date(fromDate) : new Date(minDate === "9999-12-31" ? Date.now() : minDate);
    const end = toDate ? new Date(toDate) : new Date(maxDate === "0000-01-01" ? Date.now() : maxDate);
    const diffDays = Math.abs(end - start) / (1000 * 60 * 60 * 24);

    const map = {};
    const add = (date, key, val) => {
      if (!date) return;
      const l = diffDays <= 60 ? date : date.slice(0, 7);
      map[l] ||= { key: l, income: 0, expenses: 0 };
      map[l][key] += num(val);
    };

    filteredSales.forEach(x => add(x.date, 'income', x.paid));
    filteredDaybook.filter(x => x.kind === 'income').forEach(x => add(x.date, 'income', x.amount));
    filteredPurchases.forEach(x => add(x.date, 'expenses', x.paid));
    filteredDaybook.filter(x => x.kind === 'expense').forEach(x => add(x.date, 'expenses', x.amount));

    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).map(x => {
       const d = new Date(x.key + (diffDays <= 60 ? "" : "-01"));
       return {
         label: diffDays <= 60 ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
         income: x.income,
         expenses: x.expenses
       };
    });
  }, [filteredSales, filteredPurchases, filteredDaybook, chartData, fromDate, toDate]);

  return (
    <>
      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', color: '#4f5e7b', fontWeight: '500' }}>From:</label>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '0.4rem 0.6rem', border: '1px solid #dfe5ee', borderRadius: '6px', color: '#101623' }} />
        <label style={{ fontSize: '0.85rem', color: '#4f5e7b', fontWeight: '500' }}>To:</label>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '0.4rem 0.6rem', border: '1px solid #dfe5ee', borderRadius: '6px', color: '#101623' }} />
      </div>
      <section className="metric-grid super-grid">
        <MetricCard label="Income" value={money(totals.income)} tone="green" />
        <MetricCard label="Expenses" value={money(totals.expense)} tone="red" />
        <MetricCard label="Profit" value={money(totals.profit)} tone={totals.profit >= 0 ? "green" : "red"} />
        <MetricCard label="Receivables" value={money(totals.receivables)} tone="amber" />
      </section>
      <ChartPanel chartData={dynamicChartData} />
      <section className="two-column">
        <section className="panel tenant-list-card"><div className="panel-heading"><h2>Customer Summary</h2></div><Table cols={["Customer", "Total", "Balance"]} rows={topCustomers.map((x) => <tr key={x.name}><td>{x.name}</td><td>{money(x.total)}</td><td>{money(x.balance)}</td></tr>)} /></section>
        <section className="panel tenant-list-card"><div className="panel-heading"><h2>Vendor Summary</h2></div><Table cols={["Vendor", "Total", "Balance"]} rows={topVendors.map((x) => <tr key={x.name}><td>{x.name}</td><td>{money(x.total)}</td><td>{money(x.balance)}</td></tr>)} /></section>
      </section>
    </>
  );
}

function CrudPanel({ title, button, onSubmit, children }) {
  const kids = Array.isArray(children) ? children : [children];
  const records = kids.find((child) => child?.type === Records);
  const fields = kids.filter((child) => child?.type !== Records);
  return (
    <>
      <section className="panel form-panel">
        <div className="panel-heading"><h2>{title}</h2><p>Enter the details and save the record.</p></div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <div className="erp-form-grid">{fields}</div>
          <button className="primary-btn" type="submit"><Plus size={17} />{button}</button>
        </form>
      </section>
      {records}
    </>
  );
}

function Records({ cols, rows, headerRight }) {
  return (
    <section className="panel tenant-list-card records-panel">
      {headerRight && <div className="panel-heading" style={{ justifyContent: 'flex-end', paddingBottom: '1rem', paddingTop: '1.5rem', paddingRight: '1.5rem' }}>{headerRight}</div>}
      <Table cols={cols} rows={rows} />
    </section>
  );
}

function SystemUsersView({ data, save, remove }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", role: "MANAGER", password: "" });

  return (
    <CrudPanel title="New System User" button="Create User" onSubmit={() => save("users", form)}>
      <Field label="Full Name"><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" required /></Field>
      <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" required /></Field>
      <Field label="Phone"><input type="tel" pattern="[0-9]{10}" title="10-digit phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" /></Field>
      <Field label="Role"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option></select></Field>
      <Field label="Password"><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" required minLength={6} /></Field>
      <Records cols={["Name", "Email", "Role", ""]} rows={data.users.map((x) => <tr key={x.id}><td>{x.full_name}</td><td>{x.email}</td><td><span className="badge badge-green">{x.role}</span></td><td><button className="btn btn-danger" onClick={() => remove("users", x.id)}>Revoke</button></td></tr>)} />
    </CrudPanel>
  );
}

function EggReportsView({ data }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredEggs = useMemo(() => data.egg_collections.filter(x => (!fromDate || x.date >= fromDate) && (!toDate || x.date <= toDate)), [data.egg_collections, fromDate, toDate]);

  const totalEggs = filteredEggs.reduce((sum, row) => sum + num(row.qty), 0);
  const shedSummary = Object.values(filteredEggs.reduce((acc, row) => {
    acc[row.shed_name] ||= { name: row.shed_name || "Unknown Shed", eggs: 0 };
    acc[row.shed_name].eggs += num(row.qty);
    return acc;
  }, {})).sort((a, b) => b.eggs - a.eggs);

  const topShed = shedSummary[0] || { name: "N/A", eggs: 0 };

  const chartData = shedSummary.map(x => ({ name: x.name, eggs: x.eggs }));

  return (
    <>
      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', color: '#4f5e7b', fontWeight: '500' }}>From:</label>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '0.4rem 0.6rem', border: '1px solid #dfe5ee', borderRadius: '6px', color: '#101623' }} />
        <label style={{ fontSize: '0.85rem', color: '#4f5e7b', fontWeight: '500' }}>To:</label>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '0.4rem 0.6rem', border: '1px solid #dfe5ee', borderRadius: '6px', color: '#101623' }} />
      </div>
      <section className="metric-grid super-grid">
        <MetricCard label="Total Eggs Collected" value={totalEggs} tone="purple" />
        <MetricCard label="Top Shed" value={topShed.name} helper={`${topShed.eggs} eggs`} tone="green" />
        <MetricCard label="Total Collections" value={filteredEggs.length} tone="amber" />
      </section>
      <section className="panel chart-panel">
        <div className="panel-heading"><h2>Eggs per Shed</h2></div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="#dfe5ee" strokeOpacity={0.65} />
              <XAxis dataKey="name" tick={{ fill: "#8b97b0", fontSize: 11 }} axisLine={{ stroke: "#d7dee8" }} tickLine={false} />
              <YAxis tick={{ fill: "#8b97b0", fontSize: 11 }} axisLine={{ stroke: "#d7dee8" }} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(79, 156, 249, 0.08)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="eggs" name="Eggs Collected" fill="#8884d8" stroke="#6864bd" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel tenant-list-card">
        <div className="panel-heading"><h2>Shed Summary</h2></div>
        <Table cols={["Shed Name", "Total Eggs"]} rows={shedSummary.map(x => <tr key={x.name}><td>{x.name}</td><td>{x.eggs}</td></tr>)} />
      </section>
    </>
  );
}

export default AdminDashboard;
