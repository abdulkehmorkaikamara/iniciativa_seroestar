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

class LiveSessionResponse(BaseModel):
    id: int
    title: str
    course_level: str
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

class LessonNoteResponse(LessonNoteCreate):
    id: int
    created_at: datetime
    file_size: str

    class Config:
        from_attributes = True

class BlogPostCreate(BaseModel):
    title: str
    category: str
    excerpt: str
    content_markdown: str
    featured_image_url: Optional[str] = None

class BlogPostResponse(BlogPostCreate):
    id: int
    published: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ChatbotQuery(BaseModel):
    message: str
