TUTOR_PROFILES = [
    {
        "id": "xiomara-villamizar",
        "name": "Xiomara Villamizar",
        "display_name": "Tutora Xiomara Villamizar",
        "email": "xiomara@seroestar.com",
        "assigned_levels": ["A1", "A2"],
    },
    {
        "id": "ivoneth-frias",
        "name": "Ivoneth Frias",
        "display_name": "Tutora Ivoneth Frias",
        "email": "ivoneth@seroestar.com",
        "assigned_levels": ["A1", "A2"],
    },
    {
        "id": "guerly",
        "name": "Guerly",
        "display_name": "Tutora Guerly",
        "email": "guerly@seroestar.com",
        "assigned_levels": ["A1", "A2"],
    },
    {
        "id": "lashika",
        "name": "Lashika",
        "display_name": "Tutora Lashika",
        "email": "lashika@seroestar.com",
        "assigned_levels": ["A1", "A2"],
    },
]


def find_tutor_by_email(email):
    if not email:
        return TUTOR_PROFILES[0]
    return next((tutor for tutor in TUTOR_PROFILES if tutor["email"].lower() == email.lower()), TUTOR_PROFILES[0])


def find_tutor_by_name(name):
    if not name:
        return TUTOR_PROFILES[0]
    normalized = name.lower()
    return next(
        (
            tutor
            for tutor in TUTOR_PROFILES
            if tutor["name"].lower() == normalized or tutor["display_name"].lower() == normalized
        ),
        TUTOR_PROFILES[0],
    )
