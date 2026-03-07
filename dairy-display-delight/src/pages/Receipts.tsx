import { useEffect, useState } from 'react';
import POSLayout from '@/components/POSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';

type BillSummary = {
  bill_id: number;
  created_at: string;
  total: number;
  creditor_name: string;
  creditor_mobile: string;
  created_by: string;
};

type RefundedBill = {
  bill_id: number;
  original_date: string;
  refunded_at: string;
  refund_amount: number;
  creditor_name: string;
  creditor_mobile: string;
  refunded_by: string;
};

const Receipts = () => {
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [refundedBills, setRefundedBills] = useState<RefundedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<number | null>(null);
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
      setRefundedBills(refunded.refunded_bills || []);
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

  const handleRefund = async (billId: number) => {
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

  const formatDate = (dateString: string) => {
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

        {/* All Receipts */}
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
                      <TableRow key={bill.bill_id}>
                        <TableCell className="font-medium">#{bill.bill_id}</TableCell>
                        <TableCell>{formatDate(bill.created_at)}</TableCell>
                        <TableCell>{bill.creditor_name}</TableCell>
                        <TableCell>{bill.creditor_mobile}</TableCell>
                        <TableCell>₹{parseFloat(bill.total.toString()).toFixed(2)}</TableCell>
                        <TableCell>{bill.created_by}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleRefund(bill.bill_id)}
                            disabled={refunding === bill.bill_id}
                            variant="destructive"
                            size="sm"
                          >
                            {refunding === bill.bill_id ? (
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
                      <TableRow key={bill.bill_id}>
                        <TableCell className="font-medium">#{bill.bill_id}</TableCell>
                        <TableCell>{formatDate(bill.original_date)}</TableCell>
                        <TableCell>{formatDate(bill.refunded_at)}</TableCell>
                        <TableCell>{bill.creditor_name}</TableCell>
                        <TableCell>{bill.creditor_mobile}</TableCell>
                        <TableCell className="text-destructive">
                          -₹{parseFloat(bill.refund_amount.toString()).toFixed(2)}
                        </TableCell>
                        <TableCell>{bill.refunded_by}</TableCell>
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
