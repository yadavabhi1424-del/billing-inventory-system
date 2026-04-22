// ============================================================
//  Notifications.jsx — Full Notifications Page
//  StockSense Pro
// ============================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { getNotifications } from '../../services/api';
import './Notifications.css';

// ── Helpers ─────────────────────────────────────────────────
const timeAgo = (t) => {
  if (!t) return 'Just now';
  const diff = (Date.now() - new Date(t)) / 1000;
  if (diff < 60)     return 'Just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const iconFor = (n) => {
  // Use backend-provided icon if available, else fallback
  if (n.icon) return n.icon;
  if (n.type === 'out_of_stock')        return '🚨';
  if (n.type === 'low_stock')           return '⚠️';
  if (n.type === 'member_joined')       return '👤';
  if (n.type === 'b2b_received')        return '📦';
  if (n.type === 'b2b_delivered')       return '✅';
  if (n.type === 'b2b_order_received')  return '✅';
  if (n.type === 'b2b_return')          return '↩️';
  if (n.type === 'po_received')         return '✅';
  if (n.type === 'po_placed')           return '📋';
  if (n.type?.startsWith('inventory'))  return '📥';
  return '🔔';
};

const clsFor = (type) => {
  if (type === 'out_of_stock' || type === 'b2b_return')                   return 'ni--danger';
  if (type === 'low_stock')                                                return 'ni--warning';
  if (type === 'po_received' || type === 'b2b_delivered'
    || type === 'b2b_order_received')                                      return 'ni--success';
  if (type?.startsWith('inventory'))                                       return 'ni--success';
  return 'ni--info';
};

const LS_READ      = 'ss_notif_read';
const LS_DISMISSED = 'ss_notif_dismissed';
const LS_FAVORITE  = 'ss_notif_favorite';
const LS_DELETED   = 'ss_notif_deleted';

const PAGE_SIZE = 10;

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [raw, setRaw]             = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [tab, setTab]             = useState('all');
  const [sort, setSort]           = useState('latest');   // 'latest' | 'oldest'
  const [page, setPage]           = useState(0);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [readIds, setReadIds]     = useState(() => JSON.parse(localStorage.getItem(LS_READ)      || '[]'));
  const [dismissed, setDismissed] = useState(() => JSON.parse(localStorage.getItem(LS_DISMISSED) || '[]'));
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem(LS_FAVORITE)  || '[]'));
  const [deletedIds, setDeletedIds] = useState(() => JSON.parse(localStorage.getItem(LS_DELETED) || '[]'));

  const saveRead     = (ids) => { localStorage.setItem(LS_READ,      JSON.stringify(ids)); setReadIds(ids);    window.dispatchEvent(new Event('ss_notif_update')); };
  const saveDismiss  = (ids) => { localStorage.setItem(LS_DISMISSED, JSON.stringify(ids)); setDismissed(ids);  window.dispatchEvent(new Event('ss_notif_update')); };
  const saveFavorite = (ids) => { localStorage.setItem(LS_FAVORITE,  JSON.stringify(ids)); setFavorites(ids);  window.dispatchEvent(new Event('ss_notif_update')); };
  const saveDelete   = (ids) => { localStorage.setItem(LS_DELETED,   JSON.stringify(ids)); setDeletedIds(ids); window.dispatchEvent(new Event('ss_notif_update')); };

  useEffect(() => {
    setLoading(true);
    getNotifications()
      .then(res => { if (res.success) setRaw(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Reset page when tab/search/sort changes
  useEffect(() => { setPage(0); }, [tab, search, sort]);

  const enriched = useMemo(() => raw.map(n => ({
    ...n,
    read:     n.read || readIds.includes(n.id),
    archived: dismissed.includes(n.id),
    starred:  favorites.includes(n.id),
  })).filter(n => !deletedIds.includes(n.id)), [raw, readIds, dismissed, favorites, deletedIds]);

  const allCount      = enriched.filter(n => !n.archived).length;
  const archiveCount  = enriched.filter(n =>  n.archived).length;
  const favoriteCount = enriched.filter(n =>  n.starred ).length;

  // Tab filter
  const tabFiltered = useMemo(() => {
    if (tab === 'archive')  return enriched.filter(n =>  n.archived);
    if (tab === 'favorite') return enriched.filter(n =>  n.starred );
    return enriched.filter(n => !n.archived);
  }, [enriched, tab]);

  // Search filter
  const searched = useMemo(() => {
    if (!search.trim()) return tabFiltered;
    const q = search.toLowerCase();
    return tabFiltered.filter(n =>
      n.title?.toLowerCase().includes(q) ||
      n.message?.toLowerCase().includes(q)
    );
  }, [tabFiltered, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...searched].sort((a, b) => {
      const ta = a.time ? new Date(a.time) : new Date(0);
      const tb = b.time ? new Date(b.time) : new Date(0);
      return sort === 'latest' ? tb - ta : ta - tb;
    });
  }, [searched, sort]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Actions ──────────────────────────────────────────────
  const handleMarkRead    = (id) => saveRead([...new Set([...readIds, id])]);
  const handleArchive     = (id) => saveDismiss([...new Set([...dismissed, id])]);
  const handleUnarchive   = (id) => saveDismiss(dismissed.filter(x => x !== id));
  const handleToggleStar  = (id) => saveFavorite(
    favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id]
  );
  const handleDeleteItem  = (id) => saveDelete([...new Set([...deletedIds, id])]);
  const handleMarkAllRead = () => saveRead([...new Set([...readIds, ...enriched.map(n => n.id)])]);

  const handleClick = (n) => {
    handleMarkRead(n.id);
    if (n.link) navigate(n.link);
  };

  const TABS = [
    { key: 'all',      label: 'All',      count: allCount      },
    { key: 'archive',  label: 'Archive',  count: archiveCount  },
    { key: 'favorite', label: 'Favourite',count: favoriteCount },
  ];

  return (
    <div className="np-page">

      {/* ── Page Header ── */}
      <div className="np-header">
        <div className="np-header__left">
          <div className="np-header__icon">
            <Icon name="bell" size={22} />
          </div>
          <div>
            <h1 className="np-header__title">List Notification</h1>
            <p className="np-header__sub">{allCount} Notification{allCount !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="np-header__right">
          {/* Search */}
          <div className="np-search">
            <Icon name="search" size={15} />
            <input
              type="text"
              placeholder="Search by name or message"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="np-search__input"
            />
          </div>

          {/* Sort */}
          <div className="np-sort-custom" ref={sortRef}>
            <div 
              className={`np-sort-trigger ${showSortMenu ? 'np-sort-trigger--active' : ''}`} 
              onClick={() => setShowSortMenu(!showSortMenu)}
            >
              <span>{sort === 'latest' ? 'Latest' : 'Oldest'}</span>
              <Icon name="chevronDown" size={14} />
            </div>
            {showSortMenu && (
              <div className="np-sort-menu">
                <div 
                  className={`np-sort-menu-item ${sort === 'latest' ? 'active' : ''}`}
                  onClick={() => { setSort('latest'); setShowSortMenu(false); }}
                >
                  Latest
                </div>
                <div 
                  className={`np-sort-menu-item ${sort === 'oldest' ? 'active' : ''}`}
                  onClick={() => { setSort('oldest'); setShowSortMenu(false); }}
                >
                  Oldest
                </div>
              </div>
            )}
          </div>

          {/* Mark all read */}
          <button className="np-btn np-btn--ghost" onClick={handleMarkAllRead}>
            <Icon name="check" size={14} />
            Mark all read
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="np-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`np-tab ${tab === t.key ? 'np-tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <span className="np-tab__badge">{t.count}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      <div className="np-list">
        {loading ? (
          <div className="np-empty">
            <div className="np-empty__icon">⏳</div>
            <p className="np-empty__title">Loading notifications…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="np-empty">
            <div className="np-empty__icon">🎉</div>
            <p className="np-empty__title">All caught up!</p>
            <p className="np-empty__sub">No notifications in this section.</p>
          </div>
        ) : paginated.map(n => {
          const emoji = iconFor(n);
          const cls   = clsFor(n.type);

          return (
            <div
              key={n.id}
              className={`np-item ${!n.read ? 'np-item--unread' : ''} ${n.link ? 'np-item--clickable' : ''}`}
              onClick={() => n.link && handleClick(n)}
            >
              {/* Unread dot / placeholder */}
              {!n.read
                ? <span className="np-item__dot" />
                : <span className="np-item__dot-placeholder" />
              }

              {/* Star */}
              <button
                className={`np-item__star ${n.starred ? 'np-item__star--active' : ''}`}
                title={n.starred ? 'Unfavourite' : 'Favourite'}
                onClick={e => { e.stopPropagation(); handleToggleStar(n.id); }}
              >
                {n.starred ? '★' : '☆'}
              </button>

              {/* Notification type icon */}
              <div className={`np-item__icon ${cls}`}>{emoji}</div>

              {/* Title + message */}
              <div className="np-item__body">
                <span className="np-item__title">{n.title}</span>
                <span className="np-item__msg"> — {n.message}</span>
              </div>

              {/* Timestamp */}
              <span className="np-item__time">{timeAgo(n.time)}</span>

              {/* Actions */}
              <div className="np-item__actions" onClick={e => e.stopPropagation()}>
                {tab === 'archive' ? (
                  <button
                    className="np-item__btn np-item__btn--restore"
                    onClick={() => handleUnarchive(n.id)}
                    title="Restore notification"
                  >
                    <Icon name="refresh" size={13} /> Restore
                  </button>
                ) : (
                  <button
                    className="np-item__btn np-item__btn--archive"
                    title="Archive"
                    onClick={() => handleArchive(n.id)}
                  >
                    <Icon name="archive" size={13} /> Archive
                  </button>
                )}
                <button
                  className="np-item__btn np-item__btn--delete"
                  title="Delete"
                  onClick={() => handleDeleteItem(n.id)}
                >
                  <Icon name="trash" size={13} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="np-pagination">
          <button
            className="np-page-btn"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            <Icon name="chevronLeft" size={16} />
          </button>

          <div className="np-page-numbers">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`np-page-num ${i === page ? 'np-page-num--active' : ''}`}
                onClick={() => setPage(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            className="np-page-btn"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            <Icon name="chevronRight" size={16} />
          </button>

          <span className="np-page-info">
            Page {page + 1} of {totalPages} · {sorted.length} total
          </span>
        </div>
      )}
    </div>
  );
}
