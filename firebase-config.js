// תצורת Firebase
// החלף את הנתונים הבאים בנתונים מפרויקט Firebase שלך
// הנחיות להגדרה:
// 1. היכנס ל https://console.firebase.google.com/
// 2. צור פרויקט חדש
// 3. הוסף אפליקציית Web
// 4. העתק את נתוני ההגדרה לכאן

const firebaseConfig = {
  apiKey: "AIzaSyAKSxWT_gSDZyfx_cruazQQGpH_fl6AFVA",
  authDomain: "manage-home-7e1b7.firebaseapp.com",
  projectId: "manage-home-7e1b7",
  storageBucket: "manage-home-7e1b7.firebasestorage.app",
  messagingSenderId: "757704062374",
  appId: "1:757704062374:web:17b49008f3acff6bf10b67",
  measurementId: "G-EPYCX0MK25"
};

// אתחול Firebase
let app;
let auth;
let db;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase:', error);
}

// פונקציות עזר לאימות
const FirebaseAuth = {
    // הרשמה עם אימייל וסיסמה
    async signUp(email, password) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    },

    // התחברות עם אימייל וסיסמה
    async signIn(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    },

    // התחברות עם Google
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    },

    // התנתקות
    async signOut() {
        try {
            await auth.signOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    },

    // קבל משתמש נוכחי
    getCurrentUser() {
        return auth.currentUser;
    },

    // האזן לשינויים במצב האימות
    onAuthStateChanged(callback) {
        return auth.onAuthStateChanged(callback);
    },

    // תרגום הודעות שגיאה לעברית
    getErrorMessage(errorCode) {
        const errors = {
            'auth/email-already-in-use': 'כתובת האימייל כבר בשימוש',
            'auth/invalid-email': 'כתובת אימייל לא תקינה',
            'auth/operation-not-allowed': 'פעולה זו אינה מורשית',
            'auth/weak-password': 'הסיסמה חלשה מדי. השתמש לפחות ב-6 תווים',
            'auth/user-disabled': 'חשבון המשתמש הושבת',
            'auth/user-not-found': 'משתמש לא נמצא',
            'auth/wrong-password': 'סיסמה שגויה',
            'auth/too-many-requests': 'יותר מדי ניסיונות. נסה שוב מאוחר יותר',
            'auth/network-request-failed': 'שגיאת רשת. בדוק את החיבור לאינטרנט',
            'auth/popup-closed-by-user': 'החלון נסגר על ידי המשתמש'
        };
        return errors[errorCode] || 'אירעה שגיאה. נסה שוב';
    }
};

// פונקציות עזר ל-Firestore
const FirebaseDB = {
    // שמור נתונים של משתמש
    async saveUserData(userId, data) {
        try {
            await db.collection('users').doc(userId).set({
                data: data,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return { success: true };
        } catch (error) {
            console.error('Error saving data:', error);
            return { success: false, error: error.message };
        }
    },

    // טען נתונים של משתמש
    async loadUserData(userId) {
        try {
            const doc = await db.collection('users').doc(userId).get();
            if (doc.exists) {
                return { success: true, data: doc.data().data };
            } else {
                return { success: true, data: null };
            }
        } catch (error) {
            console.error('Error loading data:', error);
            return { success: false, error: error.message };
        }
    },

    // האזן לשינויים בנתונים בזמן אמת
    onUserDataChanged(userId, callback) {
        return db.collection('users').doc(userId).onSnapshot((doc) => {
            if (doc.exists) {
                callback(doc.data().data);
            }
        }, (error) => {
            console.error('Error listening to data changes:', error);
        });
    },

    // מחק נתונים של משתמש
    async deleteUserData(userId) {
        try {
            await db.collection('users').doc(userId).delete();
            return { success: true };
        } catch (error) {
            console.error('Error deleting data:', error);
            return { success: false, error: error.message };
        }
    }
};
