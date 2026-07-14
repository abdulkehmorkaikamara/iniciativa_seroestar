#!/usr/bin/env python3
"""
Small CLI helper to POST a local `portal_students` JSON file to the backend
`/api/migrate-students` endpoint. Usage:

  python3 scripts/migrate_students.py /path/to/portal_students.json http://localhost:8000

If backend URL is omitted, defaults to http://localhost:8000
"""
import sys
import json
from urllib import request as urlrequest


def post_json(url: str, payload: object):
    data = json.dumps(payload).encode("utf-8")
    req = urlrequest.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urlrequest.urlopen(req) as resp:
        return resp.read().decode("utf-8"), resp.getcode()


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/migrate_students.py /path/to/portal_students.json [BACKEND_URL]")
        sys.exit(1)

    path = sys.argv[1]
    backend = sys.argv[2] if len(sys.argv) >= 3 else "http://localhost:8000"
    endpoint = backend.rstrip("/") + "/api/migrate-students"

    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    print(f"Posting {len(payload)} records to {endpoint}...")
    body, code = post_json(endpoint, payload)
    print("Status:", code)
    print("Response:")
    print(body)


if __name__ == "__main__":
    main()
