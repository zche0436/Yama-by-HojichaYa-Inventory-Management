import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Copy, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { getLowStock, GetLowStockOutputType } from 'zitejs/api';
import { toast } from 'sonner';

type LowStockItem = GetLowStockOutputType['items'][0];

export default function LowStockPage() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLowStock({}).then(d => setItems(d.items)).finally(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    const header = 'Item Name,Category,Pack Size,Current Stock,Reorder Threshold,Units Needed';
    const rows = items.map(i =>
      `"${i.name}","${i.category}","${i.unit}",${i.currentStock},${i.reorderThreshold},${i.unitsNeeded}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restock-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const copyToClipboard = () => {
    const text = items.map(i =>
      `${i.name} (${i.category}) — Need ${i.unitsNeeded} ${i.unit} (Current: ${i.currentStock}, Min: ${i.reorderThreshold})`
    ).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Low Stock Alerts
          </h1>
          <p className="text-sm text-muted-foreground">{items.length} items need restocking</p>
        </div>
        {items.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="h-7 w-7 text-emerald-500" />
          </div>
          <p className="font-medium">All stocked up!</p>
          <p className="text-sm">No items below reorder threshold</p>
        </div>
      ) : (
        <div className="space-y-3">
          <GroupedAlerts items={items} />
        </div>
      )}
    </div>
  );
}

function GroupedAlerts({ items }: { items: LowStockItem[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, LowStockItem[]> = {};
    for (const item of items) {
      const cat = item.category || 'Uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (cat: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  return (
    <>
      {grouped.map(([category, catItems]) => {
        const isOpen = !collapsed.has(category);
        const criticalCount = catItems.filter(i => i.currentStock === 0).length;
        return (
          <div key={category} className="rounded-lg border border-border overflow-hidden">
            <button onClick={() => toggle(category)} className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-semibold text-sm">{category}</span>
                <span className="text-xs text-muted-foreground">({catItems.length})</span>
              </div>
              {criticalCount > 0 && (
                <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{criticalCount} OUT</span>
              )}
            </button>
            {isOpen && (
              <div className="divide-y divide-border">
                {catItems.map(item => <LowStockCard key={item.id} item={item} />)}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function LowStockCard({ item }: { item: LowStockItem }) {
  const urgency = item.currentStock === 0 ? 'critical' : item.currentStock <= item.reorderThreshold * 0.5 ? 'high' : 'medium';
  return (
    <div className={`p-4 ${
      urgency === 'critical' ? 'bg-red-50/50 dark:bg-red-950/20' :
      urgency === 'high' ? 'bg-amber-50/50 dark:bg-amber-950/20' :
      ''
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-sm">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.unit}</p>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${
          urgency === 'critical' ? 'bg-red-500 text-white' :
          urgency === 'high' ? 'bg-amber-500 text-white' :
          'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
        }`}>
          {urgency === 'critical' ? 'OUT' : 'LOW'}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className={`text-lg font-bold ${urgency === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{item.currentStock}</p>
          <p className="text-[10px] text-muted-foreground">Current</p>
        </div>
        <div>
          <p className="text-lg font-bold text-muted-foreground">{item.reorderThreshold}</p>
          <p className="text-[10px] text-muted-foreground">Threshold</p>
        </div>
        <div>
          <p className="text-lg font-bold text-primary">{item.unitsNeeded}</p>
          <p className="text-[10px] text-muted-foreground">Need</p>
        </div>
      </div>
    </div>
  );
}
