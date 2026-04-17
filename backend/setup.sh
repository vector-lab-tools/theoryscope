#!/usr/bin/env bash
# Theoryscope backend setup.
# Creates a local Python 3.11+ virtualenv and installs dependencies.

set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d .venv ]; then
    python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

echo
echo "Theoryscope backend ready."
echo "Run:   source backend/.venv/bin/activate && uvicorn main:app --reload --port 8000"
