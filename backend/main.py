import json
import os
import random
import re
import hashlib
import html
import smtplib
import ssl
import subprocess
import urllib.request
import urllib.parse
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import List, Dict, Set
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, WebSocket, WebSocketDisconnect, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from . import models, schemas, auth
from .live_utils import build_room_details
from .storage import store_upload
from .tutors import TUTOR_PROFILES, find_tutor_by_email, find_tutor_by_name

# Initialize local schemas automatically; production deployments use Alembic.
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
if ENVIRONMENT != "production" or os.getenv("AUTO_CREATE_TABLES", "false").lower() == "true":
    Base.metadata.create_all(bind=engine)

app = FastAPI(title="Iniciativa SER o ESTAR: Spanish Academy Platform", version="1.0.0")
if ENVIRONMENT != "production":
    os.makedirs("backend/uploads", exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="backend/uploads"), name="uploads")

# Environmental security flags
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS")
if FRONTEND_ORIGINS:
    allow_origins = [o.strip() for o in FRONTEND_ORIGINS.split(",") if o.strip()]
else:
    allow_origins = ["http://localhost:3000"] if ENVIRONMENT != "production" else []
VERCEL_URL = os.getenv("VERCEL_URL", "").strip()
if VERCEL_URL:
    vercel_origin = f"https://{VERCEL_URL}"
    if vercel_origin not in allow_origins:
        allow_origins.append(vercel_origin)

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true" if ENVIRONMENT == "production" else "false").lower() == "true"
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
RECORDING_WEBHOOK_SECRET = os.getenv("RECORDING_WEBHOOK_SECRET", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
PASSWORD_RESET_RESPONSE = "If a student account exists for this email, a password-reset link has been sent."

if ENVIRONMENT == "production":
    missing_settings = [
        name for name, value in {
            "FRONTEND_ORIGINS or VERCEL_URL": FRONTEND_ORIGINS or VERCEL_URL,
            "ADMIN_EMAIL": ADMIN_EMAIL,
            "ADMIN_PASSWORD": ADMIN_PASSWORD,
            "DAILY_API_KEY": os.getenv("DAILY_API_KEY"),
            "BLOB_READ_WRITE_TOKEN": os.getenv("BLOB_READ_WRITE_TOKEN"),
            "RECORDING_WEBHOOK_SECRET": RECORDING_WEBHOOK_SECRET,
        }.items() if not value
    ]
    if missing_settings:
        raise RuntimeError(f"Missing required production settings: {', '.join(missing_settings)}")
    if len(os.getenv("JWT_SECRET", "")) < 48:
        raise RuntimeError("JWT_SECRET must contain at least 48 characters in production.")
    if len(ADMIN_PASSWORD) < 16:
        raise RuntimeError("ADMIN_PASSWORD must contain at least 16 characters in production.")
    if len(RECORDING_WEBHOOK_SECRET) < 32:
        raise RuntimeError("RECORDING_WEBHOOK_SECRET must contain at least 32 characters in production.")
    if "*" in allow_origins:
        raise RuntimeError("Wildcard CORS origins are not allowed in production.")

# Set up CORS rules for React frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _password_reset_app_url(request: Request) -> str:
    configured_url = os.getenv("APP_URL", "").strip().rstrip("/")
    if configured_url:
        return configured_url
    origin = request.headers.get("origin", "").strip().rstrip("/")
    if origin:
        return origin
    if VERCEL_URL:
        return f"https://{VERCEL_URL}"
    return str(request.base_url).rstrip("/")


def _send_password_reset_email(recipient: str, full_name: str, reset_url: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASS", "")
    from_email = os.getenv("SMTP_FROM_EMAIL", "").strip() or smtp_user
    from_name = os.getenv("SMTP_FROM_NAME", "Iniciativa Ser o Estar").strip()
    if not smtp_host or not smtp_user or not smtp_password or not from_email:
        return False

    safe_name = html.escape(full_name or "Student")
    safe_url = html.escape(reset_url, quote=True)
    message = EmailMessage()
    message["Subject"] = "Reset your Iniciativa Ser o Estar password"
    message["From"] = f"{from_name} <{from_email}>"
    message["To"] = recipient
    message.set_content(
        f"Hello {full_name or 'Student'},\n\n"
        "We received a request to reset your Iniciativa Ser o Estar student password.\n"
        f"Open this link within 20 minutes: {reset_url}\n\n"
        "If you did not request this change, you can safely ignore this email.\n\n"
        "Iniciativa Ser o Estar"
    )
    message.add_alternative(
        f"""
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
          <h2 style="color:#0f766e">Reset your password</h2>
          <p>Hello {safe_name},</p>
          <p>We received a request to reset your Iniciativa Ser o Estar student password.</p>
          <p><a href="{safe_url}" style="display:inline-block;background:#0f766e;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold">Create a new password</a></p>
          <p>This secure link expires in 20 minutes and can only be used once.</p>
          <p style="color:#64748b;font-size:13px">If you did not request this change, you can safely ignore this email.</p>
        </div>
        """,
        subtype="html",
    )

    if smtp_port == 465:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12, context=ssl.create_default_context()) as smtp:
            smtp.login(smtp_user, smtp_password)
            smtp.send_message(message)
    else:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as smtp:
            smtp.ehlo()
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
            smtp.login(smtp_user, smtp_password)
            smtp.send_message(message)
    return True


def _password_reset_request_allowed(request: Request, email: str) -> bool:
    now_ts = int(datetime.now(tz=timezone.utc).timestamp())
    client_ip = request.client.host if request.client else "unknown"
    email_key = hashlib.sha256(email.lower().encode("utf-8")).hexdigest()
    key = f"{client_ip}:{email_key}"
    window_seconds = 15 * 60
    max_requests = 3
    if not hasattr(_password_reset_request_allowed, "requests"):
        _password_reset_request_allowed.requests = {}
    requests = _password_reset_request_allowed.requests
    entry = requests.get(key, {"count": 0, "first_ts": now_ts})
    if now_ts - entry["first_ts"] > window_seconds:
        entry = {"count": 0, "first_ts": now_ts}
    if entry["count"] >= max_requests:
        requests[key] = entry
        return False
    entry["count"] += 1
    requests[key] = entry
    return True


@app.get("/api/health")
def health_check():
    return {"status": "ok", "environment": ENVIRONMENT}


@app.post("/api/chatbot")
def academy_chatbot(payload: dict):
    message = str(payload.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message content is required.")
    if len(message) > 2000:
        raise HTTPException(status_code=413, detail="Message is too long.")

    if not OPENAI_API_KEY:
        return {
            "text": (
                "¡Hola! Our academy offers A1, A2, and B1 Spanish courses for adult learners, "
                "with small online groups, live tutor support, and face-to-face guidance when needed. "
                "For enrollment help, use the WhatsApp information button and our team will assist you."
            )
        }

    request_body = {
        "model": os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are the concise bilingual guide for Iniciativa Ser o Estar, a Spanish academy "
                    "for adult English speakers. Answer only questions about the academy and Spanish learning. "
                    "Do not invent prices, schedules, accreditation, or policies."
                ),
            },
            {"role": "user", "content": message},
        ],
        "max_tokens": 400,
        "temperature": 0.4,
    }
    try:
        ai_request = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(request_body).encode("utf-8"),
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(ai_request, timeout=20) as ai_response:
            ai_payload = json.loads(ai_response.read().decode("utf-8"))
        return {"text": ai_payload["choices"][0]["message"]["content"]}
    except Exception:
        raise HTTPException(status_code=502, detail="The academy assistant is temporarily unavailable.")

# Shared memory dictionary to track real-time WebSocket clients in Live Classes
class LiveChatConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: int):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        self.active_connections[session_id].add(websocket)

    def disconnect(self, websocket: WebSocket, session_id: int):
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)

    async def broadcast(self, message: dict, session_id: int):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

chat_manager = LiveChatConnectionManager()


def _request_auth_payload(request: Request, allowed_roles: set[str] | None = None) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ").strip() if auth_header.startswith("Bearer ") else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")
    payload = auth.decode_token(token)
    role = str(payload.get("role") or "")
    if allowed_roles and role not in allowed_roles:
        raise HTTPException(status_code=403, detail="You do not have permission to perform this action.")
    return payload


def _require_admin(request: Request) -> dict:
    return _request_auth_payload(request, {"admin"})


def _require_matching_student(request: Request, student_id_code: str, db: Session) -> models.StudentProfile:
    payload = _request_auth_payload(request, {"student"})
    student = db.query(models.StudentProfile).filter(models.StudentProfile.student_id_code == student_id_code).first()
    if not student or student.user_id != payload.get("id"):
        raise HTTPException(status_code=403, detail="You may only access your own student record.")
    return student


def _provision_live_room(session: models.LiveClassSession) -> dict:
    room_details = build_room_details(session.id, session.title)
    api_key = os.getenv("DAILY_API_KEY")
    if not api_key:
        return room_details

    payload = {
        "name": room_details["room_name"],
        "privacy": "private",
        "properties": {
            "enable_chat": True,
            "enable_recording": "cloud",
            "start_video_off": False,
        },
    }
    try:
        request = urllib.request.Request(
            "https://api.daily.co/v1/rooms",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            room_data = json.loads(response.read().decode("utf-8"))
        room_name = room_data.get("name") or room_details["room_name"]
        room_url = room_data.get("url") or build_room_details(session.id, session.title)["room_url"]
        room_details = {
            "room_name": room_name,
            "room_url": room_url,
            "join_token": room_details["join_token"],
        }

        token_request = urllib.request.Request(
            "https://api.daily.co/v1/meeting-tokens",
            data=json.dumps({"properties": {
                "room_name": room_name,
                "is_owner": True,
                "exp": int((datetime.now(timezone.utc) + timedelta(hours=4)).timestamp()),
            }}).encode("utf-8"),
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(token_request, timeout=10) as token_response:
            token_data = json.loads(token_response.read().decode("utf-8"))
        room_details["join_token"] = token_data.get("token") or room_details["join_token"]
    except Exception as exc:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=502, detail="The live classroom provider could not create the room.") from exc
        return room_details

    return room_details


def _create_daily_token(room_name: str, is_owner: bool = False, user_name: str | None = None) -> str:
    api_key = os.getenv("DAILY_API_KEY")
    if not api_key:
        return "demo-token"

    properties = {
        "room_name": room_name,
        "is_owner": is_owner,
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=4)).timestamp()),
    }
    if user_name:
        properties["user_name"] = user_name

    request = urllib.request.Request(
        "https://api.daily.co/v1/meeting-tokens",
        data=json.dumps({"properties": properties}).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as token_response:
            token_data = json.loads(token_response.read().decode("utf-8"))
    except Exception as exc:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=502, detail="The live classroom access token could not be created.") from exc
        return "demo-token"
    return token_data.get("token") or "demo-token"


def _session_scheduled_at(session: models.LiveClassSession) -> datetime | None:
    raw_value = (session.date_time or "").strip()
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d"):
        try:
            parsed = datetime.strptime(raw_value, fmt)
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _student_can_join_session(student: models.StudentProfile, session: models.LiveClassSession) -> bool:
    student_level_match = re.search(r"\b(A1|A2|B1)\b", student.course_level or "", re.IGNORECASE)
    session_level_match = re.search(r"\b(A1|A2|B1)\b", session.course_level or "", re.IGNORECASE)
    student_level = student_level_match.group(1).upper() if student_level_match else (student.course_level or "").upper()
    session_level = session_level_match.group(1).upper() if session_level_match else (session.course_level or "").upper()
    if student_level != session_level:
        return False
    scheduled_at = _session_scheduled_at(session)
    if not scheduled_at:
        return session.status == "Live"
    now = datetime.now(timezone.utc)
    return session.status == "Live" or (scheduled_at - timedelta(minutes=15) <= now <= scheduled_at + timedelta(hours=4))


def _recording_url_from_payload(payload: dict) -> str:
    candidates = [
        payload.get("recording_url"),
        payload.get("video_url"),
        payload.get("download_link"),
        payload.get("url"),
    ]
    data = payload.get("data") or {}
    if isinstance(data, dict):
        candidates.extend([
            data.get("download_link"),
            data.get("recording_url"),
            data.get("url"),
            (data.get("recording") or {}).get("download_link") if isinstance(data.get("recording"), dict) else None,
            (data.get("recording") or {}).get("url") if isinstance(data.get("recording"), dict) else None,
        ])
    return next((value for value in candidates if value), "")


def _generate_unique_student_code(db: Session) -> str:
    for _attempt in range(10):
        candidate = f"SER-{random.randint(100,999)}"
        exists_code = db.query(models.StudentProfile).filter(models.StudentProfile.student_id_code == candidate).first()
        if not exists_code:
            return candidate
    return f"SER-{random.randint(1000,9999)}"


def _generate_unique_teacher_code(db: Session) -> str:
    for _attempt in range(10):
        candidate = f"TUT-{random.randint(100,999)}"
        exists_code = db.query(models.TeacherProfile).filter(models.TeacherProfile.teacher_id_code == candidate).first()
        if not exists_code:
            return candidate
    return f"TUT-{random.randint(1000,9999)}"


def _enroll_student_in_matching_courses(student: models.StudentProfile, db: Session):
    matching_courses = db.query(models.Course).filter(
        models.Course.published.is_(True),
        models.Course.level == student.course_level,
    ).all()
    for course in matching_courses:
        exists = db.query(models.CourseEnrollment).filter(
            models.CourseEnrollment.student_id == student.id,
            models.CourseEnrollment.course_id == course.id,
        ).first()
        if not exists:
            db.add(models.CourseEnrollment(student_id=student.id, course_id=course.id))
    db.commit()


def _create_student_account(payload: schemas.StudentRegister, db: Session, status_value: str = "Active") -> models.StudentProfile:
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = models.User(
        email=payload.email,
        hashed_password=auth.get_password_hash(payload.password),
        full_name=payload.full_name,
        role="student",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = models.StudentProfile(
        user_id=user.id,
        student_id_code=_generate_unique_student_code(db),
        phone_number=payload.phone_number,
        course_level=payload.course_level,
        class_group=payload.class_group,
        learning_mode=payload.learning_mode,
        status=status_value,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    _enroll_student_in_matching_courses(profile, db)
    db.refresh(profile)
    return profile


def _teacher_profile_to_tutor_dict(profile: models.TeacherProfile, db: Session) -> dict:
    user = db.query(models.User).filter(models.User.id == profile.user_id).first()
    assigned_levels = [level.strip() for level in (profile.assigned_levels or "").split(",") if level.strip()]
    return {
        "id": profile.teacher_id_code,
        "name": user.full_name if user else profile.teacher_id_code,
        "display_name": user.full_name if user else profile.teacher_id_code,
        "email": user.email if user else "",
        "assigned_levels": assigned_levels,
        "source": "database",
    }


def _all_tutor_dicts(db: Session) -> list[dict]:
    database_tutors = [
        _teacher_profile_to_tutor_dict(profile, db)
        for profile in db.query(models.TeacherProfile).all()
    ]
    seen_emails = {tutor.get("email", "").lower() for tutor in database_tutors if tutor.get("email")}
    template_tutors = [
        {**tutor, "source": "template"}
        for tutor in TUTOR_PROFILES
        if tutor.get("email", "").lower() not in seen_emails
    ]
    return database_tutors + template_tutors


def _find_tutor_for_progress(db: Session, teacher_email: str | None = None, teacher_name: str | None = None) -> dict:
    if teacher_email:
        user = db.query(models.User).filter(
            models.User.email == teacher_email,
            models.User.role == "teacher",
        ).first()
        if user:
            profile = db.query(models.TeacherProfile).filter(models.TeacherProfile.user_id == user.id).first()
            if profile:
                return _teacher_profile_to_tutor_dict(profile, db)
        return find_tutor_by_email(teacher_email)

    if teacher_name:
        normalized = _normalize_teacher_name(teacher_name)
        users = db.query(models.User).filter(models.User.role == "teacher").all()
        for user in users:
            if _normalize_teacher_name(user.full_name) == normalized:
                profile = db.query(models.TeacherProfile).filter(models.TeacherProfile.user_id == user.id).first()
                if profile:
                    return _teacher_profile_to_tutor_dict(profile, db)
        return find_tutor_by_name(teacher_name)

    return TUTOR_PROFILES[0]


def _normalize_teacher_name(value: str | None) -> str:
    return (value or "").strip().lower().replace("tutora ", "").replace("tutor ", "")


def _aware_datetime(value: datetime | None) -> datetime | None:
    if value and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _session_belongs_to_tutor(session: models.LiveClassSession, tutor: dict) -> bool:
    session_name = _normalize_teacher_name(session.teacher_name)
    possible_names = {
        _normalize_teacher_name(tutor.get("name")),
        _normalize_teacher_name(tutor.get("display_name")),
    }
    return session_name in possible_names


def _auto_mark_teacher_absences(db: Session):
    now = datetime.now(timezone.utc)
    changed = False
    scheduled_sessions = db.query(models.LiveClassSession).filter(
        models.LiveClassSession.status == "Scheduled",
        models.LiveClassSession.started_at.is_(None),
    ).all()

    for session in scheduled_sessions:
        scheduled_at = _session_scheduled_at(session)
        if scheduled_at and now > scheduled_at + timedelta(hours=4):
            session.status = "Teacher Absent"
            session.ended_at = scheduled_at + timedelta(hours=4)
            changed = True

    if changed:
        db.commit()


def _teacher_progress_payload(tutor: dict, db: Session) -> dict:
    now = datetime.now(timezone.utc)
    sessions = [
        session
        for session in db.query(models.LiveClassSession).all()
        if _session_belongs_to_tutor(session, tutor)
    ]

    def session_minutes(session: models.LiveClassSession) -> int:
        started_at = _aware_datetime(session.started_at)
        if not started_at:
            return 0
        end_time = _aware_datetime(session.ended_at) or (now if session.status == "Live" else started_at)
        return max(int((end_time - started_at).total_seconds() // 60), 0)

    def is_late(session: models.LiveClassSession) -> bool:
        scheduled_at = _session_scheduled_at(session)
        started_at = _aware_datetime(session.started_at)
        return bool(scheduled_at and started_at and started_at > scheduled_at + timedelta(minutes=15))

    taught_sessions = [session for session in sessions if session.started_at]
    late_sessions = [session for session in taught_sessions if is_late(session)]
    present_sessions = [session for session in taught_sessions if not is_late(session)]
    absent_sessions = [session for session in sessions if session.status == "Teacher Absent"]
    completed_sessions = [session for session in taught_sessions if session.status == "Completed"]
    live_sessions = [session for session in sessions if session.status == "Live"]
    upcoming_sessions = [
        session
        for session in sessions
        if session.status == "Scheduled"
        and (not _session_scheduled_at(session) or _session_scheduled_at(session) >= now)
    ]
    total_minutes = sum(session_minutes(session) for session in taught_sessions)
    attendance_total = len(present_sessions) + len(late_sessions) + len(absent_sessions)
    attendance_rate = round(((len(present_sessions) + len(late_sessions)) / attendance_total) * 100) if attendance_total else 100

    def sort_timestamp(session: models.LiveClassSession) -> float:
        timestamp_value = _session_scheduled_at(session) or session.created_at or now
        if timestamp_value.tzinfo is None:
            timestamp_value = timestamp_value.replace(tzinfo=timezone.utc)
        return timestamp_value.timestamp()

    recent_sessions = sorted(sessions, key=sort_timestamp, reverse=True)[:8]

    return {
        "teacher_id": tutor.get("id"),
        "teacher_name": tutor.get("name"),
        "display_name": tutor.get("display_name"),
        "email": tutor.get("email"),
        "assigned_levels": tutor.get("assigned_levels", []),
        "total_minutes": total_minutes,
        "total_hours": round(total_minutes / 60, 1),
        "classes_given": len(taught_sessions),
        "completed_classes": len(completed_sessions),
        "live_classes": len(live_sessions),
        "upcoming_classes": len(upcoming_sessions),
        "attendance": {
            "present": len(present_sessions),
            "late": len(late_sessions),
            "absent": len(absent_sessions),
            "rate": attendance_rate,
        },
        "recent_sessions": [
            {
                "id": session.id,
                "title": session.title,
                "course_level": session.course_level,
                "date_time": session.date_time,
                "status": session.status,
                "minutes": session_minutes(session),
            }
            for session in recent_sessions
        ],
    }


# --- 1. Authentic Registration & Welcome System ---
@app.post("/api/register", response_model=schemas.StudentResponse)
def register_student(payload: schemas.StudentRegister, db: Session = Depends(get_db)):
    profile = _create_student_account(payload, db)

    # 3. Simulate Automated Welcome Message (English & Spanish)
    welcome_email_body = f"""
    --- AUTOMATED WELCOME CORRESPONDENCE ---
    To: {payload.email}
    Subject: Welcome to Iniciativa SER o ESTAR! / ¡Bienvenido/a a Iniciativa SER o ESTAR!

    English:
    Welcome {payload.full_name} to Iniciativa SER o ESTAR! We are excited to have you begin your Spanish learning journey with us. Your student account has been created successfully. Your Student ID code is {profile.student_id_code}.

    Spanish:
    ¡Bienvenido/a {payload.full_name} a Iniciativa SER o ESTAR! Estamos emocionados de acompañarte en tu camino de aprendizaje del español. Tu cuenta de estudiante ha sido creada correctamente. Tu código de estudiante es {profile.student_id_code}.
    -----------------------------------------
    """
    print(welcome_email_body)  # Print to server terminal as demonstration

    return profile


@app.post("/api/migrate-students")
def migrate_students(payload: List[schemas.StudentRegister], request: Request, db: Session = Depends(get_db)):
    """
    Accepts a list of student-like objects (matching `StudentRegister`) and creates
    `User` + `StudentProfile` records for each, skipping existing emails.
    Returns a summary of created and skipped entries.
    """
    _require_admin(request)
    created = []
    skipped = []

    for p in payload:
        existing_user = db.query(models.User).filter(models.User.email == p.email).first()
        if existing_user:
            skipped.append({"email": p.email, "reason": "exists"})
            continue

        profile = _create_student_account(p, db)
        created.append({"email": p.email, "student_id_code": profile.student_id_code})

    return {"created": created, "skipped": skipped, "created_count": len(created), "skipped_count": len(skipped)}


@app.get("/api/admin/students")
def list_admin_students(request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    students = db.query(models.StudentProfile).all()
    return [
        {
            "id": student.id,
            "student_id_code": student.student_id_code,
            "full_name": student.user.full_name if student.user else student.student_id_code,
            "email": student.user.email if student.user else "",
            "phone_number": student.phone_number,
            "course_level": student.course_level,
            "class_group": student.class_group,
            "learning_mode": student.learning_mode,
            "status": student.status,
            "registration_date": student.registration_date,
        }
        for student in students
    ]


@app.post("/api/admin/students", response_model=schemas.StudentResponse)
def create_admin_student(payload: schemas.AdminStudentCreate, request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    return _create_student_account(payload, db, status_value=payload.status)


@app.get("/api/admin/teachers")
def list_admin_teachers(request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    return _all_tutor_dicts(db)


@app.post("/api/admin/teachers")
def create_admin_teacher(payload: schemas.TeacherCreate, request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    assigned_levels = ",".join(payload.assigned_levels or ["A1"])
    teacher_id_code = payload.teacher_id_code or _generate_unique_teacher_code(db)
    existing_code = db.query(models.TeacherProfile).filter(models.TeacherProfile.teacher_id_code == teacher_id_code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Teacher ID code already exists.")

    user = models.User(
        email=payload.email,
        hashed_password=auth.get_password_hash(payload.password),
        full_name=payload.full_name,
        role="teacher",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = models.TeacherProfile(
        user_id=user.id,
        teacher_id_code=teacher_id_code,
        assigned_levels=assigned_levels,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return {
        "id": profile.id,
        "teacher_id_code": profile.teacher_id_code,
        "full_name": user.full_name,
        "email": user.email,
        "assigned_levels": [level.strip() for level in profile.assigned_levels.split(",") if level.strip()],
        "role": user.role,
    }

@app.post("/api/password/forgot", status_code=status.HTTP_202_ACCEPTED)
def request_password_reset(payload: schemas.PasswordForgotRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if not _password_reset_request_allowed(request, email):
        return {"detail": PASSWORD_RESET_RESPONSE}

    user = db.query(models.User).filter(models.User.email == email, models.User.role == "student").first()
    if user:
        token = auth.create_password_reset_token(user.id, user.email, user.hashed_password)
        query = urllib.parse.urlencode({"reset_token": token})
        reset_url = f"{_password_reset_app_url(request)}/?{query}"
        try:
            sent = _send_password_reset_email(user.email, user.full_name, reset_url)
            if not sent:
                if ENVIRONMENT != "production":
                    print(f"[PASSWORD RESET DEVELOPMENT LINK] {reset_url}")
                else:
                    print("Password reset email was not sent because SMTP is not configured.")
        except Exception as exc:
            print(f"Password reset email delivery failed: {type(exc).__name__}")

    return {"detail": PASSWORD_RESET_RESPONSE}


@app.post("/api/password/reset")
def reset_student_password(payload: schemas.PasswordResetRequest, response: Response, db: Session = Depends(get_db)):
    try:
        reset_claims = auth.decode_password_reset_token(payload.token)
    except HTTPException:
        raise HTTPException(status_code=400, detail="This password reset link is invalid or has expired.")

    user = db.query(models.User).filter(
        models.User.id == reset_claims.get("id"),
        models.User.email == str(reset_claims.get("sub", "")).lower(),
        models.User.role == "student",
    ).first()
    if not user or auth.password_hash_fingerprint(user.hashed_password) != reset_claims.get("pwd"):
        raise HTTPException(status_code=400, detail="This password reset link is invalid or has already been used.")
    if auth.verify_password(payload.new_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Choose a password you have not used for this account.")

    user.hashed_password = auth.get_password_hash(payload.new_password)
    db.commit()
    response.delete_cookie("access_token", path="/", secure=COOKIE_SECURE, samesite="lax")
    return {"detail": "Your password has been reset successfully. You can now sign in."}


@app.post("/api/login")
def login(request: Request, payload: schemas.LoginRequest, response: Response, db: Session = Depends(get_db)):
    # Basic in-memory rate limiter per IP to reduce brute force risk
    client_ip = request.client.host if request.client else "unknown"
    now_ts = int(datetime.now(tz=timezone.utc).timestamp())
    window_seconds = 300
    max_attempts = 6

    if not hasattr(login, "attempts"):
        login.attempts = {}

    entry = login.attempts.get(client_ip, {"count": 0, "first_ts": now_ts})
    # reset window
    if now_ts - entry["first_ts"] > window_seconds:
        entry = {"count": 0, "first_ts": now_ts}

    if entry["count"] >= max_attempts:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")

    if ADMIN_EMAIL and ADMIN_PASSWORD and payload.username.lower() == ADMIN_EMAIL and payload.password == ADMIN_PASSWORD:
        token = auth.create_access_token(data={"sub": ADMIN_EMAIL, "role": "admin", "id": 0})
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite="lax",
            max_age=60 * 60 * 4,
            path="/",
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": "admin",
            "full_name": "Academy Administrator",
            "email": ADMIN_EMAIL,
        }

    user = db.query(models.User).filter(models.User.email == payload.username).first()
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        entry["count"] += 1
        login.attempts[client_ip] = entry
        raise HTTPException(
            status_code=401, detail="Incorrect email address or user password."
        )

    # successful auth -> reset attempts
    if client_ip in login.attempts:
        del login.attempts[client_ip]

    token = auth.create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=60 * 60 * 24,
        path="/",
    )

    login_response = {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
        "email": user.email
    }

    if user.role == "student":
        student_profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == user.id).first()
        if student_profile:
            login_response.update({
                "student_id_code": student_profile.student_id_code,
                "phone_number": student_profile.phone_number,
                "course_level": student_profile.course_level,
                "class_group": student_profile.class_group,
                "learning_mode": student_profile.learning_mode,
            })
    elif user.role == "teacher":
        teacher_profile = db.query(models.TeacherProfile).filter(models.TeacherProfile.user_id == user.id).first()
        if teacher_profile:
            login_response.update({
                "teacher_id_code": teacher_profile.teacher_id_code,
                "assigned_levels": [level.strip() for level in (teacher_profile.assigned_levels or "").split(",") if level.strip()],
                "display_name": user.full_name,
            })
    return login_response


@app.get("/api/me")
def get_current_user(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    token = None

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 2)[1]
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    payload = auth.decode_token(token)
    if payload.get("role") == "admin" and payload.get("sub") == ADMIN_EMAIL:
        return {
            "id": 0,
            "email": ADMIN_EMAIL,
            "full_name": "Academy Administrator",
            "role": "admin",
        }
    user = db.query(models.User).filter(models.User.email == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="Authenticated user not found.")

    response_payload = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }

    if user.role == "student":
        student_profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == user.id).first()
        if student_profile:
            response_payload.update({
                "student_id_code": student_profile.student_id_code,
                "phone_number": student_profile.phone_number,
                "course_level": student_profile.course_level,
                "class_group": student_profile.class_group,
                "learning_mode": student_profile.learning_mode,
            })
    elif user.role == "teacher":
        teacher_profile = db.query(models.TeacherProfile).filter(models.TeacherProfile.user_id == user.id).first()
        if teacher_profile:
            response_payload.update({
                "teacher_id_code": teacher_profile.teacher_id_code,
                "assigned_levels": [level.strip() for level in (teacher_profile.assigned_levels or "").split(",") if level.strip()],
                "display_name": user.full_name,
            })

    return response_payload


@app.post("/api/logout")
def logout(response: Response):
    # Clear the access token cookie to log the user out client-side
    response.delete_cookie("access_token", path="/", secure=COOKIE_SECURE, samesite="lax")
    return {"detail": "Logged out"}


# --- 2. Live Teaching Sessions & Attendance Tracking ---
@app.post("/api/live-sessions", response_model=schemas.LiveSessionResponse)
def create_live_session(payload: schemas.LiveSessionCreate, request: Request, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"teacher", "admin"})
    session = models.LiveClassSession(
        title=payload.title,
        course_level=payload.course_level,
        teacher_name=payload.teacher_name,
        date_time=payload.date_time,
        meeting_link=payload.meeting_link or f"https://meet.jit.si/IniciativaSerEstar-{random.randint(100,999)}",
        status="Scheduled"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@app.post("/api/live-sessions/{session_id}/start", response_model=schemas.LiveRoomProvisionResponse)
def start_live_session(session_id: int, request: Request, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"teacher", "admin"})
    session = db.query(models.LiveClassSession).filter(models.LiveClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Class session not found.")

    room_details = _provision_live_room(session)
    session.provider = "daily"
    session.room_name = room_details["room_name"]
    session.room_url = room_details["room_url"]
    session.join_token = room_details["join_token"]
    session.status = "Live"
    session.started_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "title": session.title,
        "room_name": session.room_name,
        "room_url": session.room_url,
        "join_token": session.join_token,
        "status": session.status,
        "provider": session.provider,
    }


@app.post("/api/live-sessions/{session_id}/join", response_model=schemas.LiveRoomProvisionResponse)
def join_live_session(session_id: int, payload: schemas.LiveSessionJoinRequest, request: Request, db: Session = Depends(get_db)):
    session = db.query(models.LiveClassSession).filter(models.LiveClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Class session not found.")

    student = _require_matching_student(request, payload.student_id_code, db)
    if not _student_can_join_session(student, session):
        raise HTTPException(status_code=403, detail="You are not enrolled for this live class or it is outside the join window.")

    if not session.room_url:
        room_details = _provision_live_room(session)
        session.provider = "daily"
        session.room_name = room_details["room_name"]
        session.room_url = room_details["room_url"]
        db.commit()
        db.refresh(session)

    user = db.query(models.User).filter(models.User.id == student.user_id).first()
    join_token = _create_daily_token(session.room_name, is_owner=False, user_name=user.full_name if user else student.student_id_code)

    return {
        "id": session.id,
        "title": session.title,
        "room_name": session.room_name,
        "room_url": session.room_url,
        "join_token": join_token,
        "status": session.status,
        "provider": session.provider,
    }


@app.post("/api/live-sessions/{session_id}/end", response_model=schemas.LiveSessionResponse)
def end_live_session(session_id: int, request: Request, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"teacher", "admin"})
    session = db.query(models.LiveClassSession).filter(models.LiveClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Class session not found.")

    session.status = "Completed"
    session.ended_at = datetime.now(timezone.utc)
    for record in session.attendance_records:
        if record.leave_time is None:
            record.leave_time = session.ended_at
            if record.join_time:
                record.total_minutes = max(int((record.leave_time - record.join_time).total_seconds() // 60), 0)
    db.commit()
    db.refresh(session)
    return session


@app.get("/api/live-sessions", response_model=List[schemas.LiveSessionResponse])
def get_live_sessions(request: Request, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"student", "teacher", "admin"})
    _auto_mark_teacher_absences(db)
    return db.query(models.LiveClassSession).all()


@app.get("/api/tutors")
def list_tutors(request: Request, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"student", "teacher", "admin"})
    return _all_tutor_dicts(db)


@app.get("/api/teachers/progress")
def get_teacher_progress(
    request: Request,
    teacher_email: str | None = None,
    teacher_name: str | None = None,
    db: Session = Depends(get_db),
):
    payload = _request_auth_payload(request, {"teacher", "admin"})
    if payload.get("role") == "teacher":
        teacher_email = str(payload.get("sub") or "")
    _auto_mark_teacher_absences(db)
    tutor = _find_tutor_for_progress(db, teacher_email=teacher_email, teacher_name=teacher_name)
    return _teacher_progress_payload(tutor, db)


@app.get("/api/admin/teacher-progress")
def get_all_teacher_progress(request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    _auto_mark_teacher_absences(db)
    return [_teacher_progress_payload(tutor, db) for tutor in _all_tutor_dicts(db)]

@app.post("/api/attendance/join", response_model=schemas.AttendanceRecordResponse)
def record_join_class(payload: schemas.AttendanceJoinRequest, request: Request, db: Session = Depends(get_db)):
    student = _require_matching_student(request, payload.student_id_code, db)

    session = db.query(models.LiveClassSession).filter(models.LiveClassSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Class session not found.")

    current_time = datetime.now(timezone.utc)
    attendance_status = "Present"
    if session.started_at and (current_time - session.started_at).total_seconds() > 900:
        attendance_status = "Late"

    existing = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == student.id,
        models.AttendanceRecord.session_id == payload.session_id,
        models.AttendanceRecord.leave_time.is_(None),
    ).order_by(models.AttendanceRecord.id.desc()).first()
    if existing:
        return existing

    user = db.query(models.User).filter(models.User.id == student.user_id).first()
    record = models.AttendanceRecord(
        student_id=student.id,
        student_name=user.full_name if user else student.student_id_code,
        student_code=student.student_id_code,
        course_level=student.course_level,
        session_id=payload.session_id,
        join_time=current_time,
        status=attendance_status,
        total_minutes=0
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/api/attendance/summary")
def get_attendance_summary(student_id_code: str, request: Request, db: Session = Depends(get_db)):
    student = _require_matching_student(request, student_id_code, db)

    records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.student_id == student.id).all()
    present = len([record for record in records if record.status == "Present"])
    late = len([record for record in records if record.status == "Late"])
    absent = len([record for record in records if record.status == "Absent"])
    total_minutes = sum(record.total_minutes or 0 for record in records)
    return {
        "present": present,
        "late": late,
        "absent": absent,
        "total_minutes": total_minutes,
        "total_hours": round(total_minutes / 60, 1),
    }


@app.get("/api/attendance/session/{session_id}")
def get_session_attendance(session_id: int, request: Request, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"teacher", "admin"})
    records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.session_id == session_id).all()
    return [
        {
            "id": record.id,
            "student_code": record.student_code,
            "student_name": record.student_name,
            "course_level": record.course_level,
            "status": record.status,
            "join_time": record.join_time,
            "leave_time": record.leave_time,
            "total_minutes": record.total_minutes,
        }
        for record in records
    ]


@app.post("/api/attendance/leave", response_model=schemas.AttendanceRecordResponse)
def record_leave_class(payload: schemas.AttendanceJoinRequest, request: Request, db: Session = Depends(get_db)):
    _require_matching_student(request, payload.student_id_code, db)
    record = db.query(models.AttendanceRecord).join(models.StudentProfile).filter(
        models.StudentProfile.student_id_code == payload.student_id_code,
        models.AttendanceRecord.session_id == payload.session_id,
    ).order_by(models.AttendanceRecord.id.desc()).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found.")

    if record.leave_time is None:
        leave_time = datetime.now(timezone.utc)
        record.leave_time = leave_time
        if record.join_time:
            duration_minutes = int((leave_time - record.join_time).total_seconds() // 60)
            record.total_minutes = max(duration_minutes, 0)

    db.commit()
    db.refresh(record)
    return record


# --- 3. Recordings & Course Library ---
@app.get("/api/lesson-notes", response_model=List[schemas.LessonNoteResponse])
def list_lesson_notes(request: Request, course_level: str | None = None, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"student", "teacher", "admin"})
    query = db.query(models.LessonNote).filter(models.LessonNote.shared_with_students.is_(True))
    if course_level:
        level_match = re.search(r"\b(A1|A2|B1)\b", course_level, re.IGNORECASE)
        normalized_level = level_match.group(1).upper() if level_match else course_level
        query = query.filter(models.LessonNote.course_level.in_([normalized_level, "All"]))
    return query.order_by(models.LessonNote.id.desc()).all()


@app.post("/api/lesson-notes", response_model=schemas.LessonNoteResponse)
async def upload_lesson_note(
    request: Request,
    title: str = Form(...),
    course_level: str = Form(...),
    created_by: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    auth_payload = _request_auth_payload(request, {"teacher", "admin"})
    original_name = file.filename or "shared-material"
    extension = os.path.splitext(original_name)[1].lower()
    allowed_extensions = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".png", ".jpg", ".jpeg", ".mp3", ".mp4"}
    if extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload PDF, Word, PowerPoint, image, audio, or MP4 files.")

    level_match = re.search(r"\b(A1|A2|B1)\b", course_level, re.IGNORECASE)
    normalized_level = level_match.group(1).upper() if level_match else course_level
    if normalized_level not in {"A1", "A2", "B1", "All"}:
        raise HTTPException(status_code=400, detail="Invalid course level.")

    safe_stem = re.sub(r"[^a-zA-Z0-9_-]+", "_", os.path.splitext(original_name)[0]).strip("_") or "material"
    stored_name = f"{normalized_level.lower()}_{int(datetime.now(timezone.utc).timestamp())}_{safe_stem}{extension}"
    file_url, total_size = await store_upload(file, "lesson-notes", stored_name)

    if total_size >= 1024 * 1024:
        display_size = f"{total_size / (1024 * 1024):.1f} MB"
    else:
        display_size = f"{max(total_size / 1024, 0.1):.1f} KB"

    note = models.LessonNote(
        title=title.strip(),
        course_level=normalized_level,
        file_url=file_url,
        file_type=extension.lstrip(".").upper(),
        shared_with_students=True,
        created_by=str(auth_payload.get("sub") or created_by),
        file_size=display_size,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@app.get("/api/recordings", response_model=List[schemas.RecordingResponse])
def list_recordings(request: Request, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"student", "teacher", "admin"})
    return db.query(models.RecordedClass).order_by(models.RecordedClass.id.desc()).all()


@app.post("/api/recordings/webhook", response_model=schemas.RecordingResponse)
def create_recording_from_webhook(payload: dict, request: Request, db: Session = Depends(get_db)):
    try:
        _request_auth_payload(request, {"teacher", "admin"})
    except HTTPException:
        if not RECORDING_WEBHOOK_SECRET or request.headers.get("x-recording-webhook-secret") != RECORDING_WEBHOOK_SECRET:
            raise HTTPException(status_code=403, detail="Invalid recording webhook signature.")
    video_url = _recording_url_from_payload(payload)
    data = payload.get("data") or {}
    session_id = payload.get("session_id") or (data.get("session_id") if isinstance(data, dict) else None)
    room_name = payload.get("room_name") or (data.get("room_name") if isinstance(data, dict) else None)
    session = None
    if session_id:
        session = db.query(models.LiveClassSession).filter(models.LiveClassSession.id == session_id).first()
    if not session and room_name:
        session = db.query(models.LiveClassSession).filter(models.LiveClassSession.room_name == room_name).first()

    recording = models.RecordedClass(
        title=payload.get("title") or payload.get("session_title") or (session.title if session else "Recorded class"),
        teacher_name=payload.get("teacher_name") or (session.teacher_name if session else "Instructor"),
        course_level=payload.get("course_level") or (session.course_level if session else "A1"),
        date_recorded=payload.get("date_recorded") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        video_url=video_url,
        duration=payload.get("duration") or "45 mins",
        description=payload.get("description") or "Cloud recording published",
        session_id=session.id if session else session_id,
    )
    if session and video_url:
        session.recording_url = video_url
    db.add(recording)
    db.commit()
    db.refresh(recording)
    return recording


@app.get("/api/courses", response_model=List[schemas.CourseResponse])
def list_courses(request: Request, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"student", "teacher", "admin"})
    return db.query(models.Course).filter(models.Course.published.is_(True)).all()


@app.post("/api/courses", response_model=schemas.CourseResponse)
def create_course(payload: schemas.CourseCreate, request: Request, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"teacher", "admin"})
    data = payload.dict()
    module_payloads = data.pop("modules", [])
    course = models.Course(**data)
    db.add(course)
    db.commit()
    db.refresh(course)
    for module_payload in module_payloads:
        lesson_payloads = module_payload.pop("lessons", [])
        module = models.CourseModule(course_id=course.id, **module_payload)
        db.add(module)
        db.commit()
        db.refresh(module)
        for lesson_payload in lesson_payloads:
            db.add(models.CourseLesson(module_id=module.id, **lesson_payload))
    db.commit()
    db.refresh(course)
    return course


@app.get("/api/courses/{course_id}", response_model=schemas.CourseResponse)
def get_course(course_id: int, request: Request, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"student", "teacher", "admin"})
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    return course


@app.post("/api/courses/{course_id}/modules", response_model=schemas.CourseModuleResponse)
def create_course_module(course_id: int, payload: schemas.CourseModuleCreate, request: Request, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"teacher", "admin"})
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    module = models.CourseModule(course_id=course.id, title=payload.title, order_index=payload.order_index)
    db.add(module)
    db.commit()
    db.refresh(module)
    for lesson_payload in payload.lessons:
        db.add(models.CourseLesson(module_id=module.id, **lesson_payload.dict()))
    db.commit()
    db.refresh(module)
    return module


@app.post("/api/modules/{module_id}/lessons", response_model=schemas.CourseLessonResponse)
def create_course_lesson(module_id: int, payload: schemas.CourseLessonCreate, request: Request, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"teacher", "admin"})
    module = db.query(models.CourseModule).filter(models.CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found.")
    lesson = models.CourseLesson(module_id=module.id, **payload.dict())
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@app.post("/api/courses/{course_id}/enroll", response_model=schemas.EnrollmentResponse)
def enroll_student(course_id: int, payload: schemas.EnrollmentRequest, request: Request, db: Session = Depends(get_db)):
    _request_auth_payload(request, {"teacher", "admin"})
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    student = db.query(models.StudentProfile).filter(models.StudentProfile.student_id_code == payload.student_id_code).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    existing = db.query(models.CourseEnrollment).filter(
        models.CourseEnrollment.student_id == student.id,
        models.CourseEnrollment.course_id == course.id,
    ).first()
    if existing:
        return {"id": existing.id, "course_id": existing.course_id, "student_id_code": student.student_id_code, "status": existing.status}

    enrollment = models.CourseEnrollment(student_id=student.id, course_id=course.id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return {"id": enrollment.id, "course_id": enrollment.course_id, "student_id_code": student.student_id_code, "status": enrollment.status}


@app.get("/api/my-courses")
def list_my_courses(student_id_code: str, request: Request, db: Session = Depends(get_db)):
    student = _require_matching_student(request, student_id_code, db)

    enrollments = db.query(models.CourseEnrollment).filter(models.CourseEnrollment.student_id == student.id).all()
    progress_by_lesson = {
        progress.lesson_id: progress
        for progress in db.query(models.LessonProgress).filter(models.LessonProgress.student_id == student.id).all()
    }
    response = []
    for enrollment in enrollments:
        course = enrollment.course
        lessons_total = 0
        lessons_completed = 0
        modules = []
        for module in sorted(course.modules, key=lambda item: item.order_index or 0):
            lessons = []
            for lesson in sorted(module.lessons, key=lambda item: item.order_index or 0):
                lessons_total += 1
                progress = progress_by_lesson.get(lesson.id)
                if progress and progress.completed:
                    lessons_completed += 1
                lessons.append({
                    "id": lesson.id,
                    "title": lesson.title,
                    "description": lesson.description,
                    "lesson_type": lesson.lesson_type,
                    "video_url": lesson.video_url,
                    "pdf_url": lesson.pdf_url,
                    "quiz_url": lesson.quiz_url,
                    "duration_minutes": lesson.duration_minutes,
                    "order_index": lesson.order_index,
                    "progress": {
                        "completed": bool(progress.completed) if progress else False,
                        "percent_watched": progress.percent_watched if progress else 0,
                        "last_position_seconds": progress.last_position_seconds if progress else 0,
                    }
                })
            modules.append({"id": module.id, "title": module.title, "order_index": module.order_index, "lessons": lessons})
        response.append({
            "id": enrollment.id,
            "course_id": enrollment.course_id,
            "title": course.title,
            "level": course.level,
            "category": course.category,
            "status": enrollment.status,
            "modules": modules,
            "percent_complete": round((lessons_completed / lessons_total) * 100) if lessons_total else 0,
            "certificate_eligible": lessons_total > 0 and lessons_completed == lessons_total,
        })
    return response


@app.post("/api/lessons/{lesson_id}/progress")
def update_lesson_progress(lesson_id: int, payload: schemas.LessonProgressUpdate, student_id_code: str, request: Request, db: Session = Depends(get_db)):
    student = _require_matching_student(request, student_id_code, db)

    lesson = db.query(models.CourseLesson).filter(models.CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")

    enrollment = db.query(models.CourseEnrollment).filter(
        models.CourseEnrollment.student_id == student.id,
        models.CourseEnrollment.course_id == lesson.module.course_id,
        models.CourseEnrollment.status == "active",
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="You are not enrolled in this course.")

    progress = db.query(models.LessonProgress).filter(
        models.LessonProgress.student_id == student.id,
        models.LessonProgress.lesson_id == lesson.id,
    ).first()
    if not progress:
        progress = models.LessonProgress(student_id=student.id, lesson_id=lesson.id)
        db.add(progress)

    progress.completed = payload.completed
    progress.percent_watched = payload.percent_watched
    progress.last_position_seconds = payload.last_position_seconds
    db.commit()
    db.refresh(progress)
    return {
        "lesson_id": lesson.id,
        "student_id_code": student.student_id_code,
        "completed": progress.completed,
        "percent_watched": progress.percent_watched,
        "last_position_seconds": progress.last_position_seconds,
    }


@app.post("/api/lessons/{lesson_id}/media", response_model=schemas.CourseLessonResponse)
async def upload_lesson_media(
    lesson_id: int,
    request: Request,
    media_type: str = Form("video"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    _request_auth_payload(request, {"teacher", "admin"})
    lesson = db.query(models.CourseLesson).filter(models.CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")

    safe_name = "".join(ch if ch.isalnum() or ch in ("-", "_", ".") else "_" for ch in file.filename)
    stored_name = f"lesson_{lesson_id}_{int(datetime.now(timezone.utc).timestamp())}_{safe_name}"
    if ENVIRONMENT == "production":
        playback_url, _size = await store_upload(file, "lessons", stored_name)
        if media_type == "pdf":
            lesson.pdf_url = playback_url
        elif media_type == "quiz":
            lesson.quiz_url = playback_url
        else:
            lesson.video_url = playback_url
            lesson.lesson_type = "video"
        db.commit()
        db.refresh(lesson)
        return lesson

    media_dir = "backend/uploads/lessons"
    os.makedirs(media_dir, exist_ok=True)
    file_path = f"{media_dir}/{stored_name}"
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    public_base = os.getenv("OBJECT_STORAGE_PUBLIC_BASE", "").rstrip("/")
    playback_url = f"{public_base}/lessons/{stored_name}" if public_base else f"/uploads/lessons/{stored_name}"

    if media_type == "pdf":
        lesson.pdf_url = playback_url
    elif media_type == "quiz":
        lesson.quiz_url = playback_url
    else:
        hls_dir = f"{media_dir}/lesson_{lesson_id}_{int(datetime.now(timezone.utc).timestamp())}_hls"
        os.makedirs(f"{hls_dir}/v0", exist_ok=True)
        os.makedirs(f"{hls_dir}/v1", exist_ok=True)
        hls_public_path = hls_dir.replace("backend/uploads/", "")
        hls_url = f"{public_base}/{hls_public_path}/master.m3u8" if public_base else f"/uploads/{hls_public_path}/master.m3u8"
        ffmpeg_cmd = [
            "ffmpeg",
            "-y",
            "-i",
            file_path,
            "-filter_complex",
            "[0:v]split=2[v0][v1];[v0]scale=w=1280:h=-2[v0out];[v1]scale=w=640:h=-2[v1out]",
            "-map",
            "[v0out]",
            "-map",
            "0:a?",
            "-c:v:0",
            "libx264",
            "-b:v:0",
            "2500k",
            "-c:a:0",
            "aac",
            "-map",
            "[v1out]",
            "-map",
            "0:a?",
            "-c:v:1",
            "libx264",
            "-b:v:1",
            "800k",
            "-c:a:1",
            "aac",
            "-f",
            "hls",
            "-hls_time",
            "6",
            "-hls_playlist_type",
            "vod",
            "-hls_segment_filename",
            f"{hls_dir}/v%v/segment_%03d.ts",
            "-master_pl_name",
            "master.m3u8",
            "-var_stream_map",
            "v:0,a:0 v:1,a:1",
            f"{hls_dir}/v%v/index.m3u8",
        ]
        try:
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True, timeout=300)
            lesson.video_url = hls_url
        except Exception:
            lesson.video_url = playback_url
        lesson.lesson_type = "video"
    db.commit()
    db.refresh(lesson)
    return lesson


# --- 4. Interactive WebSockets Live Chat Room ---
@app.websocket("/ws/live-chat/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: int, db: Session = Depends(get_db)):
    token = websocket.query_params.get("token") or websocket.cookies.get("access_token")
    try:
        payload = auth.decode_token(token) if token else None
    except HTTPException:
        payload = None
    if not payload or payload.get("role") not in {"student", "teacher", "admin"}:
        await websocket.close(code=4401)
        return
    await chat_manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Expecting schema: {"sender_name": "Sarah", "sender_role": "student", "message": "Hi!"}
            chat_msg = models.ChatMessage(
                session_id=session_id,
                sender_name=data["sender_name"],
                sender_role=data["sender_role"],
                message=data["message"]
            )
            # Save history in PostgreSQL
            db.add(chat_msg)
            db.commit()
            db.refresh(chat_msg)

            # Broadcast back
            broadcast_payload = {
                "id": chat_msg.id,
                "session_id": session_id,
                "sender_name": chat_msg.sender_name,
                "sender_role": chat_msg.sender_role,
                "message": chat_msg.message,
                "time_sent": str(chat_msg.time_sent)
            }
            await chat_manager.broadcast(broadcast_payload, session_id)
    except WebSocketDisconnect:
        chat_manager.disconnect(websocket, session_id)


# --- 4. Blog/News Engine ---
@app.post("/api/blog", response_model=schemas.BlogPostResponse)
def create_blog_post(payload: schemas.BlogPostCreate, request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    post = models.BlogPost(
        title=payload.title,
        category=payload.category,
        excerpt=payload.excerpt,
        content_markdown=payload.content_markdown,
        featured_image_url=payload.featured_image_url or "/src/assets/images/placeholder.jpg",
        published=True
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post

@app.get("/api/blog", response_model=List[schemas.BlogPostResponse])
def list_blog_posts(db: Session = Depends(get_db)):
    return db.query(models.BlogPost).all()


# --- 5. Interactive Image Uploads ---
@app.post("/api/images")
async def upload_image(
    request: Request,
    category: str = Form(...),
    title: str = Form(...),
    alt_text: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    _require_admin(request)
    file_extension = (file.filename or "image").split(".")[-1].lower()
    if file_extension not in {"jpg", "jpeg", "png", "webp"}:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WebP images are supported.")
    safe_filename = f"{category}_{int(datetime.now().timestamp())}.{file_extension}"
    file_url, _size = await store_upload(file, "images", safe_filename, max_size=10 * 1024 * 1024)
        
    db_img = models.ImageUpload(
        title=title,
        category=category,
        path=file_url,
        alt_text=alt_text
    )
    db.add(db_img)
    db.commit()
    db.refresh(db_img)
    
    return {
        "id": db_img.id,
        "title": db_img.title,
        "category": db_img.category,
        "path": file_url,
        "alt_text": db_img.alt_text,
        "message": "Image uploaded successfully to server storage."
    }
