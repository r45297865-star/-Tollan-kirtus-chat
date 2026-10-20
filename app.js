
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDae8jt-00zrfwAhmFZf0nTKgZSgiR06bs",
  authDomain: "tollan-kirtus-chat.firebaseapp.com",
  projectId: "tollan-kirtus-chat",
  storageBucket: "tollan-kirtus-chat.firebasestorage.app",
  messagingSenderId: "506724614745",
  appId: "1:506724614745:web:2e723bfff0e37c66f3a748",
  measurementId: "G-HDWXGK609B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const messagesEl = document.querySelector("#messages");
const input = document.querySelector("#messageInput");
const form = document.querySelector("#messageForm");
const sendButton = document.querySelector("#sendButton");
const userBadge = document.querySelector("#userBadge");
const charCount = document.querySelector("#charCount");
const toast = document.querySelector("#toast");

let currentUser = null;
let username = null;
let unsubscribeMessages = null;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function formatTime(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "";
  }

  return timestamp.toDate().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function getOrCreateUsername(uid) {
  const userRef = doc(db, "users", uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    return existing.data().username;
  }

  const counterRef = doc(db, "meta", "counter");
  let number = 0;

  await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const current = counterSnap.exists()
      ? Number(counterSnap.data().value || 0)
      : 0;

    number = current + 1;
    transaction.set(counterRef, { value: number });
  });

  const generatedName = `user${number}`;

  await setDoc(userRef, {
    username: generatedName,
    createdAt: serverTimestamp()
  });

  return generatedName;
}

function renderMessage(data) {
  if (!messagesEl) return;

  const wrapper = document.createElement("article");
  wrapper.className =
    "message" + (data.uid === currentUser?.uid ? " mine" : "");

  const meta = document.createElement("div");
  meta.className = "meta";

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = data.username || "usuario";

  const time = document.createElement("span");
  time.className = "time";
  time.textContent = formatTime(data.createdAt);

  const text = document.createElement("p");
  text.className = "text";
  text.textContent = data.text || "";

  meta.append(name, time);
  wrapper.append(meta, text);
  messagesEl.appendChild(wrapper);
}

function subscribeToMessages() {
  if (!messagesEl) return;

  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  // Mostrar todos los mensajes, sin límite de dos días.
  const messagesQuery = query(
    collection(db, "messages"),
    orderBy("createdAt", "asc")
  );

  unsubscribeMessages = onSnapshot(
    messagesQuery,
    (snapshot) => {
      messagesEl.innerHTML = "";

      if (snapshot.empty) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent =
          "Todavía no hay mensajes. ¡Sé el primero!";
        messagesEl.appendChild(empty);
        return;
      }

      snapshot.forEach((docSnap) => {
        renderMessage(docSnap.data());
      });

      messagesEl.scrollTop = messagesEl.scrollHeight;
    },
    (error) => {
      console.error(
        "Error de Firestore:",
        error.code,
        error.message
      );

      messagesEl.innerHTML = "";

      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent =
        `Error al cargar mensajes: ${error.code || error.message}`;

      messagesEl.appendChild(empty);
    }
  );
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  currentUser = user;

  try {
    username = await getOrCreateUsername(user.uid);

    if (userBadge) userBadge.textContent = username;
    if (input) input.disabled = false;
    if (sendButton) sendButton.disabled = false;

    subscribeToMessages();
  } catch (error) {
    console.error(
      "Error al crear el usuario:",
      error.code,
      error.message
    );

    if (userBadge) userBadge.textContent = "Error";
    showToast(error.code || error.message);
  }
});

signInAnonymously(auth).catch((error) => {
  console.error(
    "Error de autenticación:",
    error.code,
    error.message
  );

  if (userBadge) {
    userBadge.textContent = error.code || "Error";
  }

  showToast(`${error.code || "Error"}: ${error.message}`);
});

if (input) {
  input.addEventListener("input", () => {
    if (charCount) {
      charCount.textContent = input.value.length;
    }
  });
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = input?.value.trim();

    if (!text || !currentUser || !username) return;

    if (sendButton) sendButton.disabled = true;

    try {
      await addDoc(collection(db, "messages"), {
        uid: currentUser.uid,
        username,
        text: text.slice(0, 500),
        createdAt: serverTimestamp()
      });

      input.value = "";
      if (charCount) charCount.textContent = "0";
    } catch (error) {
      console.error(
        "Error al enviar:",
        error.code,
        error.message
      );

      showToast(`${error.code || "Error"}: ${error.message}`);
    } finally {
      if (sendButton) sendButton.disabled = false;
      if (input) input.focus();
    }
  });
    }
