"""
🧪 Test Gemini Grounding Integration
Tests all grounding features with real-time data
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from gemini_grounding import (
    init_gemini,
    get_market_price,
    get_weather,
    get_upcoming_festivals,
    get_demand_prediction_data
)

def print_header(text):
    print(f"\n{'='*70}")
    print(f"  {text}")
    print(f"{'='*70}\n")

def print_json(data, indent=2):
    import json
    print(json.dumps(data, indent=indent, ensure_ascii=False))


def main():
    print("\n" + "="*70)
    print(" " * 15 + "🤖 GEMINI GROUNDING TEST")
    print(" " * 10 + "Real-Time Data via Google Search")
    print("="*70)
    
    # Initialize
    print("\n🔧 Initializing Gemini client...")
    if not init_gemini():
        print("❌ Failed to initialize. Check your Gemini API key.")
        return
    
    print("✅ Gemini client ready!\n")
    
    # Test 1: Market Price
    print_header("TEST 1: Market Price Lookup (Grounded)")
    print("Query: 'Britannia Bread 400g' price in India\n")
    
    price = data = get_market_price("Britannia Bread 400g")
    print("📊 Response:")
    print_json(price)
    
    if price.get("grounded"):
        print("\n✅ Successfully grounded with real-time data!")
        if price.get("sources"):
            print("\n📚 Sources:")
            for i, source in enumerate(price["sources"][:3], 1):
                print(f"   {i}. {source.get('title', 'Unknown')} - {source.get('uri', '')[:50]}...")
    
    # Test 2: Weather
    print_header("TEST 2: Weather Data (Grounded)")
    print("Query: Current weather in Mumbai, India\n")
    
    weather = get_weather("Mumbai", "India")
    print("🌤️ Response:")
    print_json(weather)
    
    if weather.get("grounded"):
        print("\n✅ Successfully grounded with real-time data!")
    
    # Test 3: Festivals
    print_header("TEST 3: Upcoming Festivals (Grounded)")
    print("Query: Next 5 festivals in India\n")
    
    festivals = get_upcoming_festivals("India", limit=5)
    print("🎉 Response:")
    print_json(festivals)
    
    if festivals.get("grounded"):
        print("\n✅ Successfully grounded with real-time data!")
    
    # Test 4: Demand Prediction Data
    print_header("TEST 4: Demand Prediction Data (Grounded)")
    print("Query: Demand factors for 'Amul Milk' in Mumbai\n")
    
    demand = get_demand_prediction_data("Amul Milk", "Mumbai")
    print("📈 Response:")
    print_json(demand)
    
    if demand.get("grounded"):
        print("\n✅ Successfully grounded with real-time data!")
    
    # Summary
    print_header("TEST SUMMARY")
    
    tests = [
        ("Market Price", price.get("grounded", False)),
        ("Weather", weather.get("grounded", False)),
        ("Festivals", festivals.get("grounded", False)),
        ("Demand Data", demand.get("grounded", False))
    ]
    
    passed = sum(1 for _, status in tests if status)
    
    for name, status in tests:
        symbol = "✅" if status else "❌"
        print(f"{symbol} {name}: {'GROUNDED' if status else 'FAILED'}")
    
    print(f"\n📊 Results: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("\n🎉 All grounding features working perfectly!")
        print("✨ All real-time data is now sourced from Google Search")
    elif passed > 0:
        print(f"\n⚠️ {len(tests) - passed} test(s) failed")
        print("Some features may fall back to estimates")
    else:
        print("\n❌ All tests failed")
        print("Check your Gemini API key and internet connection")
    
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    main()
