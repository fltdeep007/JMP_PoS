import { useEffect, useState } from 'react';
import POSLayout from '@/components/POSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Receipt, Package, TrendingUp } from 'lucide-react';
import { api } from '@/services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCreditors: 0,
    totalItems: 0,
    todayBills: 0,
    totalCredit: 0,
  });
  const [waStatus, setWaStatus] = useState<any>({ status: 'DISCONNECTED', qrCode: '', user: null });
  const [loadingWa, setLoadingWa] = useState(false);

  useEffect(() => {
    loadStats();
    fetchWhatsAppStatus();
    
    // Poll WhatsApp status every 5 seconds to detect QR code scanning
    const interval = setInterval(fetchWhatsAppStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchWhatsAppStatus = async () => {
    try {
      const data = await api.getWhatsAppStatus();
      setWaStatus(data);
    } catch (err) {
      console.error('Failed to fetch WhatsApp status:', err);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp? You will not be able to send reminders.')) return;
    setLoadingWa(true);
    try {
      await api.disconnectWhatsApp();
      await fetchWhatsAppStatus();
    } catch (err) {
      console.error('Failed to disconnect WhatsApp:', err);
    } finally {
      setLoadingWa(false);
    }
  };

  const loadStats = async () => {
    try {
      // Load main counts in parallel
      const [creditors, items, todayBills] = await Promise.all([
        api.getCreditors(),
        api.getItems(),
        api.getTodayBills(), // ✅ new optimized endpoint
      ]);

      // Calculate today's total credit
      const todayTotal = todayBills.reduce(
        (sum: number, bill: any) => sum + parseFloat(bill.total || 0),
        0
      );

      setStats({
        totalCreditors: creditors.length,
        totalItems: items.length,
        todayBills: todayBills.length,
        totalCredit: todayTotal,
      });
    } catch (error) {
      console.error('❌ Failed to load dashboard stats:', error);
    }
  };

  const statCards = [
    {
      title: 'Total Creditors',
      value: stats.totalCreditors,
      icon: Users,
      color: 'text-primary',
    },
    {
      title: 'Total Items',
      value: stats.totalItems,
      icon: Package,
      color: 'text-accent',
    },
    {
      title: "Today's Bills",
      value: stats.todayBills,
      icon: Receipt,
      color: 'text-secondary',
    },
    {
      title: "Today's Credit",
      value: `₹${stats.totalCredit.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-primary',
    },
  ];

  return (
    <POSLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your POS system</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a href="/billing" className="block rounded-lg border p-4 hover:bg-muted">
                <h3 className="font-semibold">Create New Bill</h3>
                <p className="text-sm text-muted-foreground">Start billing for creditors</p>
              </a>
              <a href="/creditors" className="block rounded-lg border p-4 hover:bg-muted">
                <h3 className="font-semibold">Manage Creditors</h3>
                <p className="text-sm text-muted-foreground">Add or update creditor accounts</p>
              </a>
              <a href="/items" className="block rounded-lg border p-4 hover:bg-muted">
                <h3 className="font-semibold">Manage Items</h3>
                <p className="text-sm text-muted-foreground">Update product prices and details</p>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Creditors:</span>
                <span className="font-semibold">{stats.totalCreditors}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Available Items:</span>
                <span className="font-semibold">{stats.totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Today's Activity:</span>
                <span className="font-semibold">{stats.todayBills} bills</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Today's Total Credit:</span>
                <span className="font-semibold">₹{stats.totalCredit.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    waStatus.status === 'CONNECTED' ? 'bg-green-400' : waStatus.status === 'QR_READY' ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${
                    waStatus.status === 'CONNECTED' ? 'bg-green-500' : waStatus.status === 'QR_READY' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></span>
                </span>
                WhatsApp Notification Portal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {waStatus.status === 'CONNECTED' && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border rounded-xl bg-green-500/5 border-green-500/20">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg text-green-700 dark:text-green-400 flex items-center gap-2">
                      Connected successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Linked to: <span className="font-medium text-foreground">{waStatus.user?.name || 'Unknown'}</span> ({waStatus.user?.number})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Automated receipts and weekly balance reminders are active.
                    </p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={loadingWa}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition duration-200 disabled:opacity-50"
                  >
                    {loadingWa ? 'Disconnecting...' : 'Disconnect Account'}
                  </button>
                </div>
              )}

              {waStatus.status === 'CONNECTING' && (
                <div className="flex flex-col items-center justify-center py-6 space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Initializing WhatsApp helper client. Please wait...</p>
                </div>
              )}

              {waStatus.status === 'QR_READY' && (
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
                  <div className="border p-2 bg-white rounded-lg shadow-sm">
                    {waStatus.qrCode ? (
                      <img src={waStatus.qrCode} alt="WhatsApp Web QR Code" className="w-48 h-48" />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center bg-muted">Loading QR...</div>
                    )}
                  </div>
                  <div className="space-y-3 max-w-sm text-center md:text-left">
                    <h3 className="font-semibold text-lg">Scan QR Code to Link</h3>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Open <strong>WhatsApp</strong> on your phone</li>
                      <li>Tap <strong>Menu</strong> (Android) or <strong>Settings</strong> (iOS)</li>
                      <li>Select <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong></li>
                      <li>Point your phone camera to scan this QR code</li>
                    </ol>
                    <p className="text-xs text-muted-foreground pt-2">
                      Session token is cached locally. You will only need to scan this once.
                    </p>
                  </div>
                </div>
              )}

              {waStatus.status === 'DISCONNECTED' && (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 border border-dashed rounded-xl p-6">
                  <p className="text-muted-foreground font-medium">
                    WhatsApp is currently disconnected. Creditors will not receive transaction receipts or weekly alerts.
                  </p>
                  <button
                    onClick={async () => {
                      // Trigger re-initialization call
                      try {
                        await api.getWhatsAppStatus();
                      } catch (e) {}
                    }}
                    className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg shadow hover:bg-primary/90 transition"
                  >
                    Start Connection
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </POSLayout>
  );
};

export default Dashboard;
