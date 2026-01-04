"""
Gemini Grounding Helper Module
Uses Gemini 2.5 Flash with Google Search for real-time data
Replaces OpenWeather, Calendarific, and manual price lookups
"""

import os
import json
from google import genai
from google.genai import types

# Initialize Gemini client
client = None

def init_gemini():
    """Initialize Gemini client with API key"""
    global client
    
    # Load from environment
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    
    if not api_key or api_key == "your_gemini_key_here":
        print("⚠️ Gemini API key not configured in .env")
        return False
    
    try:
        # Initialize with API key
        client = genai.Client(api_key=api_key)
        print(f"✅ Gemini client initialized (key: {api_key[:10]}...)")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize Gemini: {e}")
        return False


def query_with_grounding(prompt: str, model: str = "gemini-2.5-flash") -> dict:
    """
    Query Gemini with Google Search grounding enabled
    Returns structured response with grounding metadata
    """
    global client
    
    if not client:
        if not init_gemini():
            return {"success": False, "error": "Gemini not initialized"}
    
    try:
        # Enable Google Search grounding
        grounding_tool = types.Tool(google_search=types.GoogleSearch())
        
        config = types.GenerateContentConfig(
            tools=[grounding_tool],
            temperature=0.1  # Lower temperature for factual responses
        )
        
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config
        )
        
        # Extract text and grounding metadata
        result = {
            "success": True,
            "text": response.text,
            "grounding_metadata": None,
            "sources": []
        }
        
        # Parse grounding metadata if available
        if hasattr(response, 'candidates') and len(response.candidates) > 0:
            candidate = response.candidates[0]
            if hasattr(candidate, 'grounding_metadata'):
                metadata = candidate.grounding_metadata
                result["grounding_metadata"] = {
                    "search_queries": getattr(metadata, 'web_search_queries', []),
                    "grounding_chunks": []
                }
                
                # Extract source URLs
                if hasattr(metadata, 'grounding_chunks'):
                    for chunk in metadata.grounding_chunks:
                        if hasattr(chunk, 'web'):
                            result["sources"].append({
                                "uri": chunk.web.uri,
                                "title": chunk.web.title
                            })
        
        return result
        
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_market_price(product_name: str) -> dict:
    """
    Get real-time market price using Gemini grounding
    Returns price in INR with sources
    """
    prompt = f"""What is the current average retail market price in India for {product_name}?

Return ONLY a JSON object with this exact format:
{{
    "product": "{product_name}",
    "price_inr": <number only>,
    "unit": "per piece/per kg/per liter",
    "source": "brief source description"
}}

Example response:
{{
    "product": "Britannia Bread 400g",
    "price_inr": 45,
    "unit": "per piece",
    "source": "Based on current Indian retail prices"
}}"""
    
    result = query_with_grounding(prompt)
    
    if not result["success"]:
        # Fallback to estimates
        return {"price_inr": 50.0, "estimated": True, "error": result.get("error")}
    
    try:
        # Parse JSON from response
        text = result["text"].strip()
        # Extract JSON (might be wrapped in markdown)
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        
        data = json.loads(text)
        data["grounded"] = True
        data["sources"] = result.get("sources", [])
        return data
        
    except Exception as e:
        print(f"⚠️ Failed to parse price response: {e}")
        print(f"Raw response: {result['text']}")
        # Extract number as fallback
        import re
        numbers = re.findall(r'\d+\.?\d*', result["text"])
        if numbers:
            return {
                "price_inr": float(numbers[0]),
                "estimated": False,
                "grounded": True,
                "note": "Extracted from grounded response"
            }
        return {"price_inr": 50.0, "estimated": True, "error": "Could not parse"}


def get_weather(city: str = "Mumbai", country: str = "India") -> dict:
    """
    Get real-time weather using Gemini grounding
    """
    prompt = f"""What is the current weather in {city}, {country}?

Return ONLY a JSON object with this exact format:
{{
    "city": "{city}",
    "temperature_celsius": <number>,
    "weather_condition": "Clear/Rainy/Cloudy/etc",
    "humidity_percent": <number>,
    "description": "brief weather description"
}}"""
    
    result = query_with_grounding(prompt)
    
    if not result["success"]:
        return {"error": result.get("error"), "estimated": True}
    
    try:
        text = result["text"].strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        
        data = json.loads(text)
        data["grounded"] = True
        data["sources"] = result.get("sources", [])
        return data
        
    except Exception as e:
        print(f"⚠️ Failed to parse weather: {e}")
        return {"error": str(e), "raw": result.get("text")}


def get_upcoming_festivals(country: str = "India", limit: int = 5) -> dict:
    """
    Get upcoming festivals using Gemini grounding
    """
    prompt = f"""What are the next {limit} major festivals and holidays in {country} starting from today?

Return ONLY a JSON array with this exact format:
[
    {{
        "name": "Festival Name",
        "date": "YYYY-MM-DD",
        "type": "National/Religious/Cultural",
        "description": "brief description"
    }}
]"""
    
    result = query_with_grounding(prompt)
    
    if not result["success"]:
        return {"error": result.get("error"), "festivals": []}
    
    try:
        text = result["text"].strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        
        festivals = json.loads(text)
        return {
            "festivals": festivals,
            "grounded": True,
            "sources": result.get("sources", []),
            "country": country
        }
        
    except Exception as e:
        print(f"⚠️ Failed to parse festivals: {e}")
        return {"error": str(e), "raw": result.get("text")}


def get_demand_prediction_data(product_name: str, city: str = "Mumbai") -> dict:
    """
    Get comprehensive data for demand prediction
    Combines weather, festivals, and market trends
    """
    prompt = f"""Analyze demand factors for {product_name} in {city}, India.

Consider:
1. Current weather conditions
2. Upcoming festivals in the next 7 days
3. Seasonal trends
4. Market demand patterns

Return ONLY a JSON object:
{{
    "product": "{product_name}",
    "city": "{city}",
    "weather": {{
        "condition": "current weather",
        "temperature": <number>,
        "impact": "High/Medium/Low demand impact"
    }},
    "upcoming_festivals": ["festival names in next 7 days"],
    "demand_forecast": "High/Medium/Low",
    "recommendation": "brief recommendation"
}}"""
    
    result = query_with_grounding(prompt)
    
    if not result["success"]:
        return {"error": result.get("error")}
    
    try:
        text = result["text"].strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        
        data = json.loads(text)
        data["grounded"] = True
        data["sources"] = result.get("sources", [])
        return data
        
    except Exception as e:
        print(f"⚠️ Failed to parse demand data: {e}")
        return {"error": str(e), "raw": result.get("text")}
