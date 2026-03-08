import { useState, useEffect } from 'react';
import POSLayout from '@/components/POSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { Trash2, Plus, Printer, Download, Eye, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface BillItem {
  id: number;
  name: string;
  qty: number;
  price: number;
  priceType: string;
}

interface ReceiptData {
  receipt_no: number;
  creditor: string;
  user: string;
  date: string;
  total: number;
  item_count: number;
  items: Array<{
    item_name: string;
    quantity: string;
    price: string;
    subtotal: string;
  }>;
  formatted: string;
}

interface Receipt {
  id: string;
  creditor_id: { name: string };
  total: number;
  created_by: { username: string };
  created_at: string;
  refunded: boolean;
}

interface ReceiptsResponse {
  total: number;
  bills: Receipt[];
}

const Billing = () => {
  const [creditors, setCreditors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedCreditor, setSelectedCreditor] = useState<any>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastBillId, setLastBillId] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptsOffset, setReceiptsOffset] = useState(0);
  const [receiptsHasMore, setReceiptsHasMore] = useState(false);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadReceipts();
  }, []);

  const loadData = async () => {
    try {
      const [creditorsData, itemsData] = await Promise.all([
        api.getCreditors(),
        api.getItems(),
      ]);
      setCreditors(creditorsData);
      setItems(itemsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    }
  };

  const loadReceipts = async (offset: number = 0) => {
    setReceiptsLoading(true);
    try {
      const data = await api.getReceipts(offset, 10);
      if (offset === 0) {
        setReceipts(data.bills || []);
      } else {
        setReceipts((prev) => [...prev, ...(data.bills || [])]);
      }
      setReceiptsOffset(offset);
      setReceiptsHasMore((offset + 10) < data.total);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load receipts',
        variant: 'destructive',
      });
    } finally {
      setReceiptsLoading(false);
    }
  };

  const handleLoadMoreReceipts = () => {
    loadReceipts(receiptsOffset + 10);
  };

  const handleDownloadReceiptById = async (receiptId: string) => {
    try {
      await api.downloadReceipt(receiptId);
      toast({
        title: 'Success',
        description: `Receipt #${receiptId} downloaded`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download receipt',
        variant: 'destructive',
      });
    }
  };

  const handlePrintDuplicate = (receiptId: string) => {
    toast({
      title: 'Coming Soon',
      description: 'Print duplicate feature will be implemented soon',
    });
  };

  const addItem = () => {
  if (!items.length) return;
  const firstItem = items[0];
  setBillItems([
    ...billItems,
    {
      id: firstItem.id,
      name: firstItem.name,
      qty: 1,
      price: parseFloat(firstItem.price || 0),
      priceType: 'standard',
    },
  ]);
};

  const removeItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...billItems];
    if (field === 'id') {
      const item = items.find((i) => i.id === value);
      if (item) {
       updated[index] = {
  ...updated[index],
  id: item.id,
  name: item.name,
  price: parseFloat(item.price || 0),
};

      }
    } else {
      updated[index] = {
  ...updated[index],
  [field]: field === 'qty' ? parseFloat(value) || 0 : value,
};

    }
    setBillItems(updated);
  };

  const calculateTotal = () => {
    return billItems.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0);
  };

  const handlePreviewReceipt = async () => {
    if (!lastBillId) {
      toast({
        title: 'Error',
        description: 'No receipt to preview',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const data = await api.previewReceipt(lastBillId);
      // Transform raw MongoDB document → ReceiptData shape
      setReceiptData({
        receipt_no: data.id,
        date: data.created_at ? new Date(data.created_at).toLocaleString('en-IN') : '-',
        user: data.created_by?.username || '-',
        creditor: data.creditor_id?.name || '-',
        total: data.total,
        item_count: data.items?.length || 0,
        items: (data.items || []).map((item: any) => ({
          item_name: item.item_name || item.name || '-',
          quantity: String(item.quantity ?? item.qty ?? 0),
          price: String(item.price || 0),
          subtotal: String(item.subtotal ?? ((item.quantity ?? item.qty ?? 0) * (item.price || 0))),
        })),
        formatted: '',
      });
      setShowPreview(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to preview receipt',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadReceipt = async () => {
    if (!lastBillId) {
      toast({
        title: 'Error',
        description: 'No receipt to download',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await api.downloadReceipt(lastBillId);
      toast({
        title: 'Success',
        description: `Receipt #${lastBillId} downloaded`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download receipt',
        variant: 'destructive',
      });
    }
  };

  const handlePrintReceipt = async () => {
    if (!lastBillId) {
      toast({
        title: 'Error',
        description: 'No receipt to print',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const response = await api.printReceipt(lastBillId);
      toast({
        title: 'Success',
        description: response.message || `Bill #${lastBillId} printed successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to print receipt',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (isDuplicate: boolean = false) => {
    if (!selectedCreditor) {
      toast({
        title: 'Error',
        description: 'Please select a creditor',
        variant: 'destructive',
      });
      return;
    }

    if (billItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add items to the bill',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.createBill({
        creditor_id: selectedCreditor.id,
        items: billItems.map(item => ({
          item_id: item.id,
          item_name: item.name,
          quantity: item.qty,
          price: item.price,
          subtotal: parseFloat((item.qty * item.price).toFixed(2)),
        })),
        total: calculateTotal(),
        is_duplicate: isDuplicate,
      });

      setLastBillId(String(response.id));
      
      toast({
        title: 'Success',
        description: `Bill #${response.id} created successfully. You can now preview, download, or print the receipt.`,
      });

      // Don't reset form automatically - let user see what they created
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <POSLayout>
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[320px] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Receipt Preview</DialogTitle>
          </DialogHeader>
          <div className="bg-white text-black p-6 font-mono text-xs leading-relaxed">
            {receiptData && (
              <div className="space-y-1">
                <div className="text-center font-bold text-sm mb-3">JMP</div>
                <div className="text-center text-[10px] mb-3">
                  <div>Main Street 1</div>
                  <div>90210 Weldone</div>
                  <div>Tax No.: 123456789</div>
                  <div>+91 98765 43210</div>
                </div>
                
                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="space-y-0.5">
                  <div>Receipt No.: {receiptData.receipt_no}</div>
                  <div>Date: {receiptData.date}</div>
                  <div>User: {receiptData.user}</div>
                  <div>Creditor: {receiptData.creditor}</div>
                </div>
                
                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="font-semibold mb-1">Items:</div>
                {receiptData.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="truncate pr-2">{item.item_name}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>{item.quantity} x ₹{item.price}</span>
                      <span>₹{item.subtotal}</span>
                    </div>
                  </div>
                ))}
                
                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="flex justify-between">
                  <span>Item count:</span>
                  <span>{receiptData.item_count}</span>
                </div>
                
                <div className="flex justify-between font-bold text-sm mt-2">
                  <span>TOTAL:</span>
                  <span>₹{receiptData.total.toFixed(2)}</span>
                </div>
                
                <div className="border-t border-dashed border-black my-2"></div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Billing</h2>
          <p className="text-muted-foreground">Create bills for creditors</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Bill Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Creditor</Label>
                <Select
                  value={selectedCreditor?.id?.toString()}
                  onValueChange={(value) => {
                    const creditor = creditors.find((c) => c.id === value);
                    setSelectedCreditor(creditor);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose creditor" />
                  </SelectTrigger>
                  <SelectContent>
  {creditors.map((creditor) => (
    <SelectItem key={creditor.id} value={creditor.id.toString()}>
      {creditor.name} — ₹{Number(creditor.balance || 0).toFixed(2)}
    </SelectItem>
  ))}
</SelectContent>

                </Select>
              </div>

              {selectedCreditor && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm">
                    <span className="font-semibold">Mobile:</span> {selectedCreditor.mobile}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Current Balance:</span> ₹
                    ₹{Number(selectedCreditor.balance || 0).toFixed(2)}

                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Price Group:</span> {selectedCreditor.price_group}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button type="button" size="sm" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                {billItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Select
                      value={item.id.toString()}
                      onValueChange={(value) => updateItem(index, 'id', value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((i) => (
                          <SelectItem key={i.id} value={i.id.toString()}>
                            {i.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
  type="number"
  step="0.01"  // ✅ allow 2 decimal places
  min="0.01"
  value={item.qty}
  onChange={(e) => updateItem(index, 'qty', parseFloat(e.target.value) || 0)}
  className="w-24"
  placeholder="Qty"
/>

                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                      className="w-24"
                      placeholder="Price"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bill Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {billItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.name} x {item.qty}
                    </span>
                    <span className="font-semibold">₹{(item.qty * item.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {billItems.length > 0 && (
                <>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>₹{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => handleSubmit(false)}
                      disabled={loading}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Create Bill
                    </Button>

                    {lastBillId && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setBillItems([]);
                          setSelectedCreditor(null);
                          setLastBillId(null);
                        }}
                      >
                        Clear & New Bill
                      </Button>
                    )}

                    <div className="border-t pt-4 space-y-2">
                      {lastBillId && (
                        <p className="text-sm text-muted-foreground mb-2">Last Bill: #{lastBillId}</p>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviewReceipt}
                          disabled={!lastBillId}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadReceipt}
                          disabled={!lastBillId}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrintReceipt}
                          disabled={!lastBillId}
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Receipts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receiptsLoading && receipts.length === 0 ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Creditor</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-medium">#{receipt.id}</TableCell>
                        <TableCell>{receipt.creditor_id?.name}</TableCell>
                        <TableCell>₹{Number(receipt.total || 0).toFixed(2)}</TableCell>
                        <TableCell>{receipt.created_at ? new Date(receipt.created_at).toLocaleString('en-IN') : '-'}</TableCell>
                        <TableCell>{receipt.created_by?.username}</TableCell>
                        <TableCell>
                          {receipt.refunded ? (
                            <Badge variant="destructive">Refunded</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadReceiptById(receipt.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintDuplicate(receipt.id)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {receiptsHasMore && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      onClick={handleLoadMoreReceipts}
                      disabled={receiptsLoading}
                    >
                      {receiptsLoading ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </POSLayout>
  );
};

export default Billing;
