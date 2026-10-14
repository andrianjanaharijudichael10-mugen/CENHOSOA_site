import pytest

from app.core import sms
from app.core.config import parametres


def test_envoyer_sms_utilise_africas_talking(monkeypatch):
    monkeypatch.setattr(parametres, "AFRICASTALKING_USERNAME", "cenhosoa")
    monkeypatch.setattr(parametres, "AFRICASTALKING_API_KEY", "api-key-test")
    monkeypatch.setattr(parametres, "AFRICASTALKING_SENDER_ID", "CENHOSOA")
    requete = {}

    class ReponseFictive:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "SMSMessageData": {
                    "Recipients": [{"statusCode": 101}],
                },
            }

    def poster(url, **options):
        requete["url"] = url
        requete.update(options)
        return ReponseFictive()

    monkeypatch.setattr(sms.httpx, "post", poster)

    sms.envoyer_sms("+261331234567", "Rendez-vous confirmé")

    assert requete["url"] == sms.URL_SMS_AFRICASTALKING
    assert requete["data"] == {
        "username": "cenhosoa",
        "to": "+261331234567",
        "message": "Rendez-vous confirmé",
        "from": "CENHOSOA",
    }
    assert requete["headers"]["apiKey"] == "api-key-test"


def test_envoyer_sms_signale_les_identifiants_absents(monkeypatch):
    monkeypatch.setattr(parametres, "AFRICASTALKING_USERNAME", None)
    monkeypatch.setattr(parametres, "AFRICASTALKING_API_KEY", None)

    with pytest.raises(RuntimeError, match="n'est pas configuré"):
        sms.envoyer_sms("+261331234567", "Message de test")
