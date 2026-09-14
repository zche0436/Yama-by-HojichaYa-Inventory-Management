import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Gets items where current stock is at or below the reorder threshold',
  inputSchema: z.object({}),
  outputSchema: z.object({
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
      unit: z.string(),
      currentStock: z.number(),
      reorderThreshold: z.number(),
      unitsNeeded: z.number(),
    })),
  }),
  execute: async () => {
    const result = await zite.sql({
      query: `
        SELECT id, "name", "category", "unit", "currentStock", "lowStockThreshold"
        FROM "Items"
        WHERE "currentStock" IS NOT NULL
          AND "lowStockThreshold" IS NOT NULL
          AND "currentStock" <= "lowStockThreshold"
        ORDER BY ("lowStockThreshold" - "currentStock") DESC, "category" ASC, "name" ASC
      `,
    });

    return {
      items: result.rows.map(r => {
        const current = Number(r.currentStock ?? 0);
        const threshold = Number(r.lowStockThreshold ?? 0);
        return {
          id: String(r.id),
          name: r.name ? String(r.name) : '',
          category: r.category ? String(r.category) : '',
          unit: r.unit ? String(r.unit) : '',
          currentStock: current,
          reorderThreshold: threshold,
          unitsNeeded: Math.max(0, threshold - current),
        };
      }),
    };
  },
});
