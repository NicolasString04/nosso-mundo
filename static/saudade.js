/* =========================================================
   CANTINHO DA SAUDADE
   Nosso Mundo

   Fluxo:
   Nicolas -> Sofia
   Sofia   -> Nicolas

   A identidade é resolvida pelo backend.
========================================================= */


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const SAUDADE_CONFIG = {

  senderName: null,

  recipientName: null,

  collectionName:
    "saudades",

  emailEnabled:
    true,

  selectedChannel:
    "email",

  channels: {

    email: {

      label:
        "E-mail",

      icon:
        "✉",

      previewTitle:
        "Prévia do e-mail",

      previewCaption:
        "Assim o carinho chega por e-mail.",

      currentText:
        "E-mail",

      modalText:
        "vai receber um carinho seu por e-mail. ❤️",

      modalTitle:
        "Alguém sentiu saudades de você ❤️",

      successText:
        "recebeu seu carinho por e-mail.",

      emptyTitle:
        "Nenhuma saudade por e-mail ainda.",

      emptySubtitle:
        "Quando você enviar por e-mail, aparece aqui."

    },

    phone: {

      label:
        "Celular",

      icon:
        "▯",

      previewTitle:
        "Prévia da notificação",

      previewCaption:
        "Assim o carinho aparece no celular.",

      currentText:
        "Celular",

      modalText:
        "vai ver essa saudade como notificação no celular. ❤️",

      modalTitle:
        "Tô com saudades 💕",

      successText:
        "ganhou uma saudade no histórico de celular.",

      emptyTitle:
        "Nenhuma saudade pelo celular ainda.",

      emptySubtitle:
        "As saudades desse canal vão aparecer aqui."

    }

  },

  cooldownMinutes:
    10,

  historyLimit:
    5,

  /*
   * Buscamos mais documentos que o limite visual
   * para conseguir localizar o último envio
   * do usuário atual.
   */
  historySearchLimit:
    20

};


let toastTimer = null;

let cooldownTimer = null;

let lastSentAt = null;

let isSending = false;

let contextLoaded = false;

let historyDocuments = [];



/* =========================================================
   ELEMENTOS
========================================================= */

function getElement(id) {

  return document.getElementById(
    id
  );

}



/* =========================================================
   CANAL SELECIONADO
========================================================= */

function getSelectedChannelConfig() {

  return (
    SAUDADE_CONFIG.channels[
      SAUDADE_CONFIG
        .selectedChannel
    ]
    ||
    SAUDADE_CONFIG
      .channels
      .email
  );

}



function normalizeChannel(channel) {

  if (
    channel === "phone"
  ) {

    return "phone";

  }


  return "email";

}



/* =========================================================
   DATA / HORÁRIO
========================================================= */

function formatTime(date) {

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  ).format(date);

}



function formatDate(date) {

  const today =
    new Date();


  const yesterday =
    new Date(today);


  yesterday.setDate(
    yesterday.getDate() - 1
  );


  if (
    date.toDateString() ===
    today.toDateString()
  ) {

    return "Hoje";

  }


  if (
    date.toDateString() ===
    yesterday.toDateString()
  ) {

    return "Ontem";

  }


  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit"
    }
  ).format(date);

}



/* =========================================================
   ESTADO VISUAL ENQUANTO CARREGA
========================================================= */

function setContextLoadingState() {

  const recipient =
    getElement(
      "recipientName"
    );


  const previewSender =
    getElement(
      "previewSenderName"
    );


  const previewRecipient =
    getElement(
      "previewRecipientName"
    );


  const button =
    getElement(
      "sendSaudadeBtn"
    );


  if (recipient) {

    recipient.textContent =
      "...";

  }


  if (previewSender) {

    previewSender.textContent =
      "...";

  }


  if (previewRecipient) {

    previewRecipient.textContent =
      "...";

  }


  if (button) {

    button.disabled =
      true;

  }

}



/* =========================================================
   CONTEXTO NICOLAS / SOFIA
========================================================= */

async function loadSaudadeContext() {

  const user =
    auth.currentUser;


  if (!user) {

    throw new Error(
      "Usuário não autenticado."
    );

  }


  const idToken =
    await user.getIdToken();


  const response =
    await fetch(
      "/api/saudade/contexto",
      {

        method:
          "GET",

        headers: {

          "Authorization":
            `Bearer ${idToken}`

        }

      }
    );


  let data = {};


  try {

    data =
      await response.json();

  }

  catch (_) {

    data = {};

  }


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Não foi possível identificar o usuário."
    );

  }


  if (
    !data.senderName ||
    !data.recipientName
  ) {

    throw new Error(
      "Contexto do casal inválido."
    );

  }


  SAUDADE_CONFIG.senderName =
    data.senderName;


  SAUDADE_CONFIG.recipientName =
    data.recipientName;


  contextLoaded =
    true;


  updatePeopleUI();

}



/* =========================================================
   ATUALIZAR NOMES NA TELA
========================================================= */

function updatePeopleUI() {

  const recipient =
    getElement(
      "recipientName"
    );


  const previewSender =
    getElement(
      "previewSenderName"
    );


  const previewRecipient =
    getElement(
      "previewRecipientName"
    );


  if (recipient) {

    recipient.textContent =
      SAUDADE_CONFIG
        .recipientName;

  }


  if (previewSender) {

    previewSender.textContent =
      SAUDADE_CONFIG
        .senderName;

  }


  if (previewRecipient) {

    previewRecipient.textContent =
      SAUDADE_CONFIG
        .recipientName;

  }


  updateModalPeople();

  updateChannelUI();

}



/* =========================================================
   ATUALIZAR CANAL NA TELA
========================================================= */

function updateChannelUI() {

  const channel =
    getSelectedChannelConfig();


  document
    .querySelectorAll(
      ".channel-option"
    )
    .forEach(
      (button) => {

        const isActive =
          button.dataset.channel ===
          SAUDADE_CONFIG
            .selectedChannel;


        button.classList.toggle(
          "active",
          isActive
        );


        button.setAttribute(
          "aria-pressed",
          String(isActive)
        );

      }
    );


  const currentChannel =
    getElement(
      "currentChannelName"
    );


  if (currentChannel) {

    currentChannel.textContent =
      channel.currentText;

  }


  const previewIcon =
    getElement(
      "previewChannelIcon"
    );


  const previewTitle =
    getElement(
      "previewChannelTitle"
    );


  const previewCaption =
    getElement(
      "previewChannelCaption"
    );


  if (previewIcon) {

    previewIcon.textContent =
      channel.icon;

  }


  if (previewTitle) {

    previewTitle.textContent =
      channel.previewTitle;

  }


  if (previewCaption) {

    previewCaption.textContent =
      channel.previewCaption;

  }


  const emailPreview =
    getElement(
      "emailPreviewPanel"
    );


  const phonePreview =
    getElement(
      "phonePreviewPanel"
    );


  if (emailPreview) {

    emailPreview.hidden =
      SAUDADE_CONFIG
        .selectedChannel !== "email";

  }


  if (phonePreview) {

    phonePreview.hidden =
      SAUDADE_CONFIG
        .selectedChannel !== "phone";

  }


  const historyTitle =
    document.querySelector(
      ".history-card .side-card-title h2"
    );


  if (historyTitle) {

    historyTitle.textContent =
      SAUDADE_CONFIG.selectedChannel === "email"
        ? "Últimas saudades por e-mail"
        : "Últimas saudades pelo celular";

  }


  updateModalPeople();

  updatePreviewTime();

  renderHistory();

}



function setSaudadeChannel(channel) {

  const normalizedChannel =
    normalizeChannel(channel);


  if (
    normalizedChannel ===
    SAUDADE_CONFIG
      .selectedChannel
  ) {

    return;

  }


  SAUDADE_CONFIG.selectedChannel =
    normalizedChannel;


  updateChannelUI();

  updateCooldownUI();

}



/* =========================================================
   ATUALIZAR NOMES DO MODAL
========================================================= */

function updateModalPeople() {

  const channel =
    getSelectedChannelConfig();


  const modalPreview =
    document.querySelector(
      ".modal-preview small"
    );


  const modalDescription =
    document.querySelector(
      ".saudade-modal > p"
    );


  const modalTitle =
    document.querySelector(
      ".modal-preview strong"
    );


  if (
    modalPreview &&
    SAUDADE_CONFIG.senderName &&
    SAUDADE_CONFIG.recipientName
  ) {

    modalPreview.textContent =
      `De ${SAUDADE_CONFIG.senderName} para ${SAUDADE_CONFIG.recipientName}.`;

  }


  if (
    modalDescription &&
    SAUDADE_CONFIG.recipientName
  ) {

    modalDescription.textContent =
      `${SAUDADE_CONFIG.recipientName} ${channel.modalText}`;

  }


  if (modalTitle) {

    modalTitle.textContent =
      channel.modalTitle;

  }

}



/* =========================================================
   HORÁRIO DA PRÉVIA
========================================================= */

function updatePreviewTime() {

  const now =
    new Date();


  const time =
    formatTime(now);


  const preview =
    getElement(
      "emailPreviewTime"
    );


  const confirmation =
    getElement(
      "confirmationTime"
    );


  const phonePreview =
    getElement(
      "phonePreviewTime"
    );


  if (preview) {

    preview.textContent =
      `às ${time}`;

  }


  if (confirmation) {

    confirmation.textContent =
      `às ${time}`;

  }


  if (phonePreview) {

    phonePreview.textContent =
      time;

  }

}



/* =========================================================
   MODAL
========================================================= */

function openSaudadeConfirmation() {

  if (!contextLoaded) {

    showToast(
      "Só um instante ❤️",
      "Estamos preparando o Cantinho da Saudade."
    );

    return;

  }


  if (
    isCooldownActive()
  ) {

    showToast(
      "Calma, coração ❤️",
      "Você enviou uma saudade recentemente."
    );

    return;

  }


  updatePreviewTime();

  updateModalPeople();


  const modal =
    getElement(
      "saudadeModal"
    );


  if (!modal) {

    return;

  }


  modal.classList.add(
    "show"
  );

}



function closeSaudadeConfirmation() {

  const modal =
    getElement(
      "saudadeModal"
    );


  if (!modal) {

    return;

  }


  modal.classList.remove(
    "show"
  );

}



/* =========================================================
   TOAST
========================================================= */

function showToast(
  title,
  message
) {

  const toast =
    getElement(
      "saudadeToast"
    );


  const toastTitle =
    getElement(
      "toastTitle"
    );


  const toastMessage =
    getElement(
      "toastMessage"
    );


  if (
    !toast ||
    !toastTitle ||
    !toastMessage
  ) {

    return;

  }


  toastTitle.textContent =
    title;


  toastMessage.textContent =
    message;


  toast.classList.add(
    "show"
  );


  if (toastTimer) {

    clearTimeout(
      toastTimer
    );

  }


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      4500
    );

}



/* =========================================================
   FIREBASE TIMESTAMP -> DATE
========================================================= */

function timestampToDate(
  timestamp,
  fallbackValue
) {

  if (
    timestamp &&
    typeof timestamp.toDate ===
    "function"
  ) {

    return timestamp.toDate();

  }


  if (fallbackValue) {

    const fallbackDate =
      new Date(
        fallbackValue
      );


    if (
      !Number.isNaN(
        fallbackDate.getTime()
      )
    ) {

      return fallbackDate;

    }

  }


  return new Date();

}



/* =========================================================
   ITEM DO HISTÓRICO
========================================================= */

function getSaudadeChannel(data) {

  return normalizeChannel(
    data.channel ||
    "email"
  );

}



function createHistoryItem(
  data
) {

  const date =
    timestampToDate(
      data.createdAt,
      data.createdAtClient
    );


  const item =
    document.createElement(
      "div"
    );


  item.className =
    "history-item";


  const left =
    document.createElement(
      "div"
    );


  left.className =
    "history-item-left";


  const heart =
    document.createElement(
      "span"
    );


  heart.className =
    "history-heart";


  heart.textContent =
    "♡";


  const dateText =
    document.createElement(
      "span"
    );


  dateText.className =
    "history-date";


  dateText.textContent =
    formatDate(date);


  left.append(
    heart,
    dateText
  );


  const time =
    document.createElement(
      "span"
    );


  time.className =
    "history-time";


  time.textContent =
    formatTime(date);


  item.append(
    left,
    time
  );


  return item;

}



/* =========================================================
   HISTÓRICO
========================================================= */

function renderHistory() {

  const history =
    getElement(
      "saudadeHistory"
    );


  const viewAll =
    getElement(
      "viewAllHistoryBtn"
    );


  const user =
    auth.currentUser;


  if (
    !history ||
    !user
  ) {

    return;

  }


  history.innerHTML =
    "";


  const selectedChannel =
    SAUDADE_CONFIG
      .selectedChannel;


  const channel =
    getSelectedChannelConfig();


  const filteredDocuments =
    historyDocuments
      .filter(
        (doc) => {

          return (
            getSaudadeChannel(
              doc.data()
            )
            ===
            selectedChannel
          );

        }
      );


  if (
    filteredDocuments.length === 0
  ) {

    history.innerHTML = `
      <div class="history-empty">

        <span>♡</span>

        <p>
          ${channel.emptyTitle}
        </p>

        <small>
          ${channel.emptySubtitle}
        </small>

      </div>
    `;


    lastSentAt =
      null;


    updateCooldownUI();


    if (viewAll) {

      viewAll.hidden =
        true;

    }


    return;

  }


  /*
   * O histórico visual mostra somente
   * os primeiros registros.
   */

  filteredDocuments
    .slice(
      0,
      SAUDADE_CONFIG
        .historyLimit
    )
    .forEach(
      (doc) => {

        history.appendChild(
          createHistoryItem(
            doc.data()
          )
        );

      }
    );


  /*
   * O cooldown é calculado pelo UID real,
   * e não mais pelo nome.
   */

  const currentUserDocument =
    filteredDocuments.find(
      (doc) => {

        const data =
          doc.data();


        return (
          data.fromUid ===
          user.uid
        );

      }
    );


  if (currentUserDocument) {

    const data =
      currentUserDocument
        .data();


    lastSentAt =
      timestampToDate(
        data.createdAt,
        data.createdAtClient
      );

  }

  else {

    lastSentAt =
      null;

  }


  updateCooldownUI();


  if (viewAll) {

    viewAll.hidden =
      filteredDocuments.length <=
      SAUDADE_CONFIG
        .historyLimit;

  }

}



/* =========================================================
   OUVIR HISTÓRICO
========================================================= */

function loadSaudadeHistory() {

  db
    .collection(
      SAUDADE_CONFIG
        .collectionName
    )

    .orderBy(
      "createdAt",
      "desc"
    )

    .limit(
      SAUDADE_CONFIG
        .historySearchLimit
    )

    .onSnapshot(

      (snapshot) => {

        historyDocuments =
          snapshot.docs;


        renderHistory();

      },


      (error) => {

        console.error(
          "Erro ao carregar histórico de saudades:",
          error
        );


        showToast(
          "Ops...",
          "Não conseguimos carregar o histórico de saudades."
        );

      }

    );

}



/* =========================================================
   COOLDOWN
========================================================= */

function getCooldownMilliseconds() {

  return (
    SAUDADE_CONFIG
      .cooldownMinutes
    *
    60
    *
    1000
  );

}



function getCooldownRemaining() {

  if (!lastSentAt) {

    return 0;

  }


  const cooldownEnd =
    lastSentAt.getTime()
    +
    getCooldownMilliseconds();


  return Math.max(
    0,
    cooldownEnd - Date.now()
  );

}



function isCooldownActive() {

  return (
    getCooldownRemaining() >
    0
  );

}



function formatCooldown(
  milliseconds
) {

  const totalSeconds =
    Math.ceil(
      milliseconds / 1000
    );


  const minutes =
    Math.floor(
      totalSeconds / 60
    );


  const seconds =
    totalSeconds % 60;


  if (minutes > 0) {

    return (
      `${minutes}min ` +
      `${String(seconds)
        .padStart(2, "0")}s`
    );

  }


  return `${seconds}s`;

}



/* =========================================================
   COOLDOWN NA TELA
========================================================= */

function updateCooldownUI() {

  const button =
    getElement(
      "sendSaudadeBtn"
    );


  const message =
    getElement(
      "cooldownMessage"
    );


  if (
    !button ||
    !message
  ) {

    return;

  }


  /*
   * Enquanto o contexto do usuário
   * não foi carregado, não liberamos.
   */

  if (!contextLoaded) {

    button.disabled =
      true;

    return;

  }


  const remaining =
    getCooldownRemaining();


  if (remaining <= 0) {

    if (!isSending) {

      button.disabled =
        false;

    }


    message.hidden =
      true;


    if (cooldownTimer) {

      clearInterval(
        cooldownTimer
      );


      cooldownTimer =
        null;

    }


    return;

  }


  button.disabled =
    true;


  message.hidden =
    false;


  message.textContent =
    `Seu próximo carinho poderá ser enviado em ${formatCooldown(remaining)} ❤️`;


  if (!cooldownTimer) {

    cooldownTimer =
      setInterval(
        updateCooldownUI,
        1000
      );

  }

}



/* =========================================================
   SALVAR EVENTO NO FIRESTORE
========================================================= */

async function saveSaudadeEvent() {

  const user =
    auth.currentUser;


  if (!user) {

    throw new Error(
      "Usuário não autenticado."
    );

  }


  if (!contextLoaded) {

    throw new Error(
      "Não foi possível identificar quem está enviando."
    );

  }


  const now =
    new Date();


  const selectedChannel =
    SAUDADE_CONFIG
      .selectedChannel;


  const reference =
    await db
      .collection(
        SAUDADE_CONFIG
          .collectionName
      )
      .add({

        type:
          "miss_you",

        fromName:
          SAUDADE_CONFIG
            .senderName,

        toName:
          SAUDADE_CONFIG
            .recipientName,

        fromUid:
          user.uid,

        channel:
          selectedChannel,

        createdAt:
          firebase
            .firestore
            .FieldValue
            .serverTimestamp(),

        createdAtClient:
          now.toISOString(),

        emailStatus:
          selectedChannel === "email"
            ? "pending"
            : "not_applicable",

        notificationStatus:
          selectedChannel === "phone"
            ? "preview_ready"
            : "not_applicable",

        opened:
          false

      });


  return {

    id:
      reference.id,

    date:
      now

  };

}



/* =========================================================
   PEDIR ENVIO AO BACKEND
========================================================= */

async function requestRealEmail(
  saudadeId
) {

  const user =
    auth.currentUser;


  if (!user) {

    throw new Error(
      "Usuário não autenticado."
    );

  }


  const idToken =
    await user.getIdToken();


  const response =
    await fetch(
      "/api/saudade/enviar-email",
      {

        method:
          "POST",

        headers: {

          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${idToken}`

        },

        body:
          JSON.stringify({

            saudadeId:
              saudadeId

          })

      }
    );


  let data = {};


  try {

    data =
      await response.json();

  }

  catch (_) {

    data = {};

  }


  if (!response.ok) {

    const error =
      new Error(
        data.error ||
        "Não foi possível enviar o e-mail."
      );


    if (
      data.retryAfterSeconds
    ) {

      error.retryAfterSeconds =
        data.retryAfterSeconds;

    }


    throw error;

  }


  return data;

}

/* =========================================================
   PEDIR ENVIO DE NOTIFICAÇÃO AO BACKEND
========================================================= */

async function requestRealNotification(
  saudadeId
) {

  const user =
    auth.currentUser;


  if (!user) {

    throw new Error(
      "Usuário não autenticado."
    );

  }


  const idToken =
    await user.getIdToken();


  const response =
    await fetch(
      "/api/saudade/enviar-notificacao",
      {

        method:
          "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${idToken}`

          },

          body:
            JSON.stringify({

              saudadeId:
                saudadeId

            })

        }
      );


  let data = {};


  try {

    data =
      await response.json();

  }

  catch (_) {

    data = {};

  }


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Não foi possível enviar a notificação."
    );

  }


  return data;

}

/* =========================================================
   ENVIAR SAUDADE
========================================================= */

async function sendSaudade() {

  if (isSending) {

    return;

  }


  if (!contextLoaded) {

    showToast(
      "Só um instante ❤️",
      "Ainda estamos preparando o envio."
    );

    return;

  }


  if (
    isCooldownActive()
  ) {

    closeSaudadeConfirmation();


    showToast(
      "Calma, coração ❤️",
      "Você enviou uma saudade recentemente."
    );


    return;

  }


  const button =
    getElement(
      "confirmSendBtn"
    );


  isSending =
    true;


  if (button) {

    button.disabled =
      true;


    button.textContent =
      "Enviando... ♡";

  }


  try {

    const selectedChannel =
      SAUDADE_CONFIG
        .selectedChannel;


    /*
     * 1. Registra o evento.
     */

    const event =
      await saveSaudadeEvent();


    let result = {

      to:
        SAUDADE_CONFIG
          .recipientName

    };


    if (
  selectedChannel === "email"
) {

  /*
   * 2. Dispara o backend seguro.
   */

  result =
    await requestRealEmail(
      event.id
    );

}


if (
  selectedChannel === "phone"
) {

  /*
   * O destinatário precisa ter ativado
   * previamente as notificações no próprio
   * aparelho.
   *
   * Não tentamos inscrever o remetente aqui.
   */

  result =
    await requestRealNotification(
      event.id
    );

}


    lastSentAt =
      event.date;


    updateCooldownUI();


    closeSaudadeConfirmation();


    updatePreviewTime();


    showToast(
      "Saudade enviada! ❤️",
      `${result.to || SAUDADE_CONFIG.recipientName} ${getSelectedChannelConfig().successText}`
    );

  }


  catch (error) {

    console.error(
      "Erro ao enviar saudade:",
      error
    );


    if (
      error.retryAfterSeconds
    ) {

      lastSentAt =
        new Date(
          Date.now()
          -
          getCooldownMilliseconds()
          +
          (
            error.retryAfterSeconds
            *
            1000
          )
        );


      updateCooldownUI();

    }


    showToast(
      "Não foi dessa vez 💔",
      error.message ||
      "Não conseguimos enviar sua saudade."
    );

  }


  finally {

    isSending =
      false;


    if (button) {

      button.disabled =
        false;


      button.innerHTML =
        "♡ Enviar saudade";

    }


    updateCooldownUI();

  }

}



/* =========================================================
   FUNDO SALVO
========================================================= */

function applySavedBackground() {

  db
    .collection(
      "settings"
    )
    .doc(
      "visual"
    )
    .get()

    .then(
      (doc) => {

        if (
          !doc.exists
        ) {

          return;

        }


        const data =
          doc.data();


        if (
          !data.background
        ) {

          return;

        }


        document.body.style.background = `

          linear-gradient(
            rgba(8, 8, 20, 0.86),
            rgba(8, 8, 20, 0.96)
          ),

          url("/static/${data.background}")

        `;


        document.body.style
          .backgroundSize =
            "cover";


        document.body.style
          .backgroundPosition =
            "center";


        document.body.style
          .backgroundAttachment =
            "fixed";

      }
    )

    .catch(
      (error) => {

        console.error(
          "Erro ao carregar fundo:",
          error
        );

      }
    );

}



/* =========================================================
   LOGOUT
========================================================= */

function logout() {

  auth
    .signOut()

    .then(
      () => {

        window.location.href =
          "/login";

      }
    )

    .catch(
      (error) => {

        console.error(
          "Erro ao sair:",
          error
        );

      }
    );

}



/* =========================================================
   FECHAR MODAL CLICANDO FORA
========================================================= */

const saudadeModal =
  getElement(
    "saudadeModal"
  );


if (saudadeModal) {

  saudadeModal
    .addEventListener(
      "click",
      (event) => {

        if (
          event.target ===
          saudadeModal
        ) {

          closeSaudadeConfirmation();

        }

      }
    );

}



/* =========================================================
   ESC FECHA MODAL
========================================================= */

document
  .addEventListener(
    "keydown",
    (event) => {

      if (
        event.key ===
        "Escape"
      ) {

        closeSaudadeConfirmation();

      }

    }
  );

/* =========================================================
   ATIVAR NOTIFICAÇÕES NO CELULAR
========================================================= */

async function enablePhoneNotifications() {

  if (
    typeof subscribeToPushNotifications !==
    "function"
  ) {

    showToast(
      "Ops...",
      "As notificações ainda não foram carregadas."
    );

    return;

  }


  const button =
    document.querySelector(
      ".enable-notifications-btn"
    );


  try {

    if (button) {

      button.disabled =
        true;

      button.textContent =
        "Ativando notificações...";

    }


    await subscribeToPushNotifications();


    showToast(
      "Notificações ativadas ❤️",
      "Este celular já pode receber saudades."
    );


    if (button) {

      button.textContent =
        "Notificações ativadas neste celular";

    }

  }


  catch (error) {

    console.error(
      "Erro ao ativar notificações:",
      error
    );


    showToast(
      "Não foi possível ativar 💔",
      error.message ||
      "Confira a permissão de notificações do navegador."
    );


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Ativar notificações neste celular";

    }

  }

}

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function initializeSaudadePage() {

  setContextLoadingState();

  updatePreviewTime();

  updateChannelUI();

  applySavedBackground();


  try {

    await loadSaudadeContext();

    loadSaudadeHistory();

    updateCooldownUI();

  }

  catch (error) {

    console.error(
      "Erro ao inicializar Cantinho da Saudade:",
      error
    );


    showToast(
      "Não conseguimos abrir o Cantinho 💔",
      error.message ||
      "Não foi possível identificar sua conta."
    );


    const button =
      getElement(
        "sendSaudadeBtn"
      );


    if (button) {

      button.disabled =
        true;

    }

  }

}


initializeSaudadePage();


/*
 * Atualiza o relógio da prévia
 * a cada minuto.
 */

setInterval(
  updatePreviewTime,
  60000
);