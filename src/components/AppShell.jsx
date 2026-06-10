import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BadgeIndianRupee,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumn,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Store,
  Tag,
  UserRound,
  Users,
  WalletCards
} from "lucide-react";

import { AuthContext } from "../context/AuthContext";
import FarmTrackLogo from "./FarmTrackLogo";

const adminSections = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        to: "/admin/dashboard",
        icon: LayoutDashboard
      }
    ]
  },
  {
    title: "Transactions",
    items: [
      {
        label: "Sales",
        icon: Tag
      },
      {
        label: "Purchases",
        icon: ShoppingCart
      },
      {
        label: "Payments",
        icon: CreditCard
      },
      {
        label: "Day Book",
        icon: BookOpen
      }
    ]
  },
  {
    title: "Staff",
    items: [
      {
        label: "Staff & Salary",
        icon: Users
      }
    ]
  },
  {
    title: "Master Data",
    items: [
      {
        label: "Customers",
        icon: UserRound
      },
      {
        label: "Vendors",
        icon: UserRound
      },
      {
        label: "Items",
        icon: Package
      }
    ]
  },
  {
    title: "Analytics",
    items: [
      {
        label: "Reports",
        icon: ChartNoAxesColumn
      }
    ]
  }
];

const superAdminSections = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        to: "/super-admin/dashboard",
        icon: LayoutDashboard
      },
      {
        label: "Tenant Management",
        to: "/tenants",
        icon: Store
      }
    ]
  },
  {
    title: "Platform",
    items: [
      {
        label: "Subscriptions",
        icon: WalletCards
      },
      {
        label: "Billing",
        icon: BadgeIndianRupee
      },
      {
        label: "Reports",
        icon: ChartNoAxesColumn
      }
    ]
  }
];

function NavItem({
  item,
  activeSection,
  onSectionChange
}) {
  const Icon = item.icon;

  if (item.section && onSectionChange) {
    return (
      <button
        className={activeSection === item.section ? "side-link active" : "side-link"}
        type="button"
        onClick={() => onSectionChange(item.section)}
      >
        <Icon size={18} />
        <span>{item.label}</span>
      </button>
    );
  }

  if (item.to) {
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          isActive ? "side-link active" : "side-link"
        }
      >
        <Icon size={18} />
        <span>{item.label}</span>
      </NavLink>
    );
  }

  return (
    <button
      className="side-link side-link-muted"
      type="button"
    >
      <Icon size={18} />
      <span>{item.label}</span>
    </button>
  );
}

function AppShell({
  title,
  children,
  variant = "admin",
  activeSection,
  onSectionChange,
  sections: customSections
}) {
  const navigate = useNavigate();
  const {
    logout
  } = useContext(AuthContext);

  const storedUser =
    JSON.parse(localStorage.getItem("user") || "null");

  const sections =
    customSections || (variant === "super" ? superAdminSections : adminSections);

  const roleLabel =
    storedUser?.role === "SUPER_ADMIN" ? "Super Admin" : 
    storedUser?.role === "MANAGER" ? "Manager" : "Admin";

  const signOut = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <FarmTrackLogo compact={variant !== "super"} />
          <p>{variant === "super" ? "PLATFORM ACCESS" : "FULL ACCESS"}</p>
        </div>

        <nav className="side-nav">
          {
            sections.map((section) => (
              <div
                className="side-section"
                key={section.title}
              >
                <div className="side-heading">
                  {section.title}
                </div>
                {
                  section.items.map((item) => (
                    <NavItem
                      item={item}
                      key={item.label}
                      activeSection={activeSection}
                      onSectionChange={onSectionChange}
                    />
                  ))
                }
              </div>
            ))
          }
        </nav>

        <div className="sidebar-user">
          <div className="user-card">
            <div className="avatar">
              {(storedUser?.fullName || "U").charAt(0)}
            </div>
            <div>
              <strong>{storedUser?.fullName || "Chaitanya"}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>
          <button
            className="signout"
            type="button"
            onClick={signOut}
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="topbar-actions">
            <span className="role-pill">
              {roleLabel}
            </span>
            <span className="date-pill">
              <CalendarDays size={14} />
              {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </header>

        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AppShell;
