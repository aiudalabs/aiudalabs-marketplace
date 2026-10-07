/**
 * Cloud Functions entry point for {{project_title}}.
 * Functions are registered here by importing from callable/, triggers/,
 * scheduled/, and https/ subdirectories.
 *
 * Owner: firebase-dev (per docs/AGENT_ROSTER.md)
 */

import { initializeApp } from 'firebase-admin/app';

initializeApp();

// Callable functions (client → server, sync response)
// export { acceptBooking } from './callable/acceptBooking';

// Firestore triggers (reactive to writes)
// export { onUserCreate } from './triggers/onUserCreate';

// Scheduled functions (cron-like)
// export { dailyArchive } from './scheduled/dailyArchive';

// HTTPS webhooks (third-party integrations)
// export { paymentWebhook } from './https/paymentWebhook';
