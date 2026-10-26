"""Students are emailed when their tutor posts an announcement or sets homework."""

import os
from unittest import mock

from backend.tests.test_live_sessions import DEVELOPER, STUDENT, TUTOR, _LiveSessionTestCase

SMTP = {"SMTP_HOST": "smtp.example.com", "SMTP_USER": "school@example.com", "SMTP_PASS": "x", "SMTP_FROM_EMAIL": ""}


class PostNotificationTests(_LiveSessionTestCase):
    def _announce(self, **overrides):
        body = {"title": "No class Friday", "text": "Holiday!", "course_level": "A1", "class_group": "Group 1"}
        body.update(overrides)
        return self.client.post("/api/announcements", headers=self._headers(TUTOR), json=body)

    def _homework(self, **overrides):
        body = {"title": "Ser vs Estar worksheet", "instructions": "Do page 4.", "course_level": "A1", "class_group": "Group 1", "due_date": "2026-11-05"}
        body.update(overrides)
        return self.client.post("/api/homework", headers=self._headers(TUTOR), json=body)

    def test_announcement_emails_the_groups_students_in_bcc(self):
        with mock.patch.dict(os.environ, SMTP), mock.patch("backend.main._send_email", return_value=True) as send:
            response = self._announce()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["emailed"], 1)
        recipient, subject, text_body, _html = send.call_args.args
        self.assertEqual(recipient, "school@example.com")
        self.assertEqual(send.call_args.kwargs["bcc"], [STUDENT[0]])
        self.assertIn("No class Friday", subject)
        self.assertIn("Holiday!", text_body)

    def test_other_groups_and_inactive_students_are_not_emailed(self):
        with mock.patch.dict(os.environ, SMTP), mock.patch("backend.main._send_email", return_value=True) as send:
            self.assertEqual(self._announce(class_group="Group 2").json()["emailed"], 0)
            send.assert_not_called()

            code = next(s["student_id_code"] for s in self.client.get("/api/admin/students", headers=self._headers(DEVELOPER)).json() if s["email"] == STUDENT[0])
            self.client.put(f"/api/admin/students/{code}", headers=self._headers(DEVELOPER), json={"active": False})
            self.assertEqual(self._announce().json()["emailed"], 0)
            send.assert_not_called()

    def test_homework_emails_the_group_with_the_due_date(self):
        with mock.patch.dict(os.environ, SMTP), mock.patch("backend.main._send_email", return_value=True) as send:
            response = self._homework()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["emailed"], 1)
        _recipient, subject, text_body, _html = send.call_args.args
        self.assertIn("Ser vs Estar worksheet", subject)
        self.assertIn("05 November 2026", text_body)
        self.assertIn("Do page 4.", text_body)

    def test_tutor_can_post_without_emailing(self):
        with mock.patch.dict(os.environ, SMTP), mock.patch("backend.main._send_email", return_value=True) as send:
            self.assertIsNone(self._announce(notify_students=False).json()["emailed"])
            self.assertNotIn("emailed", self._homework(notify_students=False).json())
            send.assert_not_called()

    def test_failed_email_does_not_stop_the_post(self):
        with mock.patch.dict(os.environ, SMTP), mock.patch("backend.main._send_email", side_effect=OSError("down")):
            response = self._announce()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["emailed"], 0)
