#!/usr/bin/env python3
"""A basic check of a question bank, for when Node isn't available. Prefer validate.mjs.

Usage: python scripts/check_schema.py bank.json

This covers only the file's shape. The app also checks exam and category names, and warns about
likely mistakes, when the file is uploaded.
"""
import json
import subprocess
import sys
from pathlib import Path

SCHEMA = Path(__file__).resolve().parent.parent / "assets" / "question-bank.schema.json"
MAX_ERRORS_SHOWN = 30


def load_validator():
    try:
        import jsonschema
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "jsonschema"], check=True)
        import jsonschema
    return jsonschema.Draft202012Validator(json.loads(SCHEMA.read_text(encoding="utf-8")))


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    try:
        bank = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
    except FileNotFoundError:
        print(f"ERROR: no file at {sys.argv[1]}")
        return 1
    except json.JSONDecodeError as error:
        print(f"ERROR: not valid JSON: {error}")
        return 1

    errors = sorted(load_validator().iter_errors(bank), key=lambda error: list(map(str, error.absolute_path)))
    for error in errors[:MAX_ERRORS_SHOWN]:
        where = ".".join(map(str, error.absolute_path)) or "the file"
        print(f"ERROR at {where}: {error.message[:300]}")
    if len(errors) > MAX_ERRORS_SHOWN:
        print(f"...and {len(errors) - MAX_ERRORS_SHOWN} more")
    if errors:
        return 1

    questions = sum(len(chapter["questions"]) for chapter in bank["chapters"])
    omitted = len(bank.get("omitted", []))
    print(f"OK: the shape is valid. {questions} questions, {omitted} omitted. Only basic checks ran.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
