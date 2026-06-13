import { useState, useEffect } from 'react';
import POSLayout from '@/components/POSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { Plus, Edit, Wallet, Calendar } from 'lucide-react';

const Creditors = () => {
  const [creditors, setCreditors] = useState<any[]>([]);
  const [selectedCreditor, setSelectedCreditor] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  
  // ✅ Utility function to get today's date in IST (YYYY-MM-DD)
const getTodayIST = (): string => {
  const nowUTC = new Date();
  // Add IST offset (5 hours 30 minutes = 330 minutes)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(nowUTC.getTime() + istOffsetMs);
  // Format to YYYY-MM-DD
  const year = istTime.getFullYear();
  const month = String(istTime.getMonth() + 1).padStart(2, '0');
  const day = String(istTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

  // For Creditor Details View
  const [activeTab, setActiveTab] = useState('data');
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(getTodayIST());
const [endDate, setEndDate] = useState(getTodayIST());

  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    balance: 0,
    price_group: 'retail',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCreditors();
  }, []);

  const loadCreditors = async () => {
    try {
      const data = await api.getCreditors();
      setCreditors(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load creditors',
        variant: 'destructive',
      });
    }
  };

  const handleSendReminder = async (creditor: any) => {
    setSendingReminder(creditor.id);
    try {
      await api.sendWhatsAppReminder(creditor.id);
      toast({
        title: 'Success',
        description: `Outstanding balance reminder sent to ${creditor.name} via WhatsApp.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send WhatsApp reminder',
        variant: 'destructive',
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(formData.mobile)) {
      toast({
        title: 'Invalid Mobile Number',
        description: 'Please enter a valid 10-digit mobile number starting with 6-9.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (selectedCreditor) {
        // Only send name, mobile, price_group for updates (not balance)
        await api.updateCreditor(selectedCreditor.id, {
          name: formData.name,
          mobile: formData.mobile,
          price_group: formData.price_group,
        });
        toast({ title: 'Success', description: 'Creditor updated successfully' });
      } else {
        await api.createCreditor(formData);
        toast({ title: 'Success', description: 'Creditor created successfully' });
      }
      setShowForm(false);
      setSelectedCreditor(null);
      setFormData({ name: '', mobile: '', balance: 0, price_group: 'retail' });
      loadCreditors();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const editCreditor = (creditor: any) => {
    setSelectedCreditor(creditor);
    setFormData({
      name: creditor.name,
      mobile: creditor.mobile,
      balance: creditor.balance,
      price_group: creditor.price_group,
    });
    setShowForm(true);
  };

  const openBalanceDialog = (creditor: any) => {
    setSelectedCreditor(creditor);
    setBalanceAmount('');
    setShowBalanceDialog(true);
  };

  const handleUpdateBalance = async () => {
    if (!selectedCreditor || !balanceAmount) {
      toast({
        title: 'Error',
        description: 'Please enter deposit amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await api.updateCreditorBalance(selectedCreditor.id, {
        amount_deposited: parseFloat(balanceAmount),
      });
      
      toast({
        title: 'Success',
        description: response.message || 'Balance updated successfully',
      });
      
      setShowBalanceDialog(false);
      setBalanceAmount('');
      setSelectedCreditor(null);
      loadCreditors();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const viewCreditorDetails = async (creditor: any) => {
    setSelectedCreditor(creditor);
    setActiveTab('data');
    
    // Load change logs
    try {
      const logs = await api.getCreditorChanges(creditor.id);
      setChangeLogs(logs);
    } catch (error) {
      console.error('Failed to load change logs', error);
    }
  };

  const loadReceipts = async () => {
    if (!selectedCreditor) return;
    
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const data = await api.getCreditorReceipts(selectedCreditor.id, params);
      setReceipts(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load receipts',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (activeTab === 'receipts' && selectedCreditor) {
      loadReceipts();
    }
  }, [activeTab, selectedCreditor, startDate, endDate]);

  // ✅ Utility function to get today's date in IST (YYYY-MM-DD)

  return (
    <POSLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Creditors</h2>
            <p className="text-muted-foreground">Manage creditor accounts</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setSelectedCreditor(null);
                  setFormData({ name: '', mobile: '', balance: 0, price_group: 'retail' });
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Creditor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedCreditor ? 'Edit' : 'Add'} Creditor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    maxLength={10}
                    value={formData.mobile}
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, mobile: onlyDigits });
                    }}
                    placeholder="Enter 10-digit mobile number"
                    required
                  />
                </div>
                {!selectedCreditor && (
                  <div className="space-y-2">
                    <Label htmlFor="balance">Initial Balance</Label>
                    <Input
                      id="balance"
                      type="number"
                      value={formData.balance}
                      onChange={(e) =>
                        setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })
                      }
                      required
                    />
                  </div>
                )}
                {selectedCreditor && (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-sm text-muted-foreground">
                      Current Balance: <span className="font-semibold text-foreground">₹{parseFloat(selectedCreditor.balance || 0).toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Balance cannot be edited directly. Use "Update Balance" to record deposits.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="price_group">Price Group</Label>
                  <Select
                    value={formData.price_group}
                    onValueChange={(value) => setFormData({ ...formData, price_group: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  {selectedCreditor ? 'Update' : 'Create'} Creditor
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {!selectedCreditor ? (
          <Card>
            <CardHeader>
              <CardTitle>Creditor List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Price Group</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditors.map((creditor) => (
                    <TableRow key={creditor.id}>
                      <TableCell className="font-medium">{creditor.name}</TableCell>
                      <TableCell>{creditor.mobile}</TableCell>
                      <TableCell>₹{parseFloat(creditor.balance || 0).toFixed(2)}</TableCell>
                      <TableCell className="capitalize">{creditor.price_group}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => editCreditor(creditor)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openBalanceDialog(creditor)}>
                            <Wallet className="h-4 w-4" />
                          </Button>
                          {creditor.balance < 0 && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleSendReminder(creditor)}
                              disabled={sendingReminder === creditor.id || !creditor.mobile}
                              className="bg-green-600/10 hover:bg-green-600/20 text-green-700 dark:text-green-400 border-green-500/20 hover:border-green-500/30"
                            >
                              {sendingReminder === creditor.id ? 'Sending...' : 'Remind'}
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => viewCreditorDetails(creditor)}>
                            View Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedCreditor.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{selectedCreditor.mobile}</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedCreditor(null)}>
                  Back to List
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="data">Creditor Data</TabsTrigger>
                  <TabsTrigger value="history">Creditor History</TabsTrigger>
                  <TabsTrigger value="receipts">Creditor Receipts</TabsTrigger>
                </TabsList>

                <TabsContent value="data" className="space-y-4">
                  <div className="grid gap-4">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-semibold">Name</p>
                      <p className="text-lg">{selectedCreditor.name}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-semibold">Mobile</p>
                      <p className="text-lg">{selectedCreditor.mobile}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-semibold">Current Balance</p>
                      <p className="text-lg">₹{parseFloat(selectedCreditor.balance || 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-semibold">Price Group</p>
                      <p className="text-lg capitalize">{selectedCreditor.price_group}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Old Balance</TableHead>
                        <TableHead>New Balance</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Changed By</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changeLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.action}</TableCell>
                          <TableCell>₹{parseFloat(log.old_balance || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{parseFloat(log.new_balance || 0).toFixed(2)}</TableCell>
                          <TableCell>{log.remarks || '-'}</TableCell>
                          <TableCell>{log.changed_by}</TableCell>
                          <TableCell>{new Date(log.changed_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="receipts" className="space-y-4">
                  <div className="flex gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    <Button onClick={loadReceipts}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Filter
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {receipts.map((receipt) => (
                      <Card key={receipt.bill_id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">Bill #{receipt.bill_id}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {new Date(receipt.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">₹{parseFloat(receipt.total).toFixed(2)}</p>
                              {receipt.refunded === 1 && (
                                <span className="text-xs text-destructive">Refunded</span>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {receipt.items.map((item: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell>{item.item_name}</TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>₹{parseFloat(item.price).toFixed(2)}</TableCell>
                                  <TableCell>₹{parseFloat(item.subtotal).toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <p className="text-xs text-muted-foreground mt-2">
                            Created by: {receipt.created_by}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Update Balance Dialog */}
        <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Balance</DialogTitle>
            </DialogHeader>
            {selectedCreditor && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm font-semibold">Creditor</p>
                  <p className="text-lg">{selectedCreditor.name}</p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm font-semibold">Current Balance</p>
                  <p className="text-2xl font-bold">₹{parseFloat(selectedCreditor.balance || 0).toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_amount">Amount Deposited</Label>
                  <Input
                    id="deposit_amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="Enter deposit amount"
                    required
                  />
                </div>
                {balanceAmount && (
                  <div className="rounded-lg border bg-primary/10 p-4">
                    <p className="text-sm font-semibold">New Balance</p>
                    <p className="text-2xl font-bold">
                      ₹{(parseFloat(selectedCreditor.balance || 0) - parseFloat(balanceAmount || '0')).toFixed(2)}
                    </p>
                  </div>
                )}
                <Button onClick={handleUpdateBalance} className="w-full">
                  Update Balance
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </POSLayout>
  );
};

export default Creditors;
