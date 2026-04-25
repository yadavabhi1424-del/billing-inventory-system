import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Overview from './Overview';
import Transactions from './Transactions';
import Payment from '../billing/Payment';
import B2BOrders from '../B2B/B2BOrders';
import B2BReturns from '../B2B/B2BReturns';
import './Billing.css';

export default function Billing({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [filterDate, setFilterDate] = useState({ period: 'today' });
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('order_id')) {
      setActiveTab('newbill');
    }
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePeriodChange = (period) => {
    if (period === 'custom') {
      setFilterDate({ period: 'custom', startDate: '', endDate: '' });
    } else {
      setFilterDate({ period });
      setShowFilterMenu(false);
    }
  };

  const handleCustomDateChange = (field, value) => {
    setFilterDate(prev => ({ ...prev, [field]: value }));
  };

  const applyCustomDate = () => {
    if (filterDate.startDate && filterDate.endDate) {
      if (new Date(filterDate.startDate) > new Date(filterDate.endDate)) {
        alert("Start date cannot be after end date");
        return;
      }
      setShowFilterMenu(false);
    }
  };

  return (
    <div className="billing-module">
      
      {/* Tab Navigation */}
      <div className="billing-tabs">
        <div className="billing-tabs__left">
          <button
            className={`billing-tab ${activeTab === 'overview' ? 'billing-tab--active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`billing-tab ${activeTab === 'transactions' ? 'billing-tab--active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          {(user?.userType === 'supplier') && (
            <>
              <button
                className={`billing-tab ${activeTab === 'orders' ? 'billing-tab--active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                Orders
              </button>
              <button
                className={`billing-tab ${activeTab === 'returns' ? 'billing-tab--active' : ''}`}
                onClick={() => setActiveTab('returns')}
              >
                Returns
              </button>
            </>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {activeTab !== 'newbill' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="billing-filter-custom" ref={filterRef} style={{ position: 'relative' }}>
                <div 
                  className="billing-filter-trigger"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.6rem 1rem', borderRadius: '8px',
                    border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)',
                    cursor: 'pointer', fontSize: '0.9rem', minWidth: '130px', justifyContent: 'space-between'
                  }}
                >
                  <span>
                    {filterDate.period === 'today' ? 'Today' :
                     filterDate.period === 'yesterday' ? 'Yesterday' :
                     filterDate.period === 'week' ? 'Last 7 Days' :
                     filterDate.period === 'month' ? 'This Month' : 'All Time'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>▼</span>
                </div>
                
                {showFilterMenu && (
                  <div 
                    className="billing-filter-menu"
                    style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                      backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
                      borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                      zIndex: 100, minWidth: '180px', padding: '0.4rem'
                    }}
                  >
                    {['today', 'yesterday', 'week', 'month', 'all'].map(p => {
                      const isActive = filterDate.period === p;
                      const label = p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : p === 'week' ? 'Last 7 Days' : p === 'month' ? 'This Month' : 'All Time';
                      return (
                        <div 
                          key={p}
                          onClick={() => handlePeriodChange(p)}
                          style={{
                            padding: '0.5rem 0.8rem', cursor: 'pointer', margin: '0.1rem 0',
                            backgroundColor: isActive ? '#e0f2fe' : 'transparent',
                            color: isActive ? '#0284c7' : '#475569',
                            borderRadius: '6px',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { if(!isActive) e.target.style.backgroundColor = '#f8fafc' }}
                          onMouseLeave={(e) => { if(!isActive) e.target.style.backgroundColor = 'transparent' }}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Custom Date Pickers for All Time */}
              {filterDate.period === 'all' && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="date" 
                    value={filterDate.startDate || ''}
                    onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                  <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                  <input 
                    type="date" 
                    value={filterDate.endDate || ''}
                    onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                  {(filterDate.startDate || filterDate.endDate) && (
                    <button 
                      onClick={() => setFilterDate({ period: 'all', startDate: '', endDate: '' })}
                      style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--color-bg-base)', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                      title="Clear Dates"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <button
            className="billing-new-bill-btn"
            onClick={() => setActiveTab('newbill')}
          >
            <span className="billing-new-bill-btn__icon">+</span>
            {user?.userType === 'supplier' ? 'New Order' : 'New Bill'}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="billing-content">
        {activeTab === 'overview' && (
          <Overview filterDate={filterDate} />
        )}

        {activeTab === 'transactions' && (
          <Transactions user={user} filterDate={filterDate} />
        )}

        {activeTab === 'orders' && (
          <B2BOrders user={user} filterDate={filterDate} />
        )}

        {activeTab === 'returns' && (
          <B2BReturns user={user} filterDate={filterDate} />
        )}

        {activeTab === 'newbill' && (
          <Payment user={user} />
        )}
      </div>
    </div>
  );
}