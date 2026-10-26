"""The admin's student list: edit details, move groups, deactivate and reactivate."""

from backend.tests.test_live_sessions import DEVELOPER, STUDENT, TUTOR, _LiveSessionTestCase


class AdminStudentTests(_LiveSessionTestCase):
    def _students(self):
        response = self.client.get("/api/admin/students", headers=self._headers(DEVELOPER))
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _demo_code(self):
        return next(s["student_id_code"] for s in self._students() if s["email"] == STUDENT[0])

    def _update(self, code, body, credentials=DEVELOPER):
        return self.client.put(f"/api/admin/students/{code}", headers=self._headers(credentials), json=body)

    def test_list_shows_details_and_active_flag(self):
        demo = next(s for s in self._students() if s["email"] == STUDENT[0])
        self.assertTrue(demo["active"])
        self.assertTrue(demo["registration_date"])

    def test_move_student_to_another_group(self):
        code = self._demo_code()
        updated = self._update(code, {"class_group": "Group 3", "full_name": "Demo Student Renamed"})
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual((updated.json()["class_group"], updated.json()["full_name"]), ("Group 3", "Demo Student Renamed"))
        roster = self.client.get("/api/tutor/group-attendance?course_level=A1&class_group=Group%203", headers=self._headers(TUTOR))
        self.assertIn(code, [s["student_id_code"] for s in roster.json()["students"]])

    def test_deactivated_student_cannot_sign_in_or_use_the_portal(self):
        code = self._demo_code()
        headers = self._headers(STUDENT)
        self.assertEqual(self._update(code, {"active": False}).json()["status"], "Inactive")
        self.assertEqual(self.client.post("/api/login", json={"username": STUDENT[0], "password": STUDENT[1]}).status_code, 403)
        self.assertEqual(self.client.get("/api/my-notes", headers=headers).status_code, 403)
        roster = self.client.get("/api/tutor/group-attendance?course_level=A1&class_group=Group%201", headers=self._headers(TUTOR)).json()
        self.assertNotIn(code, [s["student_id_code"] for s in roster["students"]])

        self.assertTrue(self._update(code, {"active": True}).json()["active"])
        self.assertEqual(self.client.post("/api/login", json={"username": STUDENT[0], "password": STUDENT[1]}).status_code, 200)

    def test_only_the_admin_edits_students(self):
        code = self._demo_code()
        self.assertEqual(self._update(code, {"active": False}, credentials=TUTOR).status_code, 403)
        self.assertEqual(self._update(code, {"course_level": "C2"}).status_code, 422)
        self.assertEqual(self._update("NOPE-000", {"active": False}).status_code, 404)
