import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { getNotifications } from '../services/api';
import './AppLayout.css';

const getNavItems = (userType) => {
  const isSupplier = userType === 'supplier';
  return [
    { id: 'dashboard',     label: 'Dashboard',                         icon: 'dashboard',    path: '/dashboard' },
    { id: 'billing',       label: isSupplier ? 'Orders' : 'Billing',   icon: 'billing',      path: '/billing' },
    { id: 'inventory',     label: 'Inventory',                         icon: 'inventory',    path: '/inventory' },
    { id: 'ai-predict',   label: 'AI Predict',                        icon: 'ai',           path: '/ai-predict' },
    { id: 'reports',       label: 'Reports',                           icon: 'reports',      path: '/reports' },
    { id: 'manufacturers', label: isSupplier ? 'Customers' : 'Suppliers', icon: 'manufacturer', path: '/manufacturers' },
    { id: 'discovery',     label: 'Network',                           icon: 'globe',        path: '/discovery' },
    { id: 'notifications', label: 'Notifications',                     icon: 'bell',         path: '/notifications' },
    { id: 'settings',      label: 'Settings',                          icon: 'settings',     path: '/settings' },
  ];
};

function useTheme() {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('stocksense_theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('stocksense_theme', theme);
    // Trigger background update on theme change
    window.dispatchEvent(new Event('ss_bg_update'));
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggleTheme };
}

function useBackground(theme) {
  const [bgStyle, setBgStyle] = useState({});

  const updateBackground = () => {
    const isDark = theme === 'dark';
    const prefix = isDark ? 'dark' : 'light';
    
    const type = localStorage.getItem(`ss_bg_${prefix}_type`) || 'default';
    const val = localStorage.getItem(`ss_bg_${prefix}_val`) || '';

    if (type === 'color' && val) {
      setBgStyle({ 
        backgroundColor: val, 
        backgroundImage: 'none' 
      });
    } else if (type === 'image' && val) {
      const isGradient = val.startsWith('linear-gradient');
      setBgStyle({ 
        backgroundImage: isGradient ? val : `url(${val})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundColor: 'transparent'
      });
    } else {
      setBgStyle({}); // Revert to CSS default (var(--color-bg-base))
    }
  };

  useEffect(() => {
    updateBackground();
    window.addEventListener('ss_bg_update', updateBackground);
    return () => window.removeEventListener('ss_bg_update', updateBackground);
  }, [theme]);

  return bgStyle;
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
        {getNavItems(user?.userType).filter(item => allowedRoutes.includes(item.id)).map(item => (
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
//  NOTIFICATION PANEL (Dropdown)
// ══════════════════════════════════════════════════════════
function NotificationPanel({ notifications, onClose, onMarkAllRead, onClearAll, onDismiss, onNavigate, onViewAll }) {
  const [tab, setTab] = useState('all'); // 'all' | 'unread'

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
    if (type === 'low_stock')    return { emoji: '⚠️', cls: 'notif-icon--warning' };
    return { emoji: '👤', cls: 'notif-icon--info' };
  };

  const routeFor = (type, id) => {
    if (type === 'out_of_stock' || type === 'low_stock') return '/inventory';
    if (type === 'member_joined') return '/users';
    return null;
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const visible = tab === 'unread' ? notifications.filter(n => !n.read) : notifications;

  return (
    <div className="notif-panel">
      {/* Header */}
      <div className="notif-panel__header">
        <div className="notif-panel__header-left">
          <span className="notif-panel__title">Notifications</span>
          {unreadCount > 0 && (
            <span className="notif-panel__badge">{unreadCount}</span>
          )}
        </div>
        <div className="notif-panel__actions">
          {notifications.some(n => !n.read) && (
            <button className="notif-panel__mark-all" onClick={onMarkAllRead}>Mark all read</button>
          )}
          {notifications.length > 0 && (
            <button className="notif-panel__clear-all" onClick={onClearAll}>Clear</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="notif-panel__tabs">
        <button
          className={`notif-panel__tab ${tab === 'all' ? 'notif-panel__tab--active' : ''}`}
          onClick={() => setTab('all')}
        >
          All Notifications
        </button>
        <button
          className={`notif-panel__tab ${tab === 'unread' ? 'notif-panel__tab--active' : ''}`}
          onClick={() => setTab('unread')}
        >
          Unread {unreadCount > 0 && <span className="notif-panel__tab-count">{unreadCount}</span>}
        </button>
      </div>

      {/* List */}
      <div className="notif-panel__list">
        {visible.length === 0 ? (
          <div className="notif-empty">🎉 {tab === 'unread' ? 'No unread notifications!' : 'All caught up!'}</div>
        ) : visible.map(n => {
          const ic    = iconFor(n.type);
          const route = routeFor(n.type, n.id);
          return (
            <div
              key={n.id}
              className={`notif-item ${n.read ? 'notif-item--read' : ''}`}
            >
              {/* Icon */}
              <div className={`notif-icon ${ic.cls}`}>{ic.emoji}</div>

              {/* Content */}
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                <div className="notif-message">{n.message}</div>
                {n.time && <div className="notif-time">{timeAgo(n.time)}</div>}

                {/* Action buttons */}
                <div className="notif-item__btns">
                  {route && (
                    <button
                      className="notif-item__action-btn notif-item__action-btn--view"
                      onClick={() => { onNavigate(n.id, route); onClose(); }}
                    >
                      View
                    </button>
                  )}
                </div>
              </div>

              {/* Right side */}
              <div className="notif-item__right">
                {!n.read && <div className="notif-dot" />}
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

      {/* Footer - See all */}
      <div className="notif-panel__footer">
        <button className="notif-panel__see-all" onClick={() => { onViewAll(); onClose(); }}>
          See all notifications
        </button>
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

  const navItems = getNavItems(user?.userType);
  const currentPage = navItems.find(item => item.path === location.pathname)?.label || 'Dashboard';
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
        <input 
          type="search" 
          className="header-search__input" 
          placeholder="Search anything (menus, settings)..." 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = e.target.value.toLowerCase().trim();
              if (!val) return;

              if (val.includes('report')) navigate('/reports');
              else if (val.includes('appear') || val.includes('theme') || val.includes('background') || val.includes('color')) navigate('/settings?tab=appearance');
              else if (val.includes('account') || val.includes('profile') || val.includes('password')) navigate('/settings?tab=account');
              else if (val.includes('user') || val.includes('staff') || val.includes('team')) navigate('/settings?tab=users');
              else if (val.includes('shop') || val.includes('busines')) navigate('/settings?tab=shop');
              else if (val.includes('bill') || val.includes('invoice') || val.includes('pos') || val.includes('order')) navigate('/billing');
              else if (val.includes('inventor') || val.includes('product') || val.includes('item') || val.includes('stock')) navigate('/inventory');
              else if (val.includes('predict') || val.includes('ai')) navigate('/ai-predict');
              else if (val.includes('supplier') || val.includes('customer') || val.includes('manufactur')) navigate('/manufacturers');
              else if (val.includes('network') || val.includes('discover') || val.includes('b2b') || val.includes('connect')) navigate('/discovery');
              else if (val.includes('setting')) navigate('/settings');
              else if (val.includes('dash') || val.includes('home')) navigate('/dashboard');

              e.target.value = '';
              e.target.blur();
            }
          }}
        />
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
              onViewAll={() => navigate('/notifications')}
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
              <button className="header-user__dropdown-item" onClick={() => navigate('/settings?tab=account')}>
                <Icon name="user" size={16} />
                Profile
              </button>
              <button className="header-user__dropdown-item" onClick={() => navigate('/settings')}>
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

function useAccentColor(theme) {
  useEffect(() => {
    const hex2rgb = (hex) => {
      const h = hex.replace('#', '');
      const r = parseInt(h.length === 3 ? h[0]+h[0] : h.slice(0, 2), 16) || 0;
      const g = parseInt(h.length === 3 ? h[1]+h[1] : h.slice(2, 4), 16) || 0;
      const b = parseInt(h.length === 3 ? h[2]+h[2] : h.slice(4, 6), 16) || 0;
      return `${r}, ${g}, ${b}`;
    };

    const pSBC = (p, c) => {
      const r = parseInt(c.slice(1,3), 16);
      const g = parseInt(c.slice(3,5), 16);
      const b = parseInt(c.slice(5,7), 16);
      const R = Math.round(r + (255 - r) * p);
      const G = Math.round(g + (255 - g) * p);
      const B = Math.round(b + (255 - b) * p);
      return `#${Math.min(255, Math.max(0, R)).toString(16).padStart(2, '0')}${Math.min(255, Math.max(0, G)).toString(16).padStart(2, '0')}${Math.min(255, Math.max(0, B)).toString(16).padStart(2, '0')}`;
    };

    const updateAccent = () => {
      const isDark = theme === 'dark';
      const prefix = isDark ? 'dark' : 'light';
      const bgVal = localStorage.getItem(`ss_bg_${prefix}_val`) || '';
      
      let accent = isDark ? '#6366f1' : '#4f46e5'; // Default Indigo

      // Map known theme backgrounds to their appropriate accents
      if (bgVal.includes('#0f172a') || bgVal.includes('#334155')) accent = isDark ? '#0ea5e9' : '#0284c7'; // Slate -> Cyan
      else if (bgVal.includes('#1e1b4b')) accent = isDark ? '#a78bfa' : '#7c3aed'; // Midnight -> Violet
      else if (bgVal.includes('#fef2f2') || bgVal.includes('#fee2e2')) accent = isDark ? '#fb7185' : '#e11d48'; // Rose
      else if (bgVal.includes('#eff6ff') || bgVal.includes('#dbeafe')) accent = isDark ? '#38bdf8' : '#0284c7'; // Sky/Ocean
      else if (bgVal.includes('#f5f3ff')) accent = isDark ? '#a78bfa' : '#7c3aed'; // Lavender -> Violet
      
      // Calculate derived hex if custom color (naive tint to visible range)
      if (bgVal && bgVal.startsWith('#') && !['#020617', '#111827', '#f8fafc', '#f1f5f9'].includes(bgVal)) {
        // Just use it as the base if it's not a grayscale default, we lighten/darken it to act as accent
        if (bgVal.length === 7) {
           // If user picked a custom background color, let's use a brightened/darkened version of it as accent!
           accent = isDark ? pSBC(0.6, bgVal) : pSBC(-0.2, bgVal);
           if(accent.includes('NaN')) accent = isDark ? '#6366f1' : '#4f46e5';
        }
      }

      document.documentElement.style.setProperty('--color-accent-primary', accent);
      
      if (accent.startsWith('#')) {
        const rgb = hex2rgb(accent);
        const lighter = pSBC(0.15, accent);
        document.documentElement.style.setProperty('--color-accent-soft', `rgba(${rgb}, 0.12)`);
        document.documentElement.style.setProperty('--color-accent-glow', `rgba(${rgb}, 0.35)`);
        document.documentElement.style.setProperty('--color-border-accent', `rgba(${rgb}, 0.35)`);
        document.documentElement.style.setProperty('--color-accent-hover', lighter);
        document.documentElement.style.setProperty('--gradient-brand', `linear-gradient(135deg, ${accent}, ${lighter})`);
        document.documentElement.style.setProperty('--gradient-brand-hover', `linear-gradient(135deg, ${lighter}, ${accent})`);
      }
    };

    updateAccent();
    window.addEventListener('ss_bg_update', updateAccent); // Listen to Background update instead!
    return () => window.removeEventListener('ss_bg_update', updateAccent);
  }, [theme]);
}

export default function MainLayout({ user, onLogout, allowedRoutes, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  useAccentColor();
  const bgStyle = useBackground(theme);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="main-layout" style={bgStyle}>
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