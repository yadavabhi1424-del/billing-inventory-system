import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { getNotifications } from '../services/api';
import './AppLayout.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
  { id: 'billing', label: 'Billing', icon: 'billing', path: '/billing' },
  { id: 'inventory', label: 'Inventory', icon: 'inventory', path: '/inventory' },
  { id: 'ai-predict', label: 'AI Predict', icon: 'ai', path: '/ai-predict' },
  { id: 'reports', label: 'Reports', icon: 'reports', path: '/reports' },
  { id: 'manufacturers', label: 'Manufacturers', icon: 'manufacturer', path: '/manufacturers' },
  { id: 'settings', label: 'Settings', icon: 'settings', path: '/settings' },
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
//  NOTIFICATION PANEL
// ══════════════════════════════════════════════════════════
function NotificationPanel({ notifications, onClose, onMarkAllRead, onClearAll, onDismiss, onNavigate }) {
  const timeAgo = (t) => {
    if (!t) return '';
    const diff = (Date.now() - new Date(t)) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const iconFor = (type) => {
    if (type === 'out_of_stock') return { emoji: '🚨', cls: 'notif-icon--danger' };
    if (type === 'low_stock') return { emoji: '⚠️', cls: 'notif-icon--warning' };
    return { emoji: '👤', cls: 'notif-icon--info' };
  };

  const routeFor = (type) => {
    if (type === 'out_of_stock' || type === 'low_stock') return '/inventory';
    if (type === 'member_joined') return '/settings';
    return null;
  };

  return (
    <div className="notif-panel">
      <div className="notif-panel__header">
        <span className="notif-panel__title">Notifications</span>
        <div className="notif-panel__actions">
          {notifications.some(n => !n.read) && (
            <button className="notif-panel__mark-all" onClick={onMarkAllRead}>Mark all read</button>
          )}
          {notifications.length > 0 && (
            <button className="notif-panel__clear-all" onClick={onClearAll}>Clear all</button>
          )}
        </div>
      </div>
      <div className="notif-panel__list">
        {notifications.length === 0 ? (
          <div className="notif-empty">🎉 All caught up!</div>
        ) : notifications.map(n => {
          const ic = iconFor(n.type);
          const route = routeFor(n.type);
          return (
            <div
              key={n.id}
              className={`notif-item ${n.read ? 'notif-item--read' : ''} ${route ? 'notif-item--clickable' : ''}`}
              onClick={() => {
                if (route) { onNavigate(n.id, route); onClose(); }
              }}
            >
              <div className={`notif-icon ${ic.cls}`}>{ic.emoji}</div>
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                <div className="notif-message">{n.message}</div>
                {n.time && <div className="notif-time">{timeAgo(n.time)}</div>}
              </div>
              <div className="notif-item__right">
                {!n.read && <div className="notif-dot" />}
                {route && <span className="notif-arrow">›</span>}
                <button
                  className="notif-dismiss"
                  title="Dismiss"
                  onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
                >×</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  HEADER
// ══════════════════════════════════════════════════════════
function Header({ user, onLogout, theme, onToggleTheme, onMobileMenuToggle }) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPage = NAV_ITEMS.find(item => item.path === location.pathname)?.label || 'Dashboard';
  const unreadCount = notifications.filter(n => !n.read).length;

  // ── localStorage helpers ─────────────────────────────────
  const getReadIds = () => JSON.parse(localStorage.getItem('ss_notif_read') || '[]');
  const getDismissedIds = () => JSON.parse(localStorage.getItem('ss_notif_dismissed') || '[]');
  const saveReadIds = (ids) => localStorage.setItem('ss_notif_read', JSON.stringify(ids));
  const saveDismissedIds = (ids) => localStorage.setItem('ss_notif_dismissed', JSON.stringify(ids));

  // Apply persisted read/dismissed state to fresh API data
  const applyLocalState = (raw) => {
    const readIds = getReadIds();
    const dismissedIds = getDismissedIds();
    return raw
      .filter(n => !dismissedIds.includes(n.id))
      .map(n => ({ ...n, read: n.read || readIds.includes(n.id) }));
  };

  // Fetch notifications on mount
  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      if (res.success) setNotifications(applyLocalState(res.data));
    } catch { /* silent fail */ }
  };

  // Mark single as read + navigate
  const handleNotifClick = (id, route) => {
    const ids = [...new Set([...getReadIds(), id])];
    saveReadIds(ids);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (route) { navigate(route); setNotifOpen(false); }
  };

  // Mark all read
  const handleMarkAllRead = () => {
    const ids = [...new Set([...getReadIds(), ...notifications.map(n => n.id)])];
    saveReadIds(ids);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Dismiss single
  const handleDismiss = (id) => {
    const ids = [...new Set([...getDismissedIds(), id])];
    saveDismissedIds(ids);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Clear all
  const handleClearAll = () => {
    const ids = [...new Set([...getDismissedIds(), ...notifications.map(n => n.id)])];
    saveDismissedIds(ids);
    setNotifications([]);
  };

  // Close notif panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClick = () => setUserDropdownOpen(false);
    if (userDropdownOpen) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [userDropdownOpen]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => window.location.reload(), 300);
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
        <div className="notif-wrapper" ref={notifRef}>
          <button
            className={`header-action-btn ${notifOpen ? 'header-action-btn--active' : ''}`}
            aria-label="Notifications"
            onClick={() => { setNotifOpen(o => !o); if (!notifOpen) fetchNotifications(); }}>
            <Icon name="bell" size={20} />
            {unreadCount > 0 && (
              <span className="header-action-btn__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          {notifOpen && (
            <NotificationPanel
              notifications={notifications}
              onClose={() => setNotifOpen(false)}
              onMarkAllRead={handleMarkAllRead}
              onClearAll={handleClearAll}
              onDismiss={handleDismiss}
              onNavigate={handleNotifClick}
            />
          )}
        </div>

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

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