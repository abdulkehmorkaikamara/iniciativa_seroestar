"""Public reviews with admin approval; students' notes and announcement state on the server."""

from backend.tests.test_live_sessions import DEVELOPER, STUDENT, TUTOR, _LiveSessionTestCase


class ReviewTests(_LiveSessionTestCase):
    def _submit(self, **overrides):
        body = {"name": "Fatmata K.", "location": "Freetown", "rating": 5, "text": "Great classes!"}
        body.update(overrides)
        return self.client.post("/api/reviews", json=body)

    def _admin_list(self):
        response = self.client.get("/api/admin/reviews", headers=self._headers(DEVELOPER))
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_review_appears_only_after_approval(self):
        self.assertEqual(self._submit().status_code, 200)
        self.assertEqual(self.client.get("/api/reviews").json(), [])
        pending = self._admin_list()
        self.assertEqual([(r["name"], r["status"]) for r in pending], [("Fatmata K.", "pending")])

        approved = self.client.put(f"/api/admin/reviews/{pending[0]['id']}", headers=self._headers(DEVELOPER), json={"status": "approved"})
        self.assertEqual(approved.status_code, 200, approved.text)
        self.assertEqual(approved.json()["reviewed_by"], DEVELOPER[0])
        public = self.client.get("/api/reviews").json()
        self.assertEqual([(r["name"], r["rating"], r["text"]) for r in public], [("Fatmata K.", 5, "Great classes!")])
        self.assertNotIn("status", public[0])

        self.client.put(f"/api/admin/reviews/{pending[0]['id']}", headers=self._headers(DEVELOPER), json={"status": "rejected"})
        self.assertEqual(self.client.get("/api/reviews").json(), [])

    def test_honeypot_and_duplicates_are_not_stored(self):
        self.assertEqual(self._submit(website="http://spam.example").status_code, 200)
        self._submit()
        self._submit()
        self.assertEqual(len(self._admin_list()), 1)

    def test_rejects_invalid_reviews(self):
        self.assertEqual(self._submit(rating=6).status_code, 422)
        self.assertEqual(self._submit(text="").status_code, 422)
        self.assertEqual(self._submit(name="   ").status_code, 400)
        self.assertEqual(self._submit(text="x" * 1501).status_code, 422)

    def test_only_the_admin_moderates(self):
        self._submit()
        review_id = self._admin_list()[0]["id"]
        for credentials in (TUTOR, STUDENT):
            self.assertEqual(self.client.get("/api/admin/reviews", headers=self._headers(credentials)).status_code, 403)
            self.assertEqual(self.client.put(f"/api/admin/reviews/{review_id}", headers=self._headers(credentials), json={"status": "approved"}).status_code, 403)
        self.assertEqual(self.client.put(f"/api/admin/reviews/{review_id}", headers=self._headers(DEVELOPER), json={"status": "published"}).status_code, 422)
        self.assertEqual(self.client.delete(f"/api/admin/reviews/{review_id}", headers=self._headers(DEVELOPER)).status_code, 200)
        self.assertEqual(self._admin_list(), [])


class StudentNoteTests(_LiveSessionTestCase):
    def test_notes_are_saved_per_student(self):
        headers = self._headers(STUDENT)
        created = self.client.post("/api/my-notes", headers=headers, json={"title": " Ser vs Estar ", "content": "Ser = permanent", "created_on": "2026-10-01"})
        self.assertEqual(created.status_code, 200, created.text)
        self.assertEqual(created.json()["title"], "Ser vs Estar")
        self.assertTrue(created.json()["created_at"].startswith("2026-10-01"))
        notes = self.client.get("/api/my-notes", headers=headers).json()
        self.assertEqual([n["title"] for n in notes], ["Ser vs Estar"])

        # Tutors have no student notes, and a note can't be deleted twice.
        self.assertEqual(self.client.get("/api/my-notes", headers=self._headers(TUTOR)).status_code, 403)
        self.assertEqual(self.client.delete(f"/api/my-notes/{notes[0]['id']}", headers=headers).status_code, 200)
        self.assertEqual(self.client.delete(f"/api/my-notes/{notes[0]['id']}", headers=headers).status_code, 404)
        self.assertEqual(self.client.get("/api/my-notes", headers=headers).json(), [])

    def test_rejects_empty_notes(self):
        response = self.client.post("/api/my-notes", headers=self._headers(STUDENT), json={"title": "  ", "content": "x"})
        self.assertEqual(response.status_code, 400)


class AnnouncementStateTests(_LiveSessionTestCase):
    def _announce(self):
        response = self.client.post("/api/announcements", headers=self._headers(TUTOR), json={
            "title": "No class Friday", "text": "Public holiday.", "course_level": "A1", "alert_type": "info",
        })
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["id"]

    def test_read_and_hidden_are_remembered(self):
        announcement_id = self._announce()
        headers = self._headers(STUDENT)
        self.assertEqual(self.client.get("/api/announcements/state", headers=headers).json(), {"read": [], "hidden": []})

        self.client.put(f"/api/announcements/{announcement_id}/state", headers=headers, json={"read": True})
        self.assertEqual(self.client.get("/api/announcements/state", headers=headers).json(), {"read": [announcement_id], "hidden": []})
        self.client.put(f"/api/announcements/{announcement_id}/state", headers=headers, json={"hidden": True})
        self.assertEqual(self.client.get("/api/announcements/state", headers=headers).json(), {"read": [announcement_id], "hidden": [announcement_id]})

        self.assertEqual(self.client.put("/api/announcements/9999/state", headers=headers, json={"read": True}).status_code, 404)

    def test_deleting_the_announcement_clears_its_state(self):
        announcement_id = self._announce()
        headers = self._headers(STUDENT)
        self.client.put(f"/api/announcements/{announcement_id}/state", headers=headers, json={"read": True})
        self.assertEqual(self.client.delete(f"/api/announcements/{announcement_id}", headers=self._headers(TUTOR)).status_code, 200)
        self.assertEqual(self.client.get("/api/announcements/state", headers=headers).json(), {"read": [], "hidden": []})
