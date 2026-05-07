function login() {
  const email = document.querySelector("input[type=email]").value;
  const senha = document.querySelector("input[type=password]").value;

  auth.signInWithEmailAndPassword(email, senha)
    .then(() => {
      window.location.href = "/home";
    })
    .catch((error) => {
      alert("Erro no login: " + error.message);
    });
}