import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChartNoAxesColumn,
  CreditCard,
  LayoutDashboard,
  Package,
  Plus,
  ShoppingCart,
  Tag,
  UserRound,
  Users
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
  listResource
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
      { label: "Day Book", section: "daybook", icon: BookOpen }
    ]
  },
  { title: "Staff", items: [{ label: "Staff & Salary", section: "staff", icon: Users }] },
  {
    title: "Master Data",
    items: [
      { label: "Customers", section: "customers", icon: UserRound },
      { label: "Vendors", section: "vendors", icon: UserRound },
      { label: "Items", section: "items", icon: Package }
    ]
  },
  { title: "Analytics", items: [{ label: "Reports", section: "reports", icon: ChartNoAxesColumn }] }
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
  attendance: []
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
  return (
    <label className="form-field">
      <span>{label}</span>
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

  const title = sections.flatMap((s) => s.items).find((i) => i.section === active)?.label || "Dashboard";

  const load = async () => {
    setLoading(true);
    const names = Object.keys(empty);
    const responses = await Promise.all(names.map((name) => listResource(name)));
    const next = {};
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
        month: name,
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
      sections={sections}
    >
      {loading ? <section className="panel loading-panel">Loading farm workspace...</section> : null}
      {!loading && active === "dashboard" && (
        <DashboardView
          totals={dashboard?.metrics || totals}
          pending={dashboard?.pendingReceivables || data.sales.filter((x) => num(x.balance) > 0)}
          payables={dashboard?.outstandingPayables || data.purchases.filter((x) => num(x.balance) > 0)}
          chartData={chartData}
        />
      )}
      {!loading && active === "sales" && <SalesView data={data} save={save} remove={remove} />}
      {!loading && active === "purchases" && <PurchasesView data={data} save={save} remove={remove} />}
      {!loading && active === "payments" && <PaymentsView data={data} save={save} remove={remove} />}
      {!loading && active === "daybook" && <DaybookView data={data} save={save} remove={remove} />}
      {!loading && active === "staff" && <StaffView data={data} save={save} remove={remove} />}
      {!loading && active === "customers" && <MasterView title="Customers" resource="customers" records={data.customers} save={save} remove={remove} />}
      {!loading && active === "vendors" && <MasterView title="Vendors" resource="vendors" records={data.vendors} save={save} remove={remove} />}
      {!loading && active === "items" && <ItemsView data={data} save={save} remove={remove} />}
      {!loading && active === "reports" && <ReportsView totals={totals} chartData={chartData} data={data} />}
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
    "net"
  ]);

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      numericKeys.has(key) && value === "" ? 0 : value
    ])
  );
}

function DashboardView({ totals, pending, payables, chartData }) {
  return (
    <>
      <section className="metric-grid">
        <MetricCard label="Total Income" value={money(totals.income)} helper="Sales + misc income" tone="green" />
        <MetricCard label="Total Expenses" value={money(totals.expense)} helper="Purchases + daybook + salary" tone="red" />
        <MetricCard label="Net Profit" value={money(totals.income - totals.expense)} helper="Income - expenses" tone={totals.income >= totals.expense ? "green" : "red"} />
        <MetricCard label="Receivables" value={money(totals.receivables)} helper="Customers owe you" tone="amber" />
        <MetricCard label="Payables" value={money(totals.payables)} helper="You owe vendors" tone="amber" />
        <MetricCard label="Salary Paid" value={money(totals.salaryPaid)} helper="All staff, all time" tone="purple" />
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
            <XAxis dataKey="month" tick={{ fill: "#8b97b0", fontSize: 11 }} axisLine={{ stroke: "#d7dee8" }} tickLine={false} />
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
      <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
      <Field label="Customer"><select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}><option value="">Select</option>{data.customers.map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Item"><select value={form.item_id} onChange={(e) => { const it = data.items.find((x) => String(x.id) === e.target.value); setForm({ ...form, item_id: e.target.value, price: it?.price || "" }); }}><option value="">Select</option>{data.items.map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Qty"><input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
      <Field label="Price"><input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
      <Field label="Paid"><input value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} /></Field>
      <Field label="Total"><input readOnly value={money(total)} /></Field>
      <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
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
      <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
      <Field label="Vendor"><select value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}><option value="">Select</option>{data.vendors.map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Item"><select value={form.item_id} onChange={(e) => { const it = data.items.find((x) => String(x.id) === e.target.value); setForm({ ...form, item_id: e.target.value, price: it?.price || "" }); }}><option value="">Select</option>{data.items.map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Qty"><input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
      <Field label="Price"><input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
      <Field label="Paid"><input value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} /></Field>
      <Field label="Cost"><input readOnly value={money(cost)} /></Field>
      <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
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
      <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
      <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, ref_id: "" })}><option value="sale">Customer Payment</option><option value="purchase">Vendor Payment</option></select></Field>
      <Field label="Pending Bill"><select value={form.ref_id} onChange={(e) => setForm({ ...form, ref_id: e.target.value })}><option value="">Select</option>{refs.map((x) => <option value={x.id} key={x.id}>{x.customer_name || x.vendor_name} · {money(x.balance)}</option>)}</select></Field>
      <Field label="Amount"><input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
      <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      <Records cols={["Date", "Type", "Name", "Amount", "Notes", ""]} rows={data.payments.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.type}</td><td>{x.ref_name}</td><td>{money(x.amount)}</td><td>{x.notes}</td><td><button className="btn btn-danger" onClick={() => remove("payments", x.id)}>Delete</button></td></tr>)} />
    </CrudPanel>
  );
}

function DaybookView({ data, save, remove }) {
  const [form, setForm] = useState({ date: today(), kind: "expense", category: "", amount: "", notes: "" });
  return (
    <CrudPanel title="Day Book Entry" button="Save Entry" onSubmit={() => save("daybook", form)}>
      <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
      <Field label="Kind"><select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="income">Income</option><option value="expense">Expense</option></select></Field>
      <Field label="Category"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Transport, medicine, misc..." /></Field>
      <Field label="Amount"><input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
      <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      <Records cols={["Date", "Kind", "Category", "Amount", "Notes", ""]} rows={data.daybook.map((x) => <tr key={x.id}><td>{x.date}</td><td><span className={`badge ${x.kind === "income" ? "badge-green" : "badge-red"}`}>{x.kind}</span></td><td>{x.category}</td><td>{money(x.amount)}</td><td>{x.notes}</td><td><button className="btn btn-danger" onClick={() => remove("daybook", x.id)}>Delete</button></td></tr>)} />
    </CrudPanel>
  );
}

function StaffView({ data, save, remove }) {
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
      <CrudPanel title="Staff Member" button="Add Staff" onSubmit={() => save("staff", staff)}>
        <Field label="Name"><input value={staff.name} onChange={(e) => setStaff({ ...staff, name: e.target.value })} /></Field>
        <Field label="Phone"><input value={staff.phone} onChange={(e) => setStaff({ ...staff, phone: e.target.value })} /></Field>
        <Field label="Role"><input value={staff.role_title} onChange={(e) => setStaff({ ...staff, role_title: e.target.value })} /></Field>
        <Field label="Salary"><input value={staff.salary} onChange={(e) => setStaff({ ...staff, salary: e.target.value })} /></Field>
        <Field label="Join Date"><input type="date" value={staff.join_date} onChange={(e) => setStaff({ ...staff, join_date: e.target.value })} /></Field>
      </CrudPanel>
      <CrudPanel title="Attendance" button="Mark Attendance" onSubmit={() => save("attendance", { ...attendance, staff_name: attMember?.name })}>
        <StaffSelect data={data.staff} value={attendance.staff_id} onChange={(v) => setAttendance({ ...attendance, staff_id: v })} />
        <Field label="Date"><input type="date" value={attendance.date} onChange={(e) => setAttendance({ ...attendance, date: e.target.value })} /></Field>
        <Field label="Status"><select value={attendance.status} onChange={(e) => setAttendance({ ...attendance, status: e.target.value, work_days: e.target.value === "HALF_DAY" ? "0.5" : e.target.value === "ABSENT" ? "0" : "1" })}><option value="PRESENT">Present</option><option value="HALF_DAY">Half Day</option><option value="ABSENT">Absent</option><option value="PAID_LEAVE">Paid Leave</option></select></Field>
        <Field label="Working Days"><input value={attendance.work_days} onChange={(e) => setAttendance({ ...attendance, work_days: e.target.value })} /></Field>
        <Field label="Notes"><input value={attendance.notes} onChange={(e) => setAttendance({ ...attendance, notes: e.target.value })} /></Field>
      </CrudPanel>
      <div className="two-column">
        <CrudPanel title="Advance" button="Record Advance" onSubmit={() => save("advances", { ...advance, staff_name: advMember?.name })}>
          <StaffSelect data={data.staff} value={advance.staff_id} onChange={(v) => setAdvance({ ...advance, staff_id: v })} />
          <Field label="Date"><input type="date" value={advance.date} onChange={(e) => setAdvance({ ...advance, date: e.target.value })} /></Field>
          <Field label="Amount"><input value={advance.amount} onChange={(e) => setAdvance({ ...advance, amount: e.target.value })} /></Field>
          <Field label="Notes"><input value={advance.notes} onChange={(e) => setAdvance({ ...advance, notes: e.target.value })} /></Field>
        </CrudPanel>
        <CrudPanel title="Salary Payment" button="Pay Salary" onSubmit={() => save("salaries", { ...salary, staff_name: staffMember?.name, gross: salary.gross || staffMember?.salary })}>
          <StaffSelect data={data.staff} value={salary.staff_id} onChange={(v) => updateSalaryStaff(v)} />
          <Field label="Month"><input type="month" value={salary.month} onChange={(e) => updateSalaryStaff(salary.staff_id, e.target.value)} /></Field>
          <Field label="Working Days"><input value={salary.work_days} onChange={(e) => setSalary({ ...salary, work_days: e.target.value })} /></Field>
          <Field label="Present Days"><input value={salary.present_days} onChange={(e) => setSalary({ ...salary, present_days: e.target.value })} /></Field>
          <Field label="Gross"><input value={salary.gross} onChange={(e) => setSalary({ ...salary, gross: e.target.value })} /></Field>
          <Field label="Advance Deducted"><input value={salary.advance_deducted} onChange={(e) => setSalary({ ...salary, advance_deducted: e.target.value })} /></Field>
          <Field label="Net"><input readOnly value={money(num(salary.gross) - num(salary.advance_deducted))} /></Field>
        </CrudPanel>
      </div>
      <Records cols={["Name", "Role", "Phone", "Salary", "Status", ""]} rows={data.staff.map((x) => <tr key={x.id}><td>{x.name}</td><td>{x.role_title}</td><td>{x.phone}</td><td>{money(x.salary)}</td><td><span className="badge badge-green">{x.status}</span></td><td><button className="btn btn-danger" onClick={() => remove("staff", x.id)}>Delete</button></td></tr>)} />
      <Records cols={["Date", "Staff", "Status", "Working Days", "Notes", ""]} rows={data.attendance.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.staff_name}</td><td><span className={x.status === "ABSENT" ? "badge badge-red" : "badge badge-green"}>{x.status?.replace("_", " ")}</span></td><td>{x.work_days}</td><td>{x.notes}</td><td><button className="btn btn-danger" onClick={() => remove("attendance", x.id)}>Delete</button></td></tr>)} />
      <Records cols={["Date", "Staff", "Month", "Days", "Gross", "Deducted", "Net", ""]} rows={data.salaries.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.staff_name}</td><td>{x.month}</td><td>{x.present_days}/{x.work_days}</td><td>{money(x.gross)}</td><td>{money(x.advance_deducted)}</td><td>{money(x.net)}</td><td><button className="btn btn-danger" onClick={() => remove("salaries", x.id)}>Delete</button></td></tr>)} />
    </>
  );
}

function StaffSelect({ data, value, onChange }) {
  return <Field label="Staff"><select value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select</option>{data.map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></Field>;
}

function MasterView({ title, resource, records, save, remove }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  return (
    <CrudPanel title={`New ${title.slice(0, -1)}`} button={`Save ${title.slice(0, -1)}`} onSubmit={() => save(resource, form)}>
      <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Email"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Address"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
      <Records cols={["Name", "Phone", "Email", "Address", ""]} rows={records.map((x) => <tr key={x.id}><td>{x.name}</td><td>{x.phone}</td><td>{x.email}</td><td>{x.address}</td><td><button className="btn btn-danger" onClick={() => remove(resource, x.id)}>Delete</button></td></tr>)} />
    </CrudPanel>
  );
}

function ItemsView({ data, save, remove }) {
  const [form, setForm] = useState({ name: "", unit: "kg", price: "" });
  return (
    <CrudPanel title="New Item" button="Save Item" onSubmit={() => save("items", form)}>
      <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Unit"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
      <Field label="Default Price"><input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
      <Records cols={["Name", "Unit", "Default Price", ""]} rows={data.items.map((x) => <tr key={x.id}><td>{x.name}</td><td>{x.unit}</td><td>{money(x.price)}</td><td><button className="btn btn-danger" onClick={() => remove("items", x.id)}>Delete</button></td></tr>)} />
    </CrudPanel>
  );
}

function ReportsView({ totals, chartData, data }) {
  const topCustomers = Object.values(data.sales.reduce((acc, row) => {
    acc[row.customer_name] ||= { name: row.customer_name, total: 0, balance: 0 };
    acc[row.customer_name].total += num(row.total);
    acc[row.customer_name].balance += num(row.balance);
    return acc;
  }, {}));
  const topVendors = Object.values(data.purchases.reduce((acc, row) => {
    acc[row.vendor_name] ||= { name: row.vendor_name, total: 0, balance: 0 };
    acc[row.vendor_name].total += num(row.cost);
    acc[row.vendor_name].balance += num(row.balance);
    return acc;
  }, {}));
  return (
    <>
      <section className="metric-grid super-grid">
        <MetricCard label="Income" value={money(totals.income)} tone="green" />
        <MetricCard label="Expenses" value={money(totals.expense)} tone="red" />
        <MetricCard label="Profit" value={money(totals.profit)} tone={totals.profit >= 0 ? "green" : "red"} />
        <MetricCard label="Receivables" value={money(totals.receivables)} tone="amber" />
      </section>
      <ChartPanel chartData={chartData} />
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
        <div className="erp-form-grid">{fields}</div>
        <button className="primary-btn" type="button" onClick={onSubmit}><Plus size={17} />{button}</button>
      </section>
      {records}
    </>
  );
}

function Records({ cols, rows }) {
  return <section className="panel tenant-list-card records-panel"><Table cols={cols} rows={rows} /></section>;
}

export default AdminDashboard;
