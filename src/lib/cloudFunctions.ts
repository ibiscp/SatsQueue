import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

export const createQueueFunction = httpsCallable<{ queueName: string, lnurl: string }, { queueId: string }>(functions, 'createQueue');
export const addUserToQueueFunction = httpsCallable<{ queueName: string, userName: string, nostrPubkey: string, sats: number, comment: string }, { userId: string }>(functions, 'addUserToQueue');
export const removeUserFromQueueFunction = httpsCallable<{ queueName: string, userId: string }, { removedUserId: string }>(functions, 'removeUserFromQueue');
export const updateUserSatsFunction = httpsCallable<{ queueName: string, userId: string, sats: number }, { updatedUserId: string }>(functions, 'updateUserSats'); 