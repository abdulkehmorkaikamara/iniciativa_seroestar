import re


def group_number(class_group: str | None) -> int:
    """Group number for a stored class_group ("Group 1", "Group 2", "Group 3").

    Mirrors ``groupNumberFrom`` in src/groups.ts: legacy values such as
    "Morning Group" count as Group 1 and "Evening" as Group 2.
    """
    text = class_group or ""
    if re.search(r"(?:group|grupo|g)[\s-]*3\b", text, re.IGNORECASE):
        return 3
    if re.search(r"(?:group|grupo|g)[\s-]*2\b", text, re.IGNORECASE) or re.search(r"evening", text, re.IGNORECASE):
        return 2
    return 1


def content_in_group(content_group: str | None, student_group: str | None) -> bool:
    """Content without a school is shared with the whole level."""
    return not content_group or group_number(content_group) == group_number(student_group)
