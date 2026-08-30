const startDate = new Date("2026-03-20T00:00:00");

const memories = [];

let currentPage = 0;

let selectNewestAfterSave = false;


const MEDIA_IDS = {
  main: "mainPhoto",

  subs: [
    "subPhoto1",
    "subPhoto2",
    "subPhoto3"
  ]
};


/* =========================================================
   CONTADOR
========================================================= */

function updateTimer() {

  const now = new Date();

  const diff = now - startDate;


  const dias = Math.floor(
    diff / (1000 * 60 * 60 * 24)
  );


  const horas = Math.floor(
    (diff / (1000 * 60 * 60)) % 24
  );


  const minutos = Math.floor(
    (diff / (1000 * 60)) % 60
  );


  const segundos = Math.floor(
    (diff / 1000) % 60
  );


  document.getElementById("dias").innerText =
    dias;


  document.getElementById("horas").innerText =
    horas;


  document.getElementById("minutos").innerText =
    minutos;


  document.getElementById("segundos").innerText =
    segundos;
}


setInterval(
  updateTimer,
  1000
);


updateTimer();



/* =========================================================
   SPOTIFY
========================================================= */

function convertSpotifyLink(link) {

  if (!link) {
    return "";
  }


  let cleanLink =
    link
      .trim()
      .split("?")[0];


  cleanLink =
    cleanLink.replace(
      "open.spotify.com/intl-pt/track/",
      "open.spotify.com/embed/track/"
    );


  cleanLink =
    cleanLink.replace(
      "open.spotify.com/track/",
      "open.spotify.com/embed/track/"
    );


  return cleanLink;
}



/* =========================================================
   IDENTIFICAR FOTO OU VÍDEO
========================================================= */

function detectMediaType(file) {

  if (!file) {
    return "";
  }


  if (
    file.type &&
    file.type.startsWith("image/")
  ) {

    return "image";

  }


  if (
    file.type &&
    file.type.startsWith("video/")
  ) {

    return "video";

  }


  const extension =
    file.name
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
    videoExtensions.includes(extension)
  ) {

    return "video";

  }


  if (
    imageExtensions.includes(extension)
  ) {

    return "image";

  }


  return "";
}



function normalizeStoredType(type) {

  return type === "video"
    ? "video"
    : "image";
}



/* =========================================================
   LIMPAR NOME DO ARQUIVO
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



/* =========================================================
   UPLOAD FOTO / VÍDEO
========================================================= */

async function uploadMedia(
  file,
  folder
) {

  if (!file) {
    return null;
  }


  const mediaType =
    detectMediaType(file);


  if (!mediaType) {

    throw new Error(
      `Formato não suportado: ${file.name}`
    );

  }


  const safeName =
    sanitizeFileName(
      file.name
    );


  const uniquePart =
    Math.random()
      .toString(36)
      .slice(2, 9);


  const fileName =
    `${Date.now()}_${uniquePart}_${safeName}`;


  const fileRef =
    storage
      .ref()
      .child(
        `${folder}/${fileName}`
      );


  const metadata =
    file.type
      ? {
          contentType: file.type
        }
      : undefined;


  await fileRef.put(
    file,
    metadata
  );


  const url =
    await fileRef.getDownloadURL();


  return {
    url: url,
    type: mediaType
  };
}



/* =========================================================
   CRIA IMG OU VIDEO DINAMICAMENTE
========================================================= */

function createMediaElement(
  elementId,
  mediaUrl,
  mediaType,
  isMain = false
) {

  const currentElement =
    document.getElementById(
      elementId
    );


  if (!currentElement) {
    return null;
  }


  /*
   * Sem arquivo.
   */

  if (!mediaUrl) {

    currentElement
      .removeAttribute(
        "src"
      );


    currentElement.style.display =
      "none";


    if (
      currentElement
        .tagName
        .toLowerCase() === "video"
    ) {

      currentElement.pause();

      currentElement
        .removeAttribute(
          "src"
        );

      currentElement.load();

    }


    return currentElement;
  }


  const normalizedType =
    normalizeStoredType(
      mediaType
    );


  const desiredTag =
    normalizedType === "video"
      ? "video"
      : "img";


  const currentTag =
    currentElement
      .tagName
      .toLowerCase();


  let mediaElement =
    currentElement;


  /*
   * Se atualmente é IMG,
   * mas precisamos de VIDEO
   * (ou vice-versa),
   * substituímos o elemento.
   */

  if (
    currentTag !== desiredTag
  ) {

    mediaElement =
      document.createElement(
        desiredTag
      );


    mediaElement.id =
      elementId;


    if (isMain) {

      mediaElement.className =
        "main-book-photo";

    }


    currentElement.replaceWith(
      mediaElement
    );

  }


  mediaElement.style.display =
    "block";


  mediaElement.style.opacity =
    "1";


  mediaElement.src =
    mediaUrl;


  /*
   * Principal
   */

  if (isMain) {

    mediaElement
      .classList
      .add(
        "main-book-photo"
      );

  }


  /*
   * VÍDEO
   */

  if (
    normalizedType === "video"
  ) {

    mediaElement.controls =
      true;


    mediaElement.preload =
      "metadata";


    mediaElement.playsInline =
      true;


    mediaElement.setAttribute(
      "playsinline",
      ""
    );


    mediaElement.removeAttribute(
      "onclick"
    );


    mediaElement.style.cursor =
      "default";


    mediaElement.style.background =
      "#000";


    if (!isMain) {

      applyMiniVideoStyles(
        mediaElement
      );

    }

  }


  /*
   * IMAGEM
   */

  else {

    mediaElement.alt =
      "Memória";


    mediaElement.loading =
      "lazy";


    mediaElement.removeAttribute(
      "controls"
    );


    mediaElement.removeAttribute(
      "preload"
    );


    mediaElement.removeAttribute(
      "playsinline"
    );


    mediaElement.style.cursor =
      "pointer";


    mediaElement.style.background =
      "";


    mediaElement.onclick =
      function () {

        openPhotoModal(
          mediaUrl
        );

      };


    if (!isMain) {

      clearMiniVideoStyles(
        mediaElement
      );

    }

  }


  return mediaElement;
}



/* =========================================================
   ESTILO DOS VÍDEOS PEQUENOS
========================================================= */

function applyMiniVideoStyles(video) {

  video.style.width =
    "100%";


  video.style.height =
    window.innerWidth <= 600
      ? "70px"
      : "82px";


  video.style.objectFit =
    "cover";


  video.style.border =
    "5px solid #f8efe4";


  video.style.borderRadius =
    "3px";


  video.style.boxShadow =
    "0 5px 12px rgba(0,0,0,0.2)";


  video.style.minWidth =
    "0";
}



function clearMiniVideoStyles(element) {

  element.style.width =
    "";


  element.style.height =
    "";


  element.style.objectFit =
    "";


  element.style.border =
    "";


  element.style.borderRadius =
    "";


  element.style.boxShadow =
    "";


  element.style.minWidth =
    "";
}



/* =========================================================
   PAUSAR VÍDEOS AO TROCAR DE PÁGINA
========================================================= */

function pauseAllBookVideos() {

  document
    .querySelectorAll(
      ".page-left video"
    )
    .forEach(
      (video) => {

        video.pause();

      }
    );
}



/* =========================================================
   LAYOUT AUTOMÁTICO DAS MÍDIAS
========================================================= */

function applyMediaLayout(page) {

  const miniPhotos =
    document.getElementById(
      "miniPhotos"
    );


  const mainElement =
    document.getElementById(
      MEDIA_IDS.main
    );


  const validSubs =
    (page.subs || [])
      .filter(
        (media) =>
          media &&
          media.url
      );


  const hasMain =
    Boolean(
      page.main &&
      page.main.url
    );


  const totalMedia =
    (hasMain ? 1 : 0) +
    validSubs.length;


  /*
   * Layout das mídias menores.
   */

  if (miniPhotos) {

    if (
      validSubs.length === 0
    ) {

      miniPhotos.style.display =
        "none";

    }

    else {

      miniPhotos.style.display =
        "grid";


      if (
        validSubs.length === 1
      ) {

        miniPhotos.style.gridTemplateColumns =
          "1fr";

      }


      else if (
        validSubs.length === 2
      ) {

        miniPhotos.style.gridTemplateColumns =
          "repeat(2, 1fr)";

      }


      else {

        miniPhotos.style.gridTemplateColumns =
          "repeat(3, 1fr)";

      }

    }

  }


  /*
   * Quando existe apenas UMA mídia,
   * deixamos ela bem maior.
   */

  if (mainElement) {

    if (
      totalMedia === 1 &&
      hasMain
    ) {

      mainElement.style.height =
        window.innerWidth <= 600
          ? "260px"
          : "310px";


      mainElement.style.objectFit =
        normalizeStoredType(
          page.main.type
        ) === "video"
          ? "contain"
          : "cover";

    }

    else {

      mainElement.style.height =
        "";


      mainElement.style.objectFit =
        "";

    }

  }

}



/* =========================================================
   RENDERIZAR MÍDIAS DA PÁGINA
========================================================= */

function renderPageMedia(page) {

  createMediaElement(
    MEDIA_IDS.main,
    page.main?.url || "",
    page.main?.type || "image",
    true
  );


  MEDIA_IDS.subs.forEach(
    (
      elementId,
      index
    ) => {

      const media =
        page.subs?.[index];


      createMediaElement(
        elementId,
        media?.url || "",
        media?.type || "image",
        false
      );

    }
  );


  applyMediaLayout(
    page
  );
}



/* =========================================================
   CARREGAR PÁGINA
========================================================= */

function loadPage() {

  if (
    memories.length === 0
  ) {

    return;

  }


  const page =
    memories[currentPage];


  setTimeout(
    () => {

      pauseAllBookVideos();


      document
        .getElementById(
          "memoryDate"
        )
        .innerText =
          page.date ||
          "Sem data";


      document
        .getElementById(
          "memoryText"
        )
        .innerText =
          page.text ||
          "Sem descrição";


      renderPageMedia(
        page
      );


      /*
       * Spotify
       */

      const player =
        document.getElementById(
          "memoryMusicPlayer"
        );


      const noMusicText =
        document.getElementById(
          "noMusicText"
        );


      const musicLink =
        convertSpotifyLink(
          page.music
        );


      if (
        musicLink &&
        musicLink.includes(
          "open.spotify.com/embed/track/"
        )
      ) {

        player.src =
          musicLink;


        player.style.display =
          "block";


        if (noMusicText) {

          noMusicText.style.display =
            "none";

        }

      }

      else {

        player.removeAttribute(
          "src"
        );


        player.style.display =
          "none";


        if (noMusicText) {

          noMusicText.style.display =
            "block";

        }

      }


      renderDots();

    },

    300
  );

}



/* =========================================================
   NAVEGAÇÃO
========================================================= */

function nextPage() {

  flipToPage(
    "next"
  );

}



function prevPage() {

  flipToPage(
    "prev"
  );

}



function flipToPage(direction) {

  if (
    memories.length === 0
  ) {

    return;

  }


  const bookPage =
    document.getElementById(
      "bookPage"
    );


  pauseAllBookVideos();


  if (
    direction === "next"
  ) {

    bookPage
      .classList
      .add(
        "flip-next"
      );

  }

  else {

    bookPage
      .classList
      .add(
        "flip-prev"
      );

  }


  setTimeout(
    () => {

      if (
        direction === "next"
      ) {

        currentPage++;


        if (
          currentPage >=
          memories.length
        ) {

          currentPage = 0;

        }

      }

      else {

        currentPage--;


        if (
          currentPage < 0
        ) {

          currentPage =
            memories.length - 1;

        }

      }


      loadPage();


      bookPage
        .classList
        .remove(
          "flip-next"
        );


      bookPage
        .classList
        .remove(
          "flip-prev"
        );

    },

    350
  );

}



/* =========================================================
   BOLINHAS / PÁGINAS
========================================================= */

function renderDots() {

  const dots =
    document.getElementById(
      "dots"
    );


  dots.innerHTML =
    "";


  memories.forEach(
    (
      _,
      index
    ) => {

      const dot =
        document.createElement(
          "span"
        );


      dot
        .classList
        .add(
          "dot"
        );


      if (
        index === currentPage
      ) {

        dot
          .classList
          .add(
            "active"
          );

      }


      dot.onclick =
        function () {

          if (
            index === currentPage
          ) {

            return;

          }


          pauseAllBookVideos();


          currentPage =
            index;


          loadPage();

        };


      dots.appendChild(
        dot
      );

    }
  );

}



/* =========================================================
   EFEITOS
========================================================= */

function createHeart() {

  const heart =
    document.createElement(
      "div"
    );


  heart
    .classList
    .add(
      "heart"
    );


  heart.innerHTML =
    "❤️";


  heart.style.left =
    Math.random() *
    window.innerWidth +
    "px";


  heart.style.fontSize =
    (
      Math.random() * 18 +
      12
    ) +
    "px";


  heart.style.animationDuration =
    (
      Math.random() * 4 +
      3
    ) +
    "s";


  heart.style.opacity =
    Math.random() *
      0.7 +
    0.3;


  document.body.appendChild(
    heart
  );


  setTimeout(
    () => {

      heart.remove();

    },

    7000
  );

}



function createSparkle() {

  const sparkle =
    document.createElement(
      "div"
    );


  sparkle
    .classList
    .add(
      "sparkle"
    );


  sparkle.style.left =
    Math.random() *
    window.innerWidth +
    "px";


  sparkle.style.top =
    Math.random() *
    window.innerHeight +
    "px";


  sparkle.style.animationDuration =
    (
      Math.random() * 2 +
      1
    ) +
    "s";


  document.body.appendChild(
    sparkle
  );


  setTimeout(
    () => {

      sparkle.remove();

    },

    3000
  );

}



/*
 * Mantive os efeitos exatamente
 * nessa frequência por enquanto.
 *
 * Depois vamos otimizar isso.
 */

setInterval(
  createHeart,
  350
);


setInterval(
  createSparkle,
  180
);



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
    );

}



/* =========================================================
   MODAL NOVA MEMÓRIA
========================================================= */

function openMemoryModal() {

  document
    .getElementById(
      "memoryModal"
    )
    .classList
    .add(
      "show"
    );

}



function closeMemoryModal() {

  document
    .getElementById(
      "memoryModal"
    )
    .classList
    .remove(
      "show"
    );

}



/* =========================================================
   LIMPAR FORMULÁRIO
========================================================= */

function resetMemoryForm() {

  document.getElementById(
    "newDate"
  ).value = "";


  document.getElementById(
    "newText"
  ).value = "";


  document.getElementById(
    "newMusic"
  ).value = "";


  document.getElementById(
    "newMainPhoto"
  ).value = "";


  document.getElementById(
    "newSubPhoto1"
  ).value = "";


  document.getElementById(
    "newSubPhoto2"
  ).value = "";


  document.getElementById(
    "newSubPhoto3"
  ).value = "";

}



/* =========================================================
   SALVAR MEMÓRIA
========================================================= */

async function saveMemory() {

  const saveBtn =
    document.querySelector(
      ".save-memory-btn"
    );


  const date =
    document
      .getElementById(
        "newDate"
      )
      .value
      .trim();


  const text =
    document
      .getElementById(
        "newText"
      )
      .value
      .trim();


  let music =
    document
      .getElementById(
        "newMusic"
      )
      .value
      .trim();


  const mainFile =
    document
      .getElementById(
        "newMainPhoto"
      )
      .files[0];


  const subFiles = [

    document
      .getElementById(
        "newSubPhoto1"
      )
      .files[0],

    document
      .getElementById(
        "newSubPhoto2"
      )
      .files[0],

    document
      .getElementById(
        "newSubPhoto3"
      )
      .files[0]

  ];


  /*
   * Validação antes de bloquear botão.
   */

  if (
    !date ||
    !text
  ) {

    alert(
      "Preenche data e descrição 💖"
    );

    return;

  }


  saveBtn.disabled =
    true;


  saveBtn.innerText =
    "Salvando... 💖";


  music =
    convertSpotifyLink(
      music
    );


  try {

    /*
     * Principal
     */

    const mainMedia =
      await uploadMedia(
        mainFile,
        "memories/main"
      );


    /*
     * Complementares
     */

    const uploadedSubs =
      [];


    for (
      const file of subFiles
    ) {

      uploadedSubs.push(

        await uploadMedia(
          file,
          "memories/subs"
        )

      );

    }


    /*
     * Caso não tenha principal,
     * mantém a imagem padrão antiga.
     */

    const mainURL =
      mainMedia?.url ||
      "/static/love.jpeg";


    const mainType =
      mainMedia?.type ||
      "image";


    const subURLs =
      uploadedSubs.map(
        (media) =>
          media?.url ||
          ""
      );


    const subTypes =
      uploadedSubs.map(
        (media) =>
          media?.type ||
          ""
      );


    /*
     * Firestore
     */

    await db
      .collection(
        "memories"
      )
      .add({

        date: date,

        text: text,

        music:
          music || "",


        /*
         * CAMPOS ANTIGOS
         *
         * Continuamos salvando eles
         * para não quebrar o /album
         * enquanto ainda não alteramos ele.
         */

        main:
          mainURL,


        subs:
          subURLs,


        /*
         * NOVOS CAMPOS
         */

        mainType:
          mainType,


        subTypes:
          subTypes,


        createdAt:
          new Date()

      });


    alert(
      "Memória salva 💖"
    );


    resetMemoryForm();


    closeMemoryModal();


    /*
     * Faz o snapshot selecionar
     * automaticamente a memória
     * recém cadastrada.
     */

    selectNewestAfterSave =
      true;

  }

  catch (error) {

    console.error(
      "Erro ao salvar:",
      error
    );


    alert(
      "Erro ao salvar: " +
      error.message
    );

  }

  finally {

    saveBtn.disabled =
      false;


    saveBtn.innerText =
      "Salvar memória 💖";

  }

}



/* =========================================================
   CARREGAR MEMÓRIAS FIREBASE
========================================================= */

function loadMemoriesFromFirebase() {

  db
    .collection(
      "memories"
    )

    .orderBy(
      "createdAt",
      "asc"
    )

    .onSnapshot(

      (snapshot) => {

        memories.length =
          0;


        snapshot.forEach(
          (doc) => {

            const data =
              doc.data();


            /*
             * URLs antigas.
             */

            const subURLs =
              Array.isArray(
                data.subs
              )
                ? data.subs
                : [
                    "",
                    "",
                    ""
                  ];


            /*
             * Tipos novos.
             *
             * Caso a memória seja antiga
             * e ainda não tenha subTypes,
             * assumimos que eram fotos.
             */

            const subTypes =
              Array.isArray(
                data.subTypes
              )
                ? data.subTypes
                : [
                    "image",
                    "image",
                    "image"
                  ];


            /*
             * Garantir sempre 3 posições.
             */

            while (
              subURLs.length < 3
            ) {

              subURLs.push(
                ""
              );

            }


            while (
              subTypes.length < 3
            ) {

              subTypes.push(
                "image"
              );

            }


            memories.push({

              id:
                doc.id,


              date:
                data.date ||
                "",


              text:
                data.text ||
                "",


              music:
                data.music ||
                "",


              /*
               * PRINCIPAL
               */

              main: {

                url:
                  data.main ||
                  "",


                /*
                 * Memórias antigas
                 * não possuem mainType.
                 */

                type:
                  normalizeStoredType(
                    data.mainType
                  )

              },


              /*
               * COMPLEMENTARES
               */

              subs:
                subURLs
                  .slice(
                    0,
                    3
                  )
                  .map(
                    (
                      url,
                      index
                    ) => {

                      return {

                        url:
                          url ||
                          "",


                        type:
                          normalizeStoredType(
                            subTypes[
                              index
                            ]
                          )

                      };

                    }
                  )

            });

          }
        );


        /*
         * Depois de carregar.
         */

        if (
          memories.length > 0
        ) {

          /*
           * Acabou de cadastrar?
           * Vai para a última.
           */

          if (
            selectNewestAfterSave
          ) {

            currentPage =
              memories.length - 1;


            selectNewestAfterSave =
              false;

          }


          /*
           * Proteção contra índice
           * inexistente.
           */

          else if (
            currentPage >=
            memories.length
          ) {

            currentPage =
              memories.length - 1;

          }


          loadPage();

        }

      },


      (error) => {

        console.error(
          "Erro ao ouvir memórias:",
          error
        );

      }

    );

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


        document.body.style.background =
          `
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
   MODAL FOTO
========================================================= */

function openPhotoModal(src) {

  if (!src) {
    return;
  }


  const modal =
    document.getElementById(
      "photoModal"
    );


  const expandedPhoto =
    document.getElementById(
      "expandedPhoto"
    );


  expandedPhoto.src =
    src;


  modal
    .classList
    .add(
      "show"
    );

}



function closePhotoModal() {

  const modal =
    document.getElementById(
      "photoModal"
    );


  modal
    .classList
    .remove(
      "show"
    );

}



/* =========================================================
   RESPONSIVIDADE DOS VÍDEOS
========================================================= */

window.addEventListener(
  "resize",
  () => {

    if (
      memories.length === 0
    ) {

      return;

    }


    const page =
      memories[
        currentPage
      ];


    MEDIA_IDS
      .subs
      .forEach(
        (elementId) => {

          const element =
            document.getElementById(
              elementId
            );


          if (
            element &&
            element
              .tagName
              .toLowerCase() ===
              "video"
          ) {

            applyMiniVideoStyles(
              element
            );

          }

        }
      );


    applyMediaLayout(
      page
    );

  }
);



/* =========================================================
   INICIALIZAÇÃO
========================================================= */

applySavedBackground();

loadMemoriesFromFirebase();