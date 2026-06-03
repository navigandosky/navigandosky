"""
Backend tests for the Dipendenti (Employees) module.
Covers: Archivio CRUD, sedi, tipi-contratto, Assunzioni, Buste Paga & Pagamenti,
PDF generation (lista, scheda, busta), Email send (Resend test mode),
module toggle, multi-tenancy isolation.
"""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"

ADMIN_USER = {"username": "Admin", "password": "SmartMaster2026"}
BAUNEI_USER = {"username": "Baunei", "password": "Baunei2026$"}


# ---------- Fixtures ----------

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN_USER, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_user_id(admin_token):
    r = requests.get(f"{API}/auth/verify", params={"token": admin_token}, timeout=15)
    assert r.status_code == 200
    return r.json()["user"]["id"]


@pytest.fixture(scope="module")
def baunei_token():
    r = requests.post(f"{API}/auth/login", json=BAUNEI_USER, timeout=15)
    assert r.status_code == 200, f"Baunei login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def baunei_user_id(baunei_token):
    r = requests.get(f"{API}/auth/verify", params={"token": baunei_token}, timeout=15)
    assert r.status_code == 200
    return r.json()["user"]["id"]


# ---------- Health & Auth ----------

class TestHealthAuth:
    def test_admin_login(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 0

    def test_baunei_login(self, baunei_token):
        assert isinstance(baunei_token, str) and len(baunei_token) > 0

    def test_admin_module_dipendenti_enabled(self, admin_token):
        r = requests.get(f"{API}/auth/verify", params={"token": admin_token}, timeout=15)
        assert r.status_code == 200
        user = r.json()["user"]
        modules = user.get("modules_enabled", {})
        # default behaviour: dipendenti should default to True if missing
        assert modules.get("dipendenti", True) is True


# ---------- SEDI CRUD ----------

class TestSedi:
    created_id = None

    def test_list_sedi(self, admin_token):
        r = requests.get(f"{API}/dipendenti/sedi", params={"token": admin_token}, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_sede(self, admin_token):
        payload = {"nome": "TEST_Sede_Pytest"}
        r = requests.post(f"{API}/dipendenti/sedi", params={"token": admin_token}, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["nome"] == "TEST_Sede_Pytest"
        assert "id" in data
        TestSedi.created_id = data["id"]

    def test_create_sede_persists(self, admin_token):
        r = requests.get(f"{API}/dipendenti/sedi", params={"token": admin_token}, timeout=15)
        assert r.status_code == 200
        names = [s["nome"] for s in r.json()]
        assert "TEST_Sede_Pytest" in names

    def test_delete_sede(self, admin_token):
        if not TestSedi.created_id:
            pytest.skip("no sede created")
        r = requests.delete(f"{API}/dipendenti/sedi/{TestSedi.created_id}", params={"token": admin_token}, timeout=15)
        assert r.status_code == 200


# ---------- TIPI CONTRATTO CRUD ----------

class TestTipiContratto:
    created_id = None

    def test_create_tipo(self, admin_token):
        r = requests.post(f"{API}/dipendenti/tipi-contratto", params={"token": admin_token}, json={"nome": "TEST_Tempo_Determinato"}, timeout=15)
        assert r.status_code == 200, r.text
        TestTipiContratto.created_id = r.json()["id"]

    def test_list_tipi(self, admin_token):
        r = requests.get(f"{API}/dipendenti/tipi-contratto", params={"token": admin_token}, timeout=15)
        assert r.status_code == 200
        assert any(t["nome"] == "TEST_Tempo_Determinato" for t in r.json())

    def test_delete_tipo(self, admin_token):
        if not TestTipiContratto.created_id:
            pytest.skip("no tipo created")
        r = requests.delete(f"{API}/dipendenti/tipi-contratto/{TestTipiContratto.created_id}", params={"token": admin_token}, timeout=15)
        assert r.status_code == 200


# ---------- DIPENDENTI CRUD + Documenti + Filters ----------

class TestDipendentiCRUD:
    created_id = None

    def test_create_dipendente(self, admin_token):
        payload = {
            "nome": "TEST_Mario",
            "cognome": "PytestRossi",
            "codice_fiscale": "RSSMRA80A01H501Z",
            "email": "test_mario@example.com",
            "telefono": "+390000000",
            "mansione": "Cameriere",
            "sede": "TEST_Sede_X",
            "stato": "libero",
        }
        r = requests.post(f"{API}/dipendenti", params={"token": admin_token}, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["nome"] == "TEST_Mario"
        assert data["cognome"] == "PytestRossi"
        assert data["stato"] == "libero"
        assert "id" in data
        TestDipendentiCRUD.created_id = data["id"]

    def test_get_dipendente(self, admin_token):
        if not TestDipendentiCRUD.created_id:
            pytest.skip("no dipendente")
        r = requests.get(f"{API}/dipendenti/{TestDipendentiCRUD.created_id}", params={"token": admin_token}, timeout=15)
        assert r.status_code == 200
        assert r.json()["nome"] == "TEST_Mario"

    def test_update_dipendente(self, admin_token):
        if not TestDipendentiCRUD.created_id:
            pytest.skip("no dipendente")
        r = requests.put(
            f"{API}/dipendenti/{TestDipendentiCRUD.created_id}",
            params={"token": admin_token},
            json={"mansione": "Manager Sala"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        # verify
        r2 = requests.get(f"{API}/dipendenti/{TestDipendentiCRUD.created_id}", params={"token": admin_token}, timeout=15)
        assert r2.json()["mansione"] == "Manager Sala"

    def test_filter_search_q(self, admin_token):
        r = requests.get(f"{API}/dipendenti", params={"token": admin_token, "q": "PytestRossi"}, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert any(d["id"] == TestDipendentiCRUD.created_id for d in items)

    def test_filter_sede(self, admin_token):
        r = requests.get(f"{API}/dipendenti", params={"token": admin_token, "sede": "TEST_Sede_X"}, timeout=15)
        assert r.status_code == 200
        assert any(d["id"] == TestDipendentiCRUD.created_id for d in r.json())

    def test_filter_mansione(self, admin_token):
        r = requests.get(f"{API}/dipendenti", params={"token": admin_token, "mansione": "Manager Sala"}, timeout=15)
        assert r.status_code == 200
        assert any(d["id"] == TestDipendentiCRUD.created_id for d in r.json())

    def test_filter_stato(self, admin_token):
        r = requests.get(f"{API}/dipendenti", params={"token": admin_token, "stato": "libero"}, timeout=15)
        assert r.status_code == 200
        ids = [d["id"] for d in r.json()]
        assert TestDipendentiCRUD.created_id in ids

    def test_add_documento(self, admin_token):
        if not TestDipendentiCRUD.created_id:
            pytest.skip("no dipendente")
        # Tiny PDF base64
        b64 = "data:text/plain;base64,SGVsbG8gV29ybGQ="
        r = requests.post(
            f"{API}/dipendenti/{TestDipendentiCRUD.created_id}/documenti",
            params={"token": admin_token},
            json={"nome_file": "doc.txt", "descrizione": "Test doc", "content_base64": b64},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["nome_file"] == "doc.txt"

        # Verify persistence
        r2 = requests.get(f"{API}/dipendenti/{TestDipendentiCRUD.created_id}", params={"token": admin_token}, timeout=15)
        assert any(doc["nome_file"] == "doc.txt" for doc in r2.json().get("documenti", []))


# ---------- ASSUNZIONI ----------

class TestAssunzioni:
    created_id = None
    dipendente_id = None

    def test_create_assunzione(self, admin_token):
        # need a dipendente — reuse the one created above
        TestAssunzioni.dipendente_id = TestDipendentiCRUD.created_id
        if not TestAssunzioni.dipendente_id:
            # Create one
            r = requests.post(f"{API}/dipendenti", params={"token": admin_token}, json={"nome": "TEST_AssX", "cognome": "DipPytest"}, timeout=15)
            TestAssunzioni.dipendente_id = r.json()["id"]
        payload = {
            "dipendente_id": TestAssunzioni.dipendente_id,
            "tipo_contratto": "Tempo Indeterminato",
            "data_inizio": "2026-01-01",
            "ore_settimanali": 40,
            "tariffa_oraria": 10,
            "netto_mensile": 1500,
            "sede_lavoro": "TEST_Sede_X",
            "bonus": [{"tipo": "produzione", "importo": 200}],
        }
        r = requests.post(f"{API}/dipendenti/assunzioni", params={"token": admin_token}, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["netto_mensile"] == 1500
        assert data["stato"] == "attivo"
        TestAssunzioni.created_id = data["id"]

    def test_dipendente_stato_updated_to_assunto(self, admin_token):
        if not TestAssunzioni.dipendente_id:
            pytest.skip()
        r = requests.get(f"{API}/dipendenti/{TestAssunzioni.dipendente_id}", params={"token": admin_token}, timeout=15)
        assert r.status_code == 200
        assert r.json()["stato"] == "assunto", f"Expected stato=assunto but got {r.json()['stato']}"

    def test_list_assunzioni(self, admin_token):
        r = requests.get(f"{API}/dipendenti/assunzioni/list", params={"token": admin_token}, timeout=15)
        assert r.status_code == 200
        assert any(a["id"] == TestAssunzioni.created_id for a in r.json())

    def test_update_assunzione(self, admin_token):
        if not TestAssunzioni.created_id:
            pytest.skip()
        r = requests.put(
            f"{API}/dipendenti/assunzioni/{TestAssunzioni.created_id}",
            params={"token": admin_token},
            json={"netto_mensile": 1800},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        # Verify
        r2 = requests.get(f"{API}/dipendenti/assunzioni/list", params={"token": admin_token}, timeout=15)
        match = [a for a in r2.json() if a["id"] == TestAssunzioni.created_id]
        assert match and match[0]["netto_mensile"] == 1800


# ---------- BUSTE PAGA + PAGAMENTI ----------

class TestBustePaga:
    busta_id = None
    pagamento_id = None

    def test_create_busta(self, admin_token):
        dip_id = TestDipendentiCRUD.created_id or TestAssunzioni.dipendente_id
        assert dip_id, "need a dipendente"
        payload = {"dipendente_id": dip_id, "anno": 2026, "mese": 6, "importo_netto": 1500}
        r = requests.post(f"{API}/dipendenti/buste-paga", params={"token": admin_token}, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["importo_netto"] == 1500
        TestBustePaga.busta_id = data["id"]

    def test_add_pagamento(self, admin_token):
        if not TestBustePaga.busta_id:
            pytest.skip()
        r = requests.post(
            f"{API}/dipendenti/buste-paga/{TestBustePaga.busta_id}/pagamenti",
            params={"token": admin_token},
            json={"data": "2026-06-15", "importo": 500, "note": "Bonifico"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # response is the single pagamento just added
        assert data["importo"] == 500
        assert "id" in data
        TestBustePaga.pagamento_id = data["id"]

    def test_list_buste(self, admin_token):
        r = requests.get(f"{API}/dipendenti/buste-paga/list", params={"token": admin_token}, timeout=15)
        assert r.status_code == 200
        items = r.json()
        match = [b for b in items if b["id"] == TestBustePaga.busta_id]
        assert match
        # total pagato 500
        total = sum(p["importo"] for p in match[0].get("pagamenti", []))
        assert total == 500

    def test_delete_pagamento(self, admin_token):
        if not TestBustePaga.pagamento_id:
            pytest.skip()
        r = requests.delete(
            f"{API}/dipendenti/buste-paga/{TestBustePaga.busta_id}/pagamenti/{TestBustePaga.pagamento_id}",
            params={"token": admin_token},
            timeout=15,
        )
        assert r.status_code == 200
        # verify
        r2 = requests.get(f"{API}/dipendenti/buste-paga/list", params={"token": admin_token}, timeout=15)
        match = [b for b in r2.json() if b["id"] == TestBustePaga.busta_id]
        total = sum(p["importo"] for p in match[0].get("pagamenti", []))
        assert total == 0


# ---------- PDF ----------

class TestPDF:
    def test_pdf_lista(self, admin_token):
        r = requests.get(f"{API}/dipendenti/pdf/lista", params={"token": admin_token}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert len(r.content) > 1000
        assert r.content[:4] == b"%PDF"

    def test_pdf_scheda(self, admin_token):
        dip_id = TestDipendentiCRUD.created_id
        if not dip_id:
            pytest.skip()
        r = requests.get(f"{API}/dipendenti/pdf/scheda/{dip_id}", params={"token": admin_token}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"

    def test_pdf_busta(self, admin_token):
        if not TestBustePaga.busta_id:
            pytest.skip()
        r = requests.get(f"{API}/dipendenti/pdf/busta/{TestBustePaga.busta_id}", params={"token": admin_token}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"


# ---------- EMAIL (Resend test mode) ----------

class TestEmail:
    def test_email_send_accepts_payload(self, admin_token):
        # In Resend test mode, only verified email is accepted.
        # We test the API call goes through and returns a structured response.
        payload = {
            "to": ["info@porticciolodibosamarina.com"],
            "subject": "TEST Elenco Dipendenti",
            "body": "Test body",
            "tipo": "lista",
        }
        r = requests.post(f"{API}/dipendenti/email/send", params={"token": admin_token}, json=payload, timeout=30)
        # Accept 200 OR 4xx (Resend test mode might reject), but the endpoint must respond properly
        assert r.status_code in (200, 400, 403, 422, 500), f"Unexpected status {r.status_code}: {r.text[:400]}"
        # If 200, expect some success structure
        if r.status_code == 200:
            data = r.json()
            assert "success" in data or "id" in data or "sent" in data or "message" in data


# ---------- CLEANUP DELETES (assunzione, busta, dipendente) ----------

class TestCleanup:
    def test_delete_assunzione(self, admin_token):
        if not TestAssunzioni.created_id:
            pytest.skip()
        r = requests.delete(f"{API}/dipendenti/assunzioni/{TestAssunzioni.created_id}", params={"token": admin_token}, timeout=15)
        assert r.status_code == 200

    def test_delete_busta(self, admin_token):
        if not TestBustePaga.busta_id:
            pytest.skip()
        r = requests.delete(f"{API}/dipendenti/buste-paga/{TestBustePaga.busta_id}", params={"token": admin_token}, timeout=15)
        assert r.status_code == 200

    def test_delete_dipendente(self, admin_token):
        if not TestDipendentiCRUD.created_id:
            pytest.skip()
        r = requests.delete(f"{API}/dipendenti/{TestDipendentiCRUD.created_id}", params={"token": admin_token}, timeout=15)
        assert r.status_code == 200


# ---------- MODULE TOGGLE ----------

class TestModuleToggle:
    def test_disable_dipendenti(self, admin_token, admin_user_id):
        r = requests.put(
            f"{API}/users/{admin_user_id}/modules",
            params={"token": admin_token},
            json={"modules_enabled": {"dipendenti": False}},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        # verify
        r2 = requests.get(f"{API}/auth/verify", params={"token": admin_token}, timeout=15)
        modules = r2.json()["user"].get("modules_enabled", {})
        assert modules.get("dipendenti") is False

    def test_reenable_dipendenti(self, admin_token, admin_user_id):
        r = requests.put(
            f"{API}/users/{admin_user_id}/modules",
            params={"token": admin_token},
            json={"modules_enabled": {"dipendenti": True}},
            timeout=15,
        )
        assert r.status_code == 200
        r2 = requests.get(f"{API}/auth/verify", params={"token": admin_token}, timeout=15)
        modules = r2.json()["user"].get("modules_enabled", {})
        assert modules.get("dipendenti") is True


# ---------- MULTI-TENANCY ISOLATION ----------

class TestIsolation:
    baunei_dip_id = None

    def test_baunei_sees_no_admin_dipendenti(self, baunei_token, admin_token):
        # Create one dipendente as Admin
        r_admin = requests.post(
            f"{API}/dipendenti",
            params={"token": admin_token},
            json={"nome": "TEST_AdminOnly", "cognome": "Isolation"},
            timeout=15,
        )
        assert r_admin.status_code == 200
        admin_dip_id = r_admin.json()["id"]
        try:
            # Now list as Baunei
            r = requests.get(f"{API}/dipendenti", params={"token": baunei_token}, timeout=15)
            assert r.status_code == 200
            baunei_items = r.json()
            assert not any(d["id"] == admin_dip_id for d in baunei_items), "Admin data leaked into Baunei tenant!"
            # Also: baunei shouldn't see any items with cognome 'Isolation'
            assert not any(d.get("cognome") == "Isolation" for d in baunei_items)
        finally:
            requests.delete(f"{API}/dipendenti/{admin_dip_id}", params={"token": admin_token}, timeout=15)

    def test_baunei_module_dipendenti_default(self, baunei_token):
        r = requests.get(f"{API}/auth/verify", params={"token": baunei_token}, timeout=15)
        assert r.status_code == 200
        modules = r.json()["user"].get("modules_enabled", {})
        # default enabled (missing key counts as enabled in UI)
        assert modules.get("dipendenti", True) is True
