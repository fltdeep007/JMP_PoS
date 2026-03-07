import { useState, useEffect } from 'react';
import POSLayout from '@/components/POSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { Trash2, Plus, Printer, Download, Eye, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RefundItem {
  id: number;
  name: string;
  qty: number;
  price: number;
}

interface RefundReceiptData {
  refund_no: number;
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
}

const Refunds = () => {
  const [creditors, setCreditors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedCreditor, setSelectedCreditor] = useState<any>(null);
  const [refundItems, setRefundItems] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefundId, setLastRefundId] = useState<number | null>(null);
  const [refundReceiptData, setRefundReceiptData] = useState<RefundReceiptData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
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

  const addItem = () => {
    if (!items.length) return;
    const firstItem = items[0];
    setRefundItems([
      ...refundItems,
      {
        id: firstItem.id,
        name: firstItem.name,
        qty: 1,
        price: parseFloat(firstItem.price || 0),
      },
    ]);
  };

  const removeItem = (index: number) => {
    setRefundItems(refundItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...refundItems];
    if (field === 'id') {
      const item = items.find((i) => i.id === parseInt(value));
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
        [field]: field === 'qty' ? parseFloat(value) || 0 : parseFloat(value) || 0,
      };
    }
    setRefundItems(updated);
  };

  const calculateTotal = () => {
    return refundItems.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0);
  };

  const handlePreviewRefund = () => {
    if (!selectedCreditor) {
      toast({
        title: 'Error',
        description: 'Please select a creditor',
        variant: 'destructive',
      });
      return;
    }

    if (refundItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add items to refund',
        variant: 'destructive',
      });
      return;
    }

    // Create preview data
    const previewData: RefundReceiptData = {
      refund_no: lastRefundId || 0,
      creditor: selectedCreditor.name,
      user: 'Current User',
      date: new Date().toLocaleString('en-IN'),
      total: calculateTotal(),
      item_count: refundItems.length,
      items: refundItems.map(item => ({
        item_name: item.name,
        quantity: item.qty.toFixed(3),
        price: item.price.toFixed(2),
        subtotal: (item.qty * item.price).toFixed(2),
      })),
    };

    setRefundReceiptData(previewData);
    setShowPreview(true);
  };

  const handleDownloadRefund = () => {
    toast({
      title: 'Coming Soon',
      description: 'Download refund receipt feature will be implemented soon',
    });
  };

  const handlePrintRefund = () => {
    toast({
      title: 'Coming Soon',
      description: 'Print refund receipt feature will be implemented soon',
    });
  };

  const handleSubmit = async () => {
    if (!selectedCreditor) {
      toast({
        title: 'Error',
        description: 'Please select a creditor',
        variant: 'destructive',
      });
      return;
    }

    if (refundItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add items to refund',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.createRefund({
        creditor_id: selectedCreditor.id,
        items: refundItems.map(item => ({
          item_id: item.id,
          name: item.name,
          quantity: item.qty,
          price: item.price,
        })),
      });

      setLastRefundId(response.refund_id);
      
      toast({
        title: 'Success',
        description: response.message || `Refund #${response.refund_id} created successfully`,
      });

      // Update preview data with actual refund ID
      if (refundReceiptData) {
        setRefundReceiptData({
          ...refundReceiptData,
          refund_no: response.refund_id,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create refund',
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
            <DialogTitle>Refund Receipt Preview</DialogTitle>
          </DialogHeader>
          <div className="bg-white text-black p-6 font-mono text-xs leading-relaxed">
            {refundReceiptData && (
              <div className="space-y-1">
                <div className="text-center font-bold text-sm mb-3">JMP</div>
                <div className="text-center text-[10px] mb-3">
                  <div>Main Street 1</div>
                  <div>90210 Weldone</div>
                  <div>Tax No.: 123456789</div>
                  <div>+91 98765 43210</div>
                </div>
                
                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="text-center font-bold text-red-600 my-2">REFUND RECEIPT</div>
                
                <div className="space-y-0.5">
                  <div>Refund No.: {refundReceiptData.refund_no || 'PENDING'}</div>
                  <div>Date: {refundReceiptData.date}</div>
                  <div>User: {refundReceiptData.user}</div>
                  <div>Creditor: {refundReceiptData.creditor}</div>
                </div>
                
                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="font-semibold mb-1">Refunded Items:</div>
                {refundReceiptData.items.map((item, idx) => (
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
                  <span>{refundReceiptData.item_count}</span>
                </div>
                
                <div className="flex justify-between font-bold text-sm mt-2">
                  <span>TOTAL REFUND:</span>
                  <span>₹{refundReceiptData.total.toFixed(2)}</span>
                </div>
                
                <div className="border-t border-dashed border-black my-2"></div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Refund Receipt</h2>
          <p className="text-muted-foreground">Process refunds for creditors</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Refund Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Creditor</Label>
                <Select
                  value={selectedCreditor?.id?.toString()}
                  onValueChange={(value) => {
                    const creditor = creditors.find((c) => c.id === parseInt(value));
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
                    <span className="font-semibold">Current Balance:</span> ₹{Number(selectedCreditor.balance || 0).toFixed(2)}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Price Group:</span> {selectedCreditor.price_group}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Items to Refund</Label>
                  <Button type="button" size="sm" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                {refundItems.map((item, index) => (
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
                      step="0.01"
                      min="0.01"
                      value={item.qty}
                      onChange={(e) => updateItem(index, 'qty', e.target.value)}
                      className="w-24"
                      placeholder="Qty"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', e.target.value)}
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
              <CardTitle>Refund Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {refundItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.name} x {item.qty}
                    </span>
                    <span className="font-semibold">₹{(item.qty * item.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {refundItems.length > 0 && (
                <>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Refund:</span>
                      <span>₹{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Process Refund
                    </Button>

                    {lastRefundId && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setRefundItems([]);
                          setSelectedCreditor(null);
                          setLastRefundId(null);
                        }}
                      >
                        Clear & New Refund
                      </Button>
                    )}

                    <div className="border-t pt-4 space-y-2">
                      {lastRefundId && (
                        <p className="text-sm text-muted-foreground mb-2">Last Refund: #{lastRefundId}</p>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviewRefund}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadRefund}
                          disabled={!lastRefundId}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrintRefund}
                          disabled={!lastRefundId}
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
      </div>
    </POSLayout>
  );
};

export default Refunds;
