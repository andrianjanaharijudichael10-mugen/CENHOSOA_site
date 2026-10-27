import setup_cenhosoa


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class FakeClient:
    def __init__(self, services=None, information=None):
        self.services = services or []
        self.information = information or {}
        self.created_services = []
        self.updated_information = None

    def get(self, path, headers=None):
        if path == "/api/v1/services/admin/tous":
            return FakeResponse(self.services)
        if path == "/api/v1/informations-centre":
            return FakeResponse(self.information)
        raise AssertionError(f"Unexpected GET path: {path}")

    def post(self, path, json, headers=None):
        if path != "/api/v1/services":
            raise AssertionError(f"Unexpected POST path: {path}")
        self.created_services.append(json)
        return FakeResponse(json)

    def put(self, path, json, headers=None):
        if path != "/api/v1/informations-centre":
            raise AssertionError(f"Unexpected PUT path: {path}")
        self.updated_information = json
        return FakeResponse(json)


def test_initialiser_services_ne_cree_que_les_services_absents():
    client = FakeClient(services=[{"nom": "cardiologie"}])

    setup_cenhosoa._initialiser_services(client, {})

    assert [service["nom"] for service in client.created_services] == ["Urgences"]


def test_initialiser_informations_preserve_les_telephones_existants(monkeypatch):
    monkeypatch.setattr(setup_cenhosoa, "EMAIL_CENTRE", "contact@cenhosoa.mg")
    client = FakeClient(
        information={
            "email_centre": "ancien@cenhosoa.mg",
            "telephones": [{"numero": "+261 20 00", "libelle": "Standard", "ordre": 1}],
        }
    )

    setup_cenhosoa._initialiser_informations_centre(client, {}, None)

    assert client.updated_information == {
        "email_centre": "contact@cenhosoa.mg",
        "telephones": [{"numero": "+261 20 00", "libelle": "Standard", "ordre": 1}],
    }


def test_initialiser_informations_ignore_les_champs_non_configures(monkeypatch, capsys):
    monkeypatch.setattr(setup_cenhosoa, "EMAIL_CENTRE", "")
    client = FakeClient()

    setup_cenhosoa._initialiser_informations_centre(client, {}, None)

    assert client.updated_information is None
    assert "ignorées" in capsys.readouterr().out
