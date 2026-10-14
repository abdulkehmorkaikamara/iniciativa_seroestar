import re


def group_number(class_group: str | None) -> int:
    """Group number for a stored class_group ("Group 1", "Group 2", ...).

    Mirrors ``groupNumberFrom`` in src/groups.ts: legacy values such as
    "Morning Group" count as Group 1 and "Evening" as Group 2.
    """
    text = class_group or ""
    numbered = re.search(r"(?:group|grupo|g)[\s-]*(\d+)\b", text, re.IGNORECASE)
    if numbered:
        return int(numbered.group(1)) or 1
    return 2 if re.search(r"evening", text, re.IGNORECASE) else 1


def content_in_group(content_group: str | None, student_group: str | None) -> bool:
    """Content without a school is shared with the whole level."""
    return not content_group or group_number(content_group) == group_number(student_group)
