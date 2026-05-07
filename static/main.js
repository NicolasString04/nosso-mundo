// ⏳ DATA DE INÍCIO (MUDA AQUI)
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

// 💖 CORAÇÕES
function createHeart() {
  const heart = document.createElement("div");
  heart.classList.add("heart");
  heart.innerHTML = "❤️";

  heart.style.left = Math.random() * window.innerWidth + "px";
  heart.style.fontSize = (Math.random() * 20 + 10) + "px";
  heart.style.animationDuration = (Math.random() * 3 + 2) + "s";

  document.body.appendChild(heart);

  setTimeout(() => {
    heart.remove();
  }, 5000);
}

setInterval(createHeart, 200);

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

setInterval(createSparkle, 150);

document.addEventListener("DOMContentLoaded", () => {
  const musicBtn = document.querySelector(".btn-music");
  const player = document.getElementById("spotifyPlayer");

  musicBtn.addEventListener("click", () => {
    player.classList.toggle("show");
  });
});