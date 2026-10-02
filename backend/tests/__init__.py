"""Keep the test suite independent of the developer's local ``.env``.

``backend.database`` calls ``load_dotenv()`` at import time, which would pull a
local ``DATABASE_URL`` (often a Postgres server that isn't running) and other
secrets back in after a test has cleared them. This package is imported before
any test module, and before any test imports the backend, so disabling it here
covers every test, including those that re-import the backend to simulate a
restart.
"""

import dotenv


def _skip_dotenv(*_args, **_kwargs) -> bool:
    return False


dotenv.load_dotenv = _skip_dotenv
