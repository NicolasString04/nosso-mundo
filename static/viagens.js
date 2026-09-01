const tripGrid =
  document.getElementById("tripGrid");

const tripDetails =
  document.getElementById("tripDetails");

const travelEmptyState =
  document.getElementById("travelEmptyState");

let trips = [];
let selectedTripId = null;
let currentCoverURL = "";
let unsubscribeMoments = null;


/* =========================================================
   AUTENTICAÇÃO
========================================================= */

function logout() {
  auth.signOut().then(() => {
    window.location.href = "/login";
  });
}


/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

function sanitizeFileName(fileName) {
  return String(fileName || "capa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}


function convertSpotifyLink(link) {
  if (!link) return "";

  let cleanLink =
    link.trim().split("?")[0];

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


function timestampToMillis(timestamp) {
  if (!timestamp) return 0;

  if (
    typeof timestamp.toMillis ===
    "function"
  ) {
    return timestamp.toMillis();
  }

  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }

  return 0;
}


function getStatusInformation(status) {
  const statusMap = {
    wishlist: {
      label: "Lista de desejos",
      className: "status-wishlist"
    },

    planning: {
      label: "Em planejamento",
      className: "status-planning"
    },

    planned: {
      label: "Planejada",
      className: "status-planned"
    },

    completed: {
      label: "Realizada",
      className: "status-completed"
    }
  };

  return (
    statusMap[status] ||
    statusMap.wishlist
  );
}


function parseISODate(dateISO) {
  if (
    !dateISO ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)
  ) {
    return null;
  }

  const [year, month, day] =
    dateISO.split("-").map(Number);

  const date =
    new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}


function formatTripDate(
  startDateISO,
  endDateISO
) {
  const startDate =
    parseISODate(startDateISO);

  const endDate =
    parseISODate(endDateISO);

  if (!startDate && !endDate) {
    return "A definir";
  }

  const formatter =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );

  if (
    startDate &&
    endDate &&
    startDateISO !== endDateISO
  ) {
    return (
      `${formatter.format(startDate)} — ` +
      `${formatter.format(endDate)}`
    );
  }

  return formatter.format(
    startDate || endDate
  );
}


function getTripLocation(trip) {
  return [trip.city, trip.country]
    .filter(Boolean)
    .join(", ") || "A definir";
}


function sortTrips(tripList) {
  return [...tripList].sort(
    (first, second) => {
      const firstHasOrder =
        Number.isFinite(first.order);

      const secondHasOrder =
        Number.isFinite(second.order);

      if (
        firstHasOrder &&
        secondHasOrder
      ) {
        return first.order - second.order;
      }

      if (
        firstHasOrder !== secondHasOrder
      ) {
        return firstHasOrder ? -1 : 1;
      }

      return (
        timestampToMillis(first.createdAt) -
        timestampToMillis(second.createdAt)
      );
    }
  );
}


function normalizeTrip(doc) {
  const data = doc.data();

  return {
    id: doc.id,

    name:
      data.name || "Destino",

    city:
      data.city || "",

    country:
      data.country || "",

    subtitle:
      data.subtitle || "",

    status:
      data.status || "wishlist",

    startDate:
      data.startDate || "",

    endDate:
      data.endDate || "",

    notes:
      data.notes || "",

    music:
      data.music || "",

    coverURL:
      data.coverURL || "",

    order:
      Number.isFinite(data.order)
        ? data.order
        : null,

    createdAt:
      data.createdAt || null
  };
}


/* =========================================================
   CARDS
========================================================= */

function createTripCard(trip) {
  const card =
    document.createElement("article");

  card.className = "trip-card";
  card.dataset.tripId = trip.id;

  if (trip.id === selectedTripId) {
    card.classList.add("selected");
  }


  if (trip.coverURL) {
    const cover =
      document.createElement("img");

    cover.className =
      "trip-card-cover";

    cover.src = trip.coverURL;

    cover.alt =
      `Foto de ${trip.name}`;

    cover.loading = "lazy";

    card.appendChild(cover);
  } else {
    const placeholder =
      document.createElement("div");

    placeholder.className =
      "trip-card-placeholder";

    placeholder.textContent = "✈️";

    card.appendChild(placeholder);
  }


  const favorite =
    document.createElement("button");

  favorite.type = "button";
  favorite.className = "trip-favorite";
  favorite.textContent = "♡";
  favorite.title = "Nossa viagem";

  favorite.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
    }
  );

  card.appendChild(favorite);


  const content =
    document.createElement("div");

  content.className =
    "trip-card-content";


  const title =
    document.createElement("h3");

  title.textContent = trip.name;


  const subtitle =
    document.createElement("p");

  subtitle.textContent =
    trip.subtitle ||
    getTripLocation(trip);


  const statusInfo =
    getStatusInformation(trip.status);

  const status =
    document.createElement("span");

  status.className =
    `trip-card-status ${statusInfo.className}`;

  status.textContent =
    statusInfo.label;


  content.append(
    title,
    subtitle,
    status
  );

  card.appendChild(content);


  card.addEventListener(
    "click",
    () => {
      selectTrip(trip.id);
    }
  );


  return card;
}


function renderTripCards() {
  tripGrid.innerHTML = "";

  if (trips.length === 0) {
    tripDetails.hidden = true;
    travelEmptyState.hidden = false;
    return;
  }

  travelEmptyState.hidden = true;

  trips.forEach((trip) => {
    tripGrid.appendChild(
      createTripCard(trip)
    );
  });
}


/* =========================================================
   DETALHES DA VIAGEM
========================================================= */

function getSelectedTrip() {
  return trips.find(
    (trip) =>
      trip.id === selectedTripId
  );
}


function renderSelectedTrip() {
  const trip = getSelectedTrip();

  if (!trip) {
    tripDetails.hidden = true;
    return;
  }

  tripDetails.hidden = false;


  const cover =
    document.getElementById(
      "selectedTripCover"
    );

  if (trip.coverURL) {
    cover.style.backgroundImage =
      `linear-gradient(
        rgba(8, 7, 20, 0.08),
        rgba(8, 7, 20, 0.18)
      ),
      url("${trip.coverURL}")`;
  } else {
    cover.style.backgroundImage = "";
  }


  document.getElementById(
    "selectedTripName"
  ).textContent =
    trip.name;


  document.getElementById(
    "selectedTripSubtitle"
  ).textContent =
    trip.subtitle ||
    "Nossa próxima aventura ❤️";


  document.getElementById(
    "selectedTripDate"
  ).textContent =
    formatTripDate(
      trip.startDate,
      trip.endDate
    );


  document.getElementById(
    "selectedTripLocation"
  ).textContent =
    getTripLocation(trip);


  const statusInfo =
    getStatusInformation(trip.status);

  const status =
    document.getElementById(
      "selectedTripStatus"
    );

  status.textContent =
    statusInfo.label;

  status.className =
    `trip-status ${statusInfo.className}`;


  document.getElementById(
    "selectedTripNotes"
  ).textContent =
    trip.notes ||
    "Nenhuma anotação adicionada.";


  renderTripMusic(trip.music);

  listenToMomentPreview(trip.id);
}


function renderTripMusic(musicLink) {
  const musicContainer =
    document.getElementById(
      "selectedTripMusic"
    );

  musicContainer.innerHTML = "";

  const embedLink =
    convertSpotifyLink(musicLink);

  if (!embedLink) {
    const message =
      document.createElement("p");

    message.textContent =
      "Nenhuma música adicionada.";

    musicContainer.appendChild(message);
    return;
  }

  const iframe =
    document.createElement("iframe");

  iframe.src = embedLink;
  iframe.loading = "lazy";
  iframe.allow =
    "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";

  musicContainer.appendChild(iframe);
}


function selectTrip(tripId) {
  selectedTripId = tripId;

  renderTripCards();
  renderSelectedTrip();
}


/* =========================================================
   PRÉVIA DOS MOMENTOS
========================================================= */

function normalizeMoment(doc) {
  const data = doc.data();

  return {
    id: doc.id,

    mediaURL:
      data.mediaURL || "",

    mediaType:
      data.mediaType || "image",

    caption:
      data.caption || "",

    order:
      Number.isFinite(data.order)
        ? data.order
        : null,

    createdAt:
      data.createdAt || null
  };
}


function sortMoments(momentList) {
  return [...momentList].sort(
    (first, second) => {
      const firstHasOrder =
        Number.isFinite(first.order);

      const secondHasOrder =
        Number.isFinite(second.order);

      if (
        firstHasOrder &&
        secondHasOrder
      ) {
        return first.order - second.order;
      }

      return (
        timestampToMillis(first.createdAt) -
        timestampToMillis(second.createdAt)
      );
    }
  );
}


function renderMomentPreview(moments) {
  const previewGrid =
    document.getElementById(
      "momentPreviewGrid"
    );

  previewGrid.innerHTML = "";

  const visibleMoments =
    moments.slice(0, 6);

  visibleMoments.forEach((moment) => {
    const preview =
      document.createElement("div");

    preview.className =
      "moment-preview";


    if (
      moment.mediaType === "video"
    ) {
      const video =
        document.createElement("video");

      video.src = moment.mediaURL;
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      const playIcon =
        document.createElement("span");

      playIcon.className =
        "moment-video-icon";

      playIcon.textContent = "▶";

      preview.append(
        video,
        playIcon
      );
    } else {
      const image =
        document.createElement("img");

      image.src = moment.mediaURL;
      image.alt =
        moment.caption ||
        "Momento da viagem";

      image.loading = "lazy";

      preview.appendChild(image);
    }

    preview.addEventListener(
      "click",
      openSelectedTripMoments
    );

    previewGrid.appendChild(preview);
  });


  const emptyAmount =
    Math.max(
      0,
      6 - visibleMoments.length
    );

  for (
    let index = 0;
    index < emptyAmount;
    index += 1
  ) {
    const empty =
      document.createElement("div");

    empty.className = "empty-moment";
    empty.textContent = "＋";

    empty.addEventListener(
      "click",
      openSelectedTripMoments
    );

    previewGrid.appendChild(empty);
  }
}


function listenToMomentPreview(tripId) {
  if (unsubscribeMoments) {
    unsubscribeMoments();
    unsubscribeMoments = null;
  }

  unsubscribeMoments =
    db
      .collection("trips")
      .doc(tripId)
      .collection("moments")
      .onSnapshot(
        (snapshot) => {
          const moments =
            sortMoments(
              snapshot.docs.map(
                normalizeMoment
              )
            );

          renderMomentPreview(moments);
        },

        (error) => {
          console.error(
            "Erro ao carregar momentos:",
            error
          );

          renderMomentPreview([]);
        }
      );
}


/* =========================================================
   MODAL
========================================================= */

function updateTripDateVisibility(
  clearDates = true
) {
  const status =
    document.getElementById(
      "tripStatus"
    ).value;

  const dateFields =
    document.getElementById(
      "tripDateFields"
    );

  const shouldHideDates =
    status === "wishlist";

  dateFields.hidden =
    shouldHideDates;

  if (
    shouldHideDates &&
    clearDates
  ) {
    document.getElementById(
      "tripStartDate"
    ).value = "";

    document.getElementById(
      "tripEndDate"
    ).value = "";
  }
}


function resetTripForm() {
  document.getElementById(
    "editingTripId"
  ).value = "";

  document.getElementById(
    "tripName"
  ).value = "";

  document.getElementById(
    "tripCity"
  ).value = "";

  document.getElementById(
    "tripCountry"
  ).value = "";

  document.getElementById(
    "tripSubtitle"
  ).value = "";

  document.getElementById(
    "tripStartDate"
  ).value = "";

  document.getElementById(
    "tripEndDate"
  ).value = "";

  document.getElementById(
    "tripStatus"
  ).value = "wishlist";

  document.getElementById(
    "tripNotes"
  ).value = "";

  document.getElementById(
    "tripMusic"
  ).value = "";

  document.getElementById(
    "tripCover"
  ).value = "";

  document.getElementById(
    "currentCoverInfo"
  ).textContent = "";

  document.getElementById(
    "tripNotesCounter"
  ).textContent = "0";

  currentCoverURL = "";

  updateTripDateVisibility();
}


function openTripModal(trip = null) {
  resetTripForm();

  const modal =
    document.getElementById(
      "tripModal"
    );

  const modalTitle =
    document.getElementById(
      "tripModalTitle"
    );

  if (trip) {
    modalTitle.textContent =
      "Editar viagem ✈️";

    document.getElementById(
      "editingTripId"
    ).value = trip.id;

    document.getElementById(
      "tripName"
    ).value = trip.name;

    document.getElementById(
      "tripCity"
    ).value = trip.city;

    document.getElementById(
      "tripCountry"
    ).value = trip.country;

    document.getElementById(
      "tripSubtitle"
    ).value = trip.subtitle;

    document.getElementById(
      "tripStartDate"
    ).value = trip.startDate;

    document.getElementById(
      "tripEndDate"
    ).value = trip.endDate;

    document.getElementById(
      "tripStatus"
    ).value = trip.status;

    document.getElementById(
      "tripNotes"
    ).value = trip.notes;

    document.getElementById(
      "tripMusic"
    ).value = trip.music;

    document.getElementById(
      "tripNotesCounter"
    ).textContent =
      String(trip.notes.length);

    currentCoverURL =
      trip.coverURL;

    document.getElementById(
      "currentCoverInfo"
    ).textContent =
      trip.coverURL
        ? "A capa atual será mantida se nenhuma nova imagem for escolhida."
        : "Esta viagem ainda não possui capa.";
  } else {
    modalTitle.textContent =
      "Adicionar viagem ✈️";
  }

  updateTripDateVisibility(false);

  modal.classList.add("show");

  document.body.style.overflow =
    "hidden";
}


function closeTripModal() {
  document
    .getElementById("tripModal")
    .classList.remove("show");

  document.body.style.overflow = "";
}


/* =========================================================
   UPLOAD DA CAPA
========================================================= */

async function uploadTripCover(
  file,
  tripId
) {
  if (!file) {
    return currentCoverURL;
  }

  if (
    !file.type.startsWith("image/")
  ) {
    throw new Error(
      "A capa da viagem precisa ser uma imagem."
    );
  }

  const maxFileSize =
    10 * 1024 * 1024;

  if (file.size > maxFileSize) {
    throw new Error(
      "A imagem de capa deve ter no máximo 10 MB."
    );
  }

  const safeName =
    sanitizeFileName(file.name);

  const fileName =
    `${Date.now()}_${safeName}`;

  const fileReference =
    storage
      .ref()
      .child(
        `trips/${tripId}/cover/${fileName}`
      );

  await fileReference.put(
    file,
    {
      contentType: file.type
    }
  );

  return fileReference.getDownloadURL();
}


/* =========================================================
   SALVAR VIAGEM
========================================================= */

async function saveTrip() {
  const editingTripId =
    document.getElementById(
      "editingTripId"
    ).value;

  const name =
    document.getElementById(
      "tripName"
    ).value.trim();

  const city =
    document.getElementById(
      "tripCity"
    ).value.trim();

  const country =
    document.getElementById(
      "tripCountry"
    ).value.trim();

  const subtitle =
    document.getElementById(
      "tripSubtitle"
    ).value.trim();

  let startDate =
    document.getElementById(
      "tripStartDate"
    ).value;

  let endDate =
    document.getElementById(
      "tripEndDate"
    ).value;

  const status =
    document.getElementById(
      "tripStatus"
    ).value;

  const notes =
    document.getElementById(
      "tripNotes"
    ).value.trim();

  const music =
    convertSpotifyLink(
      document.getElementById(
        "tripMusic"
      ).value
    );

  const coverFile =
    document.getElementById(
      "tripCover"
    ).files[0];

  if (status === "wishlist") {
    startDate = "";
    endDate = "";
  }

  if (!name || !city || !country) {
    alert(
      "Preencha o destino, a cidade e o país ❤️"
    );

    return;
  }

  if (
    startDate &&
    endDate &&
    endDate < startDate
  ) {
    alert(
      "A data final não pode ser anterior à data inicial."
    );

    return;
  }

  if (
    !editingTripId &&
    !coverFile
  ) {
    alert(
      "Escolha uma foto de capa para a viagem ❤️"
    );

    return;
  }


  const saveButton =
    document.getElementById(
      "saveTripBtn"
    );

  saveButton.disabled = true;
  saveButton.textContent =
    "Salvando viagem...";


  try {
    const tripReference =
      editingTripId
        ? db
            .collection("trips")
            .doc(editingTripId)
        : db
            .collection("trips")
            .doc();

    const coverURL =
      await uploadTripCover(
        coverFile,
        tripReference.id
      );

    const tripData = {
      name,
      city,
      country,
      subtitle,
      status,
      startDate,
      endDate,
      notes,
      music,
      coverURL,

      updatedAt:
        new Date()
    };

    if (!editingTripId) {
      tripData.order =
        Date.now();

      tripData.createdAt =
        new Date();
    }

    await tripReference.set(
      tripData,
      { merge: true }
    );

    selectedTripId =
      tripReference.id;

    closeTripModal();

    alert(
      editingTripId
        ? "Viagem atualizada ❤️"
        : "Viagem adicionada ❤️"
    );
  } catch (error) {
    console.error(
      "Erro ao salvar viagem:",
      error
    );

    alert(
      "Não foi possível salvar a viagem: " +
      error.message
    );
  } finally {
    saveButton.disabled = false;
    saveButton.textContent =
      "Salvar viagem ❤️";
  }
}


/* =========================================================
   EDITAR E EXCLUIR
========================================================= */

function editSelectedTrip() {
  const trip = getSelectedTrip();

  if (!trip) return;

  openTripModal(trip);
}


async function deleteStorageFile(url) {
  if (!url) return;

  try {
    await storage
      .refFromURL(url)
      .delete();
  } catch (error) {
    console.warn(
      "Não foi possível excluir um arquivo:",
      error
    );
  }
}


async function deleteSelectedTrip() {
  const trip = getSelectedTrip();

  if (!trip) return;

  const confirmed =
    confirm(
      `Excluir a viagem para ${trip.name}? ` +
      "As fotos e vídeos dela também serão excluídos."
    );

  if (!confirmed) return;


  try {
    const tripReference =
      db
        .collection("trips")
        .doc(trip.id);

    const momentsSnapshot =
      await tripReference
        .collection("moments")
        .get();

    const batch = db.batch();

    const mediaURLs = [];

    momentsSnapshot.forEach(
      (momentDocument) => {
        const data =
          momentDocument.data();

        if (data.mediaURL) {
          mediaURLs.push(
            data.mediaURL
          );
        }

        batch.delete(
          momentDocument.ref
        );
      }
    );

    batch.delete(tripReference);

    await batch.commit();


    await Promise.all([
      deleteStorageFile(
        trip.coverURL
      ),

      ...mediaURLs.map(
        deleteStorageFile
      )
    ]);


    selectedTripId = null;

    alert("Viagem excluída.");
  } catch (error) {
    console.error(
      "Erro ao excluir viagem:",
      error
    );

    alert(
      "Não foi possível excluir a viagem: " +
      error.message
    );
  }
}


/* =========================================================
   PÁGINA DE MOMENTOS
========================================================= */

function openSelectedTripMoments() {
  const trip = getSelectedTrip();

  if (!trip) return;

  window.location.href =
    `/viagens/${encodeURIComponent(
      trip.id
    )}/momentos`;
}


/* =========================================================
   CARREGAMENTO DO FIREBASE
========================================================= */

function loadTrips() {
  db
    .collection("trips")
    .onSnapshot(
      (snapshot) => {
        trips =
          sortTrips(
            snapshot.docs.map(
              normalizeTrip
            )
          );

        if (trips.length === 0) {
          selectedTripId = null;

          renderTripCards();

          if (unsubscribeMoments) {
            unsubscribeMoments();
            unsubscribeMoments = null;
          }

          return;
        }

        const selectedStillExists =
          trips.some(
            (trip) =>
              trip.id === selectedTripId
          );

        if (!selectedStillExists) {
          selectedTripId =
            trips[0].id;
        }

        renderTripCards();
        renderSelectedTrip();
      },

      (error) => {
        console.error(
          "Erro ao carregar viagens:",
          error
        );

        tripGrid.innerHTML = "";

        travelEmptyState.hidden = false;

        travelEmptyState.querySelector(
          "h2"
        ).textContent =
          "Não foi possível carregar as viagens";

        travelEmptyState.querySelector(
          "p"
        ).textContent =
          "Confira sua conexão e as permissões do Firebase.";
      }
    );
}


/* =========================================================
   EVENTOS
========================================================= */

const notesInput =
  document.getElementById(
    "tripNotes"
  );

const statusInput =
  document.getElementById(
    "tripStatus"
  );

statusInput.addEventListener(
  "change",
  () => {
    updateTripDateVisibility();
  }
);

notesInput.addEventListener(
  "input",
  () => {
    document.getElementById(
      "tripNotesCounter"
    ).textContent =
      String(notesInput.value.length);
  }
);


document
  .getElementById("tripModal")
  .addEventListener(
    "click",
    (event) => {
      if (
        event.target.id ===
        "tripModal"
      ) {
        closeTripModal();
      }
    }
  );


document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Escape") {
      closeTripModal();
    }
  }
);


window.addEventListener(
  "beforeunload",
  () => {
    if (unsubscribeMoments) {
      unsubscribeMoments();
    }
  }
);


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

loadTrips();