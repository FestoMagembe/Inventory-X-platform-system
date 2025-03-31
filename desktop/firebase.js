const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDoc, onSnapshot } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const db = require('./db');

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

// Collections
const productsCollection = collection(firestore, 'products');
const usersCollection = collection(firestore, 'users');

// Authentication
async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Sync functions
async function syncProductToFirebase(productId) {
  try {
    const product = await new Promise((resolve, reject) => {
      db.getProductById(productId, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!product) {
      console.log('Product not found in local DB');
      return;
    }

    const productRef = doc(productsCollection, productId.toString());
    await setDoc(productRef, {
      name: product.name,
      description: product.description,
      quantity: product.quantity,
      minQuantity: product.min_quantity,
      price: product.price,
      lastUpdated: new Date()
    });

    console.log(`Product ${productId} synced to Firebase`);
  } catch (error) {
    console.error('Sync error:', error);
  }
}

// Initialize real-time sync for low stock alerts
function initLowStockSync() {
  db.getAllProducts((err, products) => {
    if (err) {
      console.error('Error getting products:', err);
      return;
    }

    products.forEach(product => {
      if (product.quantity <= product.min_quantity) {
        syncProductToFirebase(product.id);
      }
    });
  });

  // Watch for local DB changes
  const lowStockQuery = collection(firestore, 'products');
  onSnapshot(lowStockQuery, (snapshot) => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'modified') {
        const product = change.doc.data();
        if (product.quantity <= product.minQuantity) {
          // Trigger local notification
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('low-stock-notification', {
            productId: change.doc.id,
            productName: product.name,
            currentQuantity: product.quantity
          });
        }
      }
    });
  });
}

module.exports = {
  app,
  firestore,
  auth,
  login,
  syncProductToFirebase,
  initLowStockSync
};