import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Records one or more stock in/out transactions and updates current stock',
  inputSchema: z.object({
    entries: z.array(z.object({
      itemId: z.string(),
      quantity: z.number().min(0.1),
    })),
    type: z.enum(['Stock In', 'Stock Out']),
    date: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean(), count: z.number() }),
  execute: async ({ input, context }) => {
    const staffName = context.user.firstName ?? context.user.email;
    const dateVal = input.date ?? new Date().toISOString();

    for (const entry of input.entries) {
      const item = await zite.items.findOne({ id: entry.itemId });
      if (!item) continue;

      const currentStock = item.currentStock ?? 0;
      const newStock = input.type === 'Stock In'
        ? currentStock + entry.quantity
        : Math.max(0, currentStock - entry.quantity);

      await zite.items.update({
        id: entry.itemId,
        record: { currentStock: newStock },
      });

      await zite.stockLogs.create({
        record: {
          date: dateVal,
          item: entry.itemId,
          type: input.type,
          quantity: entry.quantity,
          countedBy: staffName,
          reason: null,
          notes: null,
        },
      });
    }

    return { success: true, count: input.entries.length };
  },
});
