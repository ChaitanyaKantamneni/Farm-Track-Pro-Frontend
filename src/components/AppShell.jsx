import { useContext, useState, useMemo, useEffect } from "react";
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
  WalletCards,
  Menu,
  ChevronLeft,
  ChevronRight,
  Egg,
  X,
  Shield,
  Lock,
  Clock
} from "lucide-react";

import { AuthContext } from "../context/AuthContext";
import FarmTrackLogo from "./FarmTrackLogo";
import { getSettings } from "../services/farmService";

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
        section: "reports",
        icon: ChartNoAxesColumn
      },
      {
        label: "Eggs Collection",
        section: "egg_reports",
        icon: Egg
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
    title: "Platform Analytics",
    items: [
      {
        label: "Subscriptions",
        to: "/super-admin/dashboard?tab=subscriptions",
        icon: WalletCards
      },
      {
        label: "Pending Approvals",
        to: "/super-admin/dashboard?tab=pending_approvals",
        icon: Clock
      },
      {
        label: "Billing & Plans",
        to: "/super-admin/dashboard?tab=billing",
        icon: BadgeIndianRupee
      },
      {
        label: "Reports",
        to: "/super-admin/dashboard?tab=reports",
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
        <span className="link-text">{item.label}</span>
      </button>
    );
  }

  if (item.to) {
    return (
      <NavLink
        to={item.to}
        onClick={() => { if (onSectionChange) onSectionChange(item.label); }}
        className={({ isActive }) =>
          isActive ? "side-link active" : "side-link"
        }
      >
        <Icon size={18} />
        <span className="link-text">{item.label}</span>
      </NavLink>
    );
  }

  return (
    <button
      className="side-link side-link-muted"
      type="button"
      onClick={() => { if (onSectionChange) onSectionChange(item.label); }}
    >
      <Icon size={18} />
      <span className="link-text">{item.label}</span>
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
  const { logout } = useContext(AuthContext);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tenantLogo, setTenantLogo] = useState(null);
  const [tenantFarmName, setTenantFarmName] = useState("");

  const [currentUser, setCurrentUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "null")
  );

  useEffect(() => {
    if (variant === "super" || currentUser?.role === "SUPER_ADMIN" || !currentUser?.tenantId) {
      return;
    }

    // Load initial values from localStorage cache
    setTenantFarmName(currentUser?.farmName || "");
    const logos = JSON.parse(localStorage.getItem("tenant_logos") || "{}");
    setTenantLogo(currentUser?.logo || logos[currentUser.tenantId] || null);

    // Fetch latest from database to stay updated in real-time
    getSettings()
      .then((res) => {
        if (res.data) {
          const latestLogo = res.data.logo;
          const latestFarmName = res.data.farmName;
          const latestPlanName = res.data.planName;
          const latestEndsInDays = res.data.endsInDays;
          const latestStatus = res.data.status;

          setTenantLogo(latestLogo || null);
          setTenantFarmName(latestFarmName || "");

          // Update user in localStorage & React state
          const updatedUser = {
            ...currentUser,
            logo: latestLogo || null,
            farmName: latestFarmName,
            planName: latestPlanName,
            endsInDays: latestEndsInDays,
            status: latestStatus
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);

          // Sync tenant_logos map
          const logosMap = JSON.parse(localStorage.getItem("tenant_logos") || "{}");
          if (latestLogo) {
            logosMap[currentUser.tenantId] = latestLogo;
          } else {
            delete logosMap[currentUser.tenantId];
          }
          localStorage.setItem("tenant_logos", JSON.stringify(logosMap));
        }
      })
      .catch((err) => console.log("Failed to load settings in AppShell", err));
  }, [variant, currentUser?.tenantId]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sections =
    customSections || (variant === "super" ? superAdminSections : adminSections);

  const roleLabel =
    currentUser?.role === "SUPER_ADMIN" ? "Super Admin" : 
    currentUser?.role === "MANAGER" ? "Manager" : "Admin";

  const signOut = () => {
    logout();
    navigate("/");
  };

  const isSubscriptionBlocked = useMemo(() => {
    if (variant === "super" || currentUser?.role === "SUPER_ADMIN") return false;
    if (!currentUser?.tenantId) return false;
    return currentUser.status === "INACTIVE" || Number(currentUser.endsInDays) <= 0;
  }, [currentUser, variant]);

  const filteredSections = useMemo(() => {
    if (variant === "super") return sections;

    const plan = currentUser?.planName || "Pro";
    const role = currentUser?.role || "ADMIN";

    let filtered = sections.map(sec => ({
      ...sec,
      items: sec.items.map(item => ({ ...item }))
    }));

    if (plan === "Basic") {
      filtered = filtered.map(sec => {
        if (sec.title === "Transactions") {
          sec.items = sec.items.filter(i => ["Sales", "Day Book", "Eggs Collection"].includes(i.label));
        } else if (sec.title === "Staff") {
          sec.items = [];
        } else if (sec.title === "Master Data") {
          sec.items = sec.items.filter(i => ["Customers", "Items", "Sheds"].includes(i.label));
        } else if (sec.title === "Analytics") {
          sec.items = sec.items.filter(i => ["Eggs Collection"].includes(i.label));
        }
        return sec;
      }).filter(sec => sec.items.length > 0);
    } else if (plan === "Pro") {
      filtered = filtered.map(sec => {
        if (sec.title === "Transactions") {
          sec.items = sec.items.filter(i => !["Disposed Inventory"].includes(i.label));
        } else if (sec.title === "Master Data") {
          // Keep Sheds visible
          sec.items = sec.items;
        } else if (sec.title === "Analytics") {
          sec.items = sec.items.filter(i => !["Disposed Inventory"].includes(i.label));
        }
        return sec;
      }).filter(sec => sec.items.length > 0);
    }

    if (role === "MANAGER") {
      filtered = filtered.map(sec => {
        if (sec.title === "Overview") {
          sec.items = [];
        } else if (sec.title === "Transactions") {
          sec.items = sec.items.filter((i) => ["Eggs Collection", "Disposed Inventory"].includes(i.label));
        } else if (sec.title === "Master Data") {
          sec.items = sec.items.filter((i) => i.label === "Sheds");
        } else if (sec.title === "Analytics") {
          sec.items = [];
        } else if (sec.title === "Settings") {
          sec.items = [];
        }
        return sec;
      }).filter(sec => sec.items.length > 0);
    }

    return filtered;
  }, [sections, currentUser, variant]);

  if (isSubscriptionBlocked) {
    const isPending = currentUser?.billingStatus === "Pending";
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f4f9f6', padding: '24px' }}>
        <div className="panel ledger-panel" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '40px 32px', boxShadow: '0 20px 50px rgba(5,32,18,0.08)' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '64px', height: '64px', borderRadius: '50%', background: isPending ? '#eef2ff' : '#fef2f2', color: isPending ? '#4f46e5' : '#ef4444', margin: '0 auto 24px' }}>
            <Lock size={30} />
          </div>
          <h2 style={{ fontSize: '20px', color: '#052012', margin: '0 0 12px' }}>
            {isPending ? "Verification Pending" : "Access Blocked"}
          </h2>
          <p style={{ color: '#526b5c', fontSize: '14px', lineHeight: '1.6', margin: '0 0 28px' }}>
            {isPending 
              ? "Your subscription payment is currently pending verification by the administrator. Access will be unlocked shortly."
              : `Your farm subscription for ${currentUser?.fullName || "your organization"} has expired or been suspended. Please contact the platform administrator to renew your billing.`}
          </p>
          <button className="primary-btn" style={{ background: isPending ? '#4f46e5' : '#ef4444', boxShadow: `0 10px 18px ${isPending ? 'rgba(79, 70, 229, 0.18)' : 'rgba(239, 68, 68, 0.18)'}`, width: '100%' }} type="button" onClick={signOut}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      {isMobileOpen && <div className="mobile-overlay" onClick={() => setIsMobileOpen(false)} />}
      <aside className="sidebar">
        <button className="mobile-close-btn" type="button" onClick={() => setIsMobileOpen(false)}>
          <X size={18} />
        </button>
        <div className="sidebar-brand" style={{
          display: 'flex',
          flexDirection: (isCollapsed || variant === "super" || !tenantLogo) ? 'column' : 'row',
          alignItems: (isCollapsed || variant === "super" || !tenantLogo) ? (isCollapsed ? 'center' : 'flex-start') : 'center',
          gap: (variant === "super" || !tenantLogo) ? '8px' : '12px'
        }}>
          {tenantLogo ? (
            <img src={tenantLogo} alt="Logo" style={{ height: isCollapsed ? '32px' : '40px', maxWidth: isCollapsed ? '100%' : '120px', objectFit: 'contain', borderRadius: '6px' }} />
          ) : (
            <FarmTrackLogo collapsed={isCollapsed} compact={variant !== "super"} />
          )}
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left' }}>
              {variant !== "super" && tenantFarmName && (
                <span className="brand-farm-name" style={{ color: '#ffffff', fontWeight: '700', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2', marginTop: !tenantLogo ? '10px' : '0px' }}>
                  {tenantFarmName}
                </span>
              )}
              <p className="brand-label" style={{ margin: (variant === "super" || (!tenantLogo && !tenantFarmName)) ? '12px 0 0' : '4px 0 0', color: '#a3ccb5', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {variant === "super" ? "PLATFORM ACCESS" : `${(currentUser?.planName || "Pro").toUpperCase()} ACCESS`}
              </p>
            </div>
          )}
        </div>

        <nav className="side-nav">
          {
            filteredSections.map((section) => (
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
                      onSectionChange={(s) => {
                        if (onSectionChange) onSectionChange(s);
                        setIsMobileOpen(false);
                      }}
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
              {(currentUser?.fullName || "U").charAt(0)}
            </div>
            <div>
              <strong>{currentUser?.fullName || "Chaitanya"}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>
          <button
            className="signout"
            type="button"
            onClick={signOut}
          >
            <LogOut size={16} />
            <span className="link-text">Sign out</span>
          </button>
        </div>
        <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-toggle" type="button" onClick={() => setIsMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 className="topbar-title">{title}</h1>
          </div>
          <div className="topbar-actions">
            <span className="role-pill">
              <Shield size={13} className="role-icon" />
              {roleLabel}
            </span>
            <span className="date-pill">
              <CalendarDays size={13} />
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
