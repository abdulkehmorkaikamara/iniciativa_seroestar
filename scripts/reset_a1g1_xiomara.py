#!/usr/bin/env python3
"""
Hand-over of A1G1 from Xiomara to Ivoneth.

Removes everything Xiomara created (live classes with their attendance, chat
and recordings, recorded classes, shared notes) and resets the lesson
progress of every A1G1 student to 0%.

Dry run by default: prints what would be deleted and writes a JSON backup of
those rows. Nothing is deleted unless --apply is passed.

  DATABASE_URL=postgresql://... python3 scripts/reset_a1g1_xiomara.py
  DATABASE_URL=postgresql://... python3 scripts/reset_a1g1_xiomara.py --apply
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import false, func, inspect, or_  # noqa: E402

from backend import models  # noqa: E402
from backend.database import SessionLocal, database_description  # noqa: E402

XIOMARA_NAMES = ["xiomara villamizar", "tutora xiomara villamizar", "xiomara"]
XIOMARA_EMAILS = ["xiomara@seroestar.com", "xiomara@iseroestar.com"]


def row_to_dict(row):
    values = {}
    for column in inspect(row).mapper.column_attrs:
        value = getattr(row, column.key)
        values[column.key] = value.isoformat() if isinstance(value, datetime) else value
    return values


def is_a1g1(student):
    level = (student.course_level or "").upper()
    group = (student.class_group or "").lower()
    in_other_group = bool(re.search(r"\b([2-9]|\d\d+)\b", group)) or "evening" in group
    return "A1" in level and not in_other_group


def collect(db):
    name_match = func.lower(func.trim(models.LiveClassSession.teacher_name)).in_(XIOMARA_NAMES)
    sessions = db.query(models.LiveClassSession).filter(name_match).all()
    session_ids = [s.id for s in sessions]

    recordings = db.query(models.RecordedClass).filter(
        or_(
            func.lower(func.trim(models.RecordedClass.teacher_name)).in_(XIOMARA_NAMES),
            models.RecordedClass.session_id.in_(session_ids) if session_ids else false(),
        )
    ).all()
    notes = db.query(models.LessonNote).filter(
        func.lower(func.trim(models.LessonNote.created_by)).in_(XIOMARA_NAMES + XIOMARA_EMAILS)
    ).all()
    attendance = (
        db.query(models.AttendanceRecord).filter(models.AttendanceRecord.session_id.in_(session_ids)).all()
        if session_ids else []
    )
    chat = (
        db.query(models.ChatMessage).filter(models.ChatMessage.session_id.in_(session_ids)).all()
        if session_ids else []
    )

    a1g1_students = [s for s in db.query(models.StudentProfile).all() if is_a1g1(s)]
    student_ids = [s.id for s in a1g1_students]
    progress = (
        db.query(models.LessonProgress).filter(models.LessonProgress.student_id.in_(student_ids)).all()
        if student_ids else []
    )

    return {
        # Children first, so deleting in this order respects foreign keys.
        "attendance_records": attendance,
        "chat_messages": chat,
        "recorded_classes": recordings,
        "live_class_sessions": sessions,
        "lesson_notes": notes,
        "lesson_progress (A1G1 students)": progress,
    }, a1g1_students


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="actually delete the rows (after writing the backup)")
    parser.add_argument("--backup-dir", default="backups")
    args = parser.parse_args()

    if not os.getenv("DATABASE_URL"):
        sys.exit("Set DATABASE_URL to the database you mean to change.")

    print(f"Database: {database_description()}")
    db = SessionLocal()
    try:
        groups, a1g1_students = collect(db)

        print(f"\nA1G1 students ({len(a1g1_students)}):")
        for student in a1g1_students:
            print(f"  {student.student_id_code}  {student.course_level}  {student.class_group}")
        print("\nRows to delete:")
        for label, rows in groups.items():
            print(f"  {label}: {len(rows)}")

        backup_dir = Path(args.backup_dir)
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = backup_dir / f"a1g1_xiomara_{datetime.now():%Y%m%d_%H%M%S}.json"
        backup = {label: [row_to_dict(r) for r in rows] for label, rows in groups.items()}
        backup["a1g1_students"] = [row_to_dict(s) for s in a1g1_students]
        backup_path.write_text(json.dumps(backup, indent=2, default=str))
        print(f"\nBackup written to {backup_path}")

        if not args.apply:
            print("Dry run: nothing deleted. Re-run with --apply to delete.")
            return

        for rows in groups.values():
            for row in rows:
                db.delete(row)
        db.commit()
        print("Deleted.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
