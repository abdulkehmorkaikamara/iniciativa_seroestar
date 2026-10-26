"""Students' personal file locker and admin-replaceable website images."""

import shutil

from backend.tests.test_live_sessions import DEVELOPER, STUDENT, TUTOR, _LiveSessionTestCase


class _UploadTestCase(_LiveSessionTestCase):
    def tearDown(self):
        super().tearDown()
        for folder in ("locker", "images"):
            shutil.rmtree(f"backend/uploads/{folder}", ignore_errors=True)


class StudentLockerTests(_UploadTestCase):
    def _upload(self, name="vocab list.pdf", content=b"%PDF-1.4 notes", credentials=STUDENT):
        return self.client.post("/api/my-files", headers=self._headers(credentials), files={"file": (name, content, "application/pdf")})

    def test_files_are_kept_and_deleted(self):
        uploaded = self._upload()
        self.assertEqual(uploaded.status_code, 200, uploaded.text)
        body = uploaded.json()
        self.assertEqual(body["file_name"], "vocab list.pdf")
        self.assertTrue(body["file_url"].startswith("/uploads/locker/"))
        self.assertEqual(self.client.get(body["file_url"]).content, b"%PDF-1.4 notes")

        listed = self.client.get("/api/my-files", headers=self._headers(STUDENT)).json()
        self.assertEqual([f["id"] for f in listed], [body["id"]])

        self.assertEqual(self.client.delete(f"/api/my-files/{body['id']}", headers=self._headers(STUDENT)).status_code, 200)
        self.assertEqual(self.client.get("/api/my-files", headers=self._headers(STUDENT)).json(), [])
        self.assertEqual(self.client.delete(f"/api/my-files/{body['id']}", headers=self._headers(STUDENT)).status_code, 404)

    def test_rejects_bad_files_and_other_roles(self):
        self.assertEqual(self._upload(name="virus.exe").status_code, 400)
        self.assertEqual(self._upload(content=b"").status_code, 400)
        self.assertEqual(self._upload(credentials=TUTOR).status_code, 403)
        self.assertIn(self.client.get("/api/my-files").status_code, (401, 403))


class SiteImageTests(_UploadTestCase):
    def _upload(self, credentials=DEVELOPER, name="hero.jpg"):
        return self.client.post(
            "/api/images",
            headers=self._headers(credentials),
            data={"category": "hero", "title": name, "alt_text": "Students in class"},
            files={"file": (name, b"\xff\xd8\xff fake jpeg", "image/jpeg")},
        )

    def test_newest_upload_replaces_the_image_until_reset(self):
        self.assertEqual(self.client.get("/api/site-images").json(), {})
        self.assertEqual(self._upload(name="first.jpg").status_code, 200)
        second = self._upload(name="second.jpg")
        self.assertEqual(second.status_code, 200, second.text)
        images = self.client.get("/api/site-images").json()
        self.assertEqual(images["hero"], {"path": second.json()["path"], "alt_text": "Students in class"})

        self.assertEqual(self.client.delete("/api/site-images/hero", headers=self._headers(DEVELOPER)).status_code, 200)
        self.assertEqual(self.client.get("/api/site-images").json(), {})
        self.assertEqual(self.client.delete("/api/site-images/footer", headers=self._headers(DEVELOPER)).status_code, 404)

    def test_only_the_admin_changes_images(self):
        self.assertEqual(self._upload(credentials=TUTOR).status_code, 403)
        self.assertEqual(self._upload(credentials=STUDENT).status_code, 403)
        self.assertEqual(self.client.delete("/api/site-images/hero", headers=self._headers(TUTOR)).status_code, 403)
        self.assertEqual(self._upload(name="hero.gif").status_code, 400)
