#!/bin/bash
set -e
cd "$(dirname "$0")"

# Create venv if needed
if [ ! -d ".venv" ]; then
  echo "Creating virtual environment…"
  python3 -m venv .venv
fi

# Install dependencies
.venv/bin/pip install -q -r requirements.txt

# Copy .env.example to .env if .env doesn't exist
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created .env from .env.example — add your GEMINI_API_KEY to enable AI features."
fi

echo ""
echo "Starting Handoff on http://localhost:5010"
echo ""
.venv/bin/python app.py
