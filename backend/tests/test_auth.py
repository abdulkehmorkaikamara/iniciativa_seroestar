import os
import unittest
from datetime import timedelta


os.environ.setdefault("JWT_SECRET", "test-only-secret-that-is-long-enough-for-signed-jwt-tokens")

from backend import auth


class AuthenticationTests(unittest.TestCase):
    def test_access_token_round_trip_preserves_identity_and_role(self):
        token = auth.create_access_token({"sub": "teacher@example.com", "role": "teacher", "id": 42})
        payload = auth.decode_token(token)
        self.assertEqual(payload["sub"], "teacher@example.com")
        self.assertEqual(payload["role"], "teacher")
        self.assertEqual(payload["id"], 42)

    def test_expired_access_token_is_rejected(self):
        token = auth.create_access_token(
            {"sub": "student@example.com", "role": "student", "id": 7},
            expires_delta=timedelta(seconds=-1),
        )
        with self.assertRaises(Exception):
            auth.decode_token(token)

    def test_password_hash_does_not_store_plaintext(self):
        password = "A-strong-test-password-2026"
        password_hash = auth.get_password_hash(password)
        self.assertNotEqual(password_hash, password)
        self.assertTrue(auth.verify_password(password, password_hash))

    def test_password_reset_token_is_bound_to_current_password_hash(self):
        password_hash = auth.get_password_hash("A-strong-test-password-2026")
        token = auth.create_password_reset_token(14, "student@example.com", password_hash, "student")
        payload = auth.decode_password_reset_token(token)
        self.assertEqual(payload["id"], 14)
        self.assertEqual(payload["sub"], "student@example.com")
        self.assertEqual(payload["purpose"], "password_reset")
        self.assertEqual(payload["role"], "student")
        self.assertEqual(payload["pwd"], auth.password_hash_fingerprint(password_hash))

    def test_teacher_password_reset_token_preserves_teacher_role(self):
        password_hash = auth.get_password_hash("A-different-strong-password-2026")
        token = auth.create_password_reset_token(27, "teacher@example.com", password_hash, "teacher")
        payload = auth.decode_password_reset_token(token)
        self.assertEqual(payload["id"], 27)
        self.assertEqual(payload["role"], "teacher")

    def test_admin_cannot_receive_password_reset_token(self):
        password_hash = auth.get_password_hash("An-admin-password-that-is-not-resettable")
        with self.assertRaises(ValueError):
            auth.create_password_reset_token(1, "admin@example.com", password_hash, "admin")

    def test_access_token_cannot_be_used_as_password_reset_token(self):
        token = auth.create_access_token({"sub": "student@example.com", "role": "student", "id": 14})
        with self.assertRaises(Exception):
            auth.decode_password_reset_token(token)


if __name__ == "__main__":
    unittest.main()
