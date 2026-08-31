const grid = document.getElementById("memoryGrid");

let editingId = null;
let currentMain = emptyMedia();
let currentSubs = createEmptySubs();

let albumMemories = [];
let originalMemoryIds = [];
let isOrganizing = false;
let draggedMemoryId = null;

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

    order:
      Number.isFinite(data.order)
        ? data.order
        : null,

    createdAt:
      data.createdAt || null,

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

function timestampToMillis(timestamp) {
  if (!timestamp) return 0;

  if (typeof timestamp.toMillis === "function") {
    return timestamp.toMillis();
  }

  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }

  return 0;
}

function compareMemoryOrder(first, second) {
  const firstHasOrder =
    Number.isFinite(first.order);

  const secondHasOrder =
    Number.isFinite(second.order);

  if (firstHasOrder && secondHasOrder) {
    return first.order - second.order;
  }

  if (firstHasOrder !== secondHasOrder) {
    return firstHasOrder ? -1 : 1;
  }

  return (
    timestampToMillis(first.createdAt) -
    timestampToMillis(second.createdAt)
  );
}

function sortAlbumMemories(memories) {
  return [...memories].sort(compareMemoryOrder);
}

function moveMemory(fromIndex, toIndex) {
  if (
    !isOrganizing ||
    fromIndex === toIndex ||
    toIndex < 0 ||
    toIndex >= albumMemories.length
  ) {
    return;
  }

  const [memory] =
    albumMemories.splice(fromIndex, 1);

  albumMemories.splice(toIndex, 0, memory);
  renderAlbumGrid();
}

function createOrderControls(index) {
  const controls = document.createElement("div");
  controls.className = "order-controls";

  const position = document.createElement("span");
  position.className = "memory-position";
  position.textContent =
    `${index + 1}ª posição`;

  const upButton = document.createElement("button");
  upButton.type = "button";
  upButton.className = "order-arrow";
  upButton.textContent = "↑";
  upButton.title = "Mover memória para cima";
  upButton.setAttribute(
    "aria-label",
    "Mover memória para cima"
  );
  upButton.disabled = index === 0;

  upButton.addEventListener("click", (event) => {
    event.stopPropagation();
    moveMemory(index, index - 1);
  });

  const downButton = document.createElement("button");
  downButton.type = "button";
  downButton.className = "order-arrow";
  downButton.textContent = "↓";
  downButton.title = "Mover memória para baixo";
  downButton.setAttribute(
    "aria-label",
    "Mover memória para baixo"
  );
  downButton.disabled =
    index === albumMemories.length - 1;

  downButton.addEventListener("click", (event) => {
    event.stopPropagation();
    moveMemory(index, index + 1);
  });

  controls.append(
    position,
    upButton,
    downButton
  );

  return controls;
}

function clearDragStyles() {
  document
    .querySelectorAll(
      ".memory-card.dragging, .memory-card.drag-over"
    )
    .forEach((card) => {
      card.classList.remove(
        "dragging",
        "drag-over"
      );
    });
}

function handleDragStart(event, memoryId) {
  if (!isOrganizing) {
    event.preventDefault();
    return;
  }

  draggedMemoryId = memoryId;

  event.currentTarget.classList.add(
    "dragging"
  );

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(
    "text/plain",
    memoryId
  );
}

function handleDragOver(event) {
  if (!isOrganizing) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";

  clearDragStyles();

  event.currentTarget.classList.add(
    "drag-over"
  );
}

function handleDrop(event, targetMemoryId) {
  if (!isOrganizing) return;

  event.preventDefault();

  const sourceMemoryId =
    draggedMemoryId ||
    event.dataTransfer.getData("text/plain");

  if (
    !sourceMemoryId ||
    sourceMemoryId === targetMemoryId
  ) {
    clearDragStyles();
    return;
  }

  const sourceIndex =
    albumMemories.findIndex(
      (memory) => memory.id === sourceMemoryId
    );

  const targetIndex =
    albumMemories.findIndex(
      (memory) => memory.id === targetMemoryId
    );

  if (
    sourceIndex === -1 ||
    targetIndex === -1
  ) {
    clearDragStyles();
    return;
  }

  const [memory] =
    albumMemories.splice(sourceIndex, 1);

  const updatedTargetIndex =
    albumMemories.findIndex(
      (item) => item.id === targetMemoryId
    );

  albumMemories.splice(
    updatedTargetIndex,
    0,
    memory
  );

  draggedMemoryId = null;
  clearDragStyles();
  renderAlbumGrid();
}

function handleDragEnd() {
  draggedMemoryId = null;
  clearDragStyles();
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

function createMemoryCard(memory, index) {
  const card = document.createElement("article");
  card.className = "memory-card";
  card.dataset.memoryId = memory.id;

  if (isOrganizing) {
    card.classList.add("organizing-card");
    card.draggable = true;

    card.addEventListener(
      "dragstart",
      (event) =>
        handleDragStart(event, memory.id)
    );

    card.addEventListener(
      "dragover",
      handleDragOver
    );

    card.addEventListener(
      "drop",
      (event) =>
        handleDrop(event, memory.id)
    );

    card.addEventListener(
      "dragend",
      handleDragEnd
    );
  }

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
    musicChip
  );

  if (isOrganizing) {
    info.appendChild(
      createOrderControls(index)
    );
  }

  info.appendChild(actions);

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

function renderAlbumGrid() {
  grid.innerHTML = "";

  grid.classList.toggle(
    "organizing",
    isOrganizing
  );

  if (albumMemories.length === 0) {
    renderEmptyAlbum();
    return;
  }

  albumMemories.forEach((memory, index) => {
    const card =
      createMemoryCard(memory, index);

    grid.appendChild(card);
  });
}

function loadAlbumCards() {
  db.collection("memories")
    .orderBy("createdAt", "asc")
    .onSnapshot(
      (snapshot) => {
        if (isOrganizing) {
          return;
        }

        albumMemories =
          sortAlbumMemories(
            snapshot.docs.map(
              (doc) => normalizeMemory(doc)
            )
          );

        renderAlbumGrid();
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

function updateOrganizeInterface() {
  const toolbar =
    document.getElementById(
      "organizeToolbar"
    );

  const organizeButton =
    document.getElementById(
      "organizeBtn"
    );

  if (toolbar) {
    toolbar.hidden = !isOrganizing;
  }

  if (organizeButton) {
    organizeButton.hidden = isOrganizing;
  }

  grid.classList.toggle(
    "organizing",
    isOrganizing
  );
}

function enterOrganizeMode() {
  if (albumMemories.length === 0) {
    alert(
      "Ainda não existem memórias para organizar."
    );
    return;
  }

  originalMemoryIds =
    albumMemories.map(
      (memory) => memory.id
    );

  isOrganizing = true;
  updateOrganizeInterface();
  renderAlbumGrid();
}

function cancelOrganizeMode() {
  const memoriesById =
    new Map(
      albumMemories.map(
        (memory) => [
          memory.id,
          memory
        ]
      )
    );

  const restoredMemories =
    originalMemoryIds
      .map((id) => memoriesById.get(id))
      .filter(Boolean);

  const restoredIds =
    new Set(originalMemoryIds);

  const newMemories =
    albumMemories.filter(
      (memory) =>
        !restoredIds.has(memory.id)
    );

  albumMemories = [
    ...restoredMemories,
    ...newMemories
  ];

  isOrganizing = false;
  originalMemoryIds = [];

  updateOrganizeInterface();
  renderAlbumGrid();
}

async function saveMemoryOrder() {
  if (!isOrganizing) return;

  const saveButton =
    document.getElementById(
      "saveOrderBtn"
    );

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent =
      "Salvando...";
  }

  try {
    const batch = db.batch();

    albumMemories.forEach(
      (memory, index) => {
        const reference =
          db
            .collection("memories")
            .doc(memory.id);

        batch.update(
          reference,
          { order: index }
        );
      }
    );

    await batch.commit();

    albumMemories =
      albumMemories.map(
        (memory, index) => ({
          ...memory,
          order: index
        })
      );

    isOrganizing = false;
    originalMemoryIds = [];

    updateOrganizeInterface();
    renderAlbumGrid();

    alert("Ordem das memórias salva 💖");
  } catch (error) {
    console.error(
      "Erro ao salvar ordem:",
      error
    );

    alert(
      "Não foi possível salvar a ordem: " +
      error.message
    );
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent =
        "Salvar ordem 💖";
    }
  }
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