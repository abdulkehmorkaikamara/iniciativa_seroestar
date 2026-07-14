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


if __name__ == "__main__":
    unittest.main()
