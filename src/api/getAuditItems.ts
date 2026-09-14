import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Gets all items grouped by category for month-end audit with system stock counts',
  inputSchema: z.object({}),
  outputSchema: z.object({
    categories: z.array(z.object({
      category: z.string(),
      items: z.array(z.object({
        id: z.string(),
        name: z.string(),
        unit: z.string(),
        currentStock: z.number(),
      })),
    })),
  }),
  execute: async () => {
    const result = await zite.sql({
      query: `
        SELECT id, "name", "category", "unit", "currentStock"
        FROM "Items"
        ORDER BY "category" ASC, "name" ASC
      `,
    });

    const grouped: Record<string, { id: string; name: string; unit: string; currentStock: number }[]> = {};
    for (const r of result.rows) {
      const cat = r.category ? String(r.category) : 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        id: String(r.id),
        name: r.name ? String(r.name) : '',
        unit: r.unit ? String(r.unit) : '',
        currentStock: r.currentStock != null ? Number(r.currentStock) : 0,
      });
    }

    return {
      categories: Object.entries(grouped).map(([category, items]) => ({ category, items })),
    };
  },
});
