"""Homework: tutors set it per school, students hand in files, tutors grade them."""

from backend.tests.test_live_sessions import DEVELOPER, STUDENT, TUTOR, _LiveSessionTestCase


class HomeworkTests(_LiveSessionTestCase):
    def _create(self, credentials=TUTOR, **overrides):
        body = {"title": "Describe your family", "instructions": "Write 5 sentences.", "course_level": "A1", "class_group": "Group 1", "due_date": "2030-01-15", "max_score": 10}
        body.update(overrides)
        return self.client.post("/api/homework", headers=self._headers(credentials), json=body)

    def _submit(self, homework_id, name="familia.pdf", content=b"%PDF-1.4 homework", note=None, credentials=STUDENT):
        data = {"note": note} if note is not None else {}
        return self.client.post(
            f"/api/homework/{homework_id}/submit",
            headers=self._headers(credentials),
            files={"file": (name, content, "application/pdf")},
            data=data,
        )

    def _mine(self):
        response = self.client.get("/api/homework/me", headers=self._headers(STUDENT))
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _tutor_view(self, credentials=TUTOR, class_group="Group 1"):
        response = self.client.get(f"/api/tutor/homework?course_level=A1&class_group={class_group}", headers=self._headers(credentials))
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_full_homework_flow(self):
        created = self._create()
        self.assertEqual(created.status_code, 200, created.text)
        homework = created.json()
        self.assertEqual(homework["max_score"], 10)

        # It shows up for the student, not handed in yet.
        mine = self._mine()
        self.assertEqual([(h["title"], h["submission"]) for h in mine], [("Describe your family", None)])

        submitted = self._submit(homework["id"], note="  Here it is  ")
        self.assertEqual(submitted.status_code, 200, submitted.text)
        self.assertEqual(submitted.json()["file_name"], "familia.pdf")
        self.assertEqual(submitted.json()["note"], "Here it is")
        self.assertFalse(submitted.json()["late"])

        # The tutor sees the submission and the file is downloadable.
        view = self._tutor_view()
        subs = view["homework"][0]["submissions"]
        self.assertEqual(len(subs), 1)
        self.assertEqual(self.client.get(subs[0]["file_url"]).content, b"%PDF-1.4 homework")

        # Grading goes through the homework's gradebook column.
        code = subs[0]["student_id_code"]
        graded = self.client.put(
            f"/api/assessments/{homework['assessment_id']}/scores",
            headers=self._headers(TUTOR),
            json={"student_id_code": code, "score": 8, "remarks": "Bien hecho"},
        )
        self.assertEqual(graded.status_code, 200, graded.text)
        self.assertEqual((self._mine()[0]["score"], self._mine()[0]["remarks"]), (8, "Bien hecho"))
        self.assertEqual(self._tutor_view()["homework"][0]["submissions"][0]["score"], 8)
        grades = self.client.get("/api/grades/me", headers=self._headers(STUDENT)).json()
        self.assertEqual([(g["title"], g["score"]) for g in grades], [("Homework: Describe your family", 8)])

    def test_resubmitting_replaces_the_file(self):
        homework_id = self._create().json()["id"]
        self._submit(homework_id, name="first.pdf")
        self._submit(homework_id, name="second.jpg", content=b"jpeg-bytes")
        subs = self._tutor_view()["homework"][0]["submissions"]
        self.assertEqual([s["file_name"] for s in subs], ["second.jpg"])

    def test_late_when_handed_in_after_the_due_date(self):
        homework_id = self._create(due_date="2020-01-01").json()["id"]
        self.assertTrue(self._submit(homework_id).json()["late"])

    def test_students_only_see_and_submit_their_own_schools_homework(self):
        other = self._create(class_group="Group 2").json()["id"]
        self.assertEqual(self._mine(), [])
        self.assertEqual(self._submit(other).status_code, 404)

    def test_rejects_bad_files(self):
        homework_id = self._create().json()["id"]
        self.assertEqual(self._submit(homework_id, name="virus.exe").status_code, 400)
        self.assertEqual(self._submit(homework_id, content=b"").status_code, 400)

    def test_only_students_submit_and_only_staff_set_homework(self):
        homework_id = self._create().json()["id"]
        self.assertEqual(self._submit(homework_id, credentials=TUTOR).status_code, 403)
        self.assertEqual(self._create(credentials=STUDENT).status_code, 403)
        self.assertEqual(self._create(due_date="next week").status_code, 400)

    def test_tutors_manage_only_their_own_homework(self):
        dev_homework = self._create(credentials=DEVELOPER).json()["id"]
        self.assertEqual(self._tutor_view()["homework"], [])
        self.assertEqual(self.client.delete(f"/api/homework/{dev_homework}", headers=self._headers(TUTOR)).status_code, 403)
        self.assertEqual(len(self._tutor_view(DEVELOPER)["homework"]), 1)

    def test_deleting_homework_removes_its_gradebook_column(self):
        homework = self._create().json()
        self._submit(homework["id"])
        self.assertEqual(self.client.delete(f"/api/homework/{homework['id']}", headers=self._headers(TUTOR)).status_code, 200)
        self.assertEqual(self._mine(), [])
        self.assertEqual(self.client.get("/api/grades/me", headers=self._headers(STUDENT)).json(), [])

    def test_deleting_the_gradebook_column_keeps_the_homework(self):
        homework = self._create().json()
        self.client.delete(f"/api/assessments/{homework['assessment_id']}", headers=self._headers(TUTOR))
        mine = self._mine()
        self.assertEqual(len(mine), 1)
        self.assertIsNone(mine[0]["assessment_id"])
