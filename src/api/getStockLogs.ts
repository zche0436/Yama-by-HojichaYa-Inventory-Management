import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Gets stock transaction log with search, type filter, and date filter',
  inputSchema: z.object({
    search: z.string().optional(),
    type: z.string().optional(),
    date: z.string().optional(),
    offset: z.number().optional(),
    limit: z.number().optional(),
  }),
  outputSchema: z.object({
    logs: z.array(z.object({
      id: z.string(),
      date: z.string().nullable(),
      type: z.string().nullable(),
      quantity: z.number().nullable(),
      countedBy: z.string().nullable(),
      notes: z.string().nullable(),
      itemName: z.string(),
      category: z.string(),
    })),
    hasMore: z.boolean(),
  }),
  execute: async ({ input }) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.search) {
      conditions.push(`LOWER(i."name") LIKE $${idx++}`);
      params.push(`%${input.search.toLowerCase()}%`);
    }
    if (input.type) {
      conditions.push(`sl."type" = $${idx++}`);
      params.push(input.type);
    }
    if (input.date) {
      conditions.push(`sl."date"::date = $${idx++}::date`);
      params.push(input.date);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;

    const result = await zite.sql({
      query: `
        SELECT sl.id, sl."date", sl."type", sl."quantity",
               sl."countedBy", sl."notes",
               i."name" AS "itemName", i."category"
        FROM "StockLogs" sl
        LEFT JOIN "ItemsStockLogs" l ON l."stockLogsId" = sl.id
        LEFT JOIN "Items" i ON i.id = l."itemsId"
        ${where}
        ORDER BY sl."date" DESC, sl.created_at DESC
        LIMIT ${limit + 1} OFFSET ${offset}
      `,
      params,
    });

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

    return {
      logs: rows.map(r => ({
        id: String(r.id),
        date: r.date ? String(r.date) : null,
        type: r.type ? String(r.type) : null,
        quantity: r.quantity != null ? Number(r.quantity) : null,
        countedBy: r.countedBy ? String(r.countedBy) : null,
        notes: r.notes ? String(r.notes) : null,
        itemName: r.itemName ? String(r.itemName) : 'Unknown',
        category: r.category ? String(r.category) : '',
      })),
      hasMore,
    };
  },
});
