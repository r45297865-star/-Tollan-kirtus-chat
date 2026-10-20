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
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

/*
  1) Crea un proyecto en Firebase.
  2) Activa Authentication > Anonymous.
  3) Crea Firestore Database.
  4) Copia la configuración de tu app web aquí.
*/
const firebaseConfig = {
  apiKey: "AIzaSyDae8jt-00rzfWHmZFf0nTKgZSGiR06bs",
  authDomain: "tollan-kirtus-chat.firebaseapp.com",
  projectId: "tollan-kirtus-chat",
  storageBucket: "tollan-kirtus-chat.firebasestorage.app",
  messagingSenderId: "506724614745",
  appId: "1:506724614745:web:231f1c9527ad251f3a748",
  measurementId: "G-HHMEQNMV3"
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
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function formatTime(timestamp) {
  if (!timestamp) return "";
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
  let number;

  // Atomic transaction: two people entering at the same time
  // receive different numbers.
  await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const current = counterSnap.exists() ? (counterSnap.data().value || 0) : 0;
    number = current + 1;

    transaction.set(counterRef, { value: number }, { merge: true });
  });

  const generatedName = `user${number}`;
  await setDoc(userRef, {
    username: generatedName,
    createdAt: serverTimestamp()
  });

  return generatedName;
}

function renderMessage(data) {
  const wrapper = document.createElement("article");
  wrapper.className = "message" + (data.uid === currentUser.uid ? " mine" : "");

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
  // textContent avoids interpreting user messages as HTML.
  text.textContent = data.text || "";

  meta.append(name, time);
  wrapper.append(meta, text);
  messagesEl.appendChild(wrapper);
}

function subscribeToMessages() {
  const twoDaysAgo = Timestamp.fromMillis(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const messagesQuery = query(
    collection(db, "messages"),
    where("createdAt", ">=", twoDaysAgo),
    orderBy("createdAt", "asc")
  );

  unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
    messagesEl.innerHTML = "";

    if (snapshot.empty) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Todavía no hay mensajes. ¡Sé el primero!";
      messagesEl.appendChild(empty);
      return;
    }

    snapshot.forEach((docSnap) => renderMessage(docSnap.data()));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }, (error) => {
    console.error(error);
    messagesEl.innerHTML = '<div class="empty">No se pudo cargar el chat. Revisa la configuración de Firebase.</div>';
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  currentUser = user;

  try {
    username = await getOrCreateUsername(user.uid);
    userBadge.textContent = username;
    input.disabled = false;
    sendButton.disabled = false;
    input.focus();
    subscribeToMessages();
  } catch (error) {
    console.error(error);
    userBadge.textContent = "Error";
    showToast("No se pudo asignar tu usuario.");
  }
});

signInAnonymously(auth).catch((error) => {
  console.error(error);
  userBadge.textContent = "Sin conexión";
  showToast("Activa el acceso anónimo en Firebase.");
});

input.addEventListener("input", () => {
  charCount.textContent = input.value.length;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text || !currentUser || !username) return;

  sendButton.disabled = true;

  try {
    const now = new Date();
    const expireAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    await addDoc(collection(db, "messages"), {
      uid: currentUser.uid,
      username,
      text: text.slice(0, 500),
      createdAt: serverTimestamp(),
      expireAt: Timestamp.fromDate(expireAt)
    });

    input.value = "";
    charCount.textContent = "0";
  } catch (error) {
    console.error(error);
    showToast("No se pudo enviar el mensaje.");
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
});
