import { useState, useEffect } from 'react';
import POSLayout from '@/components/POSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { FileText, Printer } from 'lucide-react';

const Reports = () => {
  const [creditReport, setCreditReport] = useState<any>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const getUTCDateString = (date: Date) => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
};

// Initialize filters using UTC-based dates
const today = new Date();
const [filters, setFilters] = useState({
  start_date: getUTCDateString(today),
  end_date: getUTCDateString(today),
  report_type: 'daily',
});
  const { toast } = useToast();

  useEffect(() => {
    loadDuplicates();
    loadLoginLogs();
  }, []);

  const loadCreditReport = async () => {
    try {
      const data = await api.getCreditReport(filters);
      setCreditReport(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load credit report',
        variant: 'destructive',
      });
    }
  };

  const loadDuplicates = async () => {
    try {
      const data = await api.getDuplicates();
      setDuplicates(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load duplicates',
        variant: 'destructive',
      });
    }
  };

  const loadLoginLogs = async () => {
    try {
      const data = await api.getLoginLogs();
      setLoginLogs(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load login logs',
        variant: 'destructive',
      });
    }
  };

  return (
    <POSLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Reports</h2>
          <p className="text-muted-foreground">View and analyze system reports</p>
        </div>

        <Tabs defaultValue="credit" className="space-y-4">
          <TabsList>
            <TabsTrigger value="credit">Credit Reports</TabsTrigger>
            <TabsTrigger value="duplicates">Duplicate Receipts</TabsTrigger>
            <TabsTrigger value="logs">Login Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="credit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Credit Report Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={filters.start_date}
                      onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={filters.end_date}
                      onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="report_type">Report Type</Label>
                    <Select
                      value={filters.report_type}
                      onValueChange={(value) => setFilters({ ...filters, report_type: value })}
                    >
                      <SelectTrigger id="report_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={loadCreditReport} className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {creditReport && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Credit Report Results</CardTitle>
                    <Button variant="outline" onClick={() => window.print()}>
                      <Printer className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 rounded-lg bg-primary/10 p-4">
                    <p className="text-lg font-semibold">
                      Total Credit: ₹{creditReport.totalCredit.toFixed(2)}
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Creditor</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Billed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
  {creditReport.bills.map((bill: any) => (
    <TableRow key={bill.bill_id}>
      <TableCell>#{bill.bill_id}</TableCell>
      <TableCell>{new Date(bill.created_at).toLocaleString()}</TableCell>
      <TableCell>{bill.creditor_name}</TableCell>
      <TableCell>{bill.creditor_mobile}</TableCell>
      <TableCell>₹{Number(bill.total || 0).toFixed(2)}</TableCell>
      <TableCell>{bill.created_by}</TableCell>
    </TableRow>
  ))}
</TableBody>

                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="duplicates">
            <Card>
              <CardHeader>
                <CardTitle>Duplicate Receipts Log</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill ID</TableHead>
                      <TableHead>Original Date</TableHead>
                      <TableHead>Printed At</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Creditor</TableHead>
                      <TableHead>Printed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {duplicates.map((dup) => (
                      <TableRow key={dup.id}>
                        <TableCell>#{dup.bill_id}</TableCell>
                        <TableCell>{new Date(dup.original_date).toLocaleString()}</TableCell>
                        <TableCell>{new Date(dup.printed_at).toLocaleString()}</TableCell>
                        <TableCell>₹{dup.total.toFixed(2)}</TableCell>
                        <TableCell>{dup.creditor_name}</TableCell>
                        <TableCell>{dup.printed_by_user}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>User Login Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Login Time</TableHead>
                      <TableHead>Logout Time</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.username}</TableCell>
                        <TableCell>{new Date(log.login_time).toLocaleString()}</TableCell>
                        <TableCell>
                          {log.logout_time ? new Date(log.logout_time).toLocaleString() : 'Active'}
                        </TableCell>
                        <TableCell>{log.ip_address}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              log.status === 'SUCCESS'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-destructive/10 text-destructive'
                            }`}
                          >
                            {log.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </POSLayout>
  );
};

export default Reports;
