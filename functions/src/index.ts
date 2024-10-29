import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { nanoid } from 'nanoid';


admin.initializeApp();
const db = admin.database();

// Create Queue Function
export const createQueue = functions.https.onCall(async (data) => {
  // @ts-expect-error avoid error
  const { queueName, lnurl } = data;
  
  if (!queueName || !lnurl) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const normalizedQueueName = queueName.toLowerCase();
  const queueRef = db.ref(`queues/${normalizedQueueName}`);
  
  // Check if queue already exists
  const snapshot = await queueRef.once('value');
  if (snapshot.exists()) {
    throw new functions.https.HttpsError('already-exists', 'Queue name already taken');
  }

  const queueId = generateId(); // You'll need to implement this
  const mockedUsers = generateMockedUsers(10); // Move this helper function here

  await queueRef.set({
    id: queueId,
    name: queueName,
    lnurl: lnurl,
    createdAt: Date.now(),
    isActive: true,
    totalSats: mockedUsers.reduce((total, user) => total + user.sats, 0),
    currentQueue: mockedUsers.reduce((acc, user) => ({...acc, [user.id]: user}), {}),
    servedCustomers: {}
  });

  return { queueId };
});

// Helper function to generate unique IDs
function generateId() {
  return Math.random().toString(36).substr(2, 9);
} 

const generateMockedUsers = (count: number) => {
    const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eva', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
    const comments = [
      'How do you handle stress during live streams?',
      'Whats your favorite video game to stream?',
      'Tips for growing a streaming community?',
      'How long have you been streaming?',
      'Best equipment for starting streamers?',
      'How do you balance streaming and life?',
      'Favorite streaming moment so far?',
      'Advice for new content creators?',
      'How do you deal with trolls?',
      'Plans for future content?'
    ];
    return Array.from({length: count}, (_, i) => ({
      id: nanoid(),
      name: names[i],
      createdAt: Date.now() - Math.random() * 3600000, // Random join time within the last hour
      sats: Math.floor(Math.random() * 200) + 50, // Random sats between 50 and 250
      nostrPubkey: null,
      comment: comments[i]
    }));
  };