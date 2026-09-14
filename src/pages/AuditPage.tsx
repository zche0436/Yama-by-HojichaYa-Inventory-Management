import { useState, useEffect } from 'react';
import { ClipboardCheck, ChevronDown, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Skeleton } from '@project/components/ui/skeleton';
import { getAuditItems, saveAudit, GetAuditItemsOutputType } from 'zitejs/api';
import { toast } from 'sonner';

type AuditCategory = GetAuditItemsOutputType['categories'][0];
type AuditItem = AuditCategory['items'][0];

type AuditEntry = { itemId: string; systemCount: number; physicalCount: string; };

export default function AuditPage() {
  const [categories, setCategories] = useState<AuditCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getAuditItems({}).then(d => {
      setCategories(d.categories);
      setExpandedCats(new Set(d.categories.map(c => c.category)));
    }).finally(() => setLoading(false));
  }, []);

  const toggleCategory = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const setPhysicalCount = (itemId: string, val: string) => {
    setEntries(prev => ({ ...prev, [itemId]: val }));
  };

  const filledCount = Object.values(entries).filter(v => v !== '').length;
  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);

  const handleSubmit = async () => {
    const auditEntries = categories.flatMap(c =>
      c.items
        .filter(item => entries[item.id] !== undefined && entries[item.id] !== '')
        .map(item => ({
          itemId: item.id,
          systemCount: item.currentStock,
          physicalCount: parseFloat(entries[item.id]),
        }))
    );

    if (auditEntries.length === 0) {
      toast.error('Enter at least one physical count');
      return;
    }

    setSubmitting(true);
    try {
      const result = await saveAudit({ entries: auditEntries });
      toast.success(`Saved ${result.saved} counts, ${result.adjustments} adjustments made`);
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold mb-1">Audit Saved</h2>
        <p className="text-muted-foreground mb-4">Physical counts recorded and variances adjusted</p>
        <Button onClick={() => { setSubmitted(false); setEntries({}); setLoading(true); getAuditItems({}).then(d => setCategories(d.categories)).finally(() => setLoading(false)); }}>
          Start New Count
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Month-End Count
        </h1>
        <p className="text-sm text-muted-foreground">{filledCount} of {totalItems} items counted</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => (
            <CategorySection
              key={cat.category}
              category={cat}
              expanded={expandedCats.has(cat.category)}
              onToggle={() => toggleCategory(cat.category)}
              entries={entries}
              onEntryChange={setPhysicalCount}
            />
          ))}
        </div>
      )}

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/90 backdrop-blur border-t border-border">
        <Button onClick={handleSubmit} disabled={submitting || filledCount === 0} className="w-full" size="lg">
          {submitting ? 'Saving...' : `Submit Audit (${filledCount} items)`}
        </Button>
      </div>
    </div>
  );
}

function CategorySection({ category, expanded, onToggle, entries, onEntryChange }: {
  category: AuditCategory; expanded: boolean; onToggle: () => void;
  entries: Record<string, string>; onEntryChange: (id: string, val: string) => void;
}) {
  const filled = category.items.filter(i => entries[i.id] !== undefined && entries[i.id] !== '').length;
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-semibold text-sm">{category.category}</span>
        </div>
        <span className="text-xs text-muted-foreground">{filled}/{category.items.length}</span>
      </button>
      {expanded && (
        <div className="divide-y divide-border">
          {category.items.map(item => (
            <AuditRow key={item.id} item={item} value={entries[item.id] ?? ''} onChange={v => onEntryChange(item.id, v)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AuditRow({ item, value, onChange }: { item: AuditItem; value: string; onChange: (v: string) => void }) {
  const variance = value !== '' ? parseFloat(value) - item.currentStock : null;
  const hasVariance = variance !== null && variance !== 0;
  return (
    <div className="p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{item.name}</p>
          <p className="text-[10px] text-muted-foreground">{item.unit}</p>
        </div>
        <span className="text-xs text-muted-foreground">System: {item.currentStock}</span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.1"
          placeholder="Physical count"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-9 text-sm"
        />
        {hasVariance && (
          <span className={`text-xs font-semibold whitespace-nowrap flex items-center gap-0.5 ${variance! > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <AlertCircle className="h-3 w-3" />
            {variance! > 0 ? '+' : ''}{variance!.toFixed(1)}
          </span>
        )}
        {value !== '' && !hasVariance && (
          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
        )}
      </div>
    </div>
  );
}
