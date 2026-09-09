import React, { useState, useEffect } from 'react';
import { User, AuditLog, AppSettings } from '../types.js';
import { useToast } from '../context/ToastContext.tsx';
import { 
  Settings, Key, History, Activity, ShieldAlert, Globe, Server, Save, 
  UserPlus, Mail, Phone, Lock, Eye, EyeOff, Search, Clock
} from 'lucide-react';

interface SuperAdminPortalProps {
  currentUser: User;
}

export default function SuperAdminPortal({ currentUser }: SuperAdminPortalProps) {
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState<'settings' | 'admins' | 'audit_logs'>('settings');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [realtimeVisitors, setRealtimeVisitors] = useState(15);
  const [loading, setLoading] = useState(true);

  // Admin creation form fields
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Settings form fields
  const [websiteName, setWebsiteName] = useState('');
  const [logoText, setLogoText] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState(10);
  const [shippingCharge, setShippingCharge] = useState(50);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [logSearch, setLogSearch] = useState('');

  const fetchSuperAdminData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}` };
      
      const settingsRes = await fetch('/api/settings');
      const logsRes = await fetch('/api/admin/logs', { headers });
      const statsRes = await fetch('/api/analytics/dashboard', { headers });

      if (settingsRes.ok && logsRes.ok && statsRes.ok) {
        const settingsData = await settingsRes.json();
        const logsData = await logsRes.json();
        const statsData = await statsRes.json();

        setSettings(settingsData);
        setWebsiteName(settingsData.websiteName);
        setLogoText(settingsData.logoText);
        setCommissionPercentage(settingsData.commissionPercentage);
        setShippingCharge(settingsData.shippingCharge);
        setMaintenanceMode(settingsData.maintenanceMode);
        setEmailNotifications(settingsData.emailNotifications);

        setAuditLogs(logsData);
        setRealtimeVisitors(statsData.stats?.realtimeVisitors || 15);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperAdminData();
    const interval = setInterval(async () => {
      // Refresh visitors count occasionally
      try {
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}` };
        const statsRes = await fetch('/api/analytics/dashboard', { headers });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setRealtimeVisitors(statsData.stats?.realtimeVisitors || 15);
        }
      } catch (e) {}
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify({
          websiteName,
          logoText,
          commissionPercentage,
          shippingCharge,
          maintenanceMode,
          emailNotifications
        })
      });
      if (res.ok) {
        setSettingsSuccess('Platform global settings updated successfully.');
        success('Platform global settings updated successfully.', 'Settings Saved');
        setTimeout(() => setSettingsSuccess(''), 3000);
      } else {
        error('Failed to save system settings.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');
    setCreatingAdmin(true);

    try {
      const res = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          phone: adminPhone
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register admin account.');
      }

      setAdminSuccess(`Success! New Administrator account created for "${data.name}"`);
      setAdminName('');
      setAdminEmail('');
      setAdminPhone('');
      setAdminPassword('');
      fetchSuperAdminData(); // refresh audit logs
    } catch (err: any) {
      setAdminError(err.message);
    } finally {
      setCreatingAdmin(false);
    }
  };

  // Filter logs list
  const filteredLogs = auditLogs.filter(l => 
    l.userName.toLowerCase().includes(logSearch.toLowerCase()) || 
    l.action.toLowerCase().includes(logSearch.toLowerCase()) || 
    l.details.toLowerCase().includes(logSearch.toLowerCase()) || 
    l.ipAddress.includes(logSearch)
  );

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 min-h-screen py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Super admin headers */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-rose-600 dark:text-rose-500 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-7.5 h-7.5" />
              Super Admin supreme panel
            </h1>
            <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
              Global systems parameters, register sub-administrators, and track secure audit logs
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'settings' 
                  ? 'bg-rose-600 text-white shadow-sm' 
                  : 'bg-white dark:bg-zinc-900 border text-stone-600 dark:text-zinc-400'
              }`}
            >
              <Settings className="w-4 h-4" />
              Website Settings
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'admins' 
                  ? 'bg-rose-600 text-white shadow-sm' 
                  : 'bg-white dark:bg-zinc-900 border text-stone-600 dark:text-zinc-400'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Create Admins
            </button>
            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'audit_logs' 
                  ? 'bg-rose-600 text-white shadow-sm' 
                  : 'bg-white dark:bg-zinc-900 border text-stone-600 dark:text-zinc-400'
              }`}
            >
              <History className="w-4 h-4" />
              Security Audit Logs
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-center py-20 text-xs text-stone-400 italic animate-pulse">Loading system settings databases...</p>
        ) : (
          <>
            {/* Tab 1: Global System Settings */}
            {activeTab === 'settings' && settings && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                
                {/* Form column */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border rounded-2xl p-6 md:p-8 shadow-sm space-y-6 transition-colors">
                  <h3 className="text-sm font-extrabold uppercase text-stone-850 dark:text-zinc-200 pb-2 border-b flex items-center gap-1.5">
                    <Server className="w-4.5 h-4.5 text-rose-500" />
                    Global Portal Constants
                  </h3>

                  {settingsSuccess && (
                    <div className="p-3 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-xl border border-emerald-100">
                      {settingsSuccess}
                    </div>
                  )}

                  <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-stone-500 uppercase mb-1">Website Display Name *</label>
                        <input
                          type="text"
                          required
                          value={websiteName}
                          onChange={(e) => setWebsiteName(e.target.value)}
                          className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border rounded-xl focus:ring-1 focus:ring-rose-500 text-stone-850 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-500 uppercase mb-1">Branding Logo Text *</label>
                        <input
                          type="text"
                          required
                          value={logoText}
                          onChange={(e) => setLogoText(e.target.value)}
                          className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border rounded-xl focus:ring-1 focus:ring-rose-500 text-stone-850 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-stone-500 uppercase mb-1">Commission Taken (%) *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          max="50"
                          value={commissionPercentage}
                          onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                          className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border rounded-xl focus:ring-1 focus:ring-rose-500 text-stone-850 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-500 uppercase mb-1">Standard Delivery Charge (₹) *</label>
                        <input
                          type="number"
                          required
                          value={shippingCharge}
                          onChange={(e) => setShippingCharge(Number(e.target.value))}
                          className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border rounded-xl focus:ring-1 focus:ring-rose-500 text-stone-850 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3.5 pt-4 border-t border-stone-50 dark:border-zinc-850/60 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-stone-800 dark:text-zinc-200">Maintenance Mode State</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">Stops all buyer order placements and displays administrative maintenance screens.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={maintenanceMode}
                          onChange={() => setMaintenanceMode(!maintenanceMode)}
                          className="accent-rose-500 h-4 w-4"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-stone-50 dark:border-zinc-850/30">
                        <div>
                          <p className="font-bold text-stone-800 dark:text-zinc-200">System Notification Alerts</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">Enables in-app order logs and automated product approval notifications.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={emailNotifications}
                          onChange={() => setEmailNotifications(!emailNotifications)}
                          className="accent-rose-500 h-4 w-4"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow mt-6 cursor-pointer"
                    >
                      <Save className="w-4.5 h-4.5" />
                      Save System Parameters
                    </button>

                  </form>
                </div>

                {/* Simulated Traffic statistics side board */}
                <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-sm space-y-6 h-fit transition-colors">
                  <h3 className="text-sm font-extrabold uppercase text-stone-850 dark:text-zinc-200 pb-2 border-b flex items-center gap-1.5">
                    <Activity className="w-4.5 h-4.5 text-rose-500" />
                    Web Traffic Analytics
                  </h3>

                  <div className="space-y-4 text-xs">
                    
                    <div className="flex justify-between items-center bg-stone-50 dark:bg-zinc-850 p-4 rounded-xl border">
                      <div>
                        <p className="text-stone-400 uppercase text-[9px] tracking-wider font-extrabold">Active Now</p>
                        <p className="text-xl font-black text-rose-600 font-mono mt-1">{realtimeVisitors}</p>
                      </div>
                      <Globe className="w-8 h-8 text-rose-500/35 animate-spin" />
                    </div>

                    <div className="space-y-2 text-[11px] text-stone-600 dark:text-zinc-400">
                      <p className="font-bold text-stone-400 uppercase text-[9px] tracking-wider mb-2">Regional Traffic Breakdown</p>
                      <div className="flex justify-between">
                        <span>Mumbai Central / Bandra</span>
                        <span className="font-bold font-mono">65%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pune / Rest of Maharashtra</span>
                        <span className="font-bold font-mono">20%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>New Delhi / NCR</span>
                        <span className="font-bold font-mono">10%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Others (Overseas NRI)</span>
                        <span className="font-bold font-mono">5%</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* Tab 2: Create admins accounts */}
            {activeTab === 'admins' && (
              <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 md:p-8 shadow-sm max-w-xl mx-auto space-y-6 transition-colors animate-fade-in">
                
                <h3 className="text-sm font-extrabold uppercase text-stone-850 dark:text-zinc-200 pb-2 border-b flex items-center gap-1.5">
                  <UserPlus className="w-4.5 h-4.5 text-rose-500" />
                  Enroll Sub-Administrator Account
                </h3>

                {adminError && <div className="p-3 bg-red-50 text-red-600 font-bold text-xs rounded-xl border">{adminError}</div>}
                {adminSuccess && <div className="p-3 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-xl border">{adminSuccess}</div>}

                <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-stone-500 uppercase mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="E.g. Rajesh Moderator"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-500 uppercase mb-1.5">Admin Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="email"
                        required
                        placeholder="admin-name@mumbaibazar.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-500 uppercase mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="tel"
                        placeholder="9876543210"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-500 uppercase mb-1.5">Admin Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={creatingAdmin}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-450 text-white font-black text-xs rounded-xl shadow mt-4 cursor-pointer"
                  >
                    {creatingAdmin ? 'Provisioning Admin...' : 'Confirm Admin Enrollment'}
                  </button>

                </form>

              </div>
            )}

            {/* Tab 3: Security audit logs */}
            {activeTab === 'audit_logs' && (
              <div className="space-y-6 animate-fade-in text-xs">
                
                {/* Search Bar */}
                <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-4 flex items-center gap-3">
                  <Search className="w-4.5 h-4.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search security audit logs by activity details, usernames, roles or IP..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="flex-1 text-xs text-stone-850 dark:text-white bg-transparent focus:outline-none"
                  />
                </div>

                {/* Audit Logs list */}
                <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-sm space-y-4 max-h-[600px] overflow-y-auto">
                  {filteredLogs.length === 0 ? (
                    <p className="text-center py-10 text-stone-400 italic">No activity logs matching search.</p>
                  ) : (
                    filteredLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-stone-50 dark:bg-zinc-850/60 border rounded-xl flex items-start gap-4 transition-all">
                        <Clock className="w-4 h-4 text-rose-500 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 flex flex-col sm:flex-row sm:justify-between gap-2">
                          <div>
                            <p className="font-extrabold text-stone-850 dark:text-zinc-200">
                              {log.action} •{' '}
                              <span className="text-[10px] text-stone-400 font-normal">
                                By {log.userName} ({log.userRole.replace('_', ' ')})
                              </span>
                            </p>
                            <p className="text-stone-500 dark:text-zinc-400 mt-1 leading-normal text-[11px]">{log.details}</p>
                          </div>
                          <div className="sm:text-right text-[10px] text-stone-400 font-mono flex-shrink-0">
                            <p>{log.ipAddress}</p>
                            <p className="mt-1 font-bold">{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

          </>
        )}

      </div>
    </div>
  );
}
