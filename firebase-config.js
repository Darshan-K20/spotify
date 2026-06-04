/**
 * Firebase Shared Cloud Tracks Configuration for Darshtify.
 * 
 * To enable saving and sharing songs across all devices and users:
 * 
 * 1. Go to the Firebase Console: https://console.firebase.google.com/
 * 2. Create a new project named "Darshtify" (or any name you prefer).
 * 3. In your project settings, add a web app to generate your Firebase configuration.
 * 4. Enable "Cloud Firestore" and "Firebase Storage" in the Build tab.
 * 5. Set up rules for Cloud Firestore and Firebase Storage (see rules below).
 * 6. Replace the placeholder values below with your web app's configuration object.
 */

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

/**
 * Checks if the Firebase configuration has been filled in.
 */
export function isFirebaseConfigured() {
  return (
    firebaseConfig &&
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  );
}

/*
 ====================================================================
 RECOMMENDED SECURITY RULES
 ====================================================================

 1. Cloud Firestore Rules (in Firebase Console -> Firestore -> Rules):
 --------------------------------------------------------------------
 rules_version = '2';
 service cloud.firestore {
   match /databases/{database}/documents {
     match /shared_songs/{document} {
       allow read, write: if true; // Allows anyone to read and write (upload/delete)
     }
   }
 }

 2. Firebase Storage Rules (in Firebase Console -> Storage -> Rules):
 --------------------------------------------------------------------
 rules_version = '2';
 service firebase.storage {
   match /b/{bucket}/o {
     match /songs/{allPaths=**} {
       allow read, write: if true; // Allows public access to write and read songs
     }
   }
 }
*/
