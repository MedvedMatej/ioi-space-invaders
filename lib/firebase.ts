import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDkTnvpJtX7NjmlH7Lj-5jHnCJ50FtFCZ8',
  authDomain: 'space-invaders-a57bc.firebaseapp.com',
  projectId: 'space-invaders-a57bc',
  storageBucket: 'space-invaders-a57bc.firebasestorage.app',
  messagingSenderId: '265197840368',
  appId: '1:265197840368:web:a751453b18be32bad05f35',
  measurementId: 'G-DJK79337LM',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
