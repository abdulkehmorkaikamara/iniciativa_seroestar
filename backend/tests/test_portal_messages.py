"""Messages between students and tutors inside the portals."""

from backend.tests.test_live_sessions import DEVELOPER, STUDENT, TUTOR, _LiveSessionTestCase

IVONETH = "ivoneth@seroestar.com"


class PortalMessageTests(_LiveSessionTestCase):
    def _send(self, credentials, **body):
        return self.client.post("/api/messages", headers=self._headers(credentials), json=body)

    def _messages(self, credentials):
        response = self.client.get("/api/messages", headers=self._headers(credentials))
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _make_demo_tutor_ivoneth(self):
        from backend import models
        from backend.database import SessionLocal

        db = SessionLocal()
        try:
            user = db.query(models.User).filter(models.User.email == TUTOR[0]).first()
            user.full_name = "Ivoneth Frias"
            db.commit()
        finally:
            db.close()

    def test_student_and_tutor_exchange_messages(self):
        sent = self._send(STUDENT, tutor_email=IVONETH, subject="Homework", body="  Can I hand it in on Friday?  ")
        self.assertEqual(sent.status_code, 200, sent.text)
        self.assertEqual(sent.json()["body"], "Can I hand it in on Friday?")
        self.assertEqual(sent.json()["sender_role"], "student")

        # Another tutor does not see Ivoneth's messages.
        self.assertEqual(self._messages(TUTOR), [])

        self._make_demo_tutor_ivoneth()
        inbox = self._messages(TUTOR)
        self.assertEqual([m["subject"] for m in inbox], ["Homework"])
        student_code = inbox[0]["student_id_code"]

        reply = self._send(TUTOR, student_id_code=student_code, body="Yes, Friday is fine.")
        self.assertEqual(reply.status_code, 200, reply.text)
        # Filed under her portal address, so it lands in the same conversation.
        self.assertEqual(reply.json()["tutor_email"], IVONETH)
        self.assertEqual(reply.json()["tutor_name"], "Ivoneth Frias")

        thread = self._messages(STUDENT)
        self.assertEqual([m["sender_role"] for m in thread], ["student", "tutor"])
        self.assertEqual(len(self._messages(DEVELOPER)), 2)

        ids = [m["id"] for m in thread]
        marked = self.client.post("/api/messages/read", headers=self._headers(STUDENT), json={"message_ids": ids})
        self.assertEqual(marked.json(), {"updated": 1})  # only the tutor's reply
        read = {m["sender_role"]: m["read_at"] for m in self._messages(STUDENT)}
        self.assertIsNotNone(read["tutor"])
        self.assertIsNone(read["student"])

    def test_rejects_unknown_recipients_and_developers(self):
        self.assertEqual(self._send(STUDENT, tutor_email="someone@example.com", body="Hi").status_code, 400)
        self.assertEqual(self._send(TUTOR, student_id_code="NOPE-1", body="Hi").status_code, 404)
        self.assertEqual(self._send(DEVELOPER, student_id_code="NOPE-1", body="Hi").status_code, 403)
        self.assertEqual(self._send(STUDENT, tutor_email=IVONETH, body="   ").status_code, 400)

    def test_only_staff_list_students_to_message(self):
        self.assertEqual(self.client.get("/api/messages/students", headers=self._headers(STUDENT)).status_code, 403)
        students = self.client.get("/api/messages/students", headers=self._headers(TUTOR)).json()
        self.assertTrue(any(s["student_id_code"] for s in students))
