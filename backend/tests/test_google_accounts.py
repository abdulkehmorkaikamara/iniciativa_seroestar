"""Creating students' Workspace accounts, against an in-memory fake of Google's directory."""

import importlib
import io
import json
import os
import sys
import tempfile
import unittest
import urllib.error
import urllib.parse
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

DEVELOPER = ("developer@seroestar.com", "SeroEstar-Dev-2026!")
STUDENT = ("student@seroestar.com", "SeroEstar-Student-2026!")
TOKEN_URI = "https://oauth2.googleapis.com/token"


def _service_account_json() -> str:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return json.dumps({
        "client_email": "classes@seroestar.iam.gserviceaccount.com",
        "private_key_id": "key-1",
        "private_key": key.private_bytes(
            serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
        ).decode("utf-8"),
        "token_uri": TOKEN_URI,
    })


class FakeDirectory:
    """Just enough of the Admin SDK Directory API for these tests."""

    def __init__(self):
        self.users: dict[str, dict] = {}
        self.token_subjects: list[str] = []
        self.created: list[dict] = []
        self.fail_for: set[str] = set()

    def _response(self, body):
        response = io.BytesIO(json.dumps(body).encode("utf-8"))
        response.__enter__ = lambda *_: response
        response.__exit__ = lambda *_: None
        return response

    def _error(self, request, code, message):
        body = io.BytesIO(json.dumps({"error": {"code": code, "message": message}}).encode("utf-8"))
        return urllib.error.HTTPError(request.full_url, code, message, {}, body)

    def urlopen(self, request, timeout=None):
        if request.full_url == TOKEN_URI:
            from jose import jwt
            assertion = urllib.parse.parse_qs(request.data.decode("utf-8"))["assertion"][0]
            self.token_subjects.append(jwt.get_unverified_claims(assertion)["sub"])
            return self._response({"access_token": "ya29.test"})
        if request.get_method() == "GET":
            return self._response({"users": list(self.users.values())})
        body = json.loads(request.data)
        code = body["externalIds"][0]["value"]
        if code in self.fail_for:
            raise self._error(request, 400, "Invalid Input")
        if body["primaryEmail"] in self.users:
            raise self._error(request, 409, "Entity already exists.")
        self.created.append(body)
        self.users[body["primaryEmail"]] = {"primaryEmail": body["primaryEmail"], "externalIds": body["externalIds"]}
        return self._response(body)


class GoogleAccountTests(unittest.TestCase):
    def setUp(self):
        self._saved_env = dict(os.environ)
        self._data_dir = tempfile.TemporaryDirectory()
        for key in [k for k in os.environ if k.startswith("GOOGLE_")] + ["DATABASE_URL", "JWT_SECRET", "LIVE_CLASS_PROVIDER"]:
            os.environ.pop(key, None)
        os.environ.update({
            "BACKEND_DATA_DIR": self._data_dir.name,
            "ENVIRONMENT": "development",
            "GOOGLE_PROVISION_STUDENTS": "true",
            "GOOGLE_SERVICE_ACCOUNT_JSON": _service_account_json(),
            "GOOGLE_WORKSPACE_DOMAIN": "iseroestar.com",
            "GOOGLE_ADMIN_EMAIL": "admin@iseroestar.com",
        })
        for name in [n for n in list(sys.modules) if n.startswith("backend")]:
            del sys.modules[name]
        from fastapi.testclient import TestClient
        self.module = importlib.import_module("backend.main")
        self.client = TestClient(self.module.app)
        self.client.__enter__()
        self.google = FakeDirectory()
        patcher = mock.patch("urllib.request.urlopen", self.google.urlopen)
        patcher.start()
        self.addCleanup(patcher.stop)

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self._data_dir.cleanup()
        os.environ.clear()
        os.environ.update(self._saved_env)

    def _headers(self, credentials=DEVELOPER):
        response = self.client.post("/api/login", json={"username": credentials[0], "password": credentials[1]})
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def _add_student(self, full_name, email, status="Active"):
        response = self.client.post("/api/admin/students", headers=self._headers(), json={
            "full_name": full_name, "email": email, "password": "Student-Password-2026!",
            "phone_number": "", "course_level": "A1", "class_group": "Group 1", "learning_mode": "Online", "status": status,
        })
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["student_id_code"]

    def test_creates_accounts_for_active_students_only(self):
        code = self._add_student("José Ramírez Kamara", "jose@example.com")
        self._add_student("Inactive Person", "inactive@example.com", status="Inactive")

        result = self.client.post("/api/admin/google-accounts", headers=self._headers(), json={}).json()
        created = {item["student_id_code"]: item for item in result["created"]}
        # The seeded demo student plus José; never the inactive student.
        self.assertEqual(set(created), {"SER-001", code})
        self.assertEqual(created[code]["email"], "jose.kamara@iseroestar.com")
        self.assertEqual(len(created[code]["temporary_password"]), 14)
        self.assertEqual(result["remaining"], 0)

        sent = next(body for body in self.google.created if body["primaryEmail"] == "jose.kamara@iseroestar.com")
        self.assertTrue(sent["changePasswordAtNextLogin"])
        self.assertEqual(sent["recoveryEmail"], "jose@example.com")
        self.assertEqual(sent["name"], {"givenName": "José", "familyName": "Ramírez Kamara"})
        self.assertEqual(sent["externalIds"], [{"type": "custom", "customType": "student_id", "value": code}])
        self.assertEqual(set(self.google.token_subjects), {"admin@iseroestar.com"})

    def test_running_again_skips_students_who_already_have_accounts(self):
        self._add_student("Ana Lopez", "ana@example.com")
        self.client.post("/api/admin/google-accounts", headers=self._headers(), json={})
        again = self.client.post("/api/admin/google-accounts", headers=self._headers(), json={}).json()
        self.assertEqual(again, {"created": [], "failed": [], "remaining": 0})

        listing = self.client.get("/api/admin/google-accounts", headers=self._headers()).json()
        emails = {item["full_name"]: item["workspace_email"] for item in listing["students"]}
        self.assertEqual(emails["Ana Lopez"], "ana.lopez@iseroestar.com")

    def test_name_clashes_get_a_number(self):
        self.google.users["ana.lopez@iseroestar.com"] = {"primaryEmail": "ana.lopez@iseroestar.com"}
        self._add_student("Ana Lopez", "ana@example.com")
        self._add_student("Ana María Lopez", "ana2@example.com")
        created = self.client.post("/api/admin/google-accounts", headers=self._headers(), json={}).json()["created"]
        self.assertEqual(
            sorted(item["email"] for item in created if item["full_name"].startswith("Ana")),
            ["ana.lopez2@iseroestar.com", "ana.lopez3@iseroestar.com"],
        )

    def test_batches_and_failures_are_reported(self):
        codes = [self._add_student(f"Student Number{i}", f"s{i}@example.com") for i in range(3)]
        self.google.fail_for.add(codes[0])

        # Oldest first: the seeded demo student (SER-001), then codes[0], which fails.
        first = self.client.post("/api/admin/google-accounts", headers=self._headers(), json={"limit": 2}).json()
        self.assertEqual([item["student_id_code"] for item in first["created"]], ["SER-001"])
        self.assertEqual([item["student_id_code"] for item in first["failed"]], [codes[0]])
        self.assertIn("Invalid Input", first["failed"][0]["detail"])
        self.assertEqual(first["remaining"], 2)

        failed_codes = [item["student_id_code"] for item in first["failed"]]
        second = self.client.post("/api/admin/google-accounts", headers=self._headers(), json={
            "limit": 25, "exclude_student_id_codes": failed_codes,
        }).json()
        self.assertEqual([item["student_id_code"] for item in second["created"]], codes[1:])
        self.assertEqual(second["failed"], [])
        self.assertEqual(second["remaining"], 0)

    def test_switched_off_by_default(self):
        os.environ["GOOGLE_PROVISION_STUDENTS"] = "false"
        response = self.client.post("/api/admin/google-accounts", headers=self._headers(), json={})
        self.assertEqual(response.status_code, 400)
        listing = self.client.get("/api/admin/google-accounts", headers=self._headers()).json()
        self.assertFalse(listing["enabled"])
        self.assertTrue(all(item["workspace_email"] is None for item in listing["students"]))
        self.assertEqual(self.google.token_subjects, [])

    def test_reports_missing_settings(self):
        os.environ.pop("GOOGLE_ADMIN_EMAIL")
        response = self.client.post("/api/admin/google-accounts", headers=self._headers(), json={})
        self.assertEqual(response.status_code, 400)
        self.assertIn("GOOGLE_ADMIN_EMAIL", response.json()["detail"])

    def test_developers_only(self):
        student = self._headers(STUDENT)
        self.assertEqual(self.client.get("/api/admin/google-accounts", headers=student).status_code, 403)
        self.assertEqual(self.client.post("/api/admin/google-accounts", headers=student, json={}).status_code, 403)


if __name__ == "__main__":
    unittest.main()
