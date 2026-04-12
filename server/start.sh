#!/bin/bash
# Start script for Render
# Falls back to uvicorn if gunicorn is overkill
uvicorn app:app --host 0.0.0.0 --port ${PORT:-10000}
