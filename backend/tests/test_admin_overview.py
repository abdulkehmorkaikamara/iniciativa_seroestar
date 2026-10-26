"""The admin overview: active students, new sign-ups and attendance per group."""

from backend.tests.test_live_sessions import DEVELOPER, STUDENT, TUTOR, _LiveSessionTestCase


class AdminOverviewTests(_LiveSessionTestCase):
    def _overview(self):
        response = self.client.get("/api/admin/overview", headers=self._headers(DEVELOPER))
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _add_attendance(self, statuses):
        from backend.database import SessionLocal
        models = self.module.models
        with SessionLocal() as db:
            student = db.query(models.StudentProfile).join(models.User).filter(models.User.email == STUDENT[0]).one()
            for status in statuses:
                db.add(models.AttendanceRecord(
                    student_id=student.id, student_name="Demo", student_code=student.student_id_code,
                    course_level=student.course_level, status=status,
                ))
            db.commit()
            return student.student_id_code

    def test_counts_students_by_group_and_this_month(self):
        body = self._overview()
        self.assertGreaterEqual(body["totals"]["active_students"], 1)
        self.assertGreaterEqual(body["totals"]["new_this_month"], 1)
        self.assertEqual(sum(g["active_students"] for g in body["groups"]), body["totals"]["active_students"])
        self.assertIsNone(body["totals"]["attendance_rate"])

    def test_attendance_rate_counts_present_and_late(self):
        self._add_attendance(["Present", "Late", "Absent", "Absent"])
        body = self._overview()
        self.assertEqual(body["totals"]["attendance_rate"], 50)
        group = next(g for g in body["groups"] if g["recorded"])
        self.assertEqual((group["attended"], group["recorded"], group["attendance_rate"]), (2, 4, 50))

    def test_inactive_students_are_left_out(self):
        code = self._add_attendance(["Present"])
        before = self._overview()["totals"]
        self.client.put(f"/api/admin/students/{code}", headers=self._headers(DEVELOPER), json={"active": False})
        after = self._overview()["totals"]
        self.assertEqual(after["active_students"], before["active_students"] - 1)
        self.assertEqual(after["inactive_students"], before["inactive_students"] + 1)
        self.assertIsNone(after["attendance_rate"])

    def test_only_the_admin(self):
        self.assertEqual(self.client.get("/api/admin/overview", headers=self._headers(TUTOR)).status_code, 403)
