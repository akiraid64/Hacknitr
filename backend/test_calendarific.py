"""
Test Calendarific API v2 Integration
Run this to verify your API key works!
"""

import os
import requests
from datetime import datetime

# Load from .env
CALENDARIFIC_API_KEY = "xpbB4zN2I6C9OJLRCbaGNUiifz2IXAJ"
CALENDARIFIC_BASE_URL = "https://calendarific.com/api/v2"
COUNTRY = "IN"  # India
YEAR = datetime.now().year

def test_calendarific_api():
    """Test Calendarific API v2"""
    
    print("🧪 Testing Calendarific API v2...")
    print(f"📍 Country: {COUNTRY}")
    print(f"📅 Year: {YEAR}")
    print(f"🔑 API Key: {CALENDARIFIC_API_KEY[:10]}...")
    print("-" * 60)
    
    # Build request URL
    url = f"{CALENDARIFIC_BASE_URL}/holidays"
    params = {
        "api_key": CALENDARIFIC_API_KEY,
        "country": COUNTRY,
        "year": YEAR,
        "type": "national,religious"  # Get national & religious holidays
    }
    
    try:
        print("\n🌐 Making API request...")
        response = requests.get(url, params=params, timeout=10)
        
        print(f"📡 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("meta", {}).get("code") == 200:
                holidays = data.get("response", {}).get("holidays", [])
                
                print(f"\n✅ SUCCESS! Found {len(holidays)} holidays for {COUNTRY} in {YEAR}")
                print("\n🎉 Sample Holidays:")
                print("-" * 60)
                
                for holiday in holidays[:5]:  # Show first 5
                    name = holiday.get("name")
                    date = holiday.get("date", {}).get("iso")
                    types = ", ".join(holiday.get("type", []))
                    
                    print(f"📆 {date} | {name}")
                    print(f"   Type: {types}")
                    print()
                
                print("✨ Calendarific API is working perfectly!")
                return True
            else:
                print(f"❌ API Error: {data}")
                return False
                
        elif response.status_code == 401:
            print("❌ UNAUTHORIZED - Invalid API key")
            print("Get a new key from: https://calendarific.com/")
            return False
            
        elif response.status_code == 422:
            print("❌ INVALID PARAMETERS")
            print(f"Response: {response.json()}")
            return False
            
        elif response.status_code == 429:
            print("❌ RATE LIMIT EXCEEDED")
            print("You've hit the 1000 requests/day limit")
            return False
            
        else:
            print(f"❌ Unexpected error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ REQUEST TIMEOUT - API took too long to respond")
        return False
        
    except requests.exceptions.RequestException as e:
        print(f"❌ REQUEST FAILED: {e}")
        return False
        
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        return False


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  CALENDARIFIC API v2 TEST")
    print("=" * 60 + "\n")
    
    success = test_calendarific_api()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ TEST PASSED - API is ready to use!")
    else:
        print("❌ TEST FAILED - Check the errors above")
    print("=" * 60 + "\n")
