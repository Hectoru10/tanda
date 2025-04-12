// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDH1mEOU4mVLQpZmNCcrZKTa39tXz_n0-4",
    authDomain: "tandas-3f8b5.firebaseapp.com",
    projectId: "tandas-3f8b5",
    storageBucket: "tandas-3f8b5.appspot.com",
    messagingSenderId: "456682743605",
    appId: "1:456682743605:web:614d485da44808b7e78e7c"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Actualizar año en el footer
document.getElementById('currentYear').textContent = new Date().getFullYear();