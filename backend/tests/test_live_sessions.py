"""Access rules for live classes: who may run a class and who may chat in it."""

import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

TUTOR = ("tutor@seroestar.com", "SeroEstar-Tutor-2026!")
STUDENT = ("student@seroestar.com", "SeroEstar-Student-2026!")
DEVELOPER = ("developer@seroestar.com", "SeroEstar-Dev-2026!")


class LiveSessionAccessTests(unittest.TestCase):
    def setUp(self):
        self._saved_env = dict(os.environ)
        self._data_dir = tempfile.TemporaryDirectory()
        os.environ["BACKEND_DATA_DIR"] = self._data_dir.name
        os.environ["ENVIRONMENT"] = "development"
        for key in ("DATABASE_URL", "JWT_SECRET", "DAILY_API_KEY", "SEED_RESET_PASSWORDS", "ADMIN_EMAIL", "ADMIN_PASSWORD"):
            os.environ.pop(key, None)
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

    def _schedule(self, teacher_name, level="A1", credentials=DEVELOPER, date_time="2026-10-02 14:00"):
        return self.client.post("/api/live-sessions", headers=self._headers(credentials), json={
            "title": "Ser vs Estar",
            "course_level": level,
            "teacher_name": teacher_name,
            "date_time": date_time,
        })

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

if __name__ == "__main__":
    unittest.main()
