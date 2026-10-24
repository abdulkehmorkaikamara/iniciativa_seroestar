"""Tutor-entered grades: assessments per school group and each student's score."""

from backend.tests.test_live_sessions import DEVELOPER, STUDENT, TUTOR, _LiveSessionTestCase


class GradebookTests(_LiveSessionTestCase):
    def _create(self, credentials=TUTOR, **overrides):
        body = {"title": "Quiz 1", "course_level": "A1", "class_group": "Group 1", "max_score": 20, "assessed_on": "2026-10-20"}
        body.update(overrides)
        return self.client.post("/api/assessments", headers=self._headers(credentials), json=body)

    def _score(self, assessment_id, credentials=TUTOR, **body):
        return self.client.put(f"/api/assessments/{assessment_id}/scores", headers=self._headers(credentials), json=body)

    def _gradebook(self, credentials=TUTOR, class_group="Group 1"):
        response = self.client.get(f"/api/tutor/gradebook?course_level=A1&class_group={class_group}", headers=self._headers(credentials))
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _student_code(self):
        return self.client.get("/api/me", headers=self._headers(STUDENT)).json()["student_id_code"]

    def test_tutor_grades_a_student_who_then_sees_it(self):
        created = self._create()
        self.assertEqual(created.status_code, 200, created.text)
        assessment_id = created.json()["id"]
        code = self._student_code()

        # Before grading the student sees the assessment as not graded yet.
        mine = self.client.get("/api/grades/me", headers=self._headers(STUDENT)).json()
        self.assertEqual([(g["title"], g["score"]) for g in mine], [("Quiz 1", None)])

        saved = self._score(assessment_id, student_id_code=code, score=17, remarks="  Great work  ")
        self.assertEqual(saved.status_code, 200, saved.text)

        book = self._gradebook()
        self.assertIn(code, [s["student_id_code"] for s in book["students"]])
        self.assertEqual(book["scores"][str(assessment_id)][code], {"score": 17, "remarks": "Great work"})

        mine = self.client.get("/api/grades/me", headers=self._headers(STUDENT)).json()
        self.assertEqual((mine[0]["score"], mine[0]["max_score"], mine[0]["remarks"]), (17, 20, "Great work"))

        # Clearing the score returns it to not graded.
        self.assertEqual(self._score(assessment_id, student_id_code=code, score=None).status_code, 200)
        self.assertIsNone(self.client.get("/api/grades/me", headers=self._headers(STUDENT)).json()[0]["score"])

    def test_other_schools_assessments_are_hidden_from_the_student(self):
        self._create(title="Other school quiz", class_group="Group 2")
        self.assertEqual(self.client.get("/api/grades/me", headers=self._headers(STUDENT)).json(), [])
        other_id = self._create(class_group="Group 2").json()["id"]
        self.assertEqual(self._score(other_id, student_id_code=self._student_code(), score=5).status_code, 400)

    def test_rejects_scores_out_of_range(self):
        assessment_id = self._create().json()["id"]
        code = self._student_code()
        self.assertEqual(self._score(assessment_id, student_id_code=code, score=21).status_code, 400)
        self.assertEqual(self._score(assessment_id, student_id_code=code, score=-1).status_code, 400)
        self.assertEqual(self._score(assessment_id, student_id_code="NOPE-1", score=5).status_code, 404)

    def test_only_staff_grade_and_only_their_own_assessments(self):
        self.assertEqual(self._create(credentials=STUDENT).status_code, 403)
        dev_assessment = self._create(credentials=DEVELOPER).json()["id"]
        code = self._student_code()
        # A tutor cannot grade or delete another person's assessment, nor see it in their gradebook.
        self.assertEqual(self._score(dev_assessment, student_id_code=code, score=5).status_code, 403)
        self.assertEqual(self.client.delete(f"/api/assessments/{dev_assessment}", headers=self._headers(TUTOR)).status_code, 403)
        self.assertEqual(self._gradebook()["assessments"], [])
        # The developer sees and manages everything.
        own = self._create().json()["id"]
        self.assertEqual({a["id"] for a in self._gradebook(DEVELOPER)["assessments"]}, {dev_assessment, own})
        self.assertEqual(self._score(own, credentials=DEVELOPER, student_id_code=code, score=10).status_code, 200)

    def test_deleting_an_assessment_removes_its_scores(self):
        assessment_id = self._create().json()["id"]
        self._score(assessment_id, student_id_code=self._student_code(), score=12)
        self.assertEqual(self.client.delete(f"/api/assessments/{assessment_id}", headers=self._headers(TUTOR)).status_code, 200)
        self.assertEqual(self.client.get("/api/grades/me", headers=self._headers(STUDENT)).json(), [])

    def test_rejects_bad_input(self):
        self.assertEqual(self._create(course_level="C2").status_code, 400)
        self.assertEqual(self._create(assessed_on="last friday").status_code, 400)
        self.assertEqual(self._create(max_score=0).status_code, 422)
        self.assertEqual(self._create(title="   ").status_code, 400)
