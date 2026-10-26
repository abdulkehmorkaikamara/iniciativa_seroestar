"""Welcome letters the admin edits, changing your own password, and the new-student welcome email."""

import os
from unittest import mock

from backend.tests.test_live_sessions import DEVELOPER, STUDENT, TUTOR, _LiveSessionTestCase

LETTER = {
    "course_dates": "3 November to 12 December 2026",
    "duration_weeks": 6,
    "sessions": [
        {"time": "19:00-20:00", "day": "Tuesday", "session": "Grammar-Lab"},
        {"time": "10:00-11:00", "day": "Saturday", "session": "Listening Practice"},
    ],
}


class WelcomeLetterTests(_LiveSessionTestCase):
    def test_student_sees_their_groups_letter_dated_the_day_they_joined(self):
        self.assertEqual(self.client.get("/api/welcome-letter", headers=self._headers(STUDENT)).status_code, 404)
        saved = self.client.put("/api/admin/welcome-letters/A1/1", headers=self._headers(DEVELOPER), json=LETTER)
        self.assertEqual(saved.status_code, 200, saved.text)

        letter = self.client.get("/api/welcome-letter", headers=self._headers(STUDENT)).json()
        self.assertEqual(letter["course_dates"], "3 November to 12 December 2026")
        self.assertEqual([s["day"] for s in letter["sessions"]], ["Tuesday", "Saturday"])
        self.assertTrue(letter["letter_date"])

        changed = dict(LETTER, course_dates="10 November to 19 December 2026")
        self.client.put("/api/admin/welcome-letters/a1/1", headers=self._headers(DEVELOPER), json=changed)
        listed = self.client.get("/api/admin/welcome-letters", headers=self._headers(DEVELOPER)).json()
        self.assertEqual([(l["level"], l["group_number"], l["course_dates"]) for l in listed], [("A1", 1, "10 November to 19 December 2026")])

    def test_only_the_admin_edits_letters(self):
        self.assertEqual(self.client.put("/api/admin/welcome-letters/A1/1", headers=self._headers(TUTOR), json=LETTER).status_code, 403)
        self.assertEqual(self.client.put("/api/admin/welcome-letters/C2/1", headers=self._headers(DEVELOPER), json=LETTER).status_code, 404)
        self.assertEqual(self.client.put("/api/admin/welcome-letters/A1/1", headers=self._headers(DEVELOPER), json=dict(LETTER, sessions=[])).status_code, 422)


class ChangePasswordTests(_LiveSessionTestCase):
    def _change(self, credentials, current, new):
        return self.client.post("/api/me/password", headers=self._headers(credentials), json={"current_password": current, "new_password": new})

    def test_student_changes_their_password(self):
        self.assertEqual(self._change(STUDENT, "wrong-password", "New-Pass-2026").status_code, 400)
        self.assertEqual(self._change(STUDENT, STUDENT[1], "short").status_code, 422)
        self.assertEqual(self._change(STUDENT, STUDENT[1], STUDENT[1]).status_code, 400)
        self.assertEqual(self._change(STUDENT, STUDENT[1], "New-Pass-2026").status_code, 200)
        self.assertEqual(self.client.post("/api/login", json={"username": STUDENT[0], "password": STUDENT[1]}).status_code, 401)
        self.assertEqual(self.client.post("/api/login", json={"username": STUDENT[0], "password": "New-Pass-2026"}).status_code, 200)

    def test_tutors_can_change_theirs_too(self):
        self.assertEqual(self._change(TUTOR, TUTOR[1], "Tutor-New-2026").status_code, 200)

    def test_needs_to_be_signed_in(self):
        response = self.client.post("/api/me/password", json={"current_password": "x", "new_password": "12345678"})
        self.assertIn(response.status_code, (401, 403))


class WelcomeEmailTests(_LiveSessionTestCase):
    def _create(self):
        return self.client.post("/api/admin/students", headers=self._headers(DEVELOPER), json={
            "full_name": "Aminata Sesay", "email": "aminata@example.com", "password": "Temp-Pass-2026",
            "course_level": "A1", "class_group": "Group 2",
        })

    def test_new_student_gets_their_login_details_by_email(self):
        with mock.patch("backend.main._send_email", return_value=True) as send:
            response = self._create()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()["welcome_email_sent"])
        recipient, subject, text_body, _html = send.call_args.args
        self.assertEqual(recipient, "aminata@example.com")
        self.assertIn("Welcome", subject)
        self.assertIn("Temp-Pass-2026", text_body)
        self.assertIn(response.json()["student_id_code"], text_body)

    def test_account_is_still_created_when_email_fails(self):
        with mock.patch("backend.main._send_email", side_effect=OSError("smtp down")):
            response = self._create()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertFalse(response.json()["welcome_email_sent"])
        self.assertEqual(self.client.post("/api/login", json={"username": "aminata@example.com", "password": "Temp-Pass-2026"}).status_code, 200)

    def test_without_email_settings_nothing_is_sent(self):
        with mock.patch.dict(os.environ, {"SMTP_HOST": "", "SMTP_USER": "", "SMTP_PASS": ""}):
            response = self._create()
        self.assertFalse(response.json()["welcome_email_sent"])
