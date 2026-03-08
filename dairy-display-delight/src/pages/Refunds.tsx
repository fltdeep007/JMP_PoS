import { useState, useEffect } from 'react';
import POSLayout from '@/components/POSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { Trash2, Plus, Printer, Download, Eye, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RefundItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  maxQty?: number;
}

interface ReceiptItem { item_name: string; quantity: string; price: string; subtotal: string }

interface RefundPreview {
  refund_no: string | number;
  creditor: string;
  date: string;
  total: number;
  item_count: number;
  items: ReceiptItem[];
}

// ── Source item with user-editable refund qty ─────────────────────────────────
interface SourceItem {
  item_name: string;
  item_id: string;
  price: number;
  origQty: number;    // sold quantity
  refundQty: number;  // how much to refund (editable, 0 = deselected)
  selected: boolean;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

// ── Component ─────────────────────────────────────────────────────────────────
const Refunds = () => {
  const [creditors, setCreditors]           = useState<any[]>([]);
  const [items, setItems]                   = useState<any[]>([]);
  const [selectedCreditor, setSelectedCreditor] = useState<any>(null);
  const [refundItems, setRefundItems]       = useState<RefundItem[]>([]);
  const [loading, setLoading]               = useState(false);
  const [lastRefundId, setLastRefundId]     = useState<string | null>(null);
  const [preview, setPreview]               = useState<RefundPreview | null>(null);
  const [showPreview, setShowPreview]       = useState(false);

  // Bill-load flow
  const [searchCreditor, setSearchCreditor] = useState<any>(null); // creditor for bill search
  const [creditorBills, setCreditorBills]   = useState<any[]>([]);  // bills of that creditor
  const [loadingBills, setLoadingBills]     = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [sourceItems, setSourceItems]       = useState<SourceItem[]>([]);
  const [loadingBill, setLoadingBill]       = useState(false);

  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [c, i] = await Promise.all([api.getCreditors(), api.getItems()]);
      setCreditors(c);
      setItems(i);
    } catch {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    }
  };

  // ── Step 1: Creditor selected → load their bills ───────────────────────────
  const handleSearchCreditorChange = async (cid: string) => {
    const cred = creditors.find(c => c.id === cid);
    setSearchCreditor(cred || null);
    setSelectedBillId('');
    setSourceItems([]);
    setCreditorBills([]);
    if (!cred) return;
    setLoadingBills(true);
    try {
      const bills = await api.getCreditorReceipts(cred.id, {});
      // show only un-refunded SALE bills
      const active = (Array.isArray(bills) ? bills : [])
        .filter((b: any) => !b.refunded && (b.type === 'SALE' || !b.type));
      setCreditorBills(active);
    } catch {
      toast({ title: 'Error', description: 'Failed to load bills', variant: 'destructive' });
    } finally {
      setLoadingBills(false);
    }
  };

  // ── Step 2: Bill selected → fetch its items ────────────────────────────────
  const handleBillSelect = async (billId: string) => {
    setSelectedBillId(billId);
    setSourceItems([]);
    if (!billId) return;
    setLoadingBill(true);
    try {
      const bill = await api.previewRefund(billId);
      const raw: any[] = bill.items || [];
      setSourceItems(raw.map((it: any) => ({
        item_id:   it.item_id?.toString() || '',
        item_name: it.item_name || it.name || 'Unknown',
        price:     Number(it.price || 0),
        origQty:   Number(it.quantity ?? it.qty ?? 1),
        refundQty: Number(it.quantity ?? it.qty ?? 1), // default = full qty
        selected:  true,
      })));
      // pre-select creditor in the main form
      if (bill.creditor_id) {
        const cred = creditors.find(c =>
          c.id === (bill.creditor_id?.id || bill.creditor_id?._id || bill.creditor_id));
        if (cred) setSelectedCreditor(cred);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to load bill', variant: 'destructive' });
    } finally {
      setLoadingBill(false);
    }
  };

  const toggleSourceItem = (idx: number, checked: boolean) =>
    setSourceItems(p => p.map((it, i) => i === idx ? { ...it, selected: checked } : it));

  const setRefundQty = (idx: number, val: string) =>
    setSourceItems(p => p.map((it, i) => {
      if (i !== idx) return it;
      const q = Math.min(Math.max(parseFloat(val) || 0, 0), it.origQty);
      return { ...it, refundQty: q, selected: q > 0 };
    }));

  const applySourceItems = () => {
    const selected = sourceItems
      .filter(it => it.selected && it.refundQty > 0)
      .map(it => ({
        id: it.item_id,
        name: it.item_name,
        qty: it.refundQty,
        price: it.price,
        maxQty: it.origQty,
      }));
    if (!selected.length) {
      toast({ title: 'Error', description: 'Select at least one item', variant: 'destructive' });
      return;
    }
    setRefundItems(selected);
    setSourceItems([]);
    setSelectedBillId('');
    setCreditorBills([]);
    setSearchCreditor(null);
  };

  // ── Manual item management ─────────────────────────────────────────────────
  const addItem = () => {
    if (!items.length) return;
    const f = items[0];
    setRefundItems(p => [...p, { id: f.id, name: f.name, qty: 1, price: parseFloat(f.price || 0) }]);
  };
  const removeItem = (idx: number) => setRefundItems(p => p.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) =>
    setRefundItems(p => {
      const u = [...p];
      if (field === 'id') {
        const it = items.find(i => i.id === value);
        if (it) u[idx] = { ...u[idx], id: it.id, name: it.name, price: parseFloat(it.price || 0) };
      } else {
        const num = parseFloat(value) || 0;
        const capped = u[idx].maxQty ? Math.min(num, u[idx].maxQty!) : num;
        u[idx] = { ...u[idx], [field]: capped };
      }
      return u;
    });

  const total = refundItems.reduce((s, i) => s + i.qty * i.price, 0);

  // ── Preview ────────────────────────────────────────────────────────────────
  const buildPreview = (rid?: string): RefundPreview => ({
    refund_no: rid || 'PENDING',
    creditor: selectedCreditor?.name || '-',
    date: new Date().toLocaleString('en-IN'),
    total,
    item_count: refundItems.length,
    items: refundItems.map(i => ({
      item_name: i.name,
      quantity: i.qty.toFixed(3),
      price: i.price.toFixed(2),
      subtotal: (i.qty * i.price).toFixed(2),
    })),
  });

  const handlePreview = () => {
    if (!selectedCreditor || !refundItems.length) {
      toast({ title: 'Error', description: 'Select a creditor and add items', variant: 'destructive' }); return;
    }
    setPreview(buildPreview(lastRefundId || undefined));
    setShowPreview(true);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedCreditor) { toast({ title: 'Error', description: 'Select a creditor', variant: 'destructive' }); return; }
    if (!refundItems.length) { toast({ title: 'Error', description: 'Add items to refund', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const response = await api.createRefund({
        creditor_id: selectedCreditor.id,
        items: refundItems.map(i => ({
          item_id: i.id, item_name: i.name,
          quantity: i.qty, price: i.price,
          subtotal: parseFloat((i.qty * i.price).toFixed(2)),
        })),
        total,
      });
      const rid = response.id;
      setLastRefundId(rid);
      setPreview(buildPreview(rid));
      toast({ title: 'Refund processed', description: `Refund #${rid} created` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create refund', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Download / Print ───────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!lastRefundId) { toast({ title: 'Info', description: 'Process the refund first' }); return; }
    try { await api.downloadRefund(lastRefundId); toast({ title: 'Downloaded' }); }
    catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };
  const handlePrint = async () => {
    if (!lastRefundId) { toast({ title: 'Info', description: 'Process the refund first' }); return; }
    try { await api.printRefund(lastRefundId); toast({ title: 'Print job sent' }); }
    catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };
  const handleClear = () => {
    setRefundItems([]); setSelectedCreditor(null); setLastRefundId(null); setPreview(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <POSLayout>
      {/* Preview modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[340px] p-0">
          <DialogHeader className="sr-only"><DialogTitle>Refund Receipt Preview</DialogTitle></DialogHeader>
          <div className="bg-white text-black p-6 font-mono text-xs leading-relaxed">
            {preview && (
              <div className="space-y-1">
                <div className="text-center font-bold text-sm mb-3">JMP</div>
                <div className="text-center text-[10px] mb-3">
                  <div>Main Street 1</div><div>90210 Weldone</div>
                  <div>Tax No.: 123456789</div><div>+91 98765 43210</div>
                </div>
                <div className="border-t border-dashed border-black my-2" />
                <div className="text-center font-bold text-red-600 my-2">− REFUND RECEIPT −</div>
                <div className="space-y-0.5">
                  <div>Refund No.: {preview.refund_no}</div>
                  <div>Date: {preview.date}</div>
                  <div>Creditor: {preview.creditor}</div>
                </div>
                <div className="border-t border-dashed border-black my-2" />
                <div className="font-semibold mb-1">Refunded Items:</div>
                {preview.items.map((it, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="truncate">{it.item_name}</div>
                    <div className="flex justify-between text-[10px]">
                      <span>{it.quantity} × ₹{it.price}</span>
                      <span className="text-red-600">−₹{it.subtotal}</span>
                    </div>
                  </div>
                ))}
                <div className="border-t border-dashed border-black my-2" />
                <div className="flex justify-between"><span>Items:</span><span>{preview.item_count}</span></div>
                <div className="flex justify-between font-bold text-sm mt-1">
                  <span>TOTAL REFUND:</span>
                  <span className="text-red-600">−₹{preview.total.toFixed(2)}</span>
                </div>
                <div className="border-t border-dashed border-black my-2" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Refund Receipt</h2>
          <p className="text-muted-foreground">Process full or partial item refunds</p>
        </div>

        {/* ── Bill Lookup ── */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Load from Existing Bill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Creditor */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Step 1 — Select Creditor</Label>
                <Select
                  value={searchCreditor?.id?.toString() || ''}
                  onValueChange={handleSearchCreditorChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose creditor to see their bills…" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditors.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Bill */}
              <div className="space-y-1.5">
                <Label>Step 2 — Select Bill</Label>
                <Select
                  value={selectedBillId}
                  onValueChange={handleBillSelect}
                  disabled={!searchCreditor || loadingBills}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !searchCreditor ? 'Select a creditor first' :
                      loadingBills ? 'Loading bills…' :
                      creditorBills.length === 0 ? 'No active bills found' :
                      'Choose a bill…'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {creditorBills.map((b: any) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        #{b.id?.slice(-6)} · {b.created_at ? fmtDate(b.created_at) : '—'} · ₹{Number(b.total||0).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Step 3: Item list with qty inputs */}
            {loadingBill && <p className="text-sm text-muted-foreground">Loading bill items…</p>}
            {sourceItems.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Step 3 — Select items &amp; set refund quantity
                </Label>

                {/* Header */}
                <div className="grid grid-cols-[24px_1fr_120px_80px_90px] gap-2 px-3 text-xs text-muted-foreground font-medium">
                  <span />
                  <span>Item</span>
                  <span>Sold</span>
                  <span>Refund Qty</span>
                  <span className="text-right">Amount</span>
                </div>

                {sourceItems.map((it, idx) => (
                  <div
                    key={idx}
                    className={`grid grid-cols-[24px_1fr_120px_80px_90px] gap-2 items-center rounded-md border px-3 py-2 transition-colors ${it.selected ? 'bg-red-50 border-red-200' : 'opacity-50'}`}
                  >
                    <Checkbox
                      id={`src-${idx}`}
                      checked={it.selected}
                      onCheckedChange={v => toggleSourceItem(idx, !!v)}
                    />
                    <label htmlFor={`src-${idx}`} className="text-sm font-medium cursor-pointer truncate">
                      {it.item_name}
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {it.origQty} units · ₹{it.price}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={it.origQty}
                      step={0.001}
                      value={it.refundQty}
                      onChange={e => setRefundQty(idx, e.target.value)}
                      className="h-8 text-sm"
                      title={`Max refundable: ${it.origQty}`}
                    />
                    <span className={`text-sm font-semibold text-right ${it.selected ? 'text-red-500' : 'text-muted-foreground'}`}>
                      −₹{(it.refundQty * it.price).toFixed(2)}
                    </span>
                  </div>
                ))}

                {/* Partial refund summary */}
                <div className="flex items-center justify-between px-1 pt-1">
                  <span className="text-sm text-muted-foreground">
                    {sourceItems.filter(it => it.selected).length} of {sourceItems.length} item(s) selected
                    · Total: <span className="text-red-500 font-semibold">
                      −₹{sourceItems.filter(it=>it.selected).reduce((s,it)=>s+it.refundQty*it.price,0).toFixed(2)}
                    </span>
                  </span>
                  <Button size="sm" onClick={applySourceItems}>
                    Apply to Refund Form →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Main refund form ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Refund Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Creditor</Label>
                <Select
                  value={selectedCreditor?.id?.toString() || ''}
                  onValueChange={v => setSelectedCreditor(creditors.find(c=>c.id===v)||null)}
                >
                  <SelectTrigger><SelectValue placeholder="Choose creditor" /></SelectTrigger>
                  <SelectContent>
                    {creditors.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name} — ₹{Number(c.balance||0).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCreditor && (
                <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-0.5">
                  <p><span className="font-semibold">Mobile:</span> {selectedCreditor.mobile}</p>
                  <p><span className="font-semibold">Balance:</span> ₹{Number(selectedCreditor.balance||0).toFixed(2)}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Items to Refund</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addItem}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Manually
                  </Button>
                </div>

                {refundItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <Select value={item.id.toString()} onValueChange={v => updateItem(idx, 'id', v)}>
                      <SelectTrigger className="flex-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {items.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-col">
                      <Input
                        type="number" step="0.001" min="0.001"
                        max={item.maxQty}
                        value={item.qty}
                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                        className="w-24 h-9 text-sm"
                        placeholder="Qty"
                        title={item.maxQty ? `Max: ${item.maxQty}` : 'Quantity'}
                      />
                      {item.maxQty && (
                        <span className="text-[10px] text-muted-foreground mt-0.5 text-center">
                          max {item.maxQty}
                        </span>
                      )}
                    </div>
                    <Input
                      type="number" step="0.01" min="0"
                      value={item.price}
                      onChange={e => updateItem(idx, 'price', e.target.value)}
                      className="w-24 h-9 text-sm"
                      placeholder="Price"
                    />
                    <Button type="button" variant="destructive" size="icon" className="h-9 w-9" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {refundItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 rounded-md border border-dashed">
                    Load from a bill above, or add items manually
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader><CardTitle>Refund Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {refundItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No items added</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {refundItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.name}
                          {item.maxQty && <span className="text-xs ml-1 text-muted-foreground/60">(sold:{item.maxQty})</span>}
                          {' '}× {item.qty}
                        </span>
                        <span className="font-semibold text-red-500">
                          −₹{(item.qty * item.price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-lg font-bold">Total Refund:</span>
                    <span className="text-xl font-bold text-red-500">−₹{total.toFixed(2)}</span>
                  </div>

                  {lastRefundId && (
                    <Badge variant="outline" className="w-full justify-center text-green-600 border-green-600">
                      Refund #{lastRefundId} processed ✓
                    </Badge>
                  )}

                  <div className="space-y-2 pt-1">
                    <Button className="w-full" onClick={handleSubmit} disabled={loading}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {loading ? 'Processing…' : 'Process Refund'}
                    </Button>

                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="outline" size="sm" onClick={handlePreview}>
                        <Eye className="mr-1.5 h-4 w-4" /> Preview
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownload} disabled={!lastRefundId}>
                        <Download className="mr-1.5 h-4 w-4" /> Download
                      </Button>
                      <Button variant="outline" size="sm" onClick={handlePrint} disabled={!lastRefundId}>
                        <Printer className="mr-1.5 h-4 w-4" /> Print
                      </Button>
                    </div>

                    {lastRefundId && (
                      <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={handleClear}>
                        Clear &amp; New Refund
                      </Button>
                    )}
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
