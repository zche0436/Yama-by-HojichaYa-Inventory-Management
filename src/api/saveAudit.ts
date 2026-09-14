import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Saves month-end audit counts and records any variance adjustments',
  inputSchema: z.object({
    entries: z.array(z.object({
      itemId: z.string(),
      systemCount: z.number(),
      physicalCount: z.number(),
    })),
  }),
  outputSchema: z.object({ saved: z.number(), adjustments: z.number() }),
  execute: async ({ input, context }) => {
    const today = new Date().toISOString().split('T')[0];
    const staffName = context.user.firstName ?? context.user.email;
    let adjustments = 0;

    // Batch create audit records (max 100 at a time)
    for (let i = 0; i < input.entries.length; i += 100) {
      const batch = input.entries.slice(i, i + 100);
      await zite.monthEndAudits.bulkCreate({
        records: batch.map(e => ({
          date: today,
          item: e.itemId,
          systemExpectedCount: e.systemCount,
          physicalCount: e.physicalCount,
          variance: e.physicalCount - e.systemCount,
          countedBy: staffName,
          notes: null,
        })),
      });
    }

    // Apply adjustments where variance != 0
    for (const entry of input.entries) {
      const variance = entry.physicalCount - entry.systemCount;
      if (variance !== 0) {
        await zite.items.update({
          id: entry.itemId,
          record: { currentStock: entry.physicalCount },
        });

        await zite.stockLogs.create({
          record: {
            date: new Date().toISOString(),
            item: entry.itemId,
            type: variance > 0 ? 'Stock In' : 'Stock Out',
            quantity: Math.abs(variance),
            countedBy: staffName,
            reason: 'Month-End Adjustment',
            notes: `Audit: system ${entry.systemCount}, physical ${entry.physicalCount}`,
          },
        });
        adjustments++;
      }
    }

    return { saved: input.entries.length, adjustments };
  },
});
