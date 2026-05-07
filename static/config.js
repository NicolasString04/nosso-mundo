let selectedBackground = "fundo1.jpeg";

function selectBackground(backgroundName, element) {
  selectedBackground = backgroundName;

  document.querySelectorAll(".background-card").forEach(card => {
    card.classList.remove("selected");
  });

  element.classList.add("selected");

  document.body.style.background = `
    linear-gradient(rgba(8, 8, 20, 0.78), rgba(8, 8, 20, 0.96)),
    url("/static/${backgroundName}")
  `;

  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";

  const previewBox = document.querySelector(".preview-box");

  previewBox.style.background = `
    linear-gradient(rgba(8, 8, 20, 0.45), rgba(8, 8, 20, 0.8)),
    url("/static/${backgroundName}")
  `;

  previewBox.style.backgroundSize = "cover";
  previewBox.style.backgroundPosition = "center";
}

async function saveBackground() {
  try {
    await db.collection("settings").doc("visual").set({
      background: selectedBackground,
      updatedAt: new Date()
    });

    alert("Fundo salvo com sucesso 💖");

  } catch (error) {
    console.error("Erro ao salvar fundo:", error);
    alert("Erro ao salvar fundo: " + error.message);
  }
}

function loadSavedBackground() {
  db.collection("settings").doc("visual").get()
    .then((doc) => {
      if (doc.exists) {
        const data = doc.data();

        if (data.background) {
          selectedBackground = data.background;

          const cards = document.querySelectorAll(".background-card");

          cards.forEach(card => {
            const img = card.querySelector("img");

            if (img && img.src.includes(selectedBackground)) {
              card.classList.add("selected");
              selectBackground(selectedBackground, card);
            }
          });
        }
      }
    })
    .catch((error) => {
      console.error("Erro ao carregar configurações:", error);
    });
}

function logout() {
  auth.signOut().then(() => {
    window.location.href = "/login";
  });
}

window.onload = function () {
  loadSavedBackground();
};