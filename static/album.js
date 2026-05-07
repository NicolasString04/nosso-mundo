const grid = document.getElementById("memoryGrid");

let editingId = null;
let currentMain = "";
let currentSubs = [];

function logout() {
  auth.signOut().then(() => {
    window.location.href = "/login";
  });
}

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

async function uploadImage(file, folder) {
  if (!file) return null;

  const fileName = `${Date.now()}_${file.name}`;
  const fileRef = storage.ref().child(`${folder}/${fileName}`);

  await fileRef.put(file);

  return await fileRef.getDownloadURL();
}

function loadAlbumCards() {
  db.collection("memories")
    .orderBy("createdAt", "asc")
    .onSnapshot((snapshot) => {
      grid.innerHTML = "";

      snapshot.forEach((doc) => {
        const data = doc.data();

        const main = data.main || "/static/love.jpeg";
        const subs = data.subs || [
          "/static/love.jpeg",
          "/static/love.jpeg",
          "/static/love.jpeg"
        ];

        const card = document.createElement("div");
        card.classList.add("memory-card");

        card.innerHTML = `
          <div class="memory-photo">
            <img src="${main}" alt="Memória">
          </div>

          <div class="memory-info">
            <h3>${data.date || "Sem data"}</h3>
            <p>${data.text || "Sem descrição"}</p>

            <span class="music-chip">
              ${data.music ? "🎧 Música adicionada" : "🎧 Sem música"}
            </span>

            <div class="card-actions">
              <button onclick="openEditModal(
                '${doc.id}',
                '${escapeText(data.date)}',
                '${escapeText(data.text)}',
                '${escapeText(data.music || "")}',
                '${escapeText(main)}',
                '${escapeText(JSON.stringify(subs))}'
              )">
                Editar
              </button>

              <button onclick="deleteMemory('${doc.id}')">
                Excluir
              </button>
            </div>
          </div>
        `;

        grid.appendChild(card);
      });
    });
}

function escapeText(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "\\n");
}

function openEditModal(id, date, text, music, main, subsString) {
  editingId = id;
  currentMain = main || "/static/love.jpeg";

  try {
    currentSubs = JSON.parse(subsString.replace(/&quot;/g, '"'));
  } catch {
    currentSubs = [
      "/static/love.jpeg",
      "/static/love.jpeg",
      "/static/love.jpeg"
    ];
  }

  document.getElementById("editDate").value = date;
  document.getElementById("editText").value = text;
  document.getElementById("editMusic").value = music;

  document.getElementById("editMainPhoto").value = "";
  document.getElementById("editSubPhoto1").value = "";
  document.getElementById("editSubPhoto2").value = "";
  document.getElementById("editSubPhoto3").value = "";

  document.getElementById("editModal").classList.add("show");
}

function closeEditModal() {
  editingId = null;
  currentMain = "";
  currentSubs = [];
  document.getElementById("editModal").classList.remove("show");
}

async function saveEdit() {
  const saveBtn = document.querySelector(".save-edit-btn");
  saveBtn.disabled = true;
  saveBtn.innerText = "Salvando... 💖";

  const date = document.getElementById("editDate").value;
  const text = document.getElementById("editText").value;
  let music = document.getElementById("editMusic").value;

  const newMainPhoto = document.getElementById("editMainPhoto").files[0];
  const newSubPhoto1 = document.getElementById("editSubPhoto1").files[0];
  const newSubPhoto2 = document.getElementById("editSubPhoto2").files[0];
  const newSubPhoto3 = document.getElementById("editSubPhoto3").files[0];

  if (!editingId) return;

  if (!date || !text) {
    alert("Preenche data e descrição 💖");
    return;
  }

  music = convertSpotifyLink(music);

  try {
    let mainURL = currentMain;
    let subURLs = [...currentSubs];

    if (newMainPhoto) {
      mainURL = await uploadImage(newMainPhoto, "memories/main");
    }

    if (newSubPhoto1) {
      subURLs[0] = await uploadImage(newSubPhoto1, "memories/subs");
    }

    if (newSubPhoto2) {
      subURLs[1] = await uploadImage(newSubPhoto2, "memories/subs");
    }

    if (newSubPhoto3) {
      subURLs[2] = await uploadImage(newSubPhoto3, "memories/subs");
    }

    await db.collection("memories").doc(editingId).update({
      date: date,
      text: text,
      music: music || "",
      main: mainURL || "/static/love.jpeg",
      subs: [
        subURLs[0] || "/static/love.jpeg",
        subURLs[1] || "/static/love.jpeg",
        subURLs[2] || "/static/love.jpeg"
      ],
      updatedAt: new Date()
    });

    alert("Memória atualizada 💖");
    closeEditModal();

    } catch (error) {
    console.error("Erro ao editar:", error);
    alert("Erro ao editar: " + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerText = "Salvar alterações";
  }
}

async function deleteMemory(id) {
  const confirmDelete = confirm("Tem certeza que quer excluir essa memória?");

  if (!confirmDelete) return;

  try {
    await db.collection("memories").doc(id).delete();
    alert("Memória excluída 💔");

  } catch (error) {
    console.error("Erro ao excluir:", error);
    alert("Erro ao excluir: " + error.message);
  }
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
  loadAlbumCards();
};