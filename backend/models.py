from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
from .roles import STUDENT

class User(Base):
    """A persisted account. This table is the only source of truth for logins."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)  # bcrypt digest, never plaintext
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=STUDENT, index=True) # developer, tutor, student
    is_active = Column(Boolean, nullable=False, default=True, server_default="1")
    is_seeded = Column(Boolean, nullable=False, default=False, server_default="0")
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    password_changed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    teacher_profile = relationship("TeacherProfile", back_populates="user", uselist=False)

class StudentProfile(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    student_id_code = Column(String(50), unique=True, nullable=False) # e.g. SER001
    phone_number = Column(String(50), nullable=True)
    course_level = Column(String(50), default="A1") # A1, A2, B1
    class_group = Column(String(50), default="Morning") # Morning, Evening, Weekend
    learning_mode = Column(String(50), default="Online") # Online, In-person, Hybrid
    status = Column(String(50), default="Active") # Active, Inactive, Completed
    registration_date = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="student_profile")
    attendance = relationship("AttendanceRecord", back_populates="student")
    enrollments = relationship("CourseEnrollment", back_populates="student")
    lesson_progress = relationship("LessonProgress", back_populates="student")

class TeacherProfile(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    teacher_id_code = Column(String(50), unique=True, nullable=False) # e.g. ESTAR101
    assigned_levels = Column(String(255), default="A1,A2") # CSV string e.g. "A1,A2"

    user = relationship("User", back_populates="teacher_profile")
    live_sessions = relationship("LiveClassSession", back_populates="teacher_profile")

class LiveClassSession(Base):
    __tablename__ = "live_class_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    course_level = Column(String(50), nullable=False) # A1, A2, B1
    teacher_name = Column(String(255), nullable=False)
    class_group = Column(String(50), nullable=True) # "Group 1"... NULL = every group at the level
    date_time = Column(String(100), nullable=False)
    meeting_link = Column(String(255), nullable=True)
    status = Column(String(50), default="Scheduled") # Scheduled, Live, Completed
    provider = Column(String(50), default="daily")
    room_name = Column(String(255), nullable=True)
    room_url = Column(String(500), nullable=True)
    join_token = Column(Text, nullable=True)
    recording_url = Column(String(500), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    teacher_profile_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)

    teacher_profile = relationship("TeacherProfile", back_populates="live_sessions")
    attendance_records = relationship("AttendanceRecord", back_populates="session")
    chat_messages = relationship("ChatMessage", back_populates="session")
    recordings = relationship("RecordedClass", back_populates="session")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    student_name = Column(String(255), nullable=False)
    student_code = Column(String(50), nullable=False)
    course_level = Column(String(50), nullable=False)
    session_id = Column(Integer, ForeignKey("live_class_sessions.id"))
    join_time = Column(DateTime(timezone=True), nullable=True)
    leave_time = Column(DateTime(timezone=True), nullable=True)
    total_minutes = Column(Integer, default=0)
    status = Column(String(50), default="Absent") # Present, Late, Absent

    student = relationship("StudentProfile", back_populates="attendance")
    session = relationship("LiveClassSession", back_populates="attendance_records")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("live_class_sessions.id"))
    sender_name = Column(String(255), nullable=False)
    sender_role = Column(String(50), nullable=False) # student, teacher, admin
    message = Column(Text, nullable=False)
    time_sent = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("LiveClassSession", back_populates="chat_messages")

class LessonNote(Base):
    __tablename__ = "lesson_notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    course_level = Column(String(50), nullable=False) # A1, A2, B1, All
    class_group = Column(String(50), nullable=True) # NULL = every group at the level
    file_url = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False) # PDF, DOCX, PNG
    shared_with_students = Column(Boolean, default=True)
    created_by = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    file_size = Column(String(50), default="1.2 MB")

class RecordedClass(Base):
    __tablename__ = "recorded_classes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    teacher_name = Column(String(255), nullable=False)
    course_level = Column(String(50), nullable=False) # A1, A2, B1
    class_group = Column(String(50), nullable=True) # NULL = every group at the level
    date_recorded = Column(String(100), nullable=False)
    video_url = Column(String(500), nullable=False)
    duration = Column(String(50), nullable=False) # e.g. "55 mins"
    description = Column(Text, nullable=True)
    session_id = Column(Integer, ForeignKey("live_class_sessions.id"), nullable=True)

    session = relationship("LiveClassSession", back_populates="recordings")

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    level = Column(String(50), nullable=False)
    category = Column(String(100), nullable=False)
    duration_weeks = Column(Integer, default=4)
    cover_image_url = Column(String(500), nullable=True)
    published = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    modules = relationship("CourseModule", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("CourseEnrollment", back_populates="course")

class CourseModule(Base):
    __tablename__ = "course_modules"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(255), nullable=False)
    order_index = Column(Integer, default=1)

    course = relationship("Course", back_populates="modules")
    lessons = relationship("CourseLesson", back_populates="module", cascade="all, delete-orphan")

class CourseLesson(Base):
    __tablename__ = "course_lessons"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("course_modules.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    lesson_type = Column(String(50), default="video")
    video_url = Column(String(500), nullable=True)
    pdf_url = Column(String(500), nullable=True)
    quiz_url = Column(String(500), nullable=True)
    duration_minutes = Column(Integer, default=15)
    order_index = Column(Integer, default=1)

    module = relationship("CourseModule", back_populates="lessons")
    progress = relationship("LessonProgress", back_populates="lesson")

class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    status = Column(String(50), default="active")
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("StudentProfile", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("course_lessons.id"), nullable=False)
    completed = Column(Boolean, default=False)
    percent_watched = Column(Integer, default=0)
    last_position_seconds = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("StudentProfile", back_populates="lesson_progress")
    lesson = relationship("CourseLesson", back_populates="progress")

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    text = Column(Text, nullable=False)
    course_level = Column(String(50), nullable=False) # A1, A2, B1
    class_group = Column(String(50), nullable=True) # NULL = every group at the level
    alert_type = Column(String(50), default="info")
    created_by = Column(String(255), nullable=False) # tutor's display name
    created_by_email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PortalMessage(Base):
    """A message between a student and a tutor, shown inside both portals."""

    __tablename__ = "portal_messages"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    tutor_email = Column(String(255), nullable=False, index=True) # the tutor's address in TUTOR_PROFILES
    tutor_name = Column(String(255), nullable=False)
    sender_role = Column(String(50), nullable=False) # student, tutor
    subject = Column(String(255), nullable=True)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True) # when the recipient opened it

    student = relationship("StudentProfile")

class Assessment(Base):
    """A graded piece of work (quiz, test, homework) for one school's group."""

    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    course_level = Column(String(50), nullable=False) # A1, A2, B1
    class_group = Column(String(50), nullable=False) # "Group N", the school's group
    max_score = Column(Float, nullable=False, default=100)
    assessed_on = Column(String(20), nullable=True) # YYYY-MM-DD
    created_by = Column(String(255), nullable=False) # tutor's display name
    created_by_email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    scores = relationship("AssessmentScore", back_populates="assessment", cascade="all, delete-orphan")

class AssessmentScore(Base):
    """One student's mark on an assessment. No row means not graded yet."""

    __tablename__ = "assessment_scores"
    __table_args__ = (UniqueConstraint("assessment_id", "student_id", name="uq_assessment_scores_assessment_student"),)

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    remarks = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    assessment = relationship("Assessment", back_populates="scores")
    student = relationship("StudentProfile")

class Homework(Base):
    """Homework a tutor sets for one school's group; graded in the gradebook."""

    __tablename__ = "homework"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    instructions = Column(Text, nullable=True)
    course_level = Column(String(50), nullable=False) # A1, A2, B1
    class_group = Column(String(50), nullable=False) # "Group N", the school's group
    due_date = Column(String(20), nullable=True) # YYYY-MM-DD
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="SET NULL"), nullable=True) # its gradebook column
    created_by = Column(String(255), nullable=False) # tutor's display name
    created_by_email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assessment = relationship("Assessment")
    submissions = relationship("HomeworkSubmission", back_populates="homework", cascade="all, delete-orphan")

class HomeworkSubmission(Base):
    """A student's handed-in file for a homework; resubmitting replaces it."""

    __tablename__ = "homework_submissions"
    __table_args__ = (UniqueConstraint("homework_id", "student_id", name="uq_homework_submissions_homework_student"),)

    id = Column(Integer, primary_key=True, index=True)
    homework_id = Column(Integer, ForeignKey("homework.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    file_url = Column(String(1024), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(String(50), nullable=True)
    note = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=False)

    homework = relationship("Homework", back_populates="submissions")
    student = relationship("StudentProfile")

class Review(Base):
    """A public review left on the website; shown only once an admin approves it."""

    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(100), nullable=True) # profession / city, as typed
    rating = Column(Integer, nullable=False) # 1-5
    text = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending", index=True) # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(String(255), nullable=True)

class StudentNote(Base):
    """A student's private note in their portal."""

    __tablename__ = "student_notes"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class StudentFile(Base):
    """A file a student keeps in their portal's personal locker."""

    __tablename__ = "student_files"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(1024), nullable=False)
    file_size = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AnnouncementState(Base):
    """Whether a student has read, or removed from their portal, an announcement."""

    __tablename__ = "announcement_states"
    __table_args__ = (UniqueConstraint("student_id", "announcement_id", name="uq_announcement_states_student_announcement"),)

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    hidden = Column(Boolean, nullable=False, default=False, server_default="0")

class BlogPost(Base):
    __tablename__ = "blog_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    excerpt = Column(Text, nullable=False)
    content_markdown = Column(Text, nullable=False)
    featured_image_url = Column(String(255), nullable=True)
    published = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ImageUpload(Base):
    __tablename__ = "image_uploads"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False) # hero, about, course, blog, testimonial, gallery, teacher
    path = Column(String(255), nullable=False)
    alt_text = Column(String(255), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class ChatbotFAQ(Base):
    __tablename__ = "chatbot_faqs"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String(255), nullable=False)
    answer = Column(Text, nullable=False)
    language = Column(String(10), default="en") # en, es
