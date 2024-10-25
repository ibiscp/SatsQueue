import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, set, get, remove, onValue } from "firebase/database";
import { getAuth } from "firebase/auth";
import { nanoid } from 'nanoid';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL, // Updated to use env variable
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
export const createQueue = async (queueName: string) => {
  const queueId = nanoid();
  const newQueueRef = ref(db, `queues/${queueName}`);
  const mockedUsers = generateMockedUsers(10);
  await set(newQueueRef, {
    id: queueId,
    name: queueName,
    createdAt: Date.now(),
    isActive: true,
    totalSats: mockedUsers.reduce((total, user) => total + user.sats, 0),
    currentQueue: mockedUsers.reduce((acc, user) => ({...acc, [user.id]: user}), {}),
    servedCustomers: {}
  });
  return queueId;
};

const generateMockedUsers = (count: number) => {
  const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eva', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
  return Array.from({length: count}, (_, i) => ({
    id: nanoid(),
    name: names[i],
    createdAt: Date.now() - Math.random() * 3600000, // Random join time within the last hour
    sats: Math.floor(Math.random() * 200) + 50 // Random sats between 50 and 250
  }));
};

// Function to add a user to a queue
export const addUserToQueue = async (queueName: string, userName: string, sats: number) => {
  const userId = nanoid();
  await set(ref(db, `queues/${queueName}/currentQueue/${userId}`), {
    id: userId,
    name: userName,
    createdAt: Date.now(),
    sats: sats
  });
  // Update total sats
  const totalSatsRef = ref(db, `queues/${queueName}/totalSats`);
  const currentTotal = (await get(totalSatsRef)).val() || 0;
  await set(totalSatsRef, currentTotal + sats);
};

// Function to remove a user from the queue (when served)
export const removeUserFromQueue = async (queueName: string, userId: string) => {
  const userRef = ref(db, `queues/${queueName}/currentQueue/${userId}`);
  const userData = (await get(userRef)).val();
  if (userData) {
    // Remove from currentQueue
    await remove(userRef);
    // Add to servedCustomers with all original data plus servedAt
    await set(ref(db, `queues/${queueName}/servedCustomers/${userId}`), {
      ...userData,
      servedAt: Date.now()
    });
  }
};

// Function to get queue data
export const getQueueData = async (queueName: string) => {
  const queueRef = ref(db, `queues/${queueName}`);
  const snapshot = await get(queueRef);
  return snapshot.val();
};

// Function to listen for queue updates
export const listenToQueueUpdates = (queueName: string, callback: (data: any) => void) => {
  const queueRef = ref(db, `queues/${queueName}`);
  return onValue(queueRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
};

// More functions for updating user data, fetching queue information, etc.
