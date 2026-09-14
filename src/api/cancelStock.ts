import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Cancels a stock transaction and reverses the stock change',
  inputSchema: z.object({
    logId: z.string(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    // Get the log entry
    const log = await zite.stockLogs.findOne({ id: input.logId });
    if (!log) throw new Error('Transaction not found');

    // Find the linked item via SQL
    const link = await zite.sql({
      query: `SELECT l."itemsId" FROM "ItemsStockLogs" l WHERE l."stockLogsId" = $1 LIMIT 1`,
      params: [input.logId],
    });

    const itemId = link.rows[0]?.itemsId as string | undefined;
    if (itemId) {
      const item = await zite.items.findOne({ id: itemId });
      if (item) {
        const currentStock = item.currentStock ?? 0;
        const qty = log.quantity ?? 0;
        // Reverse: if it was Stock In, subtract; if Stock Out, add back
        const newStock = log.type === 'Stock In'
          ? Math.max(0, currentStock - qty)
          : currentStock + qty;

        await zite.items.update({
          id: itemId,
          record: { currentStock: newStock },
        });
      }
    }

    // Delete the log entry
    await zite.stockLogs.delete({ id: input.logId });

    return { success: true };
  },
});
