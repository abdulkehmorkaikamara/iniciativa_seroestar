"""Sign-in and password-reset limits are kept in the database, not server memory."""

import os
from unittest import mock

from backend.tests.test_live_sessions import STUDENT, TUTOR, _LiveSessionTestCase
from backend.tests.test_password_help import SMTP


class LoginLockoutTests(_LiveSessionTestCase):
    def _login(self, username, password, ip="203.0.113.5"):
        return self.client.post("/api/login", json={"username": username, "password": password}, headers={"X-Forwarded-For": ip})

    def test_account_locks_after_repeated_wrong_passwords(self):
        for _ in range(self.module.LOGIN_FAILURES_PER_EMAIL):
            self.assertEqual(self._login(STUDENT[0], "wrong-password").status_code, 401)
        # Even the right password is refused while locked, from any network.
        locked = self._login(STUDENT[0], STUDENT[1], ip="198.51.100.7")
        self.assertEqual(locked.status_code, 429)
        self.assertIn("15 minutes", locked.json()["detail"])
        # Other accounts are unaffected.
        self.assertEqual(self._login(TUTOR[0], TUTOR[1]).status_code, 200)

    def test_lock_survives_a_fresh_server_memory(self):
        for _ in range(self.module.LOGIN_FAILURES_PER_EMAIL):
            self._login(STUDENT[0], "wrong-password")
        # The count lives in the database, so nothing in process memory resets it.
        self.assertFalse(hasattr(self.module.login, "attempts"))
        from backend.database import SessionLocal
        with SessionLocal() as db:
            count = db.query(self.module.models.RateLimitEvent).count()
        self.assertGreaterEqual(count, self.module.LOGIN_FAILURES_PER_EMAIL)
        self.assertEqual(self._login(STUDENT[0], STUDENT[1]).status_code, 429)

    def test_lock_expires_after_the_window(self):
        for _ in range(self.module.LOGIN_FAILURES_PER_EMAIL):
            self._login(STUDENT[0], "wrong-password")
        with mock.patch.object(self.module, "RATE_LIMIT_WINDOW", self.module.timedelta(seconds=0)):
            self.assertEqual(self._login(STUDENT[0], STUDENT[1]).status_code, 200)

    def test_successful_sign_in_clears_earlier_mistakes(self):
        for _ in range(self.module.LOGIN_FAILURES_PER_EMAIL - 1):
            self._login(STUDENT[0], "wrong-password")
        self.assertEqual(self._login(STUDENT[0], STUDENT[1]).status_code, 200)
        self.assertEqual(self._login(STUDENT[0], "wrong-password").status_code, 401)
        self.assertEqual(self._login(STUDENT[0], STUDENT[1]).status_code, 200)

    def test_one_network_cannot_guess_endlessly_across_accounts(self):
        for i in range(self.module.LOGIN_FAILURES_PER_IP):
            self._login(f"guess{i}@example.com", "wrong-password")
        self.assertEqual(self._login(TUTOR[0], TUTOR[1]).status_code, 429)
        self.assertEqual(self._login(TUTOR[0], TUTOR[1], ip="198.51.100.7").status_code, 200)


class ResetRequestLimitTests(_LiveSessionTestCase):
    def test_reset_emails_stop_after_three_requests(self):
        with mock.patch.dict(os.environ, SMTP), mock.patch("backend.main._send_password_reset_email", return_value=True) as send:
            for _ in range(5):
                response = self.client.post("/api/password/forgot", json={"email": STUDENT[0]})
                self.assertEqual(response.status_code, 202)
        self.assertEqual(send.call_count, self.module.RESET_REQUESTS_PER_EMAIL)
