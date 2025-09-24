import { db } from './db';
import { generateId } from './utils';
// FIX: Corrected import paths.
import type { TimelineEvent, WhatsappLog } from '../types';

type LogEventPayload = Omit<TimelineEvent, 'id' | 'timestamp'>;

export const logTimelineEvent = async (payload: LogEventPayload) => {
  // No try-catch. Errors must propagate to be handled by the wrapping Dexie transaction.
  // This was the root cause of silent failures for renew/delete operations.
  await db.timeline.add({
    ...payload,
    id: generateId(),
    timestamp: Date.now(),
  });
};

export const logWhatsappMessage = async (
    customerId: string, 
    message: string, 
    templateName?: string
): Promise<void> => {
    try {
        await db.transaction('rw', db.whatsappLogs, db.timeline, async () => {
            const logEntry: WhatsappLog = {
                id: generateId(),
                customer_id: customerId,
                timestamp: Date.now(),
                message,
                template_name: templateName,
            };
            await db.whatsappLogs.add(logEntry);

            await logTimelineEvent({
                customer_id: customerId,
                type: 'WHATSAPP_SENT',
                message: `WhatsApp bericht gearchiveerd (${templateName || 'handmatig'}).`,
                meta: { whatsappLogId: logEntry.id, before: true } // 'before: true' marks it as revertible (creation)
            });
        });
    } catch (error) {
        console.error("Failed to log WhatsApp message:", error);
        // Do not throw, logging is a non-critical background task.
    }
};