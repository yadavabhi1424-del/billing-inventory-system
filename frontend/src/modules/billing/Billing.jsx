import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Overview from './Overview';
import Transactions from './Transactions';
import Payment from '../billing/Payment';
import B2BOrders from '../B2B/B2BOrders';
import './Billing.css';

export default function Billing({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('order_id')) {
      setActiveTab('newbill');
    }
  }, [location]);

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
            <button
              className={`billing-tab ${activeTab === 'orders' ? 'billing-tab--active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              Orders
            </button>
          )}
        </div>
        
        <button
          className="billing-new-bill-btn"
          onClick={() => setActiveTab('newbill')}
        >
          <span className="billing-new-bill-btn__icon">+</span>
          {user?.userType === 'supplier' ? 'New Order' : 'New Bill'}
        </button>
      </div>

      {/* Content Area */}
      <div className="billing-content">
        {activeTab === 'overview' && (
          <Overview />
        )}

        {activeTab === 'transactions' && (
          <Transactions user={user} />
        )}

        {activeTab === 'orders' && (
          <B2BOrders user={user} />
        )}

        {activeTab === 'newbill' && (
          <Payment user={user} />
        )}
      </div>
    </div>
  );
}