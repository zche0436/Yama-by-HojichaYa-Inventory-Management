import { useState, useEffect, useCallback } from 'react';
import { Plus, Minus, ArrowDownUp, Trash2, PlusCircle } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { DatePicker } from '@project/components/ui/date-picker';
import { getTodayLogs, getItems, recordStock } from 'zitejs/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CATEGORIES = ['Powders', 'Tea Leaves', 'Bar', 'Cha-Gelato', 'Raw Materials', 'Dessert Ingredients', 'Loose Tea (Retail)', 'Tea Powder (Retail)', 'Teabags (Retail)', 'Teaware (Retail)', 'Packaging Materials', 'Hygiene Materials', 'Receipt Materials'];

type TodayLog = {
  id: string; date: string | null; type: string | null; quantity: number | null;
  reason: string | null; countedBy: string | null; notes: string | null;
  itemName: string; category: string;
};
type ItemOption = { id: string; name: string; category: string; unit: string };
type LineItem = { id: number; category: string; itemId: string; quantity: string; itemName: string; unit: string };

let lineCounter = 0;

export default function QuickActionsPage() {
  const [logs, setLogs] = useState<TodayLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'Stock In' | 'Stock Out'>('Stock In');

  const loadLogs = useCallback(async () => {
    try {
      const data = await getTodayLogs({});
      setLogs(data.logs);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const openDialog = (type: 'Stock In' | 'Stock Out') => {
    setDialogType(type);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Quick Actions</h1>
        <p className="text-sm text-muted-foreground">Log daily stock movements</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => openDialog('Stock In')}
          className="flex flex-col items-center gap-3 p-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 transition-all active:scale-[0.98]">
          <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center">
            <Plus className="h-7 w-7 text-white" />
          </div>
          <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-lg">Stock In</span>
        </button>
        <button onClick={() => openDialog('Stock Out')}
          className="flex flex-col items-center gap-3 p-6 rounded-xl bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 hover:border-red-400 transition-all active:scale-[0.98]">
          <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center">
            <Minus className="h-7 w-7 text-white" />
          </div>
          <span className="font-semibold text-red-700 dark:text-red-300 text-lg">Stock Out</span>
        </button>
      </div>

      <div>
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Today's Log</h2>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ArrowDownUp className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No transactions logged today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => <LogCard key={log.id} log={log} />)}
          </div>
        )}
      </div>

      <StockDialog open={dialogOpen} onOpenChange={setDialogOpen} type={dialogType} onSuccess={loadLogs} />
    </div>
  );
}

function LogCard({ log }: { log: TodayLog }) {
  const isIn = log.type === 'Stock In';
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isIn ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
        {isIn ? <Plus className="h-4 w-4 text-emerald-600" /> : <Minus className="h-4 w-4 text-red-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{log.itemName}</p>
        <p className="text-xs text-muted-foreground">{log.countedBy}</p>
      </div>
      <div className="text-right shrink-0">
        <span className={`font-semibold text-sm ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>
          {isIn ? '+' : '-'}{log.quantity}
        </span>
        {log.date && <p className="text-[10px] text-muted-foreground">{format(new Date(log.date), 'h:mm a')}</p>}
      </div>
    </div>
  );
}

function StockDialog({ open, onOpenChange, type, onSuccess }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  type: 'Stock In' | 'Stock Out'; onSuccess: () => void;
}) {
  const [date, setDate] = useState<Date>(new Date());
  const [lines, setLines] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const isIn = type === 'Stock In';

  useEffect(() => {
    if (open) {
      setDate(new Date());
      lineCounter = 0;
      setLines([newLine()]);
    }
  }, [open]);

  const addLine = () => setLines(prev => [...prev, newLine()]);
  const removeLine = (id: number) => setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  const updateLine = (id: number, patch: Partial<LineItem>) => setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));

  const validLines = lines.filter(l => l.itemId && parseFloat(l.quantity) > 0);

  const handleSubmit = async () => {
    if (validLines.length === 0) return;
    setSubmitting(true);
    try {
      await recordStock({
        type,
        date: date.toISOString(),
        entries: validLines.map(l => ({ itemId: l.itemId, quantity: parseFloat(l.quantity) })),
      });
      toast.success(`${validLines.length} item${validLines.length > 1 ? 's' : ''} recorded`);
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Failed to record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isIn ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {isIn ? <Plus className="h-4 w-4 text-emerald-600" /> : <Minus className="h-4 w-4 text-red-600" />}
            </div>
            {type}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-2 shrink-0">
          <Label className="text-xs font-medium text-muted-foreground">Date</Label>
          <DatePicker value={date} onChange={d => d && setDate(d)} />
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
          <div className="space-y-3 pb-2">
            {lines.map((line, idx) => (
              <LineRow
                key={line.id}
                line={line}
                index={idx}
                onUpdate={patch => updateLine(line.id, patch)}
                onRemove={() => removeLine(line.id)}
                canRemove={lines.length > 1}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border shrink-0">
          <button onClick={addLine} className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors">
            <PlusCircle className="h-4 w-4" /> Add another item
          </button>
          <Button onClick={handleSubmit} disabled={validLines.length === 0 || submitting} className="w-full" size="lg">
            {submitting ? 'Saving...' : `Record ${validLines.length} item${validLines.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function newLine(): LineItem {
  return { id: ++lineCounter, category: '', itemId: '', quantity: '', itemName: '', unit: '' };
}

function LineRow({ line, index, onUpdate, onRemove, canRemove }: {
  line: LineItem; index: number;
  onUpdate: (patch: Partial<LineItem>) => void;
  onRemove: () => void; canRemove: boolean;
}) {
  const [items, setItems] = useState<ItemOption[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (!line.category) { setItems([]); return; }
    setLoadingItems(true);
    getItems({ category: line.category, limit: 500 }).then(d => {
      setItems(d.items.map(i => ({ id: i.id, name: i.name, category: i.category, unit: i.unit })));
    }).finally(() => setLoadingItems(false));
  }, [line.category]);

  const handleCategoryChange = (cat: string) => {
    onUpdate({ category: cat, itemId: '', itemName: '', unit: '' });
  };

  const handleItemChange = (id: string) => {
    const found = items.find(i => i.id === id);
    onUpdate({ itemId: id, itemName: found?.name ?? '', unit: found?.unit ?? '' });
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
        {canRemove && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <Select value={line.category} onValueChange={handleCategoryChange}>
        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={line.itemId} onValueChange={handleItemChange} disabled={!line.category || loadingItems}>
        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={loadingItems ? 'Loading...' : 'Select item'} /></SelectTrigger>
        <SelectContent>
          {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}{i.unit ? ` (${i.unit})` : ''}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input
        type="number" min="0.1" step="0.1"
        placeholder={`Qty${line.unit ? ` (${line.unit})` : ''}`}
        value={line.quantity}
        onChange={e => onUpdate({ quantity: e.target.value })}
        className="h-9 text-sm"
      />
    </div>
  );
}
