/**
 * Runs before any function module: the generated src/index.ts imports this
 * file first. Owner: firebase-dev.
 *
 * - initializeApp() once, so every function module can call getFirestore() at load time.
 * - setGlobalOptions() before any definition: firebase-functions reads the global
 *   options when a function is defined (onCall, onDocumentWritten, onSchedule,
 *   onRequest), so triggers, scheduled and https functions inherit the region as
 *   much as callables. This is the only place the region is set (firebase.json
 *   has none); scripts/stage-deploy.mjs fails on a function without a region.
 */
import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';

export const FUNCTIONS_REGION = '{{functions_region}}';

initializeApp();
setGlobalOptions({ region: FUNCTIONS_REGION });
