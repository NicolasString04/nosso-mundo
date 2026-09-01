/* =========================================================
   NOSSO MUNDO
   VIAGEM - TODOS OS MOMENTOS
========================================================= */


/* =========================================================
   ESTADO
========================================================= */

const momentsPage =
  document.getElementById("momentsPage");

const tripId =
  getTripId();

let currentTrip = null;

let moments = [];

let currentFilter = "all";

let viewedMomentId = null;

let unsubscribeTrip = null;

let unsubscribeMoments = null;


/* =========================================================
   ELEMENTOS
========================================================= */

const momentGrid =
  document.getElementById("momentGrid");

const momentsEmptyState =
  document.getElementById("momentsEmptyState");

const momentModal =
  document.getElementById("momentModal");

const momentViewer =
  document.getElementById("momentViewer");

const viewerMedia =
  document.getElementById("viewerMedia");

const viewerCaption =
  document.getElementById("viewerCaption");

const viewerDate =
  document.getElementById("viewerDate");

const momentCaption =
  document.getElementById("momentCaption");

const momentCaptionCounter =
  document.getElementById("momentCaptionCounter");

const saveMomentBtn =
  document.getElementById("saveMomentBtn");


/* =========================================================
   TRIP ID
========================================================= */

function getTripId() {

  const pageTripId =
    String(
      momentsPage?.dataset?.tripId || ""
    ).trim();

  if (
    pageTripId &&
    !pageTripId.includes("{{")
  ) {
    return pageTripId;
  }

  const match =
    window.location.pathname.match(
      /\/viagens\/([^/]+)\/momentos\/?$/
    );

  if (!match) {
    return "";
  }

  return decodeURIComponent(
    match[1]
  );
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

  auth
    .signOut()
    .then(() => {

      window.location.href =
        "/login";

    })
    .catch((error) => {

      console.error(
        "Erro ao sair:",
        error
      );

    });
}


/* =========================================================
   UTILITÁRIOS
========================================================= */

function sanitizeFileName(fileName) {

  return String(
    fileName || "arquivo"
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
}


function detectMediaType(file) {

  if (!file) {
    return "";
  }

  if (
    file.type?.startsWith("image/")
  ) {
    return "image";
  }

  if (
    file.type?.startsWith("video/")
  ) {
    return "video";
  }

  const extension =
    String(file.name || "")
      .split(".")
      .pop()
      .toLowerCase();

  const videoExtensions = [
    "mp4",
    "webm",
    "mov",
    "m4v",
    "ogv"
  ];

  const imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "heic",
    "heif"
  ];

  if (
    videoExtensions.includes(
      extension
    )
  ) {
    return "video";
  }

  if (
    imageExtensions.includes(
      extension
    )
  ) {
    return "image";
  }

  return "";
}


function normalizeStoredType(
  type,
  url = ""
) {

  if (type === "video") {
    return "video";
  }

  if (type === "image") {
    return "image";
  }

  const cleanURL =
    decodeURIComponent(
      String(url || "")
    );

  if (
    /\.(mp4|webm|mov|m4v|ogv)(?:\?|$)/i
      .test(cleanURL)
  ) {
    return "video";
  }

  return "image";
}


function timestampToMillis(value) {

  if (!value) {
    return 0;
  }

  if (
    typeof value.toMillis ===
    "function"
  ) {
    return value.toMillis();
  }

  if (
    value instanceof Date
  ) {
    return value.getTime();
  }

  const parsed =
    new Date(value).getTime();

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}


function formatDateISO(dateISO) {

  if (
    !dateISO ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateISO
    )
  ) {
    return "";
  }

  const [
    year,
    month,
    day
  ] =
    dateISO
      .split("-")
      .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !== day
  ) {
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

  return (
    `${day} de ` +
    `${months[month - 1]} de ` +
    `${year}`
  );
}


function formatTripDate(
  startDate,
  endDate
) {

  const start =
    formatDateISO(
      startDate
    );

  const end =
    formatDateISO(
      endDate
    );

  if (
    start &&
    end &&
    startDate !== endDate
  ) {
    return `${start} — ${end}`;
  }

  if (start) {
    return start;
  }

  if (end) {
    return end;
  }

  return "A definir";
}


function formatDuration(seconds) {

  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "";
  }

  const totalSeconds =
    Math.floor(seconds);

  const minutes =
    Math.floor(
      totalSeconds / 60
    );

  const remaining =
    totalSeconds % 60;

  return (
    `${minutes}:` +
    `${String(remaining)
      .padStart(2, "0")}`
  );
}


/* =========================================================
   SPOTIFY
========================================================= */

function convertSpotifyLink(link) {

  if (!link) {
    return "";
  }

  let cleanLink =
    String(link)
      .trim()
      .split("?")[0];

  if (
    cleanLink.includes(
      "open.spotify.com/embed/"
    )
  ) {
    return cleanLink;
  }

  const match =
    cleanLink.match(
      /open\.spotify\.com\/(?:intl-[^/]+\/)?(track|playlist|album|episode|show)\/([^/#?]+)/
    );

  if (!match) {
    return "";
  }

  const type =
    match[1];

  const id =
    match[2];

  return (
    `https://open.spotify.com/` +
    `embed/${type}/${id}`
  );
}


function renderTripMusic(music) {

  const container =
    document.getElementById(
      "momentsTripMusic"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const embedURL =
    convertSpotifyLink(
      music
    );

  if (!embedURL) {

    const text =
      document.createElement(
        "p"
      );

    text.textContent =
      "Nenhuma música adicionada.";

    container.appendChild(
      text
    );

    return;
  }

  const iframe =
    document.createElement(
      "iframe"
    );

  iframe.src =
    embedURL;

  iframe.width =
    "100%";

  iframe.height =
    "152";

  iframe.frameBorder =
    "0";

  iframe.allow =
    "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";

  iframe.loading =
    "lazy";

  container.appendChild(
    iframe
  );
}


/* =========================================================
   CARREGAR VIAGEM
========================================================= */

function loadTrip() {

  if (!tripId) {

    alert(
      "Não foi possível identificar a viagem."
    );

    window.location.href =
      "/viagens";

    return;
  }

  unsubscribeTrip =
    db
      .collection("trips")
      .doc(tripId)
      .onSnapshot(

        (doc) => {

          if (!doc.exists) {

            alert(
              "Essa viagem não existe mais."
            );

            window.location.href =
              "/viagens";

            return;
          }

          currentTrip = {
            id: doc.id,
            ...doc.data()
          };

          renderTripInformation();

        },

        (error) => {

          console.error(
            "Erro ao carregar viagem:",
            error
          );

        }

      );
}


function renderTripInformation() {

  if (!currentTrip) {
    return;
  }

  const name =
    currentTrip.name ||
    "Nossa viagem";

  const city =
    currentTrip.city ||
    "";

  const country =
    currentTrip.country ||
    "";

  const location =
    [
      city,
      country
    ]
      .filter(Boolean)
      .join(", ") ||
    "A definir";

  const subtitle =
    currentTrip.subtitle ||
    "Nosso sonho, nossa história.";

  const notes =
    currentTrip.notes ||
    "Nenhuma anotação adicionada.";

  const date =
    formatTripDate(
      currentTrip.startDate,
      currentTrip.endDate
    );


  setText(
    "breadcrumbTripName",
    name
  );

  setText(
    "momentsTripName",
    name
  );

  setText(
    "informationTripName",
    name
  );

  setText(
    "informationTripSubtitle",
    subtitle
  );

  setText(
    "informationTripNotes",
    notes
  );

  setText(
    "informationTripDate",
    date
  );

  setText(
    "informationTripLocation",
    location
  );


  document.title =
    `Momentos de ${name} ❤️`;


  renderTripMusic(
    currentTrip.music
  );
}


function setText(
  elementId,
  text
) {

  const element =
    document.getElementById(
      elementId
    );

  if (!element) {
    return;
  }

  element.textContent =
    text || "";
}


/* =========================================================
   NORMALIZAR MOMENTO
========================================================= */

function normalizeMoment(doc) {

  const data =
    doc.data();

  const mediaURL =
    data.mediaURL ||
    "";

  const mediaType =
    normalizeStoredType(
      data.mediaType,
      mediaURL
    );

  const orderValue =
    Number(
      data.order
    );

  return {

    id:
      doc.id,

    mediaURL,

    mediaType,

    caption:
      data.caption ||
      "",

    dateISO:
      data.dateISO ||
      data.date ||
      "",

    favorite:
      Boolean(
        data.favorite
      ),

    order:
      Number.isFinite(
        orderValue
      )
        ? orderValue
        : null,

    createdAt:
      data.createdAt ||
      null,

    updatedAt:
      data.updatedAt ||
      null

  };
}


/* =========================================================
   CARREGAR MOMENTOS
========================================================= */

function loadMoments() {

  unsubscribeMoments =
    db
      .collection("trips")
      .doc(tripId)
      .collection("moments")
      .onSnapshot(

        (snapshot) => {

          moments = [];

          snapshot.forEach(
            (doc) => {

              moments.push(
                normalizeMoment(
                  doc
                )
              );

            }
          );


          moments.sort(
            compareMoments
          );


          renderMoments();

          updateStatistics();


          if (
            viewedMomentId &&
            !moments.some(
              (moment) =>
                moment.id ===
                viewedMomentId
            )
          ) {
            closeMomentViewer();
          }

        },

        (error) => {

          console.error(
            "Erro ao carregar momentos:",
            error
          );

        }

      );
}


function compareMoments(
  a,
  b
) {

  const orderA =
    a.order !== null
      ? a.order
      : timestampToMillis(
          a.createdAt
        );

  const orderB =
    b.order !== null
      ? b.order
      : timestampToMillis(
          b.createdAt
        );

  return orderA - orderB;
}


/* =========================================================
   FILTROS
========================================================= */

function setMomentFilter(filter) {

  const allowed = [
    "all",
    "image",
    "video"
  ];

  if (
    !allowed.includes(filter)
  ) {
    filter = "all";
  }

  currentFilter =
    filter;


  document
    .querySelectorAll(
      ".filter-btn"
    )
    .forEach(
      (button) => {

        button
          .classList
          .toggle(
            "active",
            button.dataset.filter ===
              filter
          );

      }
    );


  renderMoments();
}


function getFilteredMoments() {

  if (
    currentFilter === "all"
  ) {
    return [
      ...moments
    ];
  }

  return moments.filter(
    (moment) =>
      moment.mediaType ===
        currentFilter
  );
}


/* =========================================================
   RENDERIZAR GALERIA
========================================================= */

function renderMoments() {

  if (!momentGrid) {
    return;
  }

  momentGrid.innerHTML =
    "";

  const filtered =
    getFilteredMoments();


  updateEmptyState(
    filtered
  );


  filtered.forEach(
    (moment, index) => {

      const card =
        createMomentCard(
          moment,
          index
        );

      momentGrid.appendChild(
        card
      );

    }
  );
}


function updateEmptyState(
  filtered
) {

  if (!momentsEmptyState) {
    return;
  }

  const hasVisible =
    filtered.length > 0;

  momentGrid.hidden =
    !hasVisible;

  momentsEmptyState.hidden =
    hasVisible;


  if (hasVisible) {
    return;
  }


  const title =
    momentsEmptyState.querySelector(
      "h2"
    );

  const text =
    momentsEmptyState.querySelector(
      "p"
    );


  if (
    moments.length === 0
  ) {

    if (title) {

      title.textContent =
        "Os momentos dessa viagem começam aqui";

    }

    if (text) {

      text.textContent =
        "Adicione fotos e vídeos para guardar tudo o que vocês viverem juntos.";

    }

    return;
  }


  if (
    currentFilter === "image"
  ) {

    if (title) {
      title.textContent =
        "Nenhuma foto por aqui ainda";
    }

    if (text) {
      text.textContent =
        "Quando vocês adicionarem uma foto, ela aparecerá aqui.";
    }

  }


  else if (
    currentFilter === "video"
  ) {

    if (title) {
      title.textContent =
        "Nenhum vídeo por aqui ainda";
    }

    if (text) {
      text.textContent =
        "Quando vocês adicionarem um vídeo, ele aparecerá aqui.";
    }

  }
}


function createMomentCard(
  moment,
  index
) {

  const card =
    document.createElement(
      "article"
    );

  card.className =
    "moment-card";


  applyCardLayout(
    card,
    index
  );


  if (
    moment.mediaType ===
      "video"
  ) {

    const video =
      document.createElement(
        "video"
      );

    video.src =
      moment.mediaURL;

    video.preload =
      "metadata";

    video.muted =
      true;

    video.playsInline =
      true;


    card.appendChild(
      video
    );


    const playIcon =
      document.createElement(
        "span"
      );

    playIcon.className =
      "moment-card-video-icon";

    playIcon.textContent =
      "▶";

    card.appendChild(
      playIcon
    );


    const duration =
      document.createElement(
        "span"
      );

    duration.className =
      "moment-card-video-duration";

    duration.style.display =
      "none";


    video.addEventListener(
      "loadedmetadata",
      () => {

        const text =
          formatDuration(
            video.duration
          );

        if (!text) {
          return;
        }

        duration.textContent =
          text;

        duration.style.display =
          "block";

      }
    );


    card.appendChild(
      duration
    );

  }

  else {

    const image =
      document.createElement(
        "img"
      );

    image.src =
      moment.mediaURL;

    image.alt =
      moment.caption ||
      "Momento da viagem";

    image.loading =
      "lazy";

    card.appendChild(
      image
    );

  }


  /* FAVORITO */

  const favoriteButton =
    document.createElement(
      "button"
    );

  favoriteButton.type =
    "button";

  favoriteButton.className =
    "moment-card-favorite";

  favoriteButton.textContent =
    moment.favorite
      ? "♥"
      : "♡";

  favoriteButton.title =
    moment.favorite
      ? "Remover dos favoritos"
      : "Marcar como favorito";


  favoriteButton.addEventListener(
    "click",
    (event) => {

      event.stopPropagation();

      toggleMomentFavorite(
        moment
      );

    }
  );


  card.appendChild(
    favoriteButton
  );


  /* LEGENDA */

  if (moment.caption) {

    const caption =
      document.createElement(
        "p"
      );

    caption.className =
      "moment-card-caption";

    caption.textContent =
      moment.caption;

    card.appendChild(
      caption
    );

  }


  card.addEventListener(
    "click",
    () => {

      openMomentViewer(
        moment.id
      );

    }
  );


  return card;
}


function applyCardLayout(
  card,
  index
) {

  /*
   * Padrão visual estilo mosaico.
   */

  const pattern =
    index % 9;

  if (
    pattern === 0 ||
    pattern === 6
  ) {

    card.classList.add(
      "moment-large"
    );

  }

  else if (
    pattern === 3
  ) {

    card.classList.add(
      "moment-wide"
    );

  }
}


/* =========================================================
   ESTATÍSTICAS
========================================================= */

function updateStatistics() {

  const photos =
    moments.filter(
      (moment) =>
        moment.mediaType ===
          "image"
    ).length;

  const videos =
    moments.filter(
      (moment) =>
        moment.mediaType ===
          "video"
    ).length;


  setText(
    "photoCount",
    photos
  );

  setText(
    "videoCount",
    videos
  );

  setText(
    "momentCount",
    moments.length
  );
}


/* =========================================================
   FAVORITOS
========================================================= */

async function toggleMomentFavorite(
  moment
) {

  if (!moment?.id) {
    return;
  }

  try {

    await db
      .collection("trips")
      .doc(tripId)
      .collection("moments")
      .doc(moment.id)
      .update({

        favorite:
          !moment.favorite,

        updatedAt:
          new Date()

      });

  }

  catch (error) {

    console.error(
      "Erro ao favoritar momento:",
      error
    );

    alert(
      "Não foi possível atualizar o favorito."
    );

  }
}


/* =========================================================
   MODAL
========================================================= */

function openMomentModal(
  momentId = ""
) {

  resetMomentForm();


  if (momentId) {

    const moment =
      moments.find(
        (item) =>
          item.id ===
            momentId
      );

    if (!moment) {
      return;
    }


    document
      .getElementById(
        "editingMomentId"
      )
      .value =
        moment.id;


    document
      .getElementById(
        "momentModalTitle"
      )
      .textContent =
        "Editar momento ❤️";


    momentCaption.value =
      moment.caption || "";


    document
      .getElementById(
        "momentDate"
      )
      .value =
        /^\d{4}-\d{2}-\d{2}$/.test(
          moment.dateISO
        )
          ? moment.dateISO
          : "";


    const currentMedia =
      document.getElementById(
        "currentMomentMedia"
      );


    currentMedia.textContent =
      moment.mediaType ===
        "video"
        ? "Vídeo atual mantido. Escolha outro arquivo somente se quiser substituí-lo."
        : "Foto atual mantida. Escolha outro arquivo somente se quiser substituí-la.";


    saveMomentBtn.textContent =
      "Salvar alterações ❤️";

  }

  updateCaptionCounter();


  momentModal
    .classList
    .add(
      "show"
    );


  document.body.style.overflow =
    "hidden";
}


function closeMomentModal() {

  momentModal
    .classList
    .remove(
      "show"
    );

  resetMomentForm();

  document.body.style.overflow =
    momentViewer.classList.contains(
      "show"
    )
      ? "hidden"
      : "";
}


function resetMomentForm() {

  document
    .getElementById(
      "editingMomentId"
    )
    .value =
      "";

  document
    .getElementById(
      "momentMedia"
    )
    .value =
      "";

  momentCaption.value =
    "";

  document
    .getElementById(
      "momentDate"
    )
    .value =
      "";

  document
    .getElementById(
      "currentMomentMedia"
    )
    .textContent =
      "";

  document
    .getElementById(
      "momentModalTitle"
    )
    .textContent =
      "Adicionar momento ❤️";

  saveMomentBtn.textContent =
    "Salvar momento ❤️";

  updateCaptionCounter();
}


/* =========================================================
   CONTADOR DA LEGENDA
========================================================= */

function updateCaptionCounter() {

  if (
    !momentCaption ||
    !momentCaptionCounter
  ) {
    return;
  }

  momentCaptionCounter.textContent =
    momentCaption.value.length;
}


momentCaption?.addEventListener(
  "input",
  updateCaptionCounter
);


/* =========================================================
   UPLOAD
========================================================= */

async function uploadMomentMedia(
  file
) {

  if (!file) {
    return null;
  }

  const type =
    detectMediaType(
      file
    );

  if (!type) {

    throw new Error(
      "O arquivo precisa ser uma foto ou vídeo."
    );

  }

  const safeName =
    sanitizeFileName(
      file.name
    );

  const random =
    Math.random()
      .toString(36)
      .slice(2, 9);

  const fileName =
    `${Date.now()}_${random}_${safeName}`;

  const fileRef =
    storage
      .ref()
      .child(
        `trips/${tripId}/moments/${fileName}`
      );

  const metadata =
    file.type
      ? {
          contentType:
            file.type
        }
      : undefined;


  await fileRef.put(
    file,
    metadata
  );


  const mediaURL =
    await fileRef
      .getDownloadURL();


  return {

    mediaURL,

    mediaType:
      type

  };
}


/* =========================================================
   SALVAR MOMENTO
========================================================= */

async function saveMoment() {

  const editingId =
    document
      .getElementById(
        "editingMomentId"
      )
      .value
      .trim();

  const file =
    document
      .getElementById(
        "momentMedia"
      )
      .files[0];

  const caption =
    momentCaption
      .value
      .trim();

  const dateISO =
    document
      .getElementById(
        "momentDate"
      )
      .value
      .trim();


  const editingMoment =
    editingId
      ? moments.find(
          (moment) =>
            moment.id ===
              editingId
        )
      : null;


  if (
    !editingMoment &&
    !file
  ) {

    alert(
      "Escolha uma foto ou vídeo para o momento ❤️"
    );

    return;
  }


  if (
    file &&
    !detectMediaType(file)
  ) {

    alert(
      "O arquivo precisa ser uma foto ou vídeo."
    );

    return;
  }


  saveMomentBtn.disabled =
    true;

  saveMomentBtn.textContent =
    editingMoment
      ? "Salvando alterações..."
      : "Salvando momento...";


  let newUpload =
    null;


  try {

    if (file) {

      newUpload =
        await uploadMomentMedia(
          file
        );

    }


    /*
     * EDITAR
     */

    if (editingMoment) {

      const updateData = {

        caption,

        dateISO,

        updatedAt:
          new Date()

      };


      if (newUpload) {

        updateData.mediaURL =
          newUpload.mediaURL;

        updateData.mediaType =
          newUpload.mediaType;

      }


      await db
        .collection("trips")
        .doc(tripId)
        .collection("moments")
        .doc(editingMoment.id)
        .update(
          updateData
        );


      /*
       * Se trocou a mídia,
       * remove a antiga depois
       * da atualização funcionar.
       */

      if (
        newUpload &&
        editingMoment.mediaURL &&
        editingMoment.mediaURL !==
          newUpload.mediaURL
      ) {

        await deleteStorageFile(
          editingMoment.mediaURL,
          false
        );

      }

    }


    /*
     * CRIAR
     */

    else {

      await db
        .collection("trips")
        .doc(tripId)
        .collection("moments")
        .add({

          mediaURL:
            newUpload.mediaURL,

          mediaType:
            newUpload.mediaType,

          caption,

          dateISO,

          favorite:
            false,

          order:
            Date.now(),

          createdAt:
            new Date(),

          updatedAt:
            new Date()

        });

    }


    closeMomentModal();


    /*
     * Se estava editando pelo viewer,
     * ele será atualizado pelo snapshot.
     */

  }

  catch (error) {

    console.error(
      "Erro ao salvar momento:",
      error
    );


    /*
     * Se upload ocorreu,
     * mas Firestore falhou,
     * tenta limpar arquivo novo.
     */

    if (
      newUpload?.mediaURL
    ) {

      await deleteStorageFile(
        newUpload.mediaURL,
        false
      );

    }


    alert(
      "Erro ao salvar momento: " +
      error.message
    );

  }

  finally {

    saveMomentBtn.disabled =
      false;

    saveMomentBtn.textContent =
      editingMoment
        ? "Salvar alterações ❤️"
        : "Salvar momento ❤️";

  }
}


/* =========================================================
   REMOVER DO STORAGE
========================================================= */

async function deleteStorageFile(
  url,
  showError = true
) {

  if (!url) {
    return;
  }

  try {

    const ref =
      storage.refFromURL(
        url
      );

    await ref.delete();

  }

  catch (error) {

    console.warn(
      "Não foi possível remover mídia do Storage:",
      error
    );

    if (showError) {

      console.error(
        error
      );

    }

  }
}


/* =========================================================
   VISUALIZADOR
========================================================= */

function openMomentViewer(
  momentId
) {

  const moment =
    moments.find(
      (item) =>
        item.id ===
          momentId
    );

  if (!moment) {
    return;
  }

  viewedMomentId =
    moment.id;

  renderMomentViewer(
    moment
  );

  momentViewer
    .classList
    .add(
      "show"
    );

  document.body.style.overflow =
    "hidden";
}


function renderMomentViewer(
  moment
) {

  if (!moment) {
    return;
  }


  viewerMedia.innerHTML =
    "";


  if (
    moment.mediaType ===
      "video"
  ) {

    const video =
      document.createElement(
        "video"
      );

    video.src =
      moment.mediaURL;

    video.controls =
      true;

    video.preload =
      "metadata";

    video.playsInline =
      true;

    viewerMedia.appendChild(
      video
    );

  }

  else {

    const image =
      document.createElement(
        "img"
      );

    image.src =
      moment.mediaURL;

    image.alt =
      moment.caption ||
      "Momento da viagem";

    viewerMedia.appendChild(
      image
    );

  }


  viewerCaption.textContent =
    moment.caption ||
    "Um momento nosso ❤️";


  const formattedDate =
    formatDateISO(
      moment.dateISO
    );


  viewerDate.textContent =
    formattedDate ||
    "";


  const visible =
    getFilteredMoments();


  const previousButton =
    document.querySelector(
      ".viewer-previous"
    );

  const nextButton =
    document.querySelector(
      ".viewer-next"
    );


  const showNavigation =
    visible.length > 1;


  if (previousButton) {

    previousButton.style.display =
      showNavigation
        ? ""
        : "none";

  }


  if (nextButton) {

    nextButton.style.display =
      showNavigation
        ? ""
        : "none";

  }
}


function closeMomentViewer() {

  const video =
    viewerMedia.querySelector(
      "video"
    );

  if (video) {
    video.pause();
  }

  viewerMedia.innerHTML =
    "";

  viewedMomentId =
    null;

  momentViewer
    .classList
    .remove(
      "show"
    );

  document.body.style.overflow =
    momentModal.classList.contains(
      "show"
    )
      ? "hidden"
      : "";
}


function getViewedIndex() {

  const visible =
    getFilteredMoments();

  return visible.findIndex(
    (moment) =>
      moment.id ===
        viewedMomentId
  );
}


function showPreviousMoment() {

  const visible =
    getFilteredMoments();

  if (
    visible.length === 0
  ) {
    return;
  }

  let index =
    getViewedIndex();

  index--;

  if (index < 0) {
    index =
      visible.length - 1;
  }

  viewedMomentId =
    visible[index].id;

  renderMomentViewer(
    visible[index]
  );
}


function showNextMoment() {

  const visible =
    getFilteredMoments();

  if (
    visible.length === 0
  ) {
    return;
  }

  let index =
    getViewedIndex();

  index++;

  if (
    index >= visible.length
  ) {
    index = 0;
  }

  viewedMomentId =
    visible[index].id;

  renderMomentViewer(
    visible[index]
  );
}


/* =========================================================
   EDITAR MOMENTO DO VIEWER
========================================================= */

function editViewedMoment() {

  if (!viewedMomentId) {
    return;
  }

  const id =
    viewedMomentId;

  closeMomentViewer();

  openMomentModal(
    id
  );
}


/* =========================================================
   EXCLUIR MOMENTO
========================================================= */

function deleteViewedMoment() {

  if (!viewedMomentId) {
    return;
  }

  deleteMoment(
    viewedMomentId
  );
}


async function deleteMoment(
  momentId
) {

  const moment =
    moments.find(
      (item) =>
        item.id ===
          momentId
    );

  if (!moment) {
    return;
  }


  const confirmed =
    confirm(
      "Tem certeza que deseja excluir esse momento? ❤️"
    );

  if (!confirmed) {
    return;
  }


  try {

    await db
      .collection("trips")
      .doc(tripId)
      .collection("moments")
      .doc(moment.id)
      .delete();


    if (
      moment.mediaURL
    ) {

      await deleteStorageFile(
        moment.mediaURL,
        false
      );

    }


    if (
      viewedMomentId ===
        moment.id
    ) {

      closeMomentViewer();

    }

  }

  catch (error) {

    console.error(
      "Erro ao excluir momento:",
      error
    );

    alert(
      "Erro ao excluir momento: " +
      error.message
    );

  }
}


/* =========================================================
   EVENTOS DE MODAL / VIEWER
========================================================= */

momentModal?.addEventListener(
  "click",
  (event) => {

    if (
      event.target ===
        momentModal
    ) {

      closeMomentModal();

    }

  }
);


momentViewer?.addEventListener(
  "click",
  (event) => {

    if (
      event.target ===
        momentViewer
    ) {

      closeMomentViewer();

    }

  }
);


document.addEventListener(
  "keydown",
  (event) => {

    /*
     * MODAL
     */

    if (
      momentModal
        ?.classList
        .contains("show")
    ) {

      if (
        event.key ===
          "Escape"
      ) {

        closeMomentModal();

      }

      return;
    }


    /*
     * VIEWER
     */

    if (
      !momentViewer
        ?.classList
        .contains("show")
    ) {
      return;
    }


    if (
      event.key ===
        "Escape"
    ) {

      closeMomentViewer();

    }


    else if (
      event.key ===
        "ArrowLeft"
    ) {

      showPreviousMoment();

    }


    else if (
      event.key ===
        "ArrowRight"
    ) {

      showNextMoment();

    }

  }
);


/* =========================================================
   LIMPEZA DOS LISTENERS
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    if (
      typeof unsubscribeTrip ===
        "function"
    ) {

      unsubscribeTrip();

    }

    if (
      typeof unsubscribeMoments ===
        "function"
    ) {

      unsubscribeMoments();

    }

  }
);


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

if (!tripId) {

  console.error(
    "tripId não encontrado."
  );

  alert(
    "Não foi possível abrir essa viagem."
  );

  window.location.href =
    "/viagens";

}

else {

  loadTrip();

  loadMoments();

}