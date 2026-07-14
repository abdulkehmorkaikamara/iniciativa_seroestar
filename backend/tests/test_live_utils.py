import unittest

from backend.live_utils import build_room_name, build_room_url


class LiveUtilsTests(unittest.TestCase):
    def test_build_room_name_sanitizes_title(self):
        self.assertEqual(build_room_name(42, "Ser vs Estar Basics"), "ser-vs-estar-basics-42")

    def test_build_room_url_uses_daily_domain_when_provided(self):
        self.assertEqual(
            build_room_url("ser-vs-estar-basics-42", "example.daily.co"),
            "https://example.daily.co/ser-vs-estar-basics-42",
        )


if __name__ == "__main__":
    unittest.main()
