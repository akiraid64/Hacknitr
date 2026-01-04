"""
🧪 TOOL Inc API Keys Tester
Tests all external APIs to verify configuration
"""

import os
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}")
    print(f"  {text}")
    print(f"{'='*70}{Colors.RESET}\n")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.RESET}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.RESET}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.RESET}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.RESET}")


# ============================================
# TEST 1: GEMINI AI
# ============================================
def test_gemini_api():
    """Test Gemini AI API for market price lookups and NGO verification"""
    
    print_header("TEST 1: GEMINI AI API")
    
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
    
    if not api_key or api_key == "your_gemini_key_here":
        print_warning("Gemini API key not configured")
        print_info("Get your API key from: https://aistudio.google.com/app/apikey")
        print_info("Add to .env: GEMINI_API_KEY=your_key_here")
        return False
    
    print(f"🔑 API Key: {api_key[:15]}...")
    print(f"🤖 Model: {model}")
    
    try:
        print("\n🌐 Testing Gemini API...")
        
        # Use Gemini REST API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        headers = {
            "Content-Type": "application/json"
        }
        params = {
            "key": api_key
        }
        data = {
            "contents": [{
                "parts": [{
                    "text": "What is the current average retail price in India for Britannia Bread 400g? Return only the numerical price in INR without currency symbol."
                }]
            }]
        }
        
        response = requests.post(url, headers=headers, params=params, json=data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            
            if "candidates" in result and len(result["candidates"]) > 0:
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                print_success(f"API Response: {text.strip()}")
                print_success("Gemini API is WORKING! ✨")
                return True
            else:
                print_error(f"Unexpected response format: {result}")
                return False
                
        elif response.status_code == 400:
            print_error("Invalid API key or request format")
            print_info(f"Response: {response.json()}")
            return False
            
        else:
            print_error(f"API Error {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False


# ============================================
# TEST 2: OPENWEATHER API
# ============================================
def test_openweather_api():
    """Test OpenWeather API for weather-based demand predictions"""
    
    print_header("TEST 2: OPENWEATHER API")
    
    api_key = os.getenv("OPENWEATHER_API_KEY", "").strip()
    
    if not api_key or api_key == "your_openweather_key_here":
        print_warning("OpenWeather API key not configured")
        print_info("Get your API key from: https://openweathermap.org/api")
        print_info("Free tier: 1000 calls/day")
        print_info("Add to .env: OPENWEATHER_API_KEY=your_key_here")
        return False
    
    print(f"🔑 API Key: {api_key[:15]}...")
    print(f"📍 Testing location: Mumbai, India")
    
    try:
        print("\n🌐 Testing OpenWeather API...")
        
        # Test current weather endpoint
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "q": "Mumbai,IN",
            "appid": api_key,
            "units": "metric"
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            temp = data['main']['temp']
            weather = data['weather'][0]['description']
            humidity = data['main']['humidity']
            
            print_success(f"Temperature: {temp}°C")
            print_success(f"Weather: {weather}")
            print_success(f"Humidity: {humidity}%")
            print_success("OpenWeather API is WORKING! ☀️")
            return True
            
        elif response.status_code == 401:
            print_error("Invalid API key")
            print_info("Check your API key or activate it (may take a few hours)")
            return False
            
        else:
            print_error(f"API Error {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False


# ============================================
# TEST 3: CALENDARIFIC API
# ============================================
def test_calendarific_api():
    """Test Calendarific API for festival-based demand predictions"""
    
    print_header("TEST 3: CALENDARIFIC API")
    
    api_key = os.getenv("CALENDARIFIC_API_KEY", "").strip()
    base_url = os.getenv("CALENDARIFIC_BASE_URL", "https://calendarific.com/api/v2")
    country = os.getenv("CALENDARIFIC_COUNTRY", "IN")
    
    if not api_key:
        print_warning("Calendarific API key not configured")
        print_info("Get your API key from: https://calendarific.com/")
        print_info("Add to .env: CALENDARIFIC_API_KEY=your_key_here")
        return False
    
    print(f"🔑 API Key: {api_key[:15]}...")
    print(f"🌍 Country: {country}")
    print(f"📅 Year: {datetime.now().year}")
    
    try:
        print("\n🌐 Testing Calendarific API v2...")
        
        url = f"{base_url}/holidays"
        params = {
            "api_key": api_key,
            "country": country,
            "year": datetime.now().year,
            "type": "national,religious"
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("meta", {}).get("code") == 200:
                holidays = data.get("response", {}).get("holidays", [])
                
                print_success(f"Found {len(holidays)} holidays")
                print_info("Sample upcoming holidays:")
                
                # Show next 3 upcoming holidays
                today = datetime.now().date()
                upcoming = [h for h in holidays if datetime.fromisoformat(h['date']['iso']).date() >= today][:3]
                
                for holiday in upcoming:
                    name = holiday['name']
                    date = holiday['date']['iso']
                    print(f"   📆 {date}: {name}")
                
                print_success("Calendarific API is WORKING! 🎉")
                return True
            else:
                print_error(f"API returned error: {data}")
                return False
                
        elif response.status_code == 401:
            print_error("Invalid API key")
            return False
            
        elif response.status_code == 429:
            print_error("Rate limit exceeded (1000 requests/day)")
            return False
            
        else:
            print_error(f"API Error {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False


# ============================================
# MAIN TEST RUNNER
# ============================================
def main():
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("=" * 70)
    print(" " * 20 + "🧪 TOOL Inc API Tester")
    print(" " * 15 + "Testing All External API Keys")
    print("=" * 70)
    print(Colors.RESET)
    
    results = {
        "Gemini AI": test_gemini_api(),
        "OpenWeather": test_openweather_api(),
        "Calendarific": test_calendarific_api()
    }
    
    # Summary
    print_header("TEST SUMMARY")
    
    working = sum(results.values())
    total = len(results)
    
    for api_name, status in results.items():
        if status:
            print_success(f"{api_name}: WORKING")
        else:
            print_error(f"{api_name}: NOT CONFIGURED / FAILED")
    
    print(f"\n{Colors.BOLD}Results: {working}/{total} APIs working{Colors.RESET}")
    
    if working == total:
        print_success("\n🎉 All APIs are configured and working!")
        print_info("You can now enable AI features in Phase 4")
    elif working > 0:
        print_warning(f"\n⚠️  {total - working} API(s) need configuration")
        print_info("The platform will work with dummy data for missing APIs")
    else:
        print_warning("\n⚠️  No APIs configured")
        print_info("Platform will use dummy/estimated data")
        print_info("This is fine for development and testing!")
    
    print("\n" + "=" * 70 + "\n")


if __name__ == "__main__":
    main()
