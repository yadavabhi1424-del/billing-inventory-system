import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icon';
import './AppLayout.css';

const NAV_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard',     icon: 'dashboard',    path: '/dashboard'     },
  { id: 'billing',       label: 'Billing',       icon: 'billing',      path: '/billing'       },
  { id: 'inventory',     label: 'Inventory',     icon: 'inventory',    path: '/inventory'     },
  { id: 'ai-predict',    label: 'AI Predict',    icon: 'ai',           path: '/ai-predict'    },
  { id: 'reports',       label: 'Reports',       icon: 'reports',      path: '/reports'       },
  { id: 'manufacturers', label: 'Manufacturers', icon: 'manufacturer', path: '/manufacturers' },
  { id: 'settings',      label: 'Settings',      icon: 'settings',     path: '/settings'      },
];

function useTheme() {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('stocksense_theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('stocksense_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggleTheme };
}

// ══════════════════════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════════════════════
function Sidebar({ collapsed, onToggle, user, allowedRoutes, activePath, onNavigate, onLogout, mobileOpen, onCloseMobile }) {
  return (
    <aside className={`main-sidebar ${collapsed ? 'main-sidebar--collapsed' : ''} ${mobileOpen ? 'main-sidebar--mobile-open' : ''}`}>

      <div className="sidebar-logo">
        <div className="sidebar-logo__icon">
          <Icon name="box" size={18} />
        </div>
        <div className="sidebar-logo__text">
          <div className="sidebar-logo__name">StockSense</div>
          <div className="sidebar-logo__version">Pro · v2.0</div>
        </div>
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
          <Icon name="chevronRight" size={14} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.filter(item => allowedRoutes.includes(item.id)).map(item => (
          <a key={item.id}
            className={`sidebar-nav__item ${activePath === item.path ? 'sidebar-nav__item--active' : ''}`}
            onClick={e => { e.preventDefault(); onNavigate(item.path); onCloseMobile(); }}
            href={item.path}>
            <span className="sidebar-nav__icon"><Icon name={item.icon} size={20} /></span>
            <span className="sidebar-nav__label">{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user__profile">
          <div className="sidebar-user__avatar">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="sidebar-user__info">
            <div className="sidebar-user__name">{user?.name || 'User'}</div>
            <div className="sidebar-user__role">{user?.role || 'role'}</div>
          </div>
        </div>
        <button className="sidebar-user__logout" onClick={onLogout}>
          <Icon name="logout" size={18} />
          <span className="sidebar-nav__label">Logout</span>
        </button>
      </div>
    </aside>
  );
}

// ══════════════════════════════════════════════════════════
//  HEADER
// ══════════════════════════════════════════════════════════
function Header({ user, onLogout, theme, onToggleTheme, onMobileMenuToggle }) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [refreshing,       setRefreshing]       = useState(false);
  const location = useLocation();

  const currentPage = NAV_ITEMS.find(item => item.path === location.pathname)?.label || 'Dashboard';

  useEffect(() => {
    const handleClick = () => setUserDropdownOpen(false);
    if (userDropdownOpen) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [userDropdownOpen]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  return (
    <header className="main-header">

      <button className="mobile-menu-btn" onClick={onMobileMenuToggle}>
        <Icon name="menu" size={20} />
      </button>

      <div className="header-breadcrumb">
        <span className="header-breadcrumb__item">
          <Icon name="home" size={14} />
        </span>
        <span className="header-breadcrumb__separator">
          <Icon name="chevronRight" size={14} />
        </span>
        <span className="header-breadcrumb__item header-breadcrumb__item--active">
          {currentPage}
        </span>
      </div>

      <div className="header-search">
        <span className="header-search__icon"><Icon name="search" size={16} /></span>
        <input type="search" className="header-search__input" placeholder="Search anything..." />
      </div>

      <div className="header-actions">

        {/* Refresh */}
        <button
          className={`header-action-btn ${refreshing ? 'header-action-btn--spinning' : ''}`}
          onClick={handleRefresh}
          aria-label="Refresh page"
          title="Refresh">
          <Icon name="refresh" size={18} />
        </button>

        {/* Notifications */}
        <button className="header-action-btn" aria-label="Notifications">
          <Icon name="bell" size={20} />
          <span className="header-action-btn__badge">3</span>
        </button>

        {/* Theme toggle */}
        <button className="header-action-btn" onClick={onToggleTheme} aria-label="Toggle theme">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
        </button>

        {/* User dropdown */}
        <div className="header-user">
          <button
            className={`header-user__trigger ${userDropdownOpen ? 'header-user__trigger--open' : ''}`}
            onClick={e => { e.stopPropagation(); setUserDropdownOpen(!userDropdownOpen); }}>
            <div className="header-user__avatar">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="header-user__info">
              <div className="header-user__name">{user?.name || 'User'}</div>
              <div className="header-user__role">{user?.role || 'role'}</div>
            </div>
            <span className="header-user__chevron">
              <Icon name="chevronDown" size={16} />
            </span>
          </button>

          {userDropdownOpen && (
            <div className="header-user__dropdown">
              <button className="header-user__dropdown-item">
                <Icon name="user" size={16} />
                Profile
              </button>
              <button className="header-user__dropdown-item">
                <Icon name="settings" size={16} />
                Settings
              </button>
              <div className="header-user__dropdown-divider" />
              <button className="header-user__dropdown-item header-user__dropdown-item--danger"
                onClick={onLogout}>
                <Icon name="logout" size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN LAYOUT
// ══════════════════════════════════════════════════════════
export default function MainLayout({ user, onLogout, allowedRoutes, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen,   setMobileMenuOpen]   = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="main-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
        allowedRoutes={allowedRoutes}
        activePath={location.pathname}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      <div className={`main-layout__content ${sidebarCollapsed ? 'main-layout__content--collapsed' : ''}`}>
        <Header
          user={user}
          onLogout={onLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="main-layout__page">
          {children}
        </main>
      </div>
    </div>
  );
}