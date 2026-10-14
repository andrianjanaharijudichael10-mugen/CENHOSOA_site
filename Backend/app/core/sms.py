"""Envoi de SMS transactionnels via Africa's Talking."""
import logging

import httpx

from app.core.config import parametres

logger = logging.getLogger(__name__)
URL_SMS_AFRICASTALKING = "https://api.africastalking.com/version1/messaging"


def envoyer_sms(numero: str, message: str) -> None:
    if not parametres.AFRICASTALKING_USERNAME or not parametres.AFRICASTALKING_API_KEY:
        raise RuntimeError("Le service SMS Africa's Talking n'est pas configuré.")

    donnees = {
        "username": parametres.AFRICASTALKING_USERNAME,
        "to": numero,
        "message": message,
    }
    if parametres.AFRICASTALKING_SENDER_ID:
        donnees["from"] = parametres.AFRICASTALKING_SENDER_ID

    try:
        reponse = httpx.post(
            URL_SMS_AFRICASTALKING,
            data=donnees,
            headers={
                "apiKey": parametres.AFRICASTALKING_API_KEY,
                "Accept": "application/json",
            },
            timeout=parametres.SMS_TIMEOUT_SECONDS,
        )
        reponse.raise_for_status()
        corps = reponse.json()
        resultat = corps.get("SMSMessageData") if isinstance(corps, dict) else None
        destinataires = resultat.get("Recipients") if isinstance(resultat, dict) else None
        if not isinstance(destinataires, list) or not destinataires or any(
            not isinstance(destinataire, dict)
            or destinataire.get("statusCode") not in (100, 101, 102)
            for destinataire in destinataires
        ):
            raise RuntimeError("Africa's Talking n'a pas accepté le SMS.")
    except (httpx.HTTPError, ValueError) as erreur:
        logger.exception("Échec de l'envoi d'un SMS transactionnel.")
        raise RuntimeError("Impossible d'envoyer le SMS via Africa's Talking.") from erreur

    logger.info("SMS transactionnel accepté par Africa's Talking.")
