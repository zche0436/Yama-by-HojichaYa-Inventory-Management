import { useState, useEffect, useCallback } from 'react';
import { Search, Package2, ArrowUpDown, ChevronRight } from 'lucide-react';
import { Input } from '@project/components/ui/input';
import { Badge } from '@project/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@project/components/ui/sheet';
import { Skeleton } from '@project/components/ui/skeleton';
import { getItems, getItemHistory } from 'zitejs/api';
import { useDebouncedCallback } from 'use-debounce';
import { format } from 'date-fns';

const CATEGORIES = ['All', 'Powders', 'Tea Leaves', 'Bar', 'Cha-Gelato', 'Raw Materials', 'Dessert Ingredients', 'Loose Tea (Retail)', 'Tea Powder (Retail)', 'Teabags (Retail)', 'Teaware (Retail)', 'Packaging Materials', 'Hygiene Materials', 'Receipt Materials'];

type Item = { id: string; name: string; category: string; unit: string; currentStock: number | null; lowStockThreshold: number | null; notes: string };
type HistoryLog = { id: string; date: string | null; type: string | null; quantity: number | null; reason: string | null; countedBy: string | null; notes: string | null };

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadItems = useCallback(async (s: string, cat: string) => {
    setLoading(true);
    try {
      const data = await getItems({
        search: s || undefined,
        category: cat === 'All' ? undefined : cat,
        limit: 500,
      });
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useDebouncedCallback((val: string) => {
    loadItems(val, category);
  }, 300);

  useEffect(() => { loadItems('', 'All'); }, [loadItems]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    debouncedSearch(val);
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    loadItems(search, cat);
  };

  const openDetail = async (item: Item) => {
    setSelectedItem(item);
    setDrawerOpen(true);
    setHistoryLoading(true);
    try {
      const data = await getItemHistory({ itemId: item.id, limit: 30 });
      setHistory(data.logs);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">{items.length} items</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => handleCategoryChange(c)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              category === c
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No items found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => openDetail(item)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.category} · {item.unit}</p>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                <StockBadge stock={item.currentStock} threshold={item.lowStockThreshold} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedItem && (
            <div className="space-y-6 pt-2">
              <SheetHeader>
                <SheetTitle className="text-lg">{selectedItem.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{selectedItem.category} · {selectedItem.unit}</p>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Current Stock" value={selectedItem.currentStock ?? 0} />
                <StatCard label="Reorder At" value={selectedItem.lowStockThreshold ?? 0} />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-3">Transaction History</h3>
                {historyLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
                ) : (
                  <div className="space-y-2">
                    {history.map(h => {
                      const isIn = h.type === 'Stock In';
                      return (
                        <div key={h.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/40">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isIn ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                            <ArrowUpDown className={`h-3 w-3 ${isIn ? 'text-emerald-600' : 'text-red-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{h.reason || h.type}</p>
                            <p className="text-[10px] text-muted-foreground">{h.date ? format(new Date(h.date), 'MMM d, h:mm a') : ''} · {h.countedBy}</p>
                          </div>
                          <span className={`text-sm font-semibold ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isIn ? '+' : '-'}{h.quantity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StockBadge({ stock, threshold }: { stock: number | null; threshold: number | null }) {
  const s = stock ?? 0;
  const t = threshold ?? 0;
  const isLow = t > 0 && s <= t;
  return (
    <span className={`text-sm font-semibold tabular-nums ${isLow ? 'text-red-600' : 'text-foreground'}`}>
      {s}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
