#!/usr/bin/env python3
"""Create or inspect the default portal accounts in the persistent database.

    python scripts/seed_accounts.py            # create anything missing
    python scripts/seed_accounts.py --list     # show what is stored, no writes
    python scripts/seed_accounts.py --reset-passwords

The API runs the same bootstrap on startup, so this script is only needed to
provision a database ahead of time, to check what is stored, or to recover a
forgotten default password.
"""

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend import roles  # noqa: E402
from backend.database import SessionLocal, database_description  # noqa: E402
from backend.models import User  # noqa: E402
from backend.seed import DEFAULT_ACCOUNTS, run_startup_bootstrap  # noqa: E402


def list_accounts() -> int:
    print(f"Database: {database_description()}\n")
    with SessionLocal() as db:
        users = db.query(User).order_by(User.id).all()
        if not users:
            print("No accounts stored yet. Run this script without --list to create the defaults.")
            return 0
        print(f"{'ID':<5}{'EMAIL':<36}{'ROLE':<12}{'ACTIVE':<8}{'SEEDED':<8}LAST LOGIN")
        for user in users:
            last_login = user.last_login_at.isoformat(timespec="seconds") if user.last_login_at else "never"
            print(
                f"{user.id:<5}{user.email:<36}{roles.normalize_role(user.role):<12}"
                f"{str(bool(user.is_active)):<8}{str(bool(user.is_seeded)):<8}{last_login}"
            )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--list", action="store_true", help="show stored accounts without writing anything")
    parser.add_argument(
        "--reset-passwords",
        action="store_true",
        help="reset the default accounts back to their configured passwords",
    )
    args = parser.parse_args()

    if args.list:
        return list_accounts()

    if args.reset_passwords:
        os.environ["SEED_RESET_PASSWORDS"] = "true"

    summary = run_startup_bootstrap()
    if not summary.get("ok"):
        print(f"\nBootstrap did not complete: {summary.get('error')}", file=sys.stderr)
        return 1

    if not summary["created"] and not summary["reset"]:
        print("\nNothing to do: every default account already exists.")
    print("\nConfigured default accounts:")
    for account in DEFAULT_ACCOUNTS:
        print(f"  {account.role:<10} {account.email()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
