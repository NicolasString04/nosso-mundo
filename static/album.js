const grid = document.getElementById("memoryGrid");

let editingId = null;
let currentMain = emptyMedia();
let currentSubs = createEmptySubs();

function emptyMedia() {
  return { url: "", type: "" };
}

function createEmptySubs() {
  return [emptyMedia(), emptyMedia(), emptyMedia()];
}

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

function detectMediaType(file) {
  if (!file) return "";

  if (file.type?.startsWith("image/")) return "image";
  if (file.type?.startsWith("video/")) return "video";

  const extension = file.name.split(".").pop().toLowerCase();
  const videoExtensions = ["mp4", "webm", "mov", "m4v", "ogv"];
  const imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "heic",
    "heif"
  ];

  if (videoExtensions.includes(extension)) return "video";
  if (imageExtensions.includes(extension)) return "image";

  return "";
}

function inferMediaType(url) {
  if (!url) return "";

  let decodedURL = String(url).toLowerCase();

  try {
    decodedURL = decodeURIComponent(decodedURL);
  } catch {
    // Mantém a URL original caso ela não possa ser decodificada.
  }

  return /\.(mp4|webm|mov|m4v|ogv)(?:\?|$)/i.test(decodedURL)
    ? "video"
    : "image";
}

function normalizeStoredType(type, url) {
  if (!url) return "";
  if (type === "video" || type === "image") return type;

  return inferMediaType(url);
}

function isLegacySubPlaceholder(url) {
  if (!url) return false;

  return /(?:^|\/)static\/love\.jpeg(?:\?|$)/i.test(String(url));
}

function sanitizeFileName(fileName) {
  return String(fileName || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function uploadMedia(file, folder) {
  if (!file) return null;

  const mediaType = detectMediaType(file);

  if (!mediaType) {
    throw new Error(`Formato não suportado: ${file.name}`);
  }

  const safeName = sanitizeFileName(file.name);
  const uniquePart = Math.random().toString(36).slice(2, 9);
  const fileName = `${Date.now()}_${uniquePart}_${safeName}`;
  const fileRef = storage.ref().child(`${folder}/${fileName}`);

  const metadata = file.type
    ? { contentType: file.type }
    : undefined;

  await fileRef.put(file, metadata);

  return {
    url: await fileRef.getDownloadURL(),
    type: mediaType
  };
}

function isValidISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function formatDateInPortuguese(dateISO) {
  if (!isValidISODate(dateISO)) {
    return "";
  }

  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
  ];

  const [year, month, day] = dateISO
    .split("-")
    .map(Number);

  return `${day} de ${months[month - 1]} de ${year}`;
}

function convertStoredDateToISO(value) {
  const originalValue = String(value || "").trim();

  if (!originalValue) {
    return "";
  }

  if (isValidISODate(originalValue)) {
    return originalValue;
  }

  const normalizedValue = originalValue
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const match = normalizedValue.match(
    /^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/
  );

  if (!match) {
    return "";
  }

  const monthNames = [
    "janeiro",
    "fevereiro",
    "marco",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro"
  ];

  const day = Number(match[1]);
  const month = monthNames.indexOf(match[2]) + 1;
  const year = Number(match[3]);

  if (!month) {
    return "";
  }

  const dateISO =
    `${String(year).padStart(4, "0")}-` +
    `${String(month).padStart(2, "0")}-` +
    `${String(day).padStart(2, "0")}`;

  return isValidISODate(dateISO)
    ? dateISO
    : "";
}

function getMemoryDateText(dateISO, legacyDate) {
  const normalizedDate =
    dateISO ||
    convertStoredDateToISO(legacyDate);

  if (normalizedDate) {
    return formatDateInPortuguese(normalizedDate);
  }

  return legacyDate || "Sem data";
}

function normalizeMemory(doc) {
  const data = doc.data();
  const mainURL = data.main || "";

  const storedSubURLs = Array.isArray(data.subs)
    ? data.subs
    : [];

  const storedSubTypes = Array.isArray(data.subTypes)
    ? data.subTypes
    : [];

  const subs = createEmptySubs().map((_, index) => {
    const originalURL = storedSubURLs[index] || "";

    const url = isLegacySubPlaceholder(originalURL)
      ? ""
      : originalURL;

    return {
      url,
      type: normalizeStoredType(
        storedSubTypes[index],
        url
      )
    };
  });

  const dateISO =
    data.dateISO ||
    convertStoredDateToISO(data.date);

  return {
    id: doc.id,

    date: getMemoryDateText(
      dateISO,
      data.date
    ),

    dateISO,

    text: data.text || "",
    music: data.music || "",

    main: {
      url: mainURL,
      type: normalizeStoredType(
        data.mainType,
        mainURL
      )
    },

    subs
  };
}

function getCardMedia(memory) {
  if (memory.main.url) {
    return memory.main;
  }

  return (
    memory.subs.find((media) => media.url) ||
    emptyMedia()
  );
}

function createCardMedia(memory) {
  const mediaWrapper = document.createElement("div");
  mediaWrapper.className = "memory-photo";

  const media = getCardMedia(memory);

  if (!media.url) {
    const emptyState = document.createElement("div");
    emptyState.className = "memory-no-media";
    emptyState.textContent = "♡ Memória sem mídia";

    mediaWrapper.appendChild(emptyState);
    return mediaWrapper;
  }

  const mediaElement = document.createElement(
    media.type === "video" ? "video" : "img"
  );

  mediaElement.src = media.url;

  if (media.type === "video") {
    mediaElement.controls = true;
    mediaElement.preload = "metadata";
    mediaElement.playsInline = true;
  } else {
    mediaElement.alt =
      `Memória de ${memory.date || "um dia especial"}`;

    mediaElement.loading = "lazy";
  }

  mediaWrapper.appendChild(mediaElement);

  return mediaWrapper;
}

function createMemoryCard(memory) {
  const card = document.createElement("article");
  card.className = "memory-card";

  card.appendChild(createCardMedia(memory));

  const info = document.createElement("div");
  info.className = "memory-info";

  const title = document.createElement("h3");
  title.textContent = memory.date || "Sem data";

  const description = document.createElement("p");
  description.textContent =
    memory.text || "Sem descrição";

  const musicChip = document.createElement("span");
  musicChip.className = "music-chip";

  musicChip.textContent = memory.music
    ? "🎧 Música adicionada"
    : "🎧 Sem música";

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "Editar";

  editButton.addEventListener("click", () => {
    openEditModal(memory);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Excluir";

  deleteButton.addEventListener("click", () => {
    deleteMemory(memory.id);
  });

  actions.append(editButton, deleteButton);

  info.append(
    title,
    description,
    musicChip,
    actions
  );

  card.appendChild(info);

  return card;
}

function renderEmptyAlbum() {
  const emptyState = document.createElement("div");

  emptyState.className = "album-empty-state";
  emptyState.textContent =
    "Nenhuma memória cadastrada ainda 💖";

  grid.appendChild(emptyState);
}

function loadAlbumCards() {
  db.collection("memories")
    .orderBy("createdAt", "asc")
    .onSnapshot(
      (snapshot) => {
        grid.innerHTML = "";

        if (snapshot.empty) {
          renderEmptyAlbum();
          return;
        }

        snapshot.forEach((doc) => {
          const memory = normalizeMemory(doc);
          const card = createMemoryCard(memory);

          grid.appendChild(card);
        });
      },

      (error) => {
        console.error(
          "Erro ao carregar o álbum:",
          error
        );

        grid.innerHTML = "";

        const errorState =
          document.createElement("div");

        errorState.className =
          "album-empty-state";

        errorState.textContent =
          "Não foi possível carregar as memórias.";

        grid.appendChild(errorState);
      }
    );
}

function renderCurrentMediaInfo() {
  const info =
    document.getElementById("currentMediaInfo");

  if (!info) return;

  const mainLabel = currentMain.url
    ? `Principal: ${
        currentMain.type === "video"
          ? "vídeo"
          : "foto"
      }`
    : "Sem mídia principal";

  const subCount = currentSubs.filter(
    (media) => media.url
  ).length;

  const subLabel =
    `${subCount} mídia${
      subCount === 1 ? "" : "s"
    } complementar${
      subCount === 1 ? "" : "es"
    }`;

  info.textContent =
    `${mainLabel} • ${subLabel}`;
}

function openEditModal(memory) {
  editingId = memory.id;

  currentMain = {
    ...memory.main
  };

  currentSubs = memory.subs.map((media) => ({
    ...media
  }));

  const editDateInput =
    document.getElementById("editDate");

  const currentDateInfo =
    document.getElementById("currentDateInfo");

  editDateInput.value =
    memory.dateISO || "";

  if (currentDateInfo) {
    if (memory.dateISO) {
      currentDateInfo.textContent =
        `Data atual: ${memory.date}`;
    } else if (
      memory.date &&
      memory.date !== "Sem data"
    ) {
      currentDateInfo.textContent =
        `Data atual: ${memory.date}. ` +
        "Escolha uma data no calendário para padronizá-la.";
    } else {
      currentDateInfo.textContent =
        "Escolha a data da memória.";
    }
  }

  document.getElementById("editText").value =
    memory.text;

  document.getElementById("editMusic").value =
    memory.music;

  document.getElementById("editMainPhoto").value = "";
  document.getElementById("editSubPhoto1").value = "";
  document.getElementById("editSubPhoto2").value = "";
  document.getElementById("editSubPhoto3").value = "";

  renderCurrentMediaInfo();

  document
    .getElementById("editModal")
    .classList.add("show");
}

function closeEditModal() {
  editingId = null;
  currentMain = emptyMedia();
  currentSubs = createEmptySubs();

  const currentDateInfo =
    document.getElementById("currentDateInfo");

  if (currentDateInfo) {
    currentDateInfo.textContent = "";
  }

  document
    .getElementById("editModal")
    .classList.remove("show");
}

async function saveEdit() {
  if (!editingId) {
    alert(
      "Nenhuma memória foi selecionada para edição."
    );

    return;
  }

  const dateISO = document
    .getElementById("editDate")
    .value
    .trim();

  const text = document
    .getElementById("editText")
    .value
    .trim();

  const music = convertSpotifyLink(
    document
      .getElementById("editMusic")
      .value
      .trim()
  );

  if (!dateISO || !text) {
    alert("Preenche data e descrição 💖");
    return;
  }

  const saveBtn =
    document.querySelector(".save-edit-btn");

  const newMainFile =
    document.getElementById("editMainPhoto")
      .files[0];

  const newSubFiles = [
    document.getElementById("editSubPhoto1")
      .files[0],

    document.getElementById("editSubPhoto2")
      .files[0],

    document.getElementById("editSubPhoto3")
      .files[0]
  ];

  saveBtn.disabled = true;
  saveBtn.textContent = "Salvando... 💖";

  try {
    const mainMedia = newMainFile
      ? await uploadMedia(
          newMainFile,
          "memories/main"
        )
      : { ...currentMain };

    const subMedia = currentSubs.map(
      (media) => ({ ...media })
    );

    for (
      let index = 0;
      index < newSubFiles.length;
      index += 1
    ) {
      if (newSubFiles[index]) {
        subMedia[index] = await uploadMedia(
          newSubFiles[index],
          "memories/subs"
        );
      }
    }

    await db
      .collection("memories")
      .doc(editingId)
      .update({
        date:
          formatDateInPortuguese(dateISO),

        dateISO,

        text,
        music: music || "",

        main: mainMedia.url || "",

        mainType: mainMedia.url
          ? mainMedia.type
          : "",

        subs: subMedia.map(
          (media) => media.url || ""
        ),

        subTypes: subMedia.map(
          (media) =>
            media.url ? media.type : ""
        ),

        updatedAt: new Date()
      });

    alert("Memória atualizada 💖");
    closeEditModal();
  } catch (error) {
    console.error("Erro ao editar:", error);

    alert(
      "Erro ao editar: " + error.message
    );
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Salvar alterações";
  }
}

async function deleteMemory(id) {
  const confirmDelete = confirm(
    "Tem certeza que quer excluir essa memória?"
  );

  if (!confirmDelete) return;

  try {
    await db
      .collection("memories")
      .doc(id)
      .delete();

    alert("Memória excluída 💔");
  } catch (error) {
    console.error("Erro ao excluir:", error);

    alert(
      "Erro ao excluir: " + error.message
    );
  }
}

function applySavedBackground() {
  db.collection("settings")
    .doc("visual")
    .get()
    .then((doc) => {
      if (!doc.exists) return;

      const data = doc.data();

      if (!data.background) return;

      document.body.style.background = `
        linear-gradient(
          rgba(8, 8, 20, 0.75),
          rgba(8, 8, 20, 0.95)
        ),
        url("/static/${data.background}")
      `;

      document.body.style.backgroundSize =
        "cover";

      document.body.style.backgroundPosition =
        "center";

      document.body.style.backgroundAttachment =
        "fixed";
    })
    .catch((error) => {
      console.error(
        "Erro ao carregar fundo:",
        error
      );
    });
}

applySavedBackground();
loadAlbumCards();