import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Gets all inventory items with optional category filter and search',
  inputSchema: z.object({
    category: z.string().optional(),
    search: z.string().optional(),
    offset: z.number().optional(),
    limit: z.number().optional(),
  }),
  outputSchema: z.object({
    items: z.array(z.any()),
    total: z.number(),
  }),
  execute: async ({ input }) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (input.category) {
      conditions.push(`"category" = $${paramIdx++}`);
      params.push(input.category);
    }
    if (input.search) {
      conditions.push(`LOWER("name") LIKE $${paramIdx++}`);
      params.push(`%${input.search.toLowerCase()}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;

    const countResult = await zite.sql({
      query: `SELECT COUNT(*) AS "total" FROM "Items" ${where}`,
      params,
    });

    const result = await zite.sql({
      query: `
        SELECT id, "name", "category", "unit", "currentStock", "lowStockThreshold", "notes"
        FROM "Items"
        ${where}
        ORDER BY "category" ASC, "name" ASC
        LIMIT ${limit} OFFSET ${offset}
      `,
      params,
    });

    return {
      items: result.rows.map(r => ({
        id: String(r.id),
        name: r.name ? String(r.name) : '',
        category: r.category ? String(r.category) : '',
        unit: r.unit ? String(r.unit) : '',
        currentStock: r.currentStock != null ? Number(r.currentStock) : null,
        lowStockThreshold: r.lowStockThreshold != null ? Number(r.lowStockThreshold) : null,
        notes: r.notes ? String(r.notes) : '',
      })),
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  },
});
