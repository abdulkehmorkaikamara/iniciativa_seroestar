"""Access rules for live classes: who may run a class and who may chat in it."""

import importlib
import os
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

TUTOR = ("tutor@seroestar.com", "SeroEstar-Tutor-2026!")
STUDENT = ("student@seroestar.com", "SeroEstar-Student-2026!")
DEVELOPER = ("developer@seroestar.com", "SeroEstar-Dev-2026!")


class _LiveSessionTestCase(unittest.TestCase):
    env_overrides: dict = {}

    def setUp(self):
        self._saved_env = dict(os.environ)
        self._data_dir = tempfile.TemporaryDirectory()
        os.environ["BACKEND_DATA_DIR"] = self._data_dir.name
        os.environ["ENVIRONMENT"] = "development"
        for key in (
            "DATABASE_URL", "JWT_SECRET", "DAILY_API_KEY", "SEED_RESET_PASSWORDS", "ADMIN_EMAIL", "ADMIN_PASSWORD",
            "LIVE_CLASS_PROVIDER", "GOOGLE_SERVICE_ACCOUNT_JSON", "GOOGLE_WORKSPACE_DOMAIN", "GOOGLE_MEET_ORGANIZER_EMAIL",
        ):
            os.environ.pop(key, None)
        os.environ.update(self.env_overrides)
        for name in [n for n in list(sys.modules) if n.startswith("backend")]:
            del sys.modules[name]
        from fastapi.testclient import TestClient
        self.module = importlib.import_module("backend.main")
        self.client = TestClient(self.module.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self._data_dir.cleanup()
        os.environ.clear()
        os.environ.update(self._saved_env)

    def _token(self, credentials):
        response = self.client.post("/api/login", json={"username": credentials[0], "password": credentials[1]})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def _headers(self, credentials):
        return {"Authorization": f"Bearer {self._token(credentials)}"}

    def _schedule(self, teacher_name, level="A1", credentials=DEVELOPER, date_time="2026-10-02 14:00", meeting_link=None):
        return self.client.post("/api/live-sessions", headers=self._headers(credentials), json={
            "title": "Ser vs Estar",
            "course_level": level,
            "teacher_name": teacher_name,
            "date_time": date_time,
            "meeting_link": meeting_link,
        })


class LiveSessionAccessTests(_LiveSessionTestCase):
    def test_meeting_link_endpoint_is_meet_only(self):
        session_id = self._schedule("Demo Tutor").json()["id"]
        response = self.client.put(f"/api/live-sessions/{session_id}/meeting-link", headers=self._headers(TUTOR), json={"meeting_link": "https://meet.google.com/abc-defg-hij"})
        self.assertEqual(response.status_code, 400)

    def test_daily_is_the_default_provider(self):
        config = self.client.get("/api/live-config", headers=self._headers(TUTOR)).json()
        self.assertEqual(config, {"provider": "daily", "meet_auto_create": False})

    def test_tutor_cannot_schedule_under_another_name(self):
        response = self._schedule("Xiomara Villamizar", credentials=TUTOR)
        self.assertEqual(response.status_code, 403)

    def test_rejects_unparseable_date_time(self):
        response = self._schedule("Demo Tutor", credentials=TUTOR, date_time="next tuesday")
        self.assertEqual(response.status_code, 400)

    def test_new_class_has_no_placeholder_meeting_link(self):
        response = self._schedule("Demo Tutor", credentials=TUTOR)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIsNone(response.json()["meeting_link"])

    def test_only_owning_tutor_or_developer_can_start_and_end(self):
        other = self._schedule("Xiomara Villamizar").json()["id"]
        own = self._schedule("Demo Tutor").json()["id"]
        tutor = self._headers(TUTOR)

        self.assertEqual(self.client.post(f"/api/live-sessions/{other}/start", headers=tutor).status_code, 403)
        self.assertEqual(self.client.post(f"/api/live-sessions/{other}/end", headers=tutor).status_code, 403)
        self.assertEqual(self.client.post(f"/api/live-sessions/{own}/start", headers=tutor).status_code, 200)
        self.assertEqual(self.client.post(f"/api/live-sessions/{own}/end", headers=tutor).status_code, 200)
        self.assertEqual(self.client.post(f"/api/live-sessions/{other}/start", headers=self._headers(DEVELOPER)).status_code, 200)

    def test_chat_identity_comes_from_the_token(self):
        session_id = self._schedule("Demo Tutor").json()["id"]
        response = self.client.post(f"/api/live-sessions/{session_id}/chat", headers=self._headers(STUDENT), json={
            "sender_name": "Demo Tutor", "sender_role": "teacher", "message": "  hola  ",
        })
        self.assertEqual(response.status_code, 200, response.text)
        sent = response.json()
        self.assertEqual(sent["sender_name"], "Demo Student")
        self.assertEqual(sent["sender_role"], "student")
        self.assertEqual(sent["message"], "hola")

    def test_chat_polling_returns_only_newer_messages_in_order(self):
        session_id = self._schedule("Demo Tutor").json()["id"]
        student, tutor = self._headers(STUDENT), self._headers(TUTOR)
        url = f"/api/live-sessions/{session_id}/chat"
        first = self.client.post(url, headers=student, json={"message": "¿Ser o estar?"}).json()
        self.client.post(url, headers=tutor, json={"message": "Estar"})

        everything = self.client.get(url, headers=tutor).json()
        self.assertEqual([m["message"] for m in everything], ["¿Ser o estar?", "Estar"])
        self.assertEqual([m["sender_role"] for m in everything], ["student", "teacher"])
        self.assertTrue(everything[0]["time_sent"].endswith(("Z", "+00:00")), everything[0]["time_sent"])

        newer = self.client.get(f"{url}?after_id={first['id']}", headers=student).json()
        self.assertEqual([m["message"] for m in newer], ["Estar"])

    def test_chat_rejects_empty_messages(self):
        session_id = self._schedule("Demo Tutor").json()["id"]
        response = self.client.post(f"/api/live-sessions/{session_id}/chat", headers=self._headers(STUDENT), json={"message": "   "})
        self.assertEqual(response.status_code, 400)

    def test_chat_rejects_students_from_another_level_and_other_tutors(self):
        b1_session = self._schedule("Demo Tutor", level="B1").json()["id"]
        student = self._headers(STUDENT)
        self.assertEqual(self.client.get(f"/api/live-sessions/{b1_session}/chat", headers=student).status_code, 403)
        self.assertEqual(self.client.post(f"/api/live-sessions/{b1_session}/chat", headers=student, json={"message": "hi"}).status_code, 403)

        other_session = self._schedule("Xiomara Villamizar").json()["id"]
        tutor = self._headers(TUTOR)
        self.assertEqual(self.client.get(f"/api/live-sessions/{other_session}/chat", headers=tutor).status_code, 403)

    def test_chat_requires_login(self):
        session_id = self._schedule("Demo Tutor").json()["id"]
        self.client.cookies.clear()
        self.assertEqual(self.client.get(f"/api/live-sessions/{session_id}/chat").status_code, 401)


MEET_LINK = "https://meet.google.com/abc-defg-hij"


class MeetLiveSessionTests(_LiveSessionTestCase):
    env_overrides = {"LIVE_CLASS_PROVIDER": "meet"}

    def _now_gmt(self):
        return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")

    def test_config_reports_meet_without_auto_links(self):
        config = self.client.get("/api/live-config", headers=self._headers(STUDENT)).json()
        self.assertEqual(config, {"provider": "meet", "meet_auto_create": False})

    def test_pasted_link_is_normalized_and_used_to_start(self):
        created = self._schedule("Demo Tutor", credentials=TUTOR, meeting_link="meet.google.com/ABC-DEFG-HIJ?authuser=0")
        self.assertEqual(created.status_code, 200, created.text)
        self.assertEqual(created.json()["meeting_link"], MEET_LINK)
        self.assertEqual(created.json()["provider"], "meet")

        started = self.client.post(f"/api/live-sessions/{created.json()['id']}/start", headers=self._headers(TUTOR))
        self.assertEqual(started.status_code, 200, started.text)
        self.assertEqual(started.json()["provider"], "meet")
        self.assertEqual(started.json()["room_url"], MEET_LINK)
        self.assertEqual(started.json()["join_token"], "")

    def test_rejects_links_that_are_not_meet(self):
        response = self._schedule("Demo Tutor", credentials=TUTOR, meeting_link="https://evil.example.com/abc-defg-hij")
        self.assertEqual(response.status_code, 400)

    def test_start_without_link_or_auto_create_asks_for_a_link(self):
        session_id = self._schedule("Demo Tutor").json()["id"]
        response = self.client.post(f"/api/live-sessions/{session_id}/start", headers=self._headers(TUTOR))
        self.assertEqual(response.status_code, 400)
        self.assertIn("Google Meet link", response.json()["detail"])

    def test_start_creates_a_space_when_auto_create_is_configured(self):
        session_id = self._schedule("Demo Tutor").json()["id"]
        with mock.patch.object(self.module.meet, "auto_create_enabled", return_value=True), \
                mock.patch.object(self.module.meet, "create_meet_space", return_value=MEET_LINK) as create:
            response = self.client.post(f"/api/live-sessions/{session_id}/start", headers=self._headers(TUTOR))
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["room_url"], MEET_LINK)
        create.assert_called_once_with("tutor@seroestar.com")

    def test_students_get_the_link_only_from_join(self):
        session_id = self._schedule("Demo Tutor", date_time=self._now_gmt(), meeting_link=MEET_LINK).json()["id"]
        student = self._headers(STUDENT)

        listed = self.client.get("/api/live-sessions", headers=student).json()
        self.assertTrue(listed)
        self.assertTrue(all(item["meeting_link"] is None and item["room_url"] is None for item in listed))
        tutor_view = self.client.get("/api/live-sessions", headers=self._headers(TUTOR)).json()
        self.assertEqual(tutor_view[0]["meeting_link"], MEET_LINK)

        joined = self.client.post(f"/api/live-sessions/{session_id}/join", headers=student, json={"student_id_code": "SER-001"})
        self.assertEqual(joined.status_code, 200, joined.text)
        self.assertEqual(joined.json()["provider"], "meet")
        self.assertEqual(joined.json()["room_url"], MEET_LINK)

    def _set_link(self, session_id, link, credentials=TUTOR):
        return self.client.put(f"/api/live-sessions/{session_id}/meeting-link", headers=self._headers(credentials), json={"meeting_link": link})

    def test_tutor_can_attach_a_link_to_an_existing_class_and_start_it(self):
        session_id = self._schedule("Demo Tutor").json()["id"]
        updated = self._set_link(session_id, "https://meet.google.com/abc-defg-hij/")
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["meeting_link"], MEET_LINK)

        started = self.client.post(f"/api/live-sessions/{session_id}/start", headers=self._headers(TUTOR))
        self.assertEqual(started.status_code, 200, started.text)
        self.assertEqual(started.json()["room_url"], MEET_LINK)

    def test_changing_the_link_of_a_live_class_updates_what_students_join(self):
        session_id = self._schedule("Demo Tutor", meeting_link=MEET_LINK).json()["id"]
        self.client.post(f"/api/live-sessions/{session_id}/start", headers=self._headers(TUTOR))
        self.assertEqual(self._set_link(session_id, "https://meet.google.com/xyz-wxyz-xyz").status_code, 200)

        joined = self.client.post(f"/api/live-sessions/{session_id}/join", headers=self._headers(STUDENT), json={"student_id_code": "SER-001"})
        self.assertEqual(joined.json()["room_url"], "https://meet.google.com/xyz-wxyz-xyz")

    def test_only_the_owning_tutor_can_set_the_link_and_it_must_be_meet(self):
        other = self._schedule("Xiomara Villamizar").json()["id"]
        own = self._schedule("Demo Tutor").json()["id"]
        self.assertEqual(self._set_link(other, MEET_LINK).status_code, 403)
        self.assertEqual(self._set_link(own, MEET_LINK, credentials=STUDENT).status_code, 403)
        self.assertEqual(self._set_link(own, "https://zoom.us/j/123").status_code, 400)

    def test_cannot_set_a_link_on_a_finished_class(self):
        session_id = self._schedule("Demo Tutor", meeting_link=MEET_LINK).json()["id"]
        tutor = self._headers(TUTOR)
        self.client.post(f"/api/live-sessions/{session_id}/start", headers=tutor)
        self.client.post(f"/api/live-sessions/{session_id}/end", headers=tutor)
        self.assertEqual(self._set_link(session_id, MEET_LINK).status_code, 400)

    def test_join_before_tutor_opens_a_linkless_class_waits(self):
        session_id = self._schedule("Demo Tutor", date_time=self._now_gmt()).json()["id"]
        response = self.client.post(f"/api/live-sessions/{session_id}/join", headers=self._headers(STUDENT), json={"student_id_code": "SER-001"})
        self.assertEqual(response.status_code, 409)


class MeetApiClientTests(unittest.TestCase):
    """Exercise the real token + space requests against a fake Google."""

    def setUp(self):
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import rsa

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.public_key = key.public_key()
        self.service_account = {
            "client_email": "classes@seroestar.iam.gserviceaccount.com",
            "private_key_id": "key-1",
            "private_key": key.private_bytes(
                serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
            ).decode("utf-8"),
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        self._saved_env = dict(os.environ)
        import json
        os.environ.update({
            "LIVE_CLASS_PROVIDER": "meet",
            "GOOGLE_SERVICE_ACCOUNT_JSON": json.dumps(self.service_account),
            "GOOGLE_WORKSPACE_DOMAIN": "iseroestar.com",
            "GOOGLE_MEET_ORGANIZER_EMAIL": "admin@iseroestar.com",
        })
        from backend import meet
        self.meet = meet

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._saved_env)

    def _fake_google(self, requests_seen):
        import io
        import json

        def urlopen(request, timeout=None):
            requests_seen.append(request)
            if request.full_url == self.service_account["token_uri"]:
                body = {"access_token": "ya29.test"}
            else:
                body = {"name": "spaces/xyz", "meetingUri": "https://meet.google.com/abc-defg-hij"}
            response = io.BytesIO(json.dumps(body).encode("utf-8"))
            response.__enter__ = lambda *_: response
            response.__exit__ = lambda *_: None
            return response

        return urlopen

    def test_creates_a_trusted_space_as_the_tutor(self):
        import json
        import urllib.parse
        from jose import jwt

        seen = []
        with mock.patch("urllib.request.urlopen", self._fake_google(seen)):
            link = self.meet.create_meet_space("Xiomara@iseroestar.com")

        self.assertEqual(link, MEET_LINK)
        token_request, space_request = seen
        assertion = urllib.parse.parse_qs(token_request.data.decode("utf-8"))["assertion"][0]
        claims = jwt.decode(assertion, self.public_key, algorithms=["RS256"], audience=self.service_account["token_uri"])
        self.assertEqual(claims["sub"], "xiomara@iseroestar.com")
        self.assertEqual(claims["iss"], self.service_account["client_email"])
        self.assertEqual(claims["scope"], self.meet.MEET_SCOPE)
        self.assertEqual(space_request.headers["Authorization"], "Bearer ya29.test")
        self.assertEqual(json.loads(space_request.data), {"config": {"accessType": "TRUSTED"}})

    def test_tutors_outside_the_workspace_use_the_organizer(self):
        self.assertEqual(self.meet.organizer_for("tutor@seroestar.com"), "admin@iseroestar.com")

    def test_google_errors_become_meet_errors(self):
        def failing_urlopen(request, timeout=None):
            raise OSError("network down")

        with mock.patch("urllib.request.urlopen", failing_urlopen):
            with self.assertRaises(self.meet.MeetError):
                self.meet.create_meet_space("xiomara@iseroestar.com")


if __name__ == "__main__":
    unittest.main()
