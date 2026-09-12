/* =========================================================
   PUSH NOTIFICATIONS
   Nosso Mundo
========================================================= */

async function getFirebaseIdToken() {

  const currentAuth =
    typeof auth !== "undefined"
      ? auth
      : firebase.auth();


  if (
    currentAuth.currentUser
  ) {

    return currentAuth
      .currentUser
      .getIdToken();

  }


  return new Promise(
    (resolve, reject) => {

      const unsubscribe =
        currentAuth.onAuthStateChanged(
          (user) => {

            unsubscribe();

            if (!user) {

              reject(
                new Error(
                  "Usuário não autenticado."
                )
              );

              return;

            }

            user
              .getIdToken()
              .then(resolve)
              .catch(reject);

          }
        );


      setTimeout(
        () => {

          unsubscribe();

          reject(
            new Error(
              "Não foi possível confirmar sua sessão."
            )
          );

        },
        8000
      );

    }
  );

}



function urlBase64ToUint8Array(
  base64String
) {

  const padding =
    "=".repeat(
      (
        4 -
        base64String.length % 4
      )
      % 4
    );


  const base64 =
    (
      base64String + padding
    )
      .replace(/-/g, "+")
      .replace(/_/g, "/");


  const rawData =
    window.atob(
      base64
    );


  const outputArray =
    new Uint8Array(
      rawData.length
    );


  for (
    let index = 0;
    index < rawData.length;
    index += 1
  ) {

    outputArray[index] =
      rawData.charCodeAt(
        index
      );

  }


  return outputArray;

}



async function getVapidPublicKey() {

  const response =
    await fetch(
      "/api/push/public-key"
    );


  const data =
    await response.json();


  if (
    !response.ok ||
    !data.publicKey
  ) {

    throw new Error(
      data.error ||
      "Chave pública de notificação não encontrada."
    );

  }


  return data.publicKey;

}



async function registerServiceWorker() {

  if (
    !(
      "serviceWorker" in navigator
    )
  ) {

    throw new Error(
      "Este navegador não suporta Service Worker."
    );

  }


  return navigator
    .serviceWorker
    .register(
      "/static/service-worker.js"
    );

}



async function subscribeToPushNotifications() {

  if (
    !(
      "Notification" in window
    )
  ) {

    throw new Error(
      "Este navegador não suporta notificações."
    );

  }


  if (
    !(
      "PushManager" in window
    )
  ) {

    throw new Error(
      "Este navegador não suporta Push Notification."
    );

  }


  const permission =
    await Notification.requestPermission();


  if (
    permission !== "granted"
  ) {

    throw new Error(
      "Permissão de notificação não concedida."
    );

  }


  const registration =
    await registerServiceWorker();


  const existingSubscription =
    await registration
      .pushManager
      .getSubscription();


  if (existingSubscription) {

    await savePushSubscription(
      existingSubscription
    );


    return existingSubscription;

  }


  const publicKey =
    await getVapidPublicKey();


  const subscription =
    await registration
      .pushManager
      .subscribe({

        userVisibleOnly:
          true,

        applicationServerKey:
          urlBase64ToUint8Array(
            publicKey
          )

      });


  await savePushSubscription(
    subscription
  );


  return subscription;

}



async function savePushSubscription(
  subscription
) {

  const idToken =
    await getFirebaseIdToken();


  const response =
    await fetch(
      "/api/push/subscribe",
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

            subscription:
              subscription.toJSON()

          })

      }
    );


  const data =
    await response.json()
      .catch(
        () => ({})
      );


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Não foi possível ativar notificações."
    );

  }


  return data;

}



async function ensurePushSubscription() {

  const permission =
    Notification.permission;


  if (
    permission === "granted"
  ) {

    const registration =
      await registerServiceWorker();


    const existingSubscription =
      await registration
        .pushManager
        .getSubscription();


    if (existingSubscription) {

      await savePushSubscription(
        existingSubscription
      );


      return existingSubscription;

    }

  }


  return subscribeToPushNotifications();

}



window.subscribeToPushNotifications =
  subscribeToPushNotifications;


window.ensurePushSubscription =
  ensurePushSubscription;