/**
 * Initializes the Admin SDK once. The generated src/index.ts imports this
 * file first, so every function module can call getFirestore() at load time.
 * Owner: firebase-dev.
 */
import { initializeApp } from 'firebase-admin/app';

initializeApp();
