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

  useEffect(() => {
    loadStats();
  }, []);

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
        </div>
      </div>
    </POSLayout>
  );
};

export default Dashboard;
