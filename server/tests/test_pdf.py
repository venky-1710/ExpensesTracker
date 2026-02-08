import requests
import time

BASE_URL = "http://localhost:8000"
USER_EMAIL = f"test_pdf_{int(time.time())}@example.com"
PASSWORD = "password123"

def test_enhanced_pdf():
    # 1. Signup & Login
    print(f"[INFO] Registering user: {USER_EMAIL}...")
    signup_payload = {
        "email": USER_EMAIL,
        "username": USER_EMAIL.split("@")[0],
        "password": PASSWORD,
        "full_name": "PDF Test User"
    }
    requests.post(f"{BASE_URL}/auth/signup", json=signup_payload)
    
    print("[INFO] Logging in...")
    login_resp = requests.post(f"{BASE_URL}/auth/login", data={"username": USER_EMAIL, "password": PASSWORD})
    if login_resp.status_code != 200:
        print(f"[ERROR] Login failed: {login_resp.text}")
        return
        
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Dummy Transactions
    print("[INFO] Creating dummy transactions...")
    requests.post(f"{BASE_URL}/transactions", json={
        "amount": 5000, "type": "credit", "category": "Salary", 
        "description": "Salary Oct", "payment_method": "Bank Transfer",
        "date": "2023-10-01T10:00:00"
    }, headers=headers)
    
    requests.post(f"{BASE_URL}/transactions", json={
        "amount": 1200, "type": "debit", "category": "Rent", 
        "description": "Monthly Rent", "payment_method": "Bank Transfer",
        "date": "2023-10-02T10:00:00"
    }, headers=headers)

    # 3. Test PDF Export
    print("\n[TEST] Exporting as Enhanced PDF...")
    resp = requests.get(f"{BASE_URL}/transactions/export?format=pdf", headers=headers)
    
    if resp.status_code == 200 and "application/pdf" in resp.headers["content-type"]:
        print("[SUCCESS] PDF export successful.")
        # Optional: Save to check visually
        # with open("enhanced_report.pdf", "wb") as f:
        #     f.write(resp.content)
    else:
        print(f"[ERROR] PDF Export failed: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    test_enhanced_pdf()
