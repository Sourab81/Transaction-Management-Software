'use client';

import React, { useState } from 'react';
import { FaBell, FaDollarSign, FaEllipsisV, FaHourglassHalf, FaUsers, FaChartLine, FaCog, FaReceipt, FaHistory, FaTools, FaFolderOpen, FaFileAlt, FaPlusCircle, FaUsersCog, FaArchive } from 'react-icons/fa';
import { useApp } from '../../lib/store';
import Header from '../layout/Header';
import Sidebar from '../layout/Sidebar';
import DashboardCard from '../dashboard/DashboardCard';
import ServiceForm from '../forms/ServiceForm';
import TransactionTable from '../tables/TransactionTable';
import CountersTable from '../tables/CountersTable';
import RecentServicesTable from '../tables/RecentServicesTable';
import QuickActions from './QuickActions';
import NotificationCenter from './NotificationCenter';
import WelcomeHero from './WelcomeHero';
import Footer from '../layout/Footer';

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail: string;
  colorClass: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, title, value, detail, colorClass }) => (
  <div className="card section-bale-card h-100 border-0 shadow-sm">
    <div className="card-body p-4">
      <div className="d-flex align-items-start gap-3 mb-4">
        <div className={`rounded-4 p-3 ${colorClass}`}>
          <span className="fs-4 text-white">{icon}</span>
        </div>
        <div>
          <p className="text-uppercase text-muted mb-1 small fw-semibold">{title}</p>
          <h3 className="h4 mb-0 fw-bold">{value}</h3>
        </div>
      </div>
      <p className="text-muted small mb-0">{detail}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { state, dispatch } = useApp();
  const [selectedCounterId, setSelectedCounterId] = useState(state.counters[0]?.id || '');

  const selectedCounter = state.counters.find((counter) => counter.id === selectedCounterId) || state.counters[0];

  const recentServices = [
    { id: 'service-1', name: 'Mobile Recharge', customer: 'John Doe', amount: 60, status: 'Completed' as const },
    { id: 'service-2', name: 'Bill Payment', customer: 'Jane Smith', amount: 120, status: 'Pending' as const },
    { id: 'service-3', name: 'Money Transfer', customer: 'Alex Lee', amount: 220, status: 'Failed' as const },
  ];

  const services = [
    { id: '1', name: 'Mobile Recharge', category: 'Telecom', price: 50, status: 'Active' as const, description: 'Recharge mobile phones with various operators' },
    { id: '2', name: 'Bill Payment', category: 'Utilities', price: 0, status: 'Active' as const, description: 'Pay electricity, water, and gas bills' },
    
    { id: '3', name: 'Money Transfer', category: 'Financial', price: 25, status: 'Active' as const, description: 'Send money to other accounts securely' },
  ];

  const mockTransactions = [
    { id: '1', customerName: 'John Doe', service: 'Mobile Recharge', amount: 50, status: 'completed' as const, date: '2024-01-15' },
    { id: '2', customerName: 'Jane Smith', service: 'Bill Payment', amount: 120, status: 'pending' as const, date: '2024-01-14' },
  ];

  const customers = state.customers || [];
  const transactionHistory = state.transactions || mockTransactions;

  const serviceSummary = [
    { title: 'Total Services', value: '24', detail: 'Active service items', icon: <FaCog />, colorClass: 'bg-primary' },
    { title: 'Revenue Streams', value: '$18.2K', detail: 'Last 30 days', icon: <FaDollarSign />, colorClass: 'bg-success' },
    { title: 'Pending Updates', value: '6', detail: 'Service rules to review', icon: <FaHourglassHalf />, colorClass: 'bg-warning' },
    { title: 'New Requests', value: '13', detail: 'Customer submitted tasks', icon: <FaPlusCircle />, colorClass: 'bg-info' },
  ];

  const customerSummary = [
    { title: 'Total Customers', value: `${customers.length}`, detail: 'All registered customers', icon: <FaUsers />, colorClass: 'bg-primary' },
    { title: 'Active Users', value: '834', detail: 'Logged in last 7 days', icon: <FaUsersCog />, colorClass: 'bg-success' },
    { title: 'New Leads', value: '47', detail: 'Captured this week', icon: <FaFolderOpen />, colorClass: 'bg-warning' },
    { title: 'Response Rate', value: '92%', detail: 'Customer interactions', icon: <FaChartLine />, colorClass: 'bg-info' },
  ];

  const transactionSummary = [
    { title: 'Total Volume', value: '$52.8K', detail: 'Transactions this month', icon: <FaReceipt />, colorClass: 'bg-primary' },
    { title: 'Completed', value: '1,204', detail: 'Successfully processed', icon: <FaChartLine />, colorClass: 'bg-success' },
    { title: 'Pending', value: '32', detail: 'Waiting authorization', icon: <FaHourglassHalf />, colorClass: 'bg-warning' },
    { title: 'Disputes', value: '4', detail: 'Requires review', icon: <FaHistory />, colorClass: 'bg-danger' },
  ];

  const historySummary = [
    { title: 'Recent Events', value: '38', detail: 'System logs today', icon: <FaHistory />, colorClass: 'bg-primary' },
    { title: 'Critical Alerts', value: '2', detail: 'Immediate attention', icon: <FaBell />, colorClass: 'bg-danger' },
    { title: 'System Changes', value: '12', detail: 'Policy updates', icon: <FaTools />, colorClass: 'bg-success' },
    { title: 'Audit Entries', value: '91', detail: 'Verified actions', icon: <FaArchive />, colorClass: 'bg-info' },
  ];

  const reportSummary = [
    { title: 'Revenue Growth', value: '18%', detail: 'Month over month', icon: <FaChartLine />, colorClass: 'bg-primary' },
    { title: 'Customer Retention', value: '76%', detail: 'Repeat engagement', icon: <FaUsers />, colorClass: 'bg-success' },
    { title: 'Report Exports', value: '25', detail: 'Generated reports', icon: <FaFileAlt />, colorClass: 'bg-warning' },
    { title: 'Dashboard Views', value: '4.2K', detail: 'Active sessions', icon: <FaFolderOpen />, colorClass: 'bg-info' },
  ];

  const additionsOptions = [
    { title: 'Service Rules', description: 'Configure the billing logic, thresholds, and categories used by the service engine.', icon: <FaCog /> },
    { title: 'Customer Segments', description: 'Create tags, loyalty tiers, and priority groups for your customer base.', icon: <FaUsers /> },
    { title: 'Transaction Settings', description: 'Set default payment methods, approval flows, and limits.', icon: <FaReceipt /> },
    { title: 'Report Settings', description: 'Choose templates, export formats, and email schedules for reports.', icon: <FaFileAlt /> },
    { title: 'Audit Controls', description: 'Manage history filters, user actions, and change tracking.', icon: <FaHistory /> },
    { title: 'Integration Options', description: 'Link external services, APIs, and data feeds for automation.', icon: <FaTools /> },
  ];

  const handleSearch = (query: string) => {
    console.log('Searching for:', query);
    // Implement search logic
  };

  const renderSummaryCards = (cards: SummaryCardProps[]) => (
    <div className="row g-4 mb-4">
      {cards.map((item) => (
        <div key={item.title} className="col-12 col-md-6 col-xl-3">
          <SummaryCard {...item} />
        </div>
      ))}
    </div>
  );

  const handleQuickAction = (action: string) => {
    console.log('Quick action:', action);
    // Implement quick action logic
  };

  const handleDismissNotification = (id: string) => {
    dispatch({ type: 'DISMISS_NOTIFICATION', payload: id });
  };

  const handleEditService = (service: any) => {
    console.log('Edit service:', service);
    // Implement edit service logic
  };

  const handleDeleteService = (id: string) => {
    console.log('Delete service:', id);
    // Implement delete service logic
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="row g-4">
            {/* Welcome Hero Section */}
            <div className="col-12">
              <WelcomeHero />
            </div>

            {/* Counter Info Card */}
            <div className="col-12">
              <div className="card-soft p-4">
                <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-4">
                  <div>
                    <p className="text-uppercase text-muted mb-1" style={{ letterSpacing: '0.18em', fontSize: '0.78rem' }}>Current counter</p>
                    <h2 className="h3 mb-2 fw-semibold" style={{ letterSpacing: '0.02em' }}>{selectedCounter?.name}</h2>
                    <p className="text-muted mb-0">Balance: ${selectedCounter?.currentBalance.toLocaleString()}</p>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <div className="pulse-dot"></div>
                    <span className="small fw-semibold text-success">{selectedCounter?.status}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Services Section */}
            <div className="col-12">
              <div className="card border-0 shadow-sm" style={{borderRadius: '2rem'}}>
                <div className="card-body p-5">
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <h3 className="h4 mb-0 fw-semibold">Services</h3>
                    <button
                      className="btn btn-primary btn-modern px-4 py-2"
                      onClick={() => handleQuickAction('add-service')}
                    >
                      <FaPlusCircle className="me-2" />
                      Add Service
                    </button>
                  </div>
                  <div className="row g-4">
                    {services.map((service) => (
                      <div key={service.id} className="col-12 col-md-6 col-lg-4">
                        <div className="card h-100 border-0 shadow-sm" style={{borderRadius: '1.5rem'}}>
                          <div className="card-body p-4">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                              <div className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">
                                {service.category}
                              </div>
                              <div className="dropdown">
                                <button className="btn btn-link text-muted p-0" data-bs-toggle="dropdown">
                                  <FaEllipsisV />
                                </button>
                                <ul className="dropdown-menu">
                                  <li><a className="dropdown-item" href="#" onClick={() => handleEditService(service)}>Edit</a></li>
                                  <li><a className="dropdown-item text-danger" href="#" onClick={() => handleDeleteService(service.id)}>Delete</a></li>
                                </ul>
                              </div>
                            </div>
                            <h5 className="card-title fw-semibold mb-2">{service.name}</h5>
                            <p className="card-text text-muted small mb-3">{service.description}</p>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="fw-semibold text-primary">${service.price}</span>
                              <span className={`badge ${service.status === 'Active' ? 'bg-success' : 'bg-warning'} rounded-pill px-3 py-1`}>
                                {service.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Metrics Cards */}
            <div className="col-12">
              <h3 className="h4 mb-4 fw-semibold">Today's Overview</h3>
              <div className="row g-4">
                <div className="col-12 col-sm-6 col-lg-3">
                  <DashboardCard
                    title="Today's Earnings"
                    value="$1,250"
                    icon={<FaDollarSign />}
                    trend={{ value: 12, isPositive: true }}
                    color="green"
                  />
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                  <DashboardCard
                    title="Pending Tasks"
                    value="8"
                    icon={<FaHourglassHalf />}
                    trend={{ value: 5, isPositive: false }}
                    color="orange"
                  />
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                  <DashboardCard
                    title="Active Users"
                    value="24"
                    icon={<FaUsers />}
                    color="blue"
                  />
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                  <DashboardCard
                    title="Total Transactions"
                    value="156"
                    icon={<FaChartLine />}
                    trend={{ value: 8, isPositive: true }}
                    color="purple"
                  />
                </div>
              </div>
            </div>

            {/* Main Action Area */}
            <div className="col-12">
              <h3 className="h4 mb-4 fw-semibold">Quick Actions</h3>
              <div className="row g-4">
                <div className="col-12 col-lg-8">
                  <ServiceForm selectedCounter={selectedCounter?.name || 'Not selected'} />
                </div>
                <div className="col-12 col-lg-4">
                  <div className="d-flex flex-column gap-4">
                    <QuickActions onAction={handleQuickAction} />
                    <NotificationCenter
                      notifications={state.notifications}
                      onDismiss={handleDismissNotification}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Data Tables */}
            <div className="col-12">
              <h3 className="h4 mb-4 fw-semibold">Recent Activity</h3>
              <div className="row g-4">
                <div className="col-12 col-lg-6">
                  <CountersTable counters={state.counters} />
                </div>
                <div className="col-12 col-lg-6">
                  <RecentServicesTable services={recentServices} />
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="col-12">
              <h3 className="h4 mb-4 fw-semibold">Transaction History</h3>
              <TransactionTable transactions={state.transactions} />
            </div>
          </div>
        );
      case 'services':
        return (
          <div className="row g-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm" style={{ borderRadius: '2rem' }}>
                <div className="card-body p-5">
                  <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
                    <div>
                      <p className="text-uppercase text-muted mb-1 small fw-semibold">Service Catalog</p>
                      <h3 className="h4 mb-0 fw-semibold">Manage your live services</h3>
                    </div>
                    <button className="btn btn-primary btn-modern px-4 py-2" onClick={() => handleQuickAction('add-service')}>
                      <FaPlusCircle className="me-2" />
                      Add Service
                    </button>
                  </div>
                  <p className="text-muted">Track active offerings, pricing, and service status with the latest metrics.</p>
                </div>
              </div>
            </div>

            {renderSummaryCards(serviceSummary)}

            <div className="col-12">
              <div className="row g-4">
                {services.map((service) => (
                  <div key={service.id} className="col-12 col-md-6 col-xl-4">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1.75rem' }}>
                      <div className="card-body p-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">{service.category}</span>
                          <span className="text-muted small">{service.status}</span>
                        </div>
                        <h5 className="card-title fw-semibold mb-2">{service.name}</h5>
                        <p className="text-muted small mb-4">{service.description}</p>
                        <div className="d-flex align-items-center justify-content-between">
                          <span className="fw-semibold text-primary">${service.price}</span>
                          <button className="btn btn-outline-secondary btn-sm">Edit</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'customers':
        return (
          <div className="row g-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm" style={{ borderRadius: '2rem' }}>
                <div className="card-body p-5">
                  <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
                    <div>
                      <p className="text-uppercase text-muted mb-1 small fw-semibold">Customer Hub</p>
                      <h3 className="h4 mb-0 fw-semibold">Keep your customer base engaged</h3>
                    </div>
                    <button className="btn btn-primary btn-modern px-4 py-2" onClick={() => handleQuickAction('add-customer')}>
                      <FaPlusCircle className="me-2" />
                      Add Customer
                    </button>
                  </div>
                  <p className="text-muted">Monitor customer growth, engagement, and support readiness in one place.</p>
                </div>
              </div>
            </div>

            {renderSummaryCards(customerSummary)}

            <div className="col-12">
              <div className="row g-4">
                {(customers.length ? customers : [
                  { id: 'placeholder-1', name: 'Jane Doe', email: 'jane@example.com', phone: '+1 555 123 4567' },
                  { id: 'placeholder-2', name: 'Oliver Smith', email: 'oliver@example.com', phone: '+1 555 987 6543' },
                ]).map((customer) => (
                  <div key={customer.id} className="col-12 col-md-6 col-xl-4">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1.75rem' }}>
                      <div className="card-body p-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <div>
                            <h5 className="mb-1 fw-semibold">{customer.name}</h5>
                            <p className="text-muted small mb-0">{customer.email}</p>
                          </div>
                          <span className="badge bg-success-subtle text-success rounded-pill px-3 py-2">Active</span>
                        </div>
                        <p className="text-muted small mb-3">Phone: {customer.phone}</p>
                        <button className="btn btn-outline-primary btn-sm">View profile</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'transactions':
        return (
          <div className="row g-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm" style={{ borderRadius: '2rem' }}>
                <div className="card-body p-5">
                  <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
                    <div>
                      <p className="text-uppercase text-muted mb-1 small fw-semibold">Transactions</p>
                      <h3 className="h4 mb-0 fw-semibold">Review recent activity</h3>
                    </div>
                    <button className="btn btn-primary btn-modern px-4 py-2" onClick={() => handleQuickAction('export-transactions')}>
                      <FaFileAlt className="me-2" />
                      Export
                    </button>
                  </div>
                  <p className="text-muted">A clear view of completed, pending, and disputed payment flows.</p>
                </div>
              </div>
            </div>

            {renderSummaryCards(transactionSummary)}

            <div className="col-12">
              <div className="card border-0 shadow-sm" style={{ borderRadius: '1.75rem' }}>
                <div className="card-body p-4">
                  <TransactionTable transactions={transactionHistory} />
                </div>
              </div>
            </div>
          </div>
        );
      case 'history':
        return (
          <div className="row g-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm" style={{ borderRadius: '2rem' }}>
                <div className="card-body p-5">
                  <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
                    <div>
                      <p className="text-uppercase text-muted mb-1 small fw-semibold">System History</p>
                      <h3 className="h4 mb-0 fw-semibold">Track past activity</h3>
                    </div>
                    <button className="btn btn-primary btn-modern px-4 py-2" onClick={() => handleQuickAction('filter-history')}>
                      <FaHistory className="me-2" />
                      Filter
                    </button>
                  </div>
                  <p className="text-muted">Review audit logs, events, and history details for every important change.</p>
                </div>
              </div>
            </div>

            {renderSummaryCards(historySummary)}

            <div className="col-12">
              <div className="row g-4">
                {transactionHistory.slice(0, 4).map((event) => (
                  <div key={event.id} className="col-12 col-md-6">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1.75rem' }}>
                      <div className="card-body p-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <h5 className="mb-0 fw-semibold">{event.service}</h5>
                          <span className="badge bg-secondary-subtle text-secondary rounded-pill px-3 py-2">{event.status}</span>
                        </div>
                        <p className="text-muted small mb-2">Customer: {event.customerName}</p>
                        <p className="text-muted small mb-0">Date: {event.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="row g-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm" style={{ borderRadius: '2rem' }}>
                <div className="card-body p-5">
                  <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
                    <div>
                      <p className="text-uppercase text-muted mb-1 small fw-semibold">Reports Center</p>
                      <h3 className="h4 mb-0 fw-semibold">Make data-driven decisions</h3>
                    </div>
                    <button className="btn btn-primary btn-modern px-4 py-2" onClick={() => handleQuickAction('generate-report')}>
                      <FaChartLine className="me-2" />
                      Generate
                    </button>
                  </div>
                  <p className="text-muted">View the latest insights, exports, and engagement summaries.</p>
                </div>
              </div>
            </div>

            {renderSummaryCards(reportSummary)}

            <div className="col-12">
              <div className="row g-4">
                {reportSummary.map((report) => (
                  <div key={report.title} className="col-12 col-md-6 col-xl-4">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1.75rem' }}>
                      <div className="card-body p-4">
                        <div className="d-flex align-items-center gap-3 mb-3">
                          <div className="rounded-4 bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: '3rem', height: '3rem' }}>
                            {report.icon}
                          </div>
                          <div>
                            <h5 className="mb-1 fw-semibold">{report.title}</h5>
                            <p className="text-muted small mb-0">{report.detail}</p>
                          </div>
                        </div>
                        <button className="btn btn-outline-primary btn-sm">View report</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'additions':
        return (
          <div className="row g-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm" style={{ borderRadius: '2rem' }}>
                <div className="card-body p-5">
                  <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
                    <div>
                      <p className="text-uppercase text-muted mb-1 small fw-semibold">Configuration Options</p>
                      <h3 className="h4 mb-0 fw-semibold">Fine tune system behavior</h3>
                    </div>
                    <button className="btn btn-primary btn-modern px-4 py-2" onClick={() => handleQuickAction('update-options')}>
                      <FaCog className="me-2" />
                      Manage Options
                    </button>
                  </div>
                  <p className="text-muted">Use these advanced controls to update rules, reports, and integration settings.</p>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="row g-4">
                {additionsOptions.map((option) => (
                  <div key={option.title} className="col-12 col-md-6 col-xl-4">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1.75rem' }}>
                      <div className="card-body p-4">
                        <div className="d-flex align-items-center gap-3 mb-3">
                          <div className="rounded-4 bg-secondary-subtle text-secondary d-flex align-items-center justify-content-center" style={{ width: '3rem', height: '3rem' }}>
                            {option.icon}
                          </div>
                          <h5 className="mb-0 fw-semibold">{option.title}</h5>
                        </div>
                        <p className="text-muted small mb-4">{option.description}</p>
                        <button className="btn btn-outline-primary btn-sm">Configure</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return <div>Dashboard</div>;
    }
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="d-flex min-vh-100" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)' }}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />
      {isSidebarOpen && <div className="sidebar-backdrop d-md-none" onClick={closeSidebar} />}
      <div className="flex-fill d-flex flex-column">
        <Header
          activeTab={activeTab}
          counters={state.counters}
          selectedCounterId={selectedCounterId}
          onCounterChange={setSelectedCounterId}
          onSearch={handleSearch}
          isSidebarOpen={isSidebarOpen}
          onSidebarToggle={toggleSidebar}
        />
        <main className="flex-fill overflow-auto bg-light p-4">
          <div className="container-fluid mx-auto" style={{ maxWidth: '1400px' }}>
            {renderContent()}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Dashboard;