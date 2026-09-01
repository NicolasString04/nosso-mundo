import html
import json
import os
import smtplib
import ssl

from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from firebase_admin import firestore


# =========================================================
# CONFIGURAÇÃO BÁSICA
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

app = Flask(
    __name__,
    template_folder="pages"
)


# =========================================================
# FIREBASE ADMIN
# =========================================================

def initialize_firebase_admin():
    """
    Inicializa o Firebase Admin.

    Local:
        firebase_key.json

    Produção:
        FIREBASE_SERVICE_ACCOUNT_JSON
        como variável de ambiente.
    """

    try:
        firebase_admin.get_app()
        return
    except ValueError:
        pass

    firebase_json = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON"
    )

    if firebase_json:

        try:
            firebase_data = json.loads(
                firebase_json
            )

            cred = credentials.Certificate(
                firebase_data
            )

        except Exception as error:
            raise RuntimeError(
                "FIREBASE_SERVICE_ACCOUNT_JSON inválido."
            ) from error

    else:

        key_path = (
            BASE_DIR /
            "firebase_key.json"
        )

        if not key_path.exists():
            raise RuntimeError(
                "firebase_key.json não encontrado."
            )

        cred = credentials.Certificate(
            str(key_path)
        )

    firebase_admin.initialize_app(
        cred
    )


initialize_firebase_admin()

admin_db = firestore.client()


# =========================================================
# CONFIGURAÇÃO DOS USUÁRIOS
# =========================================================

def get_people_config():

    return {

        "nicolas": {

            "uid": os.getenv(
                "SAUDADE_NICOLAS_UID",
                ""
            ).strip(),

            "name": "Nicolas",

            "email": os.getenv(
                "SAUDADE_NICOLAS_EMAIL",
                ""
            ).strip()

        },

        "sofia": {

            "uid": os.getenv(
                "SAUDADE_SOFIA_UID",
                ""
            ).strip(),

            "name": "Sofia",

            "email": os.getenv(
                "SAUDADE_SOFIA_EMAIL",
                ""
            ).strip()

        }

    }


def validate_people_config():

    people = get_people_config()

    required_values = [
        people["nicolas"]["uid"],
        people["nicolas"]["email"],
        people["sofia"]["uid"],
        people["sofia"]["email"]
    ]

    if not all(required_values):
        raise RuntimeError(
            "Configuração de Nicolas/Sofia incompleta no .env."
        )

    if (
        people["nicolas"]["uid"]
        ==
        people["sofia"]["uid"]
    ):
        raise RuntimeError(
            "Nicolas e Sofia não podem possuir o mesmo UID."
        )

    return people


# =========================================================
# USUÁRIOS AUTORIZADOS
# =========================================================

def get_allowed_uids():

    raw_uids = os.getenv(
        "SAUDADE_ALLOWED_UIDS",
        ""
    )

    return {
        uid.strip()
        for uid in raw_uids.split(",")
        if uid.strip()
    }


# =========================================================
# IDENTIFICAR QUEM ENVIA E QUEM RECEBE
# =========================================================

def get_saudade_context(uid):
    """
    Nicolas logado:
        Nicolas -> Sofia

    Sofia logada:
        Sofia -> Nicolas
    """

    people = validate_people_config()

    nicolas = people["nicolas"]
    sofia = people["sofia"]

    if uid == nicolas["uid"]:

        return {
            "sender": nicolas,
            "recipient": sofia
        }

    if uid == sofia["uid"]:

        return {
            "sender": sofia,
            "recipient": nicolas
        }

    raise PermissionError(
        "Usuário não pertence ao Cantinho da Saudade."
    )


# =========================================================
# CONFIGURAÇÃO DO GMAIL
# =========================================================

def get_email_config():

    return {

        "user": os.getenv(
            "SAUDADE_EMAIL_USER",
            ""
        ).strip(),

        "password": os.getenv(
            "SAUDADE_EMAIL_APP_PASSWORD",
            ""
        ).replace(" ", "").strip()

    }


def validate_email_config():

    config = get_email_config()

    if not config["user"]:
        raise RuntimeError(
            "SAUDADE_EMAIL_USER não configurado."
        )

    if not config["password"]:
        raise RuntimeError(
            "SAUDADE_EMAIL_APP_PASSWORD não configurado."
        )

    return config


# =========================================================
# HORÁRIO
# =========================================================

def get_saudade_now():

    try:
        return datetime.now(
            ZoneInfo(
                "America/Sao_Paulo"
            )
        )

    except ZoneInfoNotFoundError:
        return (
            datetime
            .now()
            .astimezone()
        )


# =========================================================
# TOKEN FIREBASE
# =========================================================

def get_bearer_token():

    authorization = request.headers.get(
        "Authorization",
        ""
    )

    if not authorization.startswith(
        "Bearer "
    ):
        return None

    token = authorization[
        len("Bearer "):
    ].strip()

    return token or None


# =========================================================
# AUTENTICAÇÃO
# =========================================================

def authenticate_request():

    token = get_bearer_token()

    if not token:

        return None, (
            jsonify({
                "error":
                    "Autenticação necessária."
            }),
            401
        )

    try:

        decoded_token = (
            firebase_auth
            .verify_id_token(
                token,
                check_revoked=True
            )
        )

    except firebase_auth.RevokedIdTokenError:

        return None, (
            jsonify({
                "error":
                    "Sessão expirada."
            }),
            401
        )

    except Exception:

        return None, (
            jsonify({
                "error":
                    "Sessão inválida."
            }),
            401
        )

    uid = decoded_token.get(
        "uid"
    )

    if not uid:

        return None, (
            jsonify({
                "error":
                    "Usuário inválido."
            }),
            401
        )

    allowed_uids = get_allowed_uids()

    if not allowed_uids:

        app.logger.error(
            "SAUDADE_ALLOWED_UIDS não configurado."
        )

        return None, (
            jsonify({
                "error":
                    "Cantinho da Saudade não configurado."
            }),
            503
        )

    if uid not in allowed_uids:

        return None, (
            jsonify({
                "error":
                    "Usuário sem permissão."
            }),
            403
        )

    try:

        get_saudade_context(
            uid
        )

    except PermissionError:

        return None, (
            jsonify({
                "error":
                    "Usuário não autorizado."
            }),
            403
        )

    except RuntimeError:

        app.logger.exception(
            "Configuração dos usuários inválida."
        )

        return None, (
            jsonify({
                "error":
                    "Configuração do sistema incompleta."
            }),
            503
        )

    return decoded_token, None


# =========================================================
# RATE LIMIT
# =========================================================

class SaudadeRateLimitError(Exception):

    def __init__(
        self,
        remaining_seconds
    ):

        self.remaining_seconds = (
            remaining_seconds
        )

        super().__init__(
            str(
                remaining_seconds
            )
        )


@firestore.transactional
def reserve_saudade_send(
    transaction,
    rate_limit_ref,
    now,
    cooldown_seconds
):

    snapshot = rate_limit_ref.get(
        transaction=transaction
    )

    if snapshot.exists:

        data = snapshot.to_dict()

        last_attempt = data.get(
            "lastAttemptAt"
        )

        if last_attempt:

            if last_attempt.tzinfo is None:

                last_attempt = (
                    last_attempt.replace(
                        tzinfo=timezone.utc
                    )
                )

            elapsed = (
                now.astimezone(
                    timezone.utc
                )
                -
                last_attempt.astimezone(
                    timezone.utc
                )
            ).total_seconds()

            if elapsed < cooldown_seconds:

                remaining = max(
                    1,
                    int(
                        cooldown_seconds
                        - elapsed
                    )
                )

                raise SaudadeRateLimitError(
                    remaining
                )

    transaction.set(
        rate_limit_ref,
        {
            "lastAttemptAt":
                now,

            "updatedAt":
                firestore.SERVER_TIMESTAMP
        },
        merge=True
    )


def enforce_server_rate_limit(uid):

    cooldown_seconds = int(
        os.getenv(
            "SAUDADE_COOLDOWN_SECONDS",
            "600"
        )
    )

    now = datetime.now(
        timezone.utc
    )

    rate_limit_ref = (
        admin_db
        .collection(
            "saudade_rate_limits"
        )
        .document(uid)
    )

    transaction = (
        admin_db.transaction()
    )

    reserve_saudade_send(
        transaction,
        rate_limit_ref,
        now,
        cooldown_seconds
    )


# =========================================================
# HTML DO E-MAIL
# =========================================================

def build_saudade_email_html(
    sender_name,
    recipient_name,
    time_text,
    base_url
):

    sender = html.escape(
        sender_name
    )

    recipient = html.escape(
        recipient_name
    )

    safe_time = html.escape(
        time_text
    )

    safe_url = html.escape(
        base_url,
        quote=True
    )

    return f"""
<!DOCTYPE html>

<html lang="pt-BR">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Nosso Mundo
    </title>

</head>


<body
    style="
        margin:0;
        padding:0;
        background:#f7f4f5;
        font-family:Arial, Helvetica, sans-serif;
    "
>


<table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"

    style="
        width:100%;
        background:#f7f4f5;
        padding:40px 15px;
    "
>

<tr>

<td align="center">


<table
    role="presentation"
    width="620"
    cellspacing="0"
    cellpadding="0"
    border="0"

    style="
        width:100%;
        max-width:620px;
    "
>


<!-- LOGO -->

<tr>

<td
    align="center"

    style="
        padding-bottom:26px;

        font-family:
            'Brush Script MT',
            'Segoe Script',
            cursive;

        font-size:44px;

        color:#292329;
    "
>

    Nosso Mundo

    <span
        style="
            color:#ff668a;
            font-size:25px;
        "
    >
        ♡
    </span>

</td>

</tr>


<!-- CARD -->

<tr>

<td
    style="
        border-radius:18px;

        border:
            1px solid #f4d6df;

        background-color:#fff8fa;

        background-image:
            linear-gradient(
                145deg,
                #fff9fa,
                #fff0f4
            );

        box-shadow:
            0 12px 35px
            rgba(90, 52, 67, 0.12);

        overflow:hidden;
    "
>


<table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
>


<!-- CORAÇÃO -->

<tr>

<td
    align="center"

    style="
        padding:
            48px
            35px
            12px;
    "
>

    <div
        style="
            font-size:82px;
            line-height:1;
            margin-bottom:15px;
        "
    >
        ❤️
    </div>

</td>

</tr>


<!-- TÍTULO -->

<tr>

<td
    align="center"

    style="
        padding:
            0
            35px;
    "
>

    <div
        style="
            font-size:27px;
            line-height:1.35;

            font-weight:700;

            color:#28242a;
        "
    >

        Alguém sentiu saudades
        de você ❤️

    </div>


    <div
        style="
            margin-top:7px;

            font-size:25px;

            font-weight:700;

            color:#f34f79;
        "
    >

        às {safe_time}

    </div>

</td>

</tr>


<!-- DIVISOR -->

<tr>

<td
    align="center"

    style="
        padding:
            25px
            45px
            18px;
    "
>


<table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
>

<tr>


<td
    style="
        width:44%;
        height:1px;
        background:#efc7d2;
    "
>
</td>


<td
    align="center"

    style="
        width:12%;
        color:#f26488;
        font-size:17px;
    "
>
    ♥
</td>


<td
    style="
        width:44%;
        height:1px;
        background:#efc7d2;
    "
>
</td>


</tr>

</table>


</td>

</tr>


<!-- DE / PARA -->

<tr>

<td
    align="center"

    style="
        padding:
            0
            35px;

        font-size:22px;

        color:#2f2930;
    "
>

    De

    <strong
        style="
            color:#ef5379;
        "
    >
        {sender}
    </strong>

    para

    <strong
        style="
            color:#ef5379;
        "
    >
        {recipient}
    </strong>.

</td>

</tr>


<!-- MENSAGEM -->

<tr>

<td
    align="center"

    style="
        padding:
            26px
            55px
            0;

        color:#4c454c;

        font-size:16px;

        line-height:1.7;
    "
>

    Passei por aqui para dizer
    que estou com saudades de você. 💕

</td>

</tr>


<!-- BOTÃO -->

<tr>

<td
    align="center"

    style="
        padding:
            30px
            30px
            44px;
    "
>

    <a
        href="{safe_url}"

        style="
            display:inline-block;

            padding:
                15px
                27px;

            border-radius:11px;

            background:#f4517a;

            color:#ffffff;

            font-size:16px;

            font-weight:700;

            text-decoration:none;
        "
    >

        Abrir Nosso Mundo

    </a>

</td>

</tr>


</table>

</td>

</tr>


<!-- RODAPÉ -->

<tr>

<td
    align="center"

    style="
        padding-top:22px;

        color:#b17d8d;

        font-family:
            'Brush Script MT',
            'Segoe Script',
            cursive;

        font-size:22px;
    "
>

    Te amo,
    mais que tudo. ♡

</td>

</tr>


</table>

</td>

</tr>

</table>


</body>

</html>
"""


# =========================================================
# CRIAR E-MAIL
# =========================================================

def build_saudade_email(
    technical_sender_email,
    sender_person,
    recipient_person,
    base_url
):

    now = get_saudade_now()

    time_text = now.strftime(
        "%H:%M"
    )

    sender_name = (
        sender_person["name"]
    )

    recipient_name = (
        recipient_person["name"]
    )

    recipient_email = (
        recipient_person["email"]
    )

    subject = (
        "Alguém sentiu saudades "
        f"de você ❤️ às {time_text}"
    )

    message = EmailMessage()

    message["Subject"] = (
        subject
    )

    message["From"] = (
        f"Nosso Mundo ❤️ "
        f"<{technical_sender_email}>"
    )

    message["To"] = (
        recipient_email
    )

    # Se a pessoa responder ao e-mail,
    # a resposta vai diretamente para quem
    # realmente clicou em "Tô com saudades".
    message["Reply-To"] = (
        sender_person["email"]
    )

    # Versão em texto puro
    message.set_content(
        "\n".join([

            (
                "Alguém sentiu "
                "saudades de você ❤️ "
                f"às {time_text}"
            ),

            "",

            (
                f"De {sender_name} "
                f"para {recipient_name}."
            ),

            "",

            (
                "Passei por aqui para dizer "
                "que estou com saudades "
                "de você. 💕"
            ),

            "",

            "Abra o Nosso Mundo quando puder."

        ])
    )

    html_content = (
        build_saudade_email_html(

            sender_name=
                sender_name,

            recipient_name=
                recipient_name,

            time_text=
                time_text,

            base_url=
                base_url

        )
    )

    message.add_alternative(
        html_content,
        subtype="html"
    )

    return message


# =========================================================
# ENVIO SMTP
# =========================================================

def send_email_via_gmail(
    message,
    gmail_user,
    app_password
):

    context = (
        ssl.create_default_context()
    )

    with smtplib.SMTP_SSL(
        "smtp.gmail.com",
        465,
        context=context,
        timeout=25
    ) as smtp:

        smtp.login(
            gmail_user,
            app_password
        )

        smtp.send_message(
            message
        )


# =========================================================
# ROTAS DAS PÁGINAS
# =========================================================

@app.route("/")
def index():

    return render_template(
        "index.html"
    )


@app.route("/login")
def login():

    return render_template(
        "login.html"
    )


@app.route("/home")
def home():

    return render_template(
        "home.html"
    )


@app.route("/album")
def album():

    return render_template(
        "album.html"
    )


@app.route("/viagens")
def viagens():

    return render_template(
        "viagens.html"
    )


@app.route(
    "/viagens/<trip_id>/momentos"
)
def viagem_momentos(
    trip_id
):

    return render_template(
        "viagens-momentos.html",
        trip_id=trip_id
    )


@app.route("/saudade")
def saudade():

    return render_template(
        "saudade.html"
    )


@app.route("/config")
def config():

    return render_template(
        "config.html"
    )


# =========================================================
# API - CONTEXTO DO CANTINHO
# =========================================================

@app.route(
    "/api/saudade/contexto",
    methods=["GET"]
)
def contexto_saudade():

    decoded_token, auth_error = (
        authenticate_request()
    )

    if auth_error:
        return auth_error

    uid = decoded_token["uid"]

    try:

        context = get_saudade_context(
            uid
        )

    except PermissionError:

        return jsonify({
            "error":
                "Usuário não autorizado."
        }), 403

    except RuntimeError:

        app.logger.exception(
            "Configuração do Cantinho da Saudade inválida."
        )

        return jsonify({
            "error":
                "Configuração do sistema incompleta."
        }), 503

    return jsonify({

        "senderName":
            context["sender"]["name"],

        "recipientName":
            context["recipient"]["name"]

    }), 200


# =========================================================
# API - ENVIAR E-MAIL
# =========================================================

@app.route(
    "/api/saudade/enviar-email",
    methods=["POST"]
)
def enviar_email_saudade():

    # =====================================================
    # 1. AUTENTICAÇÃO
    # =====================================================

    decoded_token, auth_error = (
        authenticate_request()
    )

    if auth_error:
        return auth_error

    uid = decoded_token["uid"]


    # =====================================================
    # 2. IDENTIFICAR QUEM ENVIA / RECEBE
    # =====================================================

    try:

        context = get_saudade_context(
            uid
        )

    except PermissionError:

        return jsonify({
            "error":
                "Usuário não autorizado."
        }), 403

    except RuntimeError:

        app.logger.exception(
            "Configuração de usuários inválida."
        )

        return jsonify({
            "error":
                "Configuração do Cantinho da Saudade incompleta."
        }), 503


    sender_person = (
        context["sender"]
    )

    recipient_person = (
        context["recipient"]
    )


    # =====================================================
    # 3. JSON
    # =====================================================

    if not request.is_json:

        return jsonify({
            "error":
                "Requisição inválida."
        }), 400


    payload = (
        request.get_json(
            silent=True
        )
        or {}
    )


    saudade_id = str(
        payload.get(
            "saudadeId",
            ""
        )
    ).strip()


    if not saudade_id:

        return jsonify({
            "error":
                "Saudade não informada."
        }), 400


    # =====================================================
    # 4. BUSCAR SAUDADE NO FIRESTORE
    # =====================================================

    saudade_ref = (
        admin_db
        .collection(
            "saudades"
        )
        .document(
            saudade_id
        )
    )


    saudade_snapshot = (
        saudade_ref.get()
    )


    if not saudade_snapshot.exists:

        return jsonify({
            "error":
                "Saudade não encontrada."
        }), 404


    saudade_data = (
        saudade_snapshot
        .to_dict()
    )


    # =====================================================
    # 5. VALIDAR AUTOR DO DOCUMENTO
    # =====================================================

    if (
        saudade_data.get(
            "fromUid"
        )
        != uid
    ):

        return jsonify({
            "error":
                "Você não pode enviar esta saudade."
        }), 403


    # =====================================================
    # 6. EVITAR ENVIO DUPLICADO
    # =====================================================

    current_status = (
        saudade_data.get(
            "emailStatus"
        )
    )


    if current_status == "sent":

        return jsonify({
            "error":
                "Esta saudade já foi enviada."
        }), 409


    if current_status == "sending":

        return jsonify({
            "error":
                "Esta saudade já está sendo enviada."
        }), 409


    # =====================================================
    # 7. RATE LIMIT NO BACKEND
    # =====================================================

    try:

        enforce_server_rate_limit(
            uid
        )

    except SaudadeRateLimitError as error:

        return jsonify({

            "error":
                "Aguarde um pouco antes de enviar outra saudade.",

            "retryAfterSeconds":
                error.remaining_seconds

        }), 429


    # =====================================================
    # 8. CONFIGURAÇÃO DO GMAIL
    # =====================================================

    try:

        email_config = (
            validate_email_config()
        )

    except RuntimeError:

        app.logger.exception(
            "Configuração do Gmail inválida."
        )

        return jsonify({
            "error":
                "O envio de e-mail não está configurado."
        }), 503


    # =====================================================
    # 9. URL DO NOSSO MUNDO
    # =====================================================

    base_url = (
        os.getenv(
            "SAUDADE_BASE_URL",
            ""
        )
        .strip()
        .rstrip("/")
    )


    if not base_url:

        base_url = (
            request.host_url
            .rstrip("/")
        )


    saudade_url = (
        f"{base_url}/saudade"
    )


    # =====================================================
    # 10. MARCAR COMO "ENVIANDO"
    # =====================================================

    saudade_ref.update({

        "emailStatus":
            "sending",

        "emailAttemptAt":
            firestore.SERVER_TIMESTAMP,

        "resolvedSenderName":
            sender_person["name"],

        "resolvedRecipientName":
            recipient_person["name"]

    })


    # =====================================================
    # 11. CRIAR E ENVIAR E-MAIL
    # =====================================================

    try:

        message = (
            build_saudade_email(

                technical_sender_email=
                    email_config["user"],

                sender_person=
                    sender_person,

                recipient_person=
                    recipient_person,

                base_url=
                    saudade_url

            )
        )


        send_email_via_gmail(

            message=
                message,

            gmail_user=
                email_config["user"],

            app_password=
                email_config["password"]

        )


        # =================================================
        # 12. SUCESSO
        # =================================================

        saudade_ref.update({

            "emailStatus":
                "sent",

            "emailSentAt":
                firestore.SERVER_TIMESTAMP,

            "fromName":
                sender_person["name"],

            "toName":
                recipient_person["name"]

        })


        return jsonify({

            "success":
                True,

            "message":
                "Saudade enviada com sucesso.",

            "from":
                sender_person["name"],

            "to":
                recipient_person["name"]

        }), 200


    # =====================================================
    # ERRO DE ENVIO
    # =====================================================

    except Exception:

        app.logger.exception(
            "Erro ao enviar e-mail de saudade."
        )


        try:

            saudade_ref.update({

                "emailStatus":
                    "failed",

                "emailFailedAt":
                    firestore.SERVER_TIMESTAMP

            })

        except Exception:

            app.logger.exception(
                "Erro ao atualizar status da saudade."
            )


        return jsonify({
            "error":
                "Não foi possível enviar o e-mail."
        }), 500


# =========================================================
# EXECUÇÃO LOCAL
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True
    )