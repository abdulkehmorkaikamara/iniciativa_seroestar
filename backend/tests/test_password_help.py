"""Password help: no false "email sent" promise, and the admin can reset passwords."""

import os
from unittest import mock

from backend.tests.test_live_sessions import DEVELOPER, STUDENT, TUTOR, _LiveSessionTestCase

NO_SMTP = {"SMTP_HOST": "", "SMTP_USER": "", "SMTP_PASS": "", "SMTP_FROM_EMAIL": ""}
SMTP = {"SMTP_HOST": "smtp.example.com", "SMTP_USER": "school@example.com", "SMTP_PASS": "x", "SMTP_FROM_EMAIL": ""}


class ForgotPasswordTests(_LiveSessionTestCase):
    def test_without_email_settings_it_says_to_ask_the_academy(self):
        with mock.patch.dict(os.environ, NO_SMTP):
            body = self.client.post("/api/password/forgot", json={"email": STUDENT[0]}).json()
        self.assertFalse(body["email_enabled"])
        self.assertIn("WhatsApp", body["detail"])

    def test_with_email_settings_it_sends_the_link(self):
        with mock.patch.dict(os.environ, SMTP), mock.patch("backend.main._send_password_reset_email", return_value=True) as send:
            body = self.client.post("/api/password/forgot", json={"email": STUDENT[0]}).json()
        self.assertTrue(body["email_enabled"])
        send.assert_called_once()
        self.assertEqual(send.call_args.args[0], STUDENT[0])


class AdminPasswordResetTests(_LiveSessionTestCase):
    def _reset(self, email, credentials=DEVELOPER):
        return self.client.post("/api/admin/reset-password", headers=self._headers(credentials), json={"email": email})

    def test_new_temporary_password_works_and_old_one_stops(self):
        response = self._reset(STUDENT[0].upper())
        self.assertEqual(response.status_code, 200, response.text)
        temporary = response.json()["temporary_password"]
        self.assertRegex(temporary, r"^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$")

        self.assertEqual(self.client.post("/api/login", json={"username": STUDENT[0], "password": STUDENT[1]}).status_code, 401)
        self.assertEqual(self.client.post("/api/login", json={"username": STUDENT[0], "password": temporary}).status_code, 200)

    def test_only_students_and_tutors_and_only_by_the_admin(self):
        self.assertEqual(self._reset(STUDENT[0], credentials=TUTOR).status_code, 403)
        self.assertEqual(self._reset(DEVELOPER[0]).status_code, 404)
        self.assertEqual(self._reset("nobody@example.com").status_code, 404)
        self.assertEqual(self._reset(TUTOR[0]).status_code, 200)
