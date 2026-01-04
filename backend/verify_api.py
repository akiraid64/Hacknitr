import requests
import json

BASE_URL = "http://localhost:8000"

def test_api():
    print("🚀 Starting API Verification...")
    
    # 1. Signup
    signup_data = {
        "email": "factory_test_final@test.com",
        "password": "password123",
        "role": "manufacturer",
        "name": "Test Factory",
        "company": "Test Co",
        "wallet_address": "0x123456789ABCDEF"
    }
    
    print(f"\n1. Testing Signup with: {signup_data['email']}")
    try:
        res = requests.post(f"{BASE_URL}/auth/signup", json=signup_data)
        if res.status_code == 200:
            print("✅ Signup Successful")
            print(res.json())
        elif res.status_code == 400 and "already exists" in res.text:
            print("⚠️ User already exists, proceeding to login...")
        else:
            print(f"❌ Signup Failed: {res.text}")
            return
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return

    # 2. Login
    print("\n2. Testing Login...")
    login_data = {
        "email": "factory_test_final@test.com",
        "password": "password123"
    }
    
    res = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if res.status_code != 200:
        print(f"❌ Login Failed: {res.text}")
        return
        
    token = res.json()['token']
    print(f"✅ Login Successful. Token: {token[:10]}...")

    # 3. Generate QR (Manufacturer)
    print("\n3. Testing Manufacturer QR Generation...")
    qr_data = {
        "product_name": "Test Product",
        "gtin": "09506000134352",
        "gstin": "27AAACW5888R1Z2",
        "batch_id": "TEST-BATCH-001",
        "item_count": 100,
        "manufacturing_date": "2025-01-01",
        "expiry_date": "2025-12-31",
        "weight_kg": 5.5
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(f"{BASE_URL}/manufacturer/generate-qr", json=qr_data, headers=headers)
    
    if res.status_code == 200:
        print("✅ QR Generation Successful")
        print(f"   URL: {res.json()['digital_link_url']}")
    else:
        print(f"❌ QR Generation Failed: {res.text}")

if __name__ == "__main__":
    test_api()
