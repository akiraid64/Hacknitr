"""
Simplified Market Price Lookup using Gemini API
Uses direct REST API instead of SDK to avoid initialization issues
"""

import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def get_market_price_simple(product_name: str) -> dict:
    """
    Get market price using Gemini REST API
    Returns price with grounding metadata if available
    """
    print(f"\n{'='*60}")
    print(f"🔍 Getting market price for: {product_name}")
    print(f"{'='*60}")
    
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    print(f"📋 API Key present: {bool(api_key)}")
    print(f"📋 API Key length: {len(api_key) if api_key else 0}")
    print(f"📋 API Key prefix: {api_key[:15]}..." if api_key else "None")
    print(f"📋 Model: {model}")
    
    if not api_key or api_key == "your_gemini_key_here":
        print("❌ API key not configured properly!")
        return {"price_inr": 50.0, "estimated": True, "error": "API key not configured"}
    
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        print(f"\n🌐 Request URL: {url}")
        
        prompt = f"""What is the current average retail market price in India for {product_name}?

Return ONLY a JSON object:
{{
    "price_inr": <number>,
    "source": "brief source"
}}

Example: {{"price_inr": 45, "source": "Indian retail market 2026"}}"""
        
        print(f"📝 Prompt length: {len(prompt)} characters")
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        
        print(f"📦 Payload prepared")
        print(f"⏳ Making API request...")
        
        response = requests.post(
            url,
            params={"key": api_key},
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=10
        )
        
        print(f"\n📡 Response Status: {response.status_code}")
        print(f"📡 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ API call successful!")
            
            data = response.json()
            print(f"📄 Response keys: {list(data.keys())}")
            
            if "candidates" in data and len(data["candidates"]) > 0:
                print(f"✅ Found {len(data['candidates'])} candidate(s)")
                
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                print(f"📝 Response text length: {len(text)} characters")
                print(f"📝 Response text preview:\n{text[:200]}...")
                
                # Extract JSON
                original_text = text
                if "```json" in text:
                    print("🔧 Extracting JSON from markdown...")
                    text = text.split("```json")[1].split("```")[0]
                elif "```" in text:
                    print("🔧 Extracting JSON from code block...")
                    text = text.split("```")[1].split("```")[0]
                
                print(f"📝 Cleaned text:\n{text[:200]}")
                
                try:
                    result = json.loads(text.strip())
                    print(f"✅ JSON parsed successfully!")
                    print(f"📊 Parsed data: {result}")
                    
                    result["success"] = True
                    result["product"] = product_name
                    print(f"\n🎉 SUCCESS! Price for {product_name}: ₹{result.get('price_inr')}")
                    return result
                    
                except json.JSONDecodeError as je:
                    print(f"⚠️ JSON parsing failed: {je}")
                    print(f"⚠️ Attempting number extraction...")
                    
                    # Fallback: extract number
                    import re
                    numbers = re.findall(r'\d+\.?\d*', original_text)
                    print(f"🔢 Found numbers: {numbers}")
                    
                    if numbers:
                        price = float(numbers[0])
                        print(f"✅ Extracted price: ₹{price}")
                        return {
                            "price_inr": price,
                            "success": True,
                            "source": "Gemini AI",
                            "product": product_name,
                            "note": "Extracted from text"
                        }
            else:
                print(f"❌ No candidates in response!")
                print(f"📄 Full response: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ API returned error status: {response.status_code}")
            print(f"📄 Response body: {response.text[:500]}")
        
        print(f"\n⚠️ Falling back to estimate")
        return {"price_inr": 50.0, "estimated": True, "error": f"API returned {response.status_code}"}
        
    except requests.exceptions.Timeout:
        print(f"❌ Request timeout after 10 seconds")
        return {"price_inr": 50.0, "estimated": True, "error": "Timeout"}
        
    except Exception as e:
        print(f"❌ Exception occurred: {type(e).__name__}")
        print(f"❌ Error message: {str(e)}")
        import traceback
        print(f"📜 Traceback:\n{traceback.format_exc()}")
        return {"price_inr": 50.0, "estimated": True, "error": str(e)}


def get_fallback_price(product_name: str) -> float:
    """Fallback price estimates"""
    product_lower = product_name.lower()
    
    if 'bread' in product_lower:
        return 40.0
    elif 'butter' in product_lower and '500' in product_lower:
        return 250.0
    elif 'butter' in product_lower:
        return 50.0
    elif 'biscuit' in product_lower:
        return 30.0
    elif 'rice' in product_lower:
        return 80.0
    elif 'milk' in product_lower:
        return 60.0
    else:
        return 50.0


# Quick test
if __name__ == "__main__":
    print("\n🧪 Testing Gemini Market Price API\n")
    
    result = get_market_price_simple("Britannia Bread 400g")
    print(f"\nResult: {json.dumps(result, indent=2)}")
    
    if result.get("success"):
        print("\n✅ Gemini API working!")
    else:
        print("\n⚠️ Using fallback estimates")
