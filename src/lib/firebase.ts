import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, set, get, remove, onValue, update, increment } from "firebase/database";
import { getAuth } from "firebase/auth";
import { nanoid } from 'nanoid';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app;
let analytics;
let db;
let auth;

if (typeof window !== "undefined" && !getApps().length) {
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  db = getDatabase(app);
  auth = getAuth(app);
}

export { app, analytics, db, auth };

// Function to create a new queue with 10 mocked users
export const createQueue = async (queueName: string, lnurl: string) => {
  const queueId = nanoid();
  const normalizedQueueName = queueName.toLowerCase();
  const newQueueRef = ref(db, `queues/${normalizedQueueName}`);
  const mockedUsers = generateMockedUsers(10);
  await set(newQueueRef, {
    id: queueId,
    name: queueName, // Keep original name for display
    lnurl: lnurl,
    createdAt: Date.now(),
    isActive: true,
    totalSats: mockedUsers.reduce((total, user) => total + user.sats, 0),
    currentQueue: mockedUsers.reduce((acc, user) => ({...acc, [user.id]: user}), {}),
    servedCustomers: {}
  });
  return queueId;
};

// Function to check if a queue exists
export const checkQueueExists = async (queueName: string): Promise<boolean> => {
  const queuesRef = ref(db, 'queues');
  const snapshot = await get(queuesRef);
  
  if (snapshot.exists()) {
    const queues = snapshot.val();
    return Object.keys(queues).some(key => key.toLowerCase() === queueName.toLowerCase());
  }
  
  return false;
};

// Function to generate mocked users
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

// Function to add a user to a queue
export const addUserToQueue = async (
  queueName: string, 
  userName: string, 
  nostrPubkey: string | null, 
  sats: number,
  comment?: string
) => {
  const normalizedQueueName = queueName.toLowerCase();
  const userId = nanoid();
  await set(ref(db, `queues/${normalizedQueueName}/currentQueue/${userId}`), {
    id: userId,
    name: userName,
    createdAt: Date.now(),
    nostrPubkey: nostrPubkey,
    sats: sats,
    comment: comment
  });
  // Update total sats
  const totalSatsRef = ref(db, `queues/${normalizedQueueName}/totalSats`);
  const currentTotal = (await get(totalSatsRef)).val() || 0;
  await set(totalSatsRef, currentTotal + sats);

  return userId;
};

// Function to remove a user from the queue (when served)
export const removeUserFromQueue = async (queueName: string, userId: string) => {
  const normalizedQueueName = queueName.toLowerCase();
  const userRef = ref(db, `queues/${normalizedQueueName}/currentQueue/${userId}`);
  const userData = (await get(userRef)).val();
  if (userData) {
    await remove(userRef);
    await set(ref(db, `queues/${normalizedQueueName}/servedCustomers/${userId}`), {
      ...userData,
      servedAt: Date.now()
    });
  }
};

// Function to get queue data
export const getQueueData = async (queueName: string) => {
  const normalizedQueueName = queueName.toLowerCase();
  const queueRef = ref(db, `queues/${normalizedQueueName}`);
  const snapshot = await get(queueRef);
  return snapshot.val();
};

// Function to listen for queue updates
export const listenToQueueUpdates = (queueName: string, callback: (data: any) => void) => {
  const normalizedQueueName = queueName.toLowerCase();
  const queueRef = ref(db, `queues/${normalizedQueueName}`);
  return onValue(queueRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
};

// Function to update the sats for a user
export const updateUserSats = async (queueName: string, userId: string, sats: number) => {
  const normalizedQueueName = queueName.toLowerCase();
  const queueRef = ref(db, `queues/${normalizedQueueName}/currentQueue/${userId}`);
  await update(queueRef, { sats: increment(sats) });
};
