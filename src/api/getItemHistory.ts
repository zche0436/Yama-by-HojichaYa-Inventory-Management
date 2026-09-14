import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Gets stock transaction history for a specific item',
  inputSchema: z.object({
    itemId: z.string(),
    limit: z.number().optional(),
  }),
  outputSchema: z.object({
    logs: z.array(z.object({
      id: z.string(),
      date: z.string().nullable(),
      type: z.string().nullable(),
      quantity: z.number().nullable(),
      reason: z.string().nullable(),
      countedBy: z.string().nullable(),
      notes: z.string().nullable(),
    })),
  }),
  execute: async ({ input }) => {
    const result = await zite.sql({
      query: `
        SELECT sl.id, sl."date", sl."type", sl."quantity", sl."reason",
               sl."countedBy", sl."notes"
        FROM "StockLogs" sl
        JOIN "ItemsStockLogs" l ON l."stockLogsId" = sl.id
        WHERE l."itemsId" = $1
        ORDER BY sl.created_at DESC
        LIMIT ${input.limit ?? 50}
      `,
      params: [input.itemId],
    });

    return {
      logs: result.rows.map(r => ({
        id: String(r.id),
        date: r.date ? String(r.date) : null,
        type: r.type ? String(r.type) : null,
        quantity: r.quantity != null ? Number(r.quantity) : null,
        reason: r.reason ? String(r.reason) : null,
        countedBy: r.countedBy ? String(r.countedBy) : null,
        notes: r.notes ? String(r.notes) : null,
      })),
    };
  },
});
