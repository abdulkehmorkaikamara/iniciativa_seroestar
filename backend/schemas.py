from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: EmailStr
    password: str = Field(min_length=8, max_length=72)

class PasswordForgotRequest(BaseModel):
    email: EmailStr

class PasswordResetRequest(BaseModel):
    token: str = Field(min_length=20, max_length=2048)
    new_password: str = Field(min_length=12, max_length=72)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str
    email: EmailStr

    class Config:
        from_attributes = True

class StudentRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    phone_number: Optional[str] = Field(default=None, max_length=40)
    course_level: str = Field(default="A1", pattern="^(A1|A2|B1)$")
    class_group: str = Field(default="Morning", max_length=80)
    learning_mode: str = Field(default="Online", max_length=80)

class AdminStudentCreate(StudentRegister):
    status: str = "Active"

class TeacherCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    assigned_levels: List[str] = ["A1", "A2"]
    teacher_id_code: Optional[str] = None

class TeacherResponse(BaseModel):
    id: int
    teacher_id_code: str
    assigned_levels: List[str]
    user: UserResponse

    class Config:
        from_attributes = True

class StudentResponse(BaseModel):
    id: int
    student_id_code: str
    phone_number: Optional[str]
    course_level: str
    class_group: str
    learning_mode: str
    status: str
    registration_date: datetime
    user: UserResponse

    class Config:
        from_attributes = True

class AttendanceJoinRequest(BaseModel):
    student_id_code: str
    session_id: int

class GoogleAccountProvisionRequest(BaseModel):
    student_id_codes: Optional[List[str]] = None
    # Codes that already failed in this run, so later batches move on.
    exclude_student_id_codes: Optional[List[str]] = None
    limit: int = 15

class LiveSessionMeetingLinkUpdate(BaseModel):
    meeting_link: str

class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    text: str = Field(min_length=1, max_length=5000)
    course_level: str
    class_group: Optional[str] = None
    alert_type: str = "info"

class AnnouncementResponse(BaseModel):
    id: int
    title: str
    text: str
    course_level: str
    class_group: Optional[str] = None
    alert_type: str
    created_by: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PortalMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    subject: Optional[str] = Field(default=None, max_length=255)
    tutor_email: Optional[str] = None  # set by students
    student_id_code: Optional[str] = None  # set by tutors

class PortalMessageResponse(BaseModel):
    id: int
    student_id_code: str
    student_name: str
    course_level: str
    class_group: Optional[str] = None
    tutor_email: str
    tutor_name: str
    sender_role: str
    subject: Optional[str] = None
    body: str
    created_at: Optional[datetime] = None
    read_at: Optional[datetime] = None

class PortalMessageReadRequest(BaseModel):
    message_ids: List[int] = Field(max_length=500)

class AssessmentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    course_level: str = Field(min_length=2, max_length=50)
    class_group: str = Field(min_length=1, max_length=50)
    max_score: float = Field(default=100, gt=0, le=1000)
    assessed_on: Optional[str] = Field(default=None, max_length=20)

class AssessmentScoreUpdate(BaseModel):
    student_id_code: str = Field(min_length=1, max_length=50)
    score: Optional[float] = None  # None clears the mark
    remarks: Optional[str] = Field(default=None, max_length=2000)

class HomeworkCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    instructions: Optional[str] = Field(default=None, max_length=5000)
    course_level: str = Field(min_length=2, max_length=50)
    class_group: str = Field(min_length=1, max_length=50)
    due_date: Optional[str] = Field(default=None, max_length=20)
    max_score: float = Field(default=100, gt=0, le=1000)

class ReviewCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    location: Optional[str] = Field(default=None, max_length=100)
    rating: int = Field(ge=1, le=5)
    text: str = Field(min_length=1, max_length=1500)
    website: Optional[str] = None  # honeypot: people leave it empty, spam bots fill it in

class ReviewStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|approved|rejected)$")

class StudentNoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=20000)
    created_on: Optional[str] = Field(default=None, max_length=20)  # YYYY-MM-DD, for notes moved from the browser

class AnnouncementStateUpdate(BaseModel):
    read: Optional[bool] = None
    hidden: Optional[bool] = None

class ManualAttendanceUpdate(BaseModel):
    session_id: int
    student_id_code: str
    status: Optional[str] = None  # Present, Late, Absent; empty clears the mark

class LiveSessionJoinRequest(BaseModel):
    student_id_code: str

class AttendanceRecordResponse(BaseModel):
    id: int
    student_name: str
    student_code: str
    course_level: str
    session_id: int
    join_time: Optional[datetime]
    leave_time: Optional[datetime]
    total_minutes: int
    status: str

    class Config:
        from_attributes = True

class LiveSessionCreate(BaseModel):
    title: str
    course_level: str
    teacher_name: str
    date_time: str
    meeting_link: Optional[str] = None
    class_group: Optional[str] = None
    # Record a class that already took place (for back-filling attendance).
    completed: bool = False

class LiveSessionResponse(BaseModel):
    id: int
    title: str
    course_level: str
    class_group: Optional[str] = None
    teacher_name: str
    date_time: str
    meeting_link: Optional[str]
    status: str
    provider: Optional[str] = None
    room_name: Optional[str] = None
    room_url: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChatMessageCreate(BaseModel):
    session_id: int
    sender_name: str
    sender_role: str
    message: str

class ChatMessagePost(BaseModel):
    message: str

class ChatMessageResponse(ChatMessageCreate):
    id: int
    time_sent: datetime

    class Config:
        from_attributes = True

class LiveRoomProvisionResponse(BaseModel):
    id: int
    title: str
    room_name: str
    room_url: str
    join_token: str
    status: str
    provider: str = "daily"

    class Config:
        from_attributes = True

class RecordingCreate(BaseModel):
    title: str
    teacher_name: str
    course_level: str
    date_recorded: Optional[str] = None
    video_url: str
    duration: str = "45 mins"
    description: Optional[str] = None
    session_id: Optional[int] = None
    class_group: Optional[str] = None

class RecordingResponse(RecordingCreate):
    id: int

    class Config:
        from_attributes = True

class CourseLessonBase(BaseModel):
    title: str
    description: Optional[str] = None
    lesson_type: str = "video"
    video_url: Optional[str] = None
    pdf_url: Optional[str] = None
    quiz_url: Optional[str] = None
    duration_minutes: int = 15
    order_index: int = 1

class CourseLessonCreate(CourseLessonBase):
    pass

class CourseModuleCreate(BaseModel):
    title: str
    order_index: int = 1
    lessons: List[CourseLessonCreate] = []

class CourseLessonResponse(CourseLessonBase):
    id: int
    module_id: int

    class Config:
        from_attributes = True

class CourseModuleResponse(BaseModel):
    id: int
    title: str
    order_index: int
    lessons: List[CourseLessonResponse] = []

    class Config:
        from_attributes = True

class CourseCreate(BaseModel):
    title: str
    slug: str
    description: Optional[str] = None
    level: str = "A1"
    category: str = "Grammar"
    duration_weeks: int = 4
    cover_image_url: Optional[str] = None
    published: bool = True
    modules: List[CourseModuleCreate] = []

class CourseResponse(CourseCreate):
    id: int
    modules: List[CourseModuleResponse] = []

    class Config:
        from_attributes = True

class EnrollmentRequest(BaseModel):
    student_id_code: str

class EnrollmentResponse(BaseModel):
    id: int
    course_id: int
    student_id_code: str
    status: str

    class Config:
        from_attributes = True

class LessonProgressUpdate(BaseModel):
    completed: bool = False
    percent_watched: int = 0
    last_position_seconds: int = 0

class LessonNoteCreate(BaseModel):
    title: str
    course_level: str
    file_url: str
    file_type: str
    shared_with_students: bool = True
    created_by: str
    class_group: Optional[str] = None

class LessonNoteResponse(LessonNoteCreate):
    id: int
    created_at: datetime
    file_size: str

    class Config:
        from_attributes = True

class BlogPostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    excerpt: str = Field(min_length=1, max_length=1000)
    content_markdown: str = Field(min_length=1, max_length=50000)
    featured_image_url: Optional[str] = Field(default=None, max_length=255)

class BlogPostResponse(BlogPostCreate):
    id: int
    published: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ChatbotFAQUpsert(BaseModel):
    question: str = Field(min_length=1, max_length=255)
    answer: str = Field(min_length=1, max_length=2000)
    language: str = Field(pattern="^(en|es)$")
    keywords: Optional[str] = Field(default=None, max_length=500)

class ChatbotQuery(BaseModel):
    message: str
