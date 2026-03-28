import { useState } from 'react';
import Overview from './Overview';
import Transactions from './Transactions';
import Payment from '../billing/Payment';
import './Billing.css';

export default function Billing({ user }) {
  const [activeTab, setActiveTab] = useState('overview');

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
          <Transactions />
        )}

        {activeTab === 'newbill' && (
          <Payment user={user} />
        )}
      </div>
    </div>
  );
}