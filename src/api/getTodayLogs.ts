import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Gets today\'s stock transactions',
  inputSchema: z.object({}),
  outputSchema: z.object({
    logs: z.array(z.object({
      id: z.string(),
      date: z.string().nullable(),
      type: z.string().nullable(),
      quantity: z.number().nullable(),
      reason: z.string().nullable(),
      countedBy: z.string().nullable(),
      notes: z.string().nullable(),
      itemName: z.string(),
      category: z.string(),
    })),
  }),
  execute: async () => {
    const result = await zite.sql({
      query: `
        SELECT sl.id, sl."date", sl."type", sl."quantity", sl."reason",
               sl."countedBy", sl."notes",
               i."name" AS "itemName", i."category"
        FROM "StockLogs" sl
        LEFT JOIN "ItemsStockLogs" l ON l."stockLogsId" = sl.id
        LEFT JOIN "Items" i ON i.id = l."itemsId"
        WHERE sl."date" >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur')::date
        ORDER BY sl.created_at DESC
        LIMIT 100
      `,
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
        itemName: r.itemName ? String(r.itemName) : 'Unknown',
        category: r.category ? String(r.category) : '',
      })),
    };
  },
});
