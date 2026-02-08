import requests
import sys
import uuid
import time

BASE_URL = "http://localhost:8000"


def test_api():
    print("Starting API Verification...")
    session = requests.Session()
    
    # 1. Test Root Redirect
    print("\n1. Testing Root Redirect...")
    try:
        r = session.get(BASE_URL, allow_redirects=False)
        if r.status_code in [301, 302, 307] and "/docs" in r.headers.get("Location", ""):
            print("Root redirect working")
        elif r.status_code == 200 and "swagger-ui" in r.text.lower():
             # If allow_redirects=True by default or if it already followed
             print("Root redirect working (landed on swagger)")
        else:
             # Fastapi RedirectResponse is 307 by default
             print(f"Root endpoint response: {r.status_code}")
    except Exception as e:
        print(f"Root redirect failed: {e}")

    # 2. Signup
    print("\n2. Testing Signup...")
    email = f"test_{uuid.uuid4()}@example.com"
    username = f"user_{uuid.uuid4().hex[:8]}"
    password = "StrongPassword123!"
    
    payload = {
        "email": email,
        "username": username,
        "password": password,
        "full_name": "Test User",
        "phone": "1234567890"
    }
    
    try:
        r = session.post(f"{BASE_URL}/auth/signup", json=payload)
        if r.status_code == 201:
            print(f"Signup successful: {email}")
            user_data = r.json()
        else:
            print(f"Signup failed: {r.status_code} - {r.text}")
            return
    except Exception as e:
        print(f"Signup exception: {e}")
        return

    # 3. Login
    print("\n3. Testing Login...")
    try:
        login_data = {
            "username": email,
            "password": password
        }
        r = session.post(f"{BASE_URL}/auth/login", data=login_data)
        if r.status_code == 200:
            print("Login successful")
            token_data = r.json()
            token = token_data["access_token"]
            
            # Check Cookie
            if "access_token" in r.cookies:
                print("Cookie 'access_token' set")
            else:
                print("Cookie 'access_token' NOT set (might be creating issue if browser expects it)")
        else:
            print(f"Login failed: {r.status_code} - {r.text}")
            return
    except Exception as e:
        print(f"Login exception: {e}")
        return

    # 4. Get Profile (Auth check)
    print("\n4. Testing /users/me...")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        r = session.get(f"{BASE_URL}/users/me", headers=headers)
        if r.status_code == 200:
            print(f"Profile fetch successful: {r.json()['email']}")
        else:
            print(f"Profile fetch failed: {r.status_code} - {r.text}")
    except Exception as e:
         print(f"Profile fetch exception: {e}")

    # 5. Create Transaction
    print("\n5. Testing Create Transaction...")
    try:
        tx_payload = {
            "amount": 150.50,
            "type": "credit",
            "category": "Salary",
            "description": "Initial Deposit",
            "payment_method": "Bank Transfer",
            "date": "2023-10-27T10:00:00"
        }
        r = session.post(f"{BASE_URL}/transactions", json=tx_payload, headers=headers)
        if r.status_code == 201:
            print("Transaction created")
            tx_id = r.json()['id']
        else:
            print(f"Transaction creation failed: {r.status_code} - {r.text}")
            return
    except Exception as e:
        print(f"Transaction creation exception: {e}")

    # 6. List Transactions
    print("\n6. Testing List Transactions...")
    try:
        r = session.get(f"{BASE_URL}/transactions?limit=5", headers=headers)
        if r.status_code == 200:
            data = r.json()
            if len(data['transactions']) > 0:
                print(f"Listed {len(data['transactions'])} transactions")
            else:
                print("Listed 0 transactions (unexpected)")
        else:
             print(f"List transactions failed: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"List transactions exception: {e}")

    # 7. Dashboard KPIs
    print("\n7. Testing Dashboard KPIs...")
    try:
        r = session.get(f"{BASE_URL}/dashboard/kpis?filter_type=month", headers=headers)
        if r.status_code == 200:
            print("KPIs fetched successfully")
            print(r.json()['data'])
        else:
            print(f"KPIs fetch failed: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"KPIs fetch exception: {e}")

    print("\nVerification Complete!")


if __name__ == "__main__":
    test_api()
