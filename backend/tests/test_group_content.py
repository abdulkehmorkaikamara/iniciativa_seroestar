"""Per-school publishing, deleting published content and hand-marked attendance."""

from datetime import datetime, timedelta, timezone

from backend.tests.test_live_sessions import DEVELOPER, STUDENT, TUTOR, _LiveSessionTestCase


class GroupContentTests(_LiveSessionTestCase):
    def _create(self, credentials=TUTOR, **overrides):
        body = {
            "title": "Ser vs Estar",
            "course_level": "A1",
            "teacher_name": "Demo Tutor",
            "date_time": "2026-10-02 14:00",
        }
        body.update(overrides)
        return self.client.post("/api/live-sessions", headers=self._headers(credentials), json=body)

    def _student_code(self):
        return self.client.get("/api/me", headers=self._headers(STUDENT)).json()["student_id_code"]

    def test_class_keeps_its_school_group(self):
        created = self._create(class_group="Group 2").json()
        self.assertEqual(created["class_group"], "Group 2")

    def test_student_cannot_join_another_schools_class(self):
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        other = self._create(class_group="Group 2", date_time=now).json()
        own = self._create(class_group="Group 1", date_time=now).json()
        code = self._student_code()
        headers = self._headers(STUDENT)
        self.assertEqual(self.client.post(f"/api/live-sessions/{other['id']}/join", headers=headers, json={"student_id_code": code}).status_code, 403)
        self.assertEqual(self.client.post(f"/api/live-sessions/{own['id']}/join", headers=headers, json={"student_id_code": code}).status_code, 200)

    def test_past_class_is_recorded_as_completed(self):
        past = (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%d %H:%M")
        created = self._create(date_time=past, completed=True).json()
        self.assertEqual(created["status"], "Completed")
        future = (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%Y-%m-%d %H:%M")
        self.assertEqual(self._create(date_time=future, completed=True).status_code, 400)

    def test_only_the_owner_can_delete_a_class(self):
        session_id = self._create(credentials=DEVELOPER, teacher_name="Xiomara Villamizar").json()["id"]
        self.assertEqual(self.client.delete(f"/api/live-sessions/{session_id}", headers=self._headers(TUTOR)).status_code, 403)
        own_id = self._create().json()["id"]
        self.assertEqual(self.client.delete(f"/api/live-sessions/{own_id}", headers=self._headers(TUTOR)).status_code, 200)
        ids = [s["id"] for s in self.client.get("/api/live-sessions", headers=self._headers(TUTOR)).json()]
        self.assertNotIn(own_id, ids)

    def test_tutor_deletes_own_recording_only(self):
        headers = self._headers(TUTOR)
        own = self.client.post("/api/recordings/webhook", headers=headers, json={
            "title": "Clase 1", "teacher_name": "Demo Tutor", "course_level": "A1", "video_url": "https://example.com/v.mp4", "class_group": "Group 1",
        }).json()
        self.assertEqual(own["class_group"], "Group 1")
        other = self.client.post("/api/recordings/webhook", headers=self._headers(DEVELOPER), json={
            "title": "Clase X", "teacher_name": "Xiomara Villamizar", "course_level": "A1", "video_url": "https://example.com/x.mp4",
        }).json()
        self.assertEqual(self.client.delete(f"/api/recordings/{other['id']}", headers=headers).status_code, 403)
        self.assertEqual(self.client.delete(f"/api/recordings/{own['id']}", headers=headers).status_code, 200)

    def test_tutor_shares_note_with_one_school_and_deletes_it(self):
        headers = self._headers(TUTOR)
        note = self.client.post(
            "/api/lesson-notes",
            headers=headers,
            data={"title": "Verbos", "course_level": "A1", "created_by": "Demo Tutor", "class_group": "Group 3"},
            files={"file": ("verbos.pdf", b"%PDF-1.4", "application/pdf")},
        ).json()
        self.assertEqual(note["class_group"], "Group 3")
        self.assertEqual(self.client.delete(f"/api/lesson-notes/{note['id']}", headers=headers).status_code, 200)

    def test_tutor_marks_attendance_for_a_past_class(self):
        past = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d %H:%M")
        session_id = self._create(date_time=past, completed=True, class_group="Group 1").json()["id"]
        code = self._student_code()
        headers = self._headers(TUTOR)

        mark = lambda status: self.client.put("/api/attendance/manual", headers=headers, json={
            "session_id": session_id, "student_id_code": code, "status": status,
        })
        self.assertEqual(mark("Present").status_code, 200)
        self.assertEqual(mark("Late").status_code, 200)
        self.assertEqual(mark("Maybe").status_code, 400)

        sheet = self.client.get("/api/tutor/group-attendance?course_level=A1&class_group=Group%201", headers=headers).json()
        self.assertIn(code, [s["student_id_code"] for s in sheet["students"]])
        self.assertEqual(sheet["marks"][str(session_id)][code], "Late")

        summary = self.client.get(f"/api/attendance/summary?student_id_code={code}", headers=self._headers(STUDENT)).json()
        self.assertEqual((summary["present"], summary["late"]), (0, 1))

        self.assertEqual(mark("").status_code, 200)
        sheet = self.client.get("/api/tutor/group-attendance?course_level=A1&class_group=Group%201", headers=headers).json()
        self.assertNotIn(str(session_id), sheet["marks"])

    def test_cannot_mark_a_student_from_another_school(self):
        past = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d %H:%M")
        session_id = self._create(date_time=past, completed=True, class_group="Group 2").json()["id"]
        response = self.client.put("/api/attendance/manual", headers=self._headers(TUTOR), json={
            "session_id": session_id, "student_id_code": self._student_code(), "status": "Present",
        })
        self.assertEqual(response.status_code, 400)


class AnnouncementTests(_LiveSessionTestCase):
    def _announce(self, credentials=TUTOR, **overrides):
        body = {"title": "Sin clase el sábado", "text": "Nos vemos el martes.", "course_level": "A1", "class_group": "Group 1", "alert_type": "important"}
        body.update(overrides)
        return self.client.post("/api/announcements", headers=self._headers(credentials), json=body)

    def test_students_only_receive_their_own_schools_announcements(self):
        self.assertEqual(self._announce().status_code, 200)
        self._announce(title="Choithram only", class_group="Group 2")
        self._announce(title="A2 only", course_level="A2", class_group="Group 1")
        self._announce(title="Every A1 school", class_group=None)
        titles = [a["title"] for a in self.client.get("/api/announcements", headers=self._headers(STUDENT)).json()]
        self.assertEqual(sorted(titles), ["Every A1 school", "Sin clase el sábado"])
        staff_titles = [a["title"] for a in self.client.get("/api/announcements", headers=self._headers(TUTOR)).json()]
        self.assertEqual(len(staff_titles), 4)

    def test_author_is_taken_from_the_account(self):
        created = self._announce().json()
        self.assertEqual(created["created_by"], "Demo Tutor")
        self.assertEqual(created["alert_type"], "important")

    def test_students_cannot_announce_and_only_the_author_can_delete(self):
        self.assertEqual(self._announce(credentials=STUDENT).status_code, 403)
        mine = self._announce().json()
        other = self._announce(credentials=DEVELOPER).json()
        headers = self._headers(TUTOR)
        self.assertEqual(self.client.delete(f"/api/announcements/{other['id']}", headers=headers).status_code, 403)
        self.assertEqual(self.client.delete(f"/api/announcements/{mine['id']}", headers=headers).status_code, 200)
        remaining = [a["id"] for a in self.client.get("/api/announcements", headers=self._headers(STUDENT)).json()]
        self.assertEqual(remaining, [other["id"]])
