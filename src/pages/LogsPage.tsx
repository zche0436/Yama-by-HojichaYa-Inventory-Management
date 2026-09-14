import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Minus, ArrowUpDown, Calendar, Undo2 } from 'lucide-react';
import { Input } from '@project/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Skeleton } from '@project/components/ui/skeleton';
import { DatePicker } from '@project/components/ui/date-picker';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';
import { getStockLogs, cancelStock, GetStockLogsOutputType } from 'zitejs/api';
import { useDebouncedCallback } from 'use-debounce';
import { format } from 'date-fns';
import { toast } from 'sonner';

type LogEntry = GetStockLogsOutputType['logs'][0];

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const loadLogs = useCallback(async (s: string, t: string, d: Date | undefined, off: number, append = false) => {
    if (!append) setLoading(true);
    try {
      const data = await getStockLogs({
        search: s || undefined,
        type: t === 'all' ? undefined : t,
        date: d ? d.toISOString().split('T')[0] : undefined,
        offset: off,
        limit: 50,
      });
      setLogs(prev => append ? [...prev, ...data.logs] : data.logs);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useDebouncedCallback((val: string) => {
    setOffset(0);
    loadLogs(val, typeFilter, dateFilter, 0);
  }, 300);

  useEffect(() => { loadLogs('', 'all', undefined, 0); }, [loadLogs]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    debouncedSearch(val);
  };

  const handleTypeChange = (val: string) => {
    setTypeFilter(val);
    setOffset(0);
    loadLogs(search, val, dateFilter, 0);
  };

  const handleDateChange = (d: Date | undefined) => {
    setDateFilter(d);
    setOffset(0);
    loadLogs(search, typeFilter, d, 0);
  };

  const loadMore = () => {
    const newOffset = offset + 50;
    setOffset(newOffset);
    loadLogs(search, typeFilter, dateFilter, newOffset, true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Transaction Log</h1>
        <p className="text-sm text-muted-foreground">All stock movements</p>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by item name..." value={search} onChange={e => handleSearchChange(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Stock In">Stock In</SelectItem>
              <SelectItem value="Stock Out">Stock Out</SelectItem>
            </SelectContent>
          </Select>
          <DatePicker value={dateFilter} onChange={handleDateChange} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ArrowUpDown className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {logs.map(log => (
            <LogRow key={log.id} log={log} onCancel={() => { setOffset(0); loadLogs(search, typeFilter, dateFilter, 0); }} />
          ))}
          {hasMore && (
            <button onClick={loadMore} className="w-full py-3 text-sm text-primary font-medium hover:bg-muted/50 rounded-lg transition-colors">
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LogRow({ log, onCancel }: { log: LogEntry; onCancel: () => void }) {
  const isIn = log.type === 'Stock In';
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelStock({ logId: log.id });
      toast.success('Transaction cancelled & stock reversed');
      onCancel();
    } catch (e: any) {
      toast.error(e.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isIn ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
        {isIn ? <Plus className="h-4 w-4 text-emerald-600" /> : <Minus className="h-4 w-4 text-red-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{log.itemName}</p>
        <p className="text-xs text-muted-foreground">
          {log.date ? format(new Date(log.date), 'MMM d, h:mm a') : ''} · {log.countedBy}
        </p>
      </div>
      <span className={`font-semibold text-sm shrink-0 ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>
        {isIn ? '+' : '-'}{log.quantity}
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1" title="Cancel transaction">
            <Undo2 className="h-4 w-4" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the stock change ({isIn ? '+' : '-'}{log.quantity} {log.itemName}) and remove the log entry. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cancelling ? 'Cancelling...' : 'Yes, cancel it'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
