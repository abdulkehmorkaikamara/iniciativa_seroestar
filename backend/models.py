from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="student") # admin, teacher, student
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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
