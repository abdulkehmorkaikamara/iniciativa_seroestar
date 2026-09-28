"""Persistence guarantees for the three portal logins.

Each test uses a throwaway SQLite file and re-imports the backend so that a
"restart" really is a fresh set of module-level objects (engine, session maker,
JWT key), not just a new database session.
"""

import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))


class PersistentAccountTests(unittest.TestCase):
    def setUp(self):
        self._saved_env = dict(os.environ)
        self._data_dir = tempfile.TemporaryDirectory()
        os.environ["BACKEND_DATA_DIR"] = self._data_dir.name
        os.environ["ENVIRONMENT"] = "development"
        for key in ("DATABASE_URL", "JWT_SECRET", "SEED_RESET_PASSWORDS", "ADMIN_EMAIL", "ADMIN_PASSWORD"):
            os.environ.pop(key, None)

    def tearDown(self):
        self._data_dir.cleanup()
        os.environ.clear()
        os.environ.update(self._saved_env)

    @staticmethod
    def _restart():
        """Reload the backend the way a server restart would."""
        for name in [n for n in list(sys.modules) if n.startswith("backend")]:
            del sys.modules[name]
        return importlib.import_module("backend.main")

    def _client(self, module):
        from fastapi.testclient import TestClient
        return TestClient(module.app)

    def _boot(self):
        """Restart and run the startup bootstrap once, without issuing requests."""
        module = self._restart()
        with self._client(module):
            pass
        return module

    def test_default_accounts_survive_a_restart(self):
        credentials = [
            ("developer@seroestar.com", "SeroEstar-Dev-2026!", "developer"),
            ("student@seroestar.com", "SeroEstar-Student-2026!", "student"),
            ("tutor@seroestar.com", "SeroEstar-Tutor-2026!", "tutor"),
        ]

        for boot in ("first", "second"):
            module = self._restart()
            with self._client(module) as client:
                for email, password, expected_role in credentials:
                    response = client.post("/api/login", json={"username": email, "password": password})
                    self.assertEqual(response.status_code, 200, f"{boot} boot: {email} -> {response.text}")
                    self.assertEqual(response.json()["role"], expected_role)

    def test_seeding_never_overwrites_an_existing_password(self):
        module = self._restart()
        with self._client(module) as client:
            self.assertEqual(client.post("/api/login", json={
                "username": "student@seroestar.com",
                "password": "SeroEstar-Student-2026!",
            }).status_code, 200)

        # The team changes the seeded account's password.
        from backend import auth, models
        from backend.database import SessionLocal
        with SessionLocal() as db:
            user = db.query(models.User).filter(models.User.email == "student@seroestar.com").one()
            user.hashed_password = auth.get_password_hash("a-brand-new-password")
            db.commit()

        module = self._restart()
        with self._client(module) as client:  # bootstrap runs again here
            self.assertEqual(client.post("/api/login", json={
                "username": "student@seroestar.com",
                "password": "a-brand-new-password",
            }).status_code, 200, "the changed password must survive the restart")
            self.assertEqual(client.post("/api/login", json={
                "username": "student@seroestar.com",
                "password": "SeroEstar-Student-2026!",
            }).status_code, 401, "seeding must not restore the default password")

    def test_account_created_at_runtime_survives_a_restart(self):
        module = self._restart()
        with self._client(module) as client:
            registered = client.post("/api/register", json={
                "full_name": "Later Learner",
                "email": "later.learner@seroestar.com",
                "password": "another-good-password",
                "course_level": "A1",
            })
            self.assertEqual(registered.status_code, 200, registered.text)

        module = self._restart()
        with self._client(module) as client:
            response = client.post("/api/login", json={
                "username": "later.learner@seroestar.com",
                "password": "another-good-password",
            })
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["role"], "student")

    def test_issued_token_still_validates_after_a_restart(self):
        module = self._restart()
        with self._client(module) as client:
            token = client.post("/api/login", json={
                "username": "developer@seroestar.com",
                "password": "SeroEstar-Dev-2026!",
            }).json()["access_token"]

        module = self._restart()
        with self._client(module) as client:
            response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(response.status_code, 200, "the JWT signing key must be stable across restarts")
            self.assertEqual(response.json()["role"], "developer")

    def test_passwords_are_stored_as_bcrypt_hashes(self):
        self._boot()
        from backend import models
        from backend.database import SessionLocal
        with SessionLocal() as db:
            for user in db.query(models.User).all():
                self.assertTrue(user.hashed_password.startswith("$2"), user.email)
                self.assertNotIn("SeroEstar", user.hashed_password)

    def test_legacy_role_values_are_normalized_and_still_authenticate(self):
        self._boot()
        from backend import auth, models
        from backend.database import SessionLocal
        with SessionLocal() as db:
            db.add(models.User(
                email="old.admin@seroestar.com",
                hashed_password=auth.get_password_hash("legacy-password-value"),
                full_name="Old Admin",
                role="admin",
            ))
            db.commit()

        module = self._restart()
        with self._client(module) as client:
            body = client.post("/api/login", json={
                "username": "old.admin@seroestar.com",
                "password": "legacy-password-value",
            }).json()
            self.assertEqual(body["role"], "developer")
            self.assertEqual(body["legacy_role"], "admin")
            self.assertEqual(client.get(
                "/api/admin/students",
                headers={"Authorization": f"Bearer {body['access_token']}"},
            ).status_code, 200)

    def test_password_recovery_works_for_both_recoverable_roles(self):
        """The developer/tutor rename must not lock tutors out of recovery."""
        module = self._restart()
        from backend import auth, models
        from backend.database import SessionLocal

        for email, portal_role in (
            ("student@seroestar.com", "student"),
            ("tutor@seroestar.com", "tutor"),
        ):
            with self._client(module) as client:
                with SessionLocal() as db:
                    user = db.query(models.User).filter(models.User.email == email).one()
                    self.assertEqual(auth.normalize_role(user.role), portal_role)
                    token = auth.create_password_reset_token(
                        user.id, user.email, user.hashed_password, user.role
                    )

                response = client.post("/api/password/reset", json={
                    "token": token,
                    "new_password": f"recovered-{portal_role}-password",
                })
                self.assertEqual(response.status_code, 200, f"{portal_role}: {response.text}")

                self.assertEqual(client.post("/api/login", json={
                    "username": email,
                    "password": f"recovered-{portal_role}-password",
                }).status_code, 200)

    def test_reset_link_issued_with_a_legacy_role_still_works(self):
        module = self._restart()
        from backend import auth, models
        from backend.database import SessionLocal

        with self._client(module) as client:
            with SessionLocal() as db:
                user = db.query(models.User).filter(
                    models.User.email == "tutor@seroestar.com"
                ).one()
                # A link minted before the rename carries role="teacher".
                legacy_token = auth.create_access_token({
                    "sub": user.email,
                    "id": user.id,
                    "role": "teacher",
                    "purpose": "password_reset",
                    "pwd": auth.password_hash_fingerprint(user.hashed_password),
                    "nonce": "legacy-nonce",
                })

            response = client.post("/api/password/reset", json={
                "token": legacy_token,
                "new_password": "reset-from-a-legacy-link",
            })
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(client.post("/api/login", json={
                "username": "tutor@seroestar.com",
                "password": "reset-from-a-legacy-link",
            }).status_code, 200)

    def test_recovery_is_refused_for_the_developer_account(self):
        module = self._restart()
        from backend import auth, models
        from backend.database import SessionLocal
        with self._client(module):
            with SessionLocal() as db:
                user = db.query(models.User).filter(
                    models.User.email == "developer@seroestar.com"
                ).one()
                with self.assertRaises(ValueError):
                    auth.create_password_reset_token(
                        user.id, user.email, user.hashed_password, user.role
                    )

    def test_environment_credentials_alone_do_not_grant_access(self):
        """ADMIN_PASSWORD seeds an account; it is not a login of its own."""
        os.environ["ADMIN_EMAIL"] = "chief@seroestar.com"
        os.environ["ADMIN_PASSWORD"] = "seeded-from-the-environment"
        module = self._restart()
        with self._client(module) as client:
            self.assertEqual(client.post("/api/login", json={
                "username": "chief@seroestar.com",
                "password": "seeded-from-the-environment",
            }).status_code, 200)

        # Change the env var: the stored hash, not the variable, decides.
        os.environ["ADMIN_PASSWORD"] = "a-different-environment-value"
        module = self._restart()
        with self._client(module) as client:
            self.assertEqual(client.post("/api/login", json={
                "username": "chief@seroestar.com",
                "password": "a-different-environment-value",
            }).status_code, 401)
            self.assertEqual(client.post("/api/login", json={
                "username": "chief@seroestar.com",
                "password": "seeded-from-the-environment",
            }).status_code, 200)


if __name__ == "__main__":
    unittest.main()
