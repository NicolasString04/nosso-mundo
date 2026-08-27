(() => {
  const guardScript = document.currentScript;
  const pageScript = guardScript.dataset.pageScript;

  auth.onAuthStateChanged(
    (user) => {
      if (!user) {
        window.location.replace("/login");
        return;
      }

      document.documentElement.style.visibility = "visible";

      if (pageScript) {
        const script = document.createElement("script");
        script.src = pageScript;
        document.body.appendChild(script);
      }
    },
    (error) => {
      console.error("Erro ao verificar autenticação:", error);
      window.location.replace("/login");
    }
  );
})();