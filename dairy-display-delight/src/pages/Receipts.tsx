import { useEffect, useState } from 'react';
import POSLayout from '@/components/POSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';

// MongoDB API response shape
type Bill = {
  id: string;
  created_at: string;
  total: number;
  creditor_id: { name: string; mobile?: string };
  created_by: { username: string };
  refunded: boolean;
  refunded_at?: string;
  refunded_amount?: number;
  refunded_by?: { username: string };
};

const Receipts = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [refundedBills, setRefundedBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [sendingWa, setSendingWa] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allBills, refunded] = await Promise.all([
        api.getAllBills(),
        api.getRefundedBills(),
      ]);
      setBills(allBills);
      setRefundedBills(Array.isArray(refunded) ? refunded : []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load receipts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (billId: string) => {
    setRefunding(billId);
    try {
      await api.refundBill(billId);
      toast({
        title: 'Success',
        description: `Bill #${billId} refunded successfully`,
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to refund bill',
        variant: 'destructive',
      });
    } finally {
      setRefunding(null);
    }
  };

  const handleSendWhatsApp = async (billId: string) => {
    setSendingWa(billId);
    try {
      await api.sendWhatsAppReceipt(billId);
      toast({
        title: 'Success',
        description: 'Receipt sent successfully via WhatsApp',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send WhatsApp receipt',
        variant: 'destructive',
      });
    } finally {
      setSendingWa(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <POSLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </POSLayout>
    );
  }

  return (
    <POSLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Receipts</h2>
            <p className="text-muted-foreground">View and manage all receipts</p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* All Active Receipts */}
        <Card>
          <CardHeader>
            <CardTitle>All Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Creditor</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No receipts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">#{bill.id}</TableCell>
                        <TableCell>{formatDate(bill.created_at)}</TableCell>
                        <TableCell>{bill.creditor_id?.name}</TableCell>
                        <TableCell>{bill.creditor_id?.mobile || '-'}</TableCell>
                        <TableCell>₹{Number(bill.total || 0).toFixed(2)}</TableCell>
                        <TableCell>{bill.created_by?.username}</TableCell>
                        <TableCell className="space-x-2">
                          <Button
                            onClick={() => handleSendWhatsApp(bill.id)}
                            disabled={sendingWa === bill.id || !bill.creditor_id?.mobile}
                            variant="outline"
                            size="sm"
                            className="bg-green-600/10 hover:bg-green-600/20 text-green-700 dark:text-green-400 border-green-500/20 hover:border-green-500/30"
                          >
                            {sendingWa === bill.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'WhatsApp'
                            )}
                          </Button>
                          <Button
                            onClick={() => handleRefund(bill.id)}
                            disabled={refunding === bill.id}
                            variant="destructive"
                            size="sm"
                          >
                            {refunding === bill.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Refund'
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Refunded Receipts */}
        <Card>
          <CardHeader>
            <CardTitle>Refunded Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill ID</TableHead>
                    <TableHead>Original Date</TableHead>
                    <TableHead>Refunded Date</TableHead>
                    <TableHead>Creditor</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Refund Amount</TableHead>
                    <TableHead>Refunded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refundedBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No refunded receipts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    refundedBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">#{bill.id}</TableCell>
                        <TableCell>{formatDate(bill.created_at)}</TableCell>
                        <TableCell>{formatDate(bill.refunded_at)}</TableCell>
                        <TableCell>{bill.creditor_id?.name}</TableCell>
                        <TableCell>{bill.creditor_id?.mobile || '-'}</TableCell>
                        <TableCell className="text-destructive">
                          -₹{Number(bill.refunded_amount || bill.total || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>{bill.refunded_by?.username || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </POSLayout>
  );
};

export default Receipts;
