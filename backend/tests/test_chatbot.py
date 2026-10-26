"""The website chat answers from the admin's question list and never makes facts up."""

import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace

from backend import chatbot
from backend.tests.test_live_sessions import DEVELOPER, STUDENT, TUTOR, _LiveSessionTestCase

MIGRATION = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "e4a6c8d0f2b3_chatbot_faq_keywords.py"
spec = importlib.util.spec_from_file_location("faq_migration", MIGRATION)
faq_migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(faq_migration)
STARTING = [SimpleNamespace(id=i, language=lang, question=q, keywords=k, answer=a) for i, (lang, q, k, a) in enumerate(faq_migration.STARTING_FAQS)]


def answer_for(message, lang="en"):
    return chatbot.best_answer(message, [faq for faq in STARTING if faq.language == lang])


class StartingAnswerTests(unittest.TestCase):
    """Plain unit tests of the matching on the starting list."""

    def test_common_questions_find_the_right_answer(self):
        cases = {
            "How much are the classes?": "current fees",
            "what time are lessons": "six weeks",
            "will I get a certificate from the embassy": "80%",
            "Can I start as a complete beginner?": "A1 Beginner",
            "how many students in a group": "16 participants",
            "how do i enroll": "seroestar@icloud.com",
            "Where is the school located?": "Freetown",
            "is it on zoom or in a classroom": "interactive classroom",
        }
        for question, expected in cases.items():
            with self.subTest(question=question):
                self.assertIn(expected, answer_for(question) or "")

    def test_spanish_questions_with_or_without_accents(self):
        self.assertIn("cuotas", answer_for("¿cuánto cuesta el curso?", "es"))
        self.assertIn("cuotas", answer_for("cuanto cuesta", "es"))
        self.assertIn("80 %", answer_for("¿Dan certificado?", "es"))

    def test_unrelated_questions_get_no_made_up_answer(self):
        self.assertIsNone(answer_for("What is the capital of France?"))
        self.assertIsNone(answer_for("???"))


class ChatbotApiTests(_LiveSessionTestCase):
    def _add(self, credentials=DEVELOPER, **overrides):
        body = {"question": "How much does it cost?", "answer": "Ask us on WhatsApp.", "language": "en", "keywords": "price, fee"}
        body.update(overrides)
        return self.client.post("/api/admin/faqs", headers=self._headers(credentials), json=body)

    def test_chat_answers_from_the_list_or_points_to_whatsapp(self):
        self.assertEqual(self._add().status_code, 200)
        self.assertEqual(self._add(language="es", question="¿Cuánto cuesta?", answer="Pregúntanos por WhatsApp.", keywords="precio").status_code, 200)

        reply = self.client.post("/api/chatbot", json={"message": "what is the price?"}).json()
        self.assertEqual(reply, {"text": "Ask us on WhatsApp.", "matched": True})
        reply = self.client.post("/api/chatbot", json={"message": "¿precio?", "lang": "es"}).json()
        self.assertEqual(reply["text"], "Pregúntanos por WhatsApp.")

        unknown = self.client.post("/api/chatbot", json={"message": "Do you sell bicycles?"}).json()
        self.assertFalse(unknown["matched"])
        self.assertIn("WhatsApp", unknown["text"])
        self.assertIn("Hello", self.client.post("/api/chatbot", json={"message": "hi!"}).json()["text"])

        quick = self.client.get("/api/chatbot/faqs?lang=es").json()
        self.assertEqual([faq["question"] for faq in quick], ["¿Cuánto cuesta?"])

    def test_admin_edits_and_deletes_answers(self):
        faq_id = self._add().json()["id"]
        updated = self.client.put(f"/api/admin/faqs/{faq_id}", headers=self._headers(DEVELOPER), json={"question": "Fees?", "answer": "Free for now.", "language": "en", "keywords": ""})
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["keywords"], "")
        self.assertEqual(self.client.post("/api/chatbot", json={"message": "fees"}).json()["text"], "Free for now.")
        self.assertEqual(self.client.delete(f"/api/admin/faqs/{faq_id}", headers=self._headers(DEVELOPER)).status_code, 200)
        self.assertEqual(self.client.get("/api/admin/faqs", headers=self._headers(DEVELOPER)).json(), [])

    def test_only_the_admin_changes_answers(self):
        for credentials in (TUTOR, STUDENT):
            self.assertEqual(self._add(credentials=credentials).status_code, 403)
            self.assertEqual(self.client.get("/api/admin/faqs", headers=self._headers(credentials)).status_code, 403)
        self.assertEqual(self._add(language="fr").status_code, 422)
        self.assertEqual(self._add(question="   ").status_code, 400)
