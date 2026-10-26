"""Blog articles the admin publishes are stored and shown to every visitor."""

from backend.tests.test_live_sessions import DEVELOPER, STUDENT, TUTOR, _LiveSessionTestCase


class BlogTests(_LiveSessionTestCase):
    def _publish(self, credentials=DEVELOPER, **overrides):
        body = {"title": " Ser vs Estar ", "category": "Grammar", "excerpt": "Two verbs for 'to be'.", "content_markdown": "### Ser\\nPermanent."}
        body.update(overrides)
        return self.client.post("/api/blog", headers=self._headers(credentials), json=body)

    def test_published_articles_are_public_and_newest_first(self):
        self.assertEqual(self.client.get("/api/blog").json(), [])
        first = self._publish()
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(first.json()["title"], "Ser vs Estar")
        self.assertIsNone(first.json()["featured_image_url"])
        second = self._publish(title="Food words", featured_image_url="https://example.com/a.jpg")
        self.assertEqual(second.status_code, 200, second.text)

        public = self.client.get("/api/blog").json()
        self.assertEqual([p["title"] for p in public], ["Food words", "Ser vs Estar"])
        self.assertEqual(public[0]["featured_image_url"], "https://example.com/a.jpg")

        self.assertEqual(self.client.delete(f"/api/blog/{second.json()['id']}", headers=self._headers(DEVELOPER)).status_code, 200)
        self.assertEqual([p["title"] for p in self.client.get("/api/blog").json()], ["Ser vs Estar"])
        self.assertEqual(self.client.delete(f"/api/blog/{second.json()['id']}", headers=self._headers(DEVELOPER)).status_code, 404)

    def test_only_the_admin_publishes_and_deletes(self):
        for credentials in (TUTOR, STUDENT):
            self.assertEqual(self._publish(credentials=credentials).status_code, 403)
        post_id = self._publish().json()["id"]
        self.assertEqual(self.client.delete(f"/api/blog/{post_id}", headers=self._headers(TUTOR)).status_code, 403)

    def test_rejects_incomplete_articles_and_unsafe_image_links(self):
        self.assertEqual(self._publish(title="   ").status_code, 400)
        self.assertEqual(self._publish(content_markdown="").status_code, 422)
        self.assertEqual(self._publish(featured_image_url="javascript:alert(1)").status_code, 400)
        self.assertEqual(self._publish(featured_image_url="http://example.com/a.jpg").status_code, 400)
