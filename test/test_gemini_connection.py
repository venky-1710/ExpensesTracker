import google.generativeai as genai
import os

# Setup API Key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    try:
        with open("server/.env", "r") as f:
            for line in f:
                if line.startswith("GEMINI_API_KEY"):
                    api_key = line.split("=")[1].strip().strip('"')
                    break
    except FileNotFoundError:
        print("No .env found and no GEMINI_API_KEY env var.")

if not api_key:
    print("Error: GEMINI_API_KEY not found.")
    exit(1)

genai.configure(api_key=api_key)

print("Initializing Gemini-2.0-Flash...")
try:
    model = genai.GenerativeModel('gemini-flash-latest')
    response = model.generate_content("Hello, can you hear me?")
    print(f"Response: {response.text}")
    print("SUCCESS: Model works!")
except Exception as e:
    print(f"FAILED: {e}")
