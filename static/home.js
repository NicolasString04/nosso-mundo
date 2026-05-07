const startDate = new Date("2026-03-20T00:00:00");

function updateTimer() {
  const now = new Date();
  const diff = now - startDate;

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutos = Math.floor((diff / (1000 * 60)) % 60);
  const segundos = Math.floor((diff / 1000) % 60);

  document.getElementById("dias").innerText = dias;
  document.getElementById("horas").innerText = horas;
  document.getElementById("minutos").innerText = minutos;
  document.getElementById("segundos").innerText = segundos;
}

setInterval(updateTimer, 1000);
updateTimer();

const memories = [];
let currentPage = 0;

function convertSpotifyLink(link) {
  if (!link) return "";

  let cleanLink = link.trim().split("?")[0];

  cleanLink = cleanLink.replace(
    "open.spotify.com/intl-pt/track/",
    "open.spotify.com/embed/track/"
  );

  cleanLink = cleanLink.replace(
    "open.spotify.com/track/",
    "open.spotify.com/embed/track/"
  );

  return cleanLink;
}

function setImageOrEmpty(elementId, imageUrl) {
  const img = document.getElementById(elementId);

  if (imageUrl) {
    img.src = imageUrl;
    img.style.opacity = "1";
  } else {
    img.removeAttribute("src");
    img.style.opacity = "0";
  }
}

function loadPage() {
  if (memories.length === 0) return;

  const page = memories[currentPage];
  const bookPage = document.getElementById("bookPage");

  setTimeout(() => {
    document.getElementById("memoryDate").innerText = page.date;
    document.getElementById("memoryText").innerText = page.text;

    setImageOrEmpty("mainPhoto", page.main);
setImageOrEmpty("subPhoto1", page.subs?.[0]);
setImageOrEmpty("subPhoto2", page.subs?.[1]);
setImageOrEmpty("subPhoto3", page.subs?.[2]);

    const player = document.getElementById("memoryMusicPlayer");
    const noMusicText = document.getElementById("noMusicText");

    const musicLink = convertSpotifyLink(page.music);

    if (musicLink && musicLink.includes("open.spotify.com/embed/track/")) {
      player.src = musicLink;
      player.style.display = "block";

      if (noMusicText) noMusicText.style.display = "none";
    } else {
      player.removeAttribute("src");
      player.style.display = "none";

      if (noMusicText) noMusicText.style.display = "block";
    }

    renderDots();
  }, 300);
}

function nextPage() {
  flipToPage("next");
}

function prevPage() {
  flipToPage("prev");
}

function flipToPage(direction) {
  if (memories.length === 0) return;

  const bookPage = document.getElementById("bookPage");

  if (direction === "next") {
    bookPage.classList.add("flip-next");
  } else {
    bookPage.classList.add("flip-prev");
  }

  setTimeout(() => {
    if (direction === "next") {
      currentPage++;

      if (currentPage >= memories.length) {
        currentPage = 0;
      }
    } else {
      currentPage--;

      if (currentPage < 0) {
        currentPage = memories.length - 1;
      }
    }

    loadPage();

    bookPage.classList.remove("flip-next");
    bookPage.classList.remove("flip-prev");
  }, 350);
}

function renderDots() {
  const dots = document.getElementById("dots");
  dots.innerHTML = "";

  memories.forEach((_, index) => {
    const dot = document.createElement("span");
    dot.classList.add("dot");

    if (index === currentPage) {
      dot.classList.add("active");
    }

    dots.appendChild(dot);
  });
}

function createHeart() {
  const heart = document.createElement("div");
  heart.classList.add("heart");
  heart.innerHTML = "❤️";

  heart.style.left = Math.random() * window.innerWidth + "px";
  heart.style.fontSize = (Math.random() * 18 + 12) + "px";
  heart.style.animationDuration = (Math.random() * 4 + 3) + "s";
  heart.style.opacity = Math.random() * 0.7 + 0.3;

  document.body.appendChild(heart);

  setTimeout(() => {
    heart.remove();
  }, 7000);
}

function createSparkle() {
  const sparkle = document.createElement("div");
  sparkle.classList.add("sparkle");

  sparkle.style.left = Math.random() * window.innerWidth + "px";
  sparkle.style.top = Math.random() * window.innerHeight + "px";
  sparkle.style.animationDuration = (Math.random() * 2 + 1) + "s";

  document.body.appendChild(sparkle);

  setTimeout(() => {
    sparkle.remove();
  }, 3000);
}

function logout() {
  auth.signOut().then(() => {
    window.location.href = "/login";
  });
}

setInterval(createHeart, 350);
setInterval(createSparkle, 180);

function openMemoryModal() {
  document.getElementById("memoryModal").classList.add("show");
}

function closeMemoryModal() {
  document.getElementById("memoryModal").classList.remove("show");
}


async function uploadImage(file, folder) {
  if (!file) return null;

  const fileName = `${Date.now()}_${file.name}`;
  const fileRef = storage.ref().child(`${folder}/${fileName}`);

  await fileRef.put(file);

  return await fileRef.getDownloadURL();
}

async function saveMemory() {
  const saveBtn = document.querySelector(".save-memory-btn");
  saveBtn.disabled = true;
  saveBtn.innerText = "Salvando... 💖";

  const date = document.getElementById("newDate").value;
  const text = document.getElementById("newText").value;
  let music = document.getElementById("newMusic").value;

  const mainPhoto = document.getElementById("newMainPhoto").files[0];
  const subPhoto1 = document.getElementById("newSubPhoto1").files[0];
  const subPhoto2 = document.getElementById("newSubPhoto2").files[0];
  const subPhoto3 = document.getElementById("newSubPhoto3").files[0];

  if (!date || !text) {
    alert("Preenche data e descrição 💖");
    return;
  }

  music = convertSpotifyLink(music);

  try {
    const mainURL = await uploadImage(mainPhoto, "memories/main");

    const sub1URL = await uploadImage(subPhoto1, "memories/subs");
    const sub2URL = await uploadImage(subPhoto2, "memories/subs");
    const sub3URL = await uploadImage(subPhoto3, "memories/subs");

    await db.collection("memories").add({
      date: date,
      text: text,
      music: music || "",

      main: mainURL || "/static/love.jpeg",

      subs: [
  sub1URL || "",
  sub2URL || "",
  sub3URL || ""
],

      createdAt: new Date()
    });

    alert("Memória salva 💖");
    document.getElementById("newDate").value = "";
document.getElementById("newText").value = "";
document.getElementById("newMusic").value = "";
document.getElementById("newMainPhoto").value = "";
document.getElementById("newSubPhoto1").value = "";
document.getElementById("newSubPhoto2").value = "";
document.getElementById("newSubPhoto3").value = "";

    closeMemoryModal();

    currentPage = memories.length;

  }  catch (error) {
    console.error("Erro ao salvar:", error);
    alert("Erro ao salvar: " + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerText = "Salvar memória 💖";
  }
}

function loadMemoriesFromFirebase() {
  db.collection("memories")
    .orderBy("createdAt", "asc")
    .onSnapshot((snapshot) => {
      memories.length = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();

        memories.push({
          id: doc.id,
          date: data.date,
          text: data.text,
          music: data.music || "",
          main: data.main || "",
subs: data.subs || ["", "", ""]
        });
      });

      if (memories.length > 0) {
        if (currentPage >= memories.length) {
          currentPage = memories.length - 1;
        }

        loadPage();
      }
    }, (error) => {
      console.error("Erro ao ouvir memórias:", error);
    });
}

function applySavedBackground() {
  db.collection("settings").doc("visual").get()
    .then((doc) => {
      if (!doc.exists) return;

      const data = doc.data();

      if (!data.background) return;

      document.body.style.background = `
        linear-gradient(rgba(8, 8, 20, 0.75), rgba(8, 8, 20, 0.95)),
        url("/static/${data.background}")
      `;

      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundAttachment = "fixed";
    })
    .catch((error) => {
      console.error("Erro ao carregar fundo:", error);
    });
}



window.onload = function () {
  applySavedBackground();
  loadMemoriesFromFirebase();
};

function openPhotoModal(src) {
  const modal = document.getElementById("photoModal");
  const expandedPhoto = document.getElementById("expandedPhoto");

  expandedPhoto.src = src;
  modal.classList.add("show");
}

function closePhotoModal() {
  const modal = document.getElementById("photoModal");
  modal.classList.remove("show");
}