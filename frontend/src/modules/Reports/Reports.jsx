import { useState } from 'react';
import SalesReport from './SalesReport';
import CustomerReport from './CustomerReport';
import SupplierReport from './SupplierReport';
import './Reports.css';

export default function Reports({ user }) {
  const isSupplier = user?.userType === 'supplier';
  const [activeTab, setActiveTab] = useState('sales');

  return (
    <div className="reports-module">
      
      {/* Tab Navigation */}
      <div className="reports-tabs">
        <h1 className="reports-title">Reports</h1>
        
        <div className="reports-tabs__nav">
          <button
            className={`reports-tab ${activeTab === 'sales' ? 'reports-tab--active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            Sales Report
          </button>
          {isSupplier && (
            <button
              className={`reports-tab ${activeTab === 'customers' ? 'reports-tab--active' : ''}`}
              onClick={() => setActiveTab('customers')}
            >
              Customer Report
            </button>
          )}
          {!isSupplier && (
            <button
              className={`reports-tab ${activeTab === 'suppliers' ? 'reports-tab--active' : ''}`}
              onClick={() => setActiveTab('suppliers')}
            >
              Supplier Report
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="reports-content">
        {activeTab === 'sales' && <SalesReport user={user} />}
        {activeTab === 'customers' && isSupplier && <CustomerReport user={user} />}
        {activeTab === 'suppliers' && !isSupplier && <SupplierReport />}
      </div>
    </div>
  );
}