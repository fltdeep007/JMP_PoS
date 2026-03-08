import { useState, useEffect } from 'react';
import POSLayout from '@/components/POSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { FileText, Printer, Download, TrendingDown, TrendingUp, IndianRupee, ReceiptText } from 'lucide-react';
import * as XLSX from 'xlsx';

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleString('en-IN') : '-';

const Reports = () => {
  const [creditBills, setCreditBills] = useState<any[]>([]);
  const [duplicates, setDuplicates]   = useState<any[]>([]);
  const [loginLogs, setLoginLogs]     = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const getUTCDateString = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString().split('T')[0];

  const today = new Date();
  const [filters, setFilters] = useState({
    start_date:  getUTCDateString(today),
    end_date:    getUTCDateString(today),
    report_type: 'daily',
  });

  const { toast } = useToast();

  useEffect(() => {
    loadDuplicates();
    loadLoginLogs();
  }, []);

  // ── Credit report ─────────────────────────────────────────────────────────────
  const loadCreditReport = async () => {
    setLoadingReport(true);
    try {
      const data = await api.getCreditReport(filters);
      setCreditBills(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load credit report', variant: 'destructive' });
    } finally {
      setLoadingReport(false);
    }
  };

  const totalCredit  = creditBills.reduce((s, b) => s + Number(b.total || 0), 0);
  const totalRefunds = creditBills.filter(b => b.refunded).reduce((s, b) => s + Number(b.total || 0), 0);
  const netCredit    = totalCredit - totalRefunds;

  // ── Excel export ──────────────────────────────────────────────────────────────
  const exportToExcel = () => {
    if (!creditBills.length) return;

    const wb = XLSX.utils.book_new();

    // ── Summary sheet ──────────────────────────────────────────────────────────
    const summaryData = [
      ['JMP POS — Credit Report'],
      ['Generated At', new Date().toLocaleString('en-IN')],
      ['Period', `${filters.start_date}  to  ${filters.end_date}`],
      [],
      ['Summary'],
      ['Total Bills',      creditBills.length],
      ['Gross Credit (₹)', totalCredit.toFixed(2)],
      ['Refunded (₹)',     totalRefunds.toFixed(2)],
      ['Net Credit (₹)',   netCredit.toFixed(2)],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 24 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // ── Detail sheet ───────────────────────────────────────────────────────────
    const detailRows = creditBills.map((b, i) => ({
      'S.No':       i + 1,
      'Bill ID':    b.id,
      'Date':       b.created_at ? new Date(b.created_at).toLocaleString('en-IN') : '-',
      'Creditor':   b.creditor_id?.name   || '-',
      'Mobile':     b.creditor_id?.mobile || '-',
      'Balance (₹)': Number(b.creditor_id?.balance || 0).toFixed(2),
      'Amount (₹)': Number(b.total || 0).toFixed(2),
      'Billed By':  b.created_by?.username || '-',
      'Type':       b.type || 'SALE',
      'Refunded':   b.refunded ? 'Yes' : 'No',
    }));

    const wsDetail = XLSX.utils.json_to_sheet(detailRows);
    wsDetail['!cols'] = [
      { wch: 6 }, { wch: 28 }, { wch: 22 }, { wch: 20 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Bill Details');

    // ── Creditor summary sheet ─────────────────────────────────────────────────
    const creditorMap: Record<string, { name: string; mobile: string; bills: number; total: number }> = {};
    creditBills.forEach(b => {
      const cid = b.creditor_id?.name || 'Unknown';
      if (!creditorMap[cid]) {
        creditorMap[cid] = { name: b.creditor_id?.name || '-', mobile: b.creditor_id?.mobile || '-', bills: 0, total: 0 };
      }
      creditorMap[cid].bills++;
      creditorMap[cid].total += Number(b.total || 0);
    });
    const creditorRows = Object.values(creditorMap)
      .sort((a, b) => b.total - a.total)
      .map((c, i) => ({
        'S.No':        i + 1,
        'Creditor':    c.name,
        'Mobile':      c.mobile,
        'No. of Bills': c.bills,
        'Total (₹)':   c.total.toFixed(2),
      }));
    const wsCreditor = XLSX.utils.json_to_sheet(creditorRows);
    wsCreditor['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsCreditor, 'By Creditor');

    XLSX.writeFile(wb, `JMP_Credit_Report_${filters.start_date}_to_${filters.end_date}.xlsx`);
    toast({ title: 'Excel downloaded', description: 'Report exported successfully' });
  };

  // ── Duplicates ────────────────────────────────────────────────────────────────
  const loadDuplicates = async () => {
    try {
      const data = await api.getDuplicates();
      setDuplicates(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load duplicates', variant: 'destructive' });
    }
  };

  // ── Login Logs ────────────────────────────────────────────────────────────────
  const loadLoginLogs = async () => {
    try {
      const data = await api.getLoginLogs();
      setLoginLogs(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load login logs', variant: 'destructive' });
    }
  };

  return (
    <POSLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Reports</h2>
          <p className="text-muted-foreground">View, analyze and export system reports</p>
        </div>

        <Tabs defaultValue="credit" className="space-y-4">
          <TabsList>
            <TabsTrigger value="credit">Credit Reports</TabsTrigger>
            <TabsTrigger value="duplicates">Duplicate Receipts</TabsTrigger>
            <TabsTrigger value="logs">Login Logs</TabsTrigger>
          </TabsList>

          {/* ── Credit Report ── */}
          <TabsContent value="credit" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input id="start_date" type="date" value={filters.start_date}
                      onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input id="end_date" type="date" value={filters.end_date}
                      onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="report_type">Report Type</Label>
                    <Select value={filters.report_type}
                      onValueChange={(v) => setFilters({ ...filters, report_type: v })}>
                      <SelectTrigger id="report_type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={loadCreditReport} disabled={loadingReport} className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      {loadingReport ? 'Loading…' : 'Generate Report'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {creditBills.length > 0 && (
              <>
                {/* ─ Summary cards ─ */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-primary/10 p-2">
                          <ReceiptText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Bills</p>
                          <p className="text-2xl font-bold">{creditBills.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-green-500/10 p-2">
                          <IndianRupee className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Gross Credit</p>
                          <p className="text-2xl font-bold text-green-600">₹{totalCredit.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-destructive/10 p-2">
                          <TrendingDown className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Refunded</p>
                          <p className="text-2xl font-bold text-destructive">₹{totalRefunds.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-500/10 p-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Net Credit</p>
                          <p className="text-2xl font-bold text-blue-600">₹{netCredit.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* ─ Bill detail table ─ */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Bill Details</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={exportToExcel}>
                          <Download className="mr-2 h-4 w-4" />
                          Export Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.print()}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Bill ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Creditor</TableHead>
                            <TableHead>Mobile</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Billed By</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {creditBills.map((bill: any, i) => (
                            <TableRow key={bill.id} className={bill.refunded ? 'opacity-60' : ''}>
                              <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                              <TableCell className="font-mono text-xs">#{bill.id}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{fmtDate(bill.created_at)}</TableCell>
                              <TableCell className="font-medium">{bill.creditor_id?.name || '-'}</TableCell>
                              <TableCell className="text-sm">{bill.creditor_id?.mobile || '-'}</TableCell>
                              <TableCell className="font-semibold">₹{Number(bill.total || 0).toFixed(2)}</TableCell>
                              <TableCell>{bill.created_by?.username || '-'}</TableCell>
                              <TableCell>
                                {bill.refunded
                                  ? <Badge variant="destructive">Refunded</Badge>
                                  : <Badge variant="default">Active</Badge>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ── Duplicates ── */}
          <TabsContent value="duplicates">
            <Card>
              <CardHeader><CardTitle>Duplicate Receipts Log</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dup ID</TableHead>
                      <TableHead>Bill ID</TableHead>
                      <TableHead>Original Date</TableHead>
                      <TableHead>Printed At</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Creditor</TableHead>
                      <TableHead>Printed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {duplicates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No duplicate receipts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      duplicates.map((dup) => (
                        <TableRow key={dup.id}>
                          <TableCell>#{dup.id}</TableCell>
                          <TableCell>#{dup.bill_id?.id || dup.bill_id?._id || '-'}</TableCell>
                          <TableCell>{fmtDate(dup.bill_id?.created_at)}</TableCell>
                          <TableCell>{fmtDate(dup.printed_at)}</TableCell>
                          <TableCell>₹{Number(dup.bill_id?.total || 0).toFixed(2)}</TableCell>
                          <TableCell>{dup.bill_id?.creditor_id?.name || '-'}</TableCell>
                          <TableCell>{dup.printed_by?.username || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Login Logs ── */}
          <TabsContent value="logs">
            <Card>
              <CardHeader><CardTitle>User Login Logs</CardTitle></CardHeader>
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
                    {loginLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No login logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      loginLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.user_id?.username || '-'}</TableCell>
                          <TableCell>{fmtDate(log.login_time)}</TableCell>
                          <TableCell>{log.logout_time ? fmtDate(log.logout_time) : 'Active'}</TableCell>
                          <TableCell className="font-mono text-sm">{log.ip_address || '-'}</TableCell>
                          <TableCell>
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              log.logout_time
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-primary/10 text-primary'
                            }`}>
                              {log.logout_time ? 'Logged Out' : 'Active'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
