const firebaseConfig = {
    apiKey: "AIzaSyC7U3UrGDDU4EHmiyy9pBkG5P7GaIqCZqI",
    authDomain: "sofia-7a95e.firebaseapp.com",
    projectId: "sofia-7a95e",
    storageBucket: "sofia-7a95e.firebasestorage.app",
    messagingSenderId: "830742920014",
    appId: "1:830742920014:web:b940095dcc15035c4bbc1f",
    measurementId: "G-XBHTMBSK8Q"
  };



firebase.initializeApp(firebaseConfig);


const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();