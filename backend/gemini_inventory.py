"""
Additional Gemini function for retailer inventory analysis
"""

import gemini_grounding
from google.genai import types

def analyze_inventory_for_recommendations(inventory_data):
    """
    Use Gemini with grounding to analyze retailer inventory and generate
    contextual discount and bundle recommendations
    
    Args:
        inventory_data: List of dicts with product info (name, gtin, expiry, etc.)
    
    Returns:
        Dict with discounts and bundles in strict JSON format
    """
    
    # Ensure Gemini is initialized
    if not gemini_grounding.client:
        if not gemini_grounding.init_gemini():
            return {"recommendations": {"discounts": [], "bundles": []}}
    
    try:
        from datetime import datetime
        import json
        
        print(f"🤖 Analyzing {len(inventory_data)} products for AI recommendations...")
        
        # Prepare inventory summary for Gemini
        inventory_summary = []
        for product in inventory_data:
            inventory_summary.append({
                "id": product.get('product_id'),
                "name": product.get('product_name', 'Unknown'),
                "gtin": product.get('gtin'),
                "batch": product.get('batch_id'),
                "expiry": product.get('expiry_date'),
                "days_remaining": product.get('days_remaining', 0)
            })
        
        # Build prompt with strict JSON schema
        today = datetime.now().strftime('%Y-%m-%d')
        
        prompt = f"""Today is {today}. 

You are a smart retail pricing assistant with access to real-time data via Google Search grounding.

**YOUR TASK:**
Analyze the retailer's inventory and provide actionable recommendations based on:
1. Product expiry dates
2. CURRENT WEATHER conditions (use grounding - get actual temperature and conditions)
3. UPCOMING FESTIVALS & HOLIDAYS in India (use grounding - find next 2-3 events)
4. Recent market trends (use grounding)

**INVENTORY:**
{json.dumps(inventory_summary, indent=2)}

**CRITICAL INSTRUCTIONS:**
- Use Google Search grounding to get REAL current weather in major Indian cities
- Use Google Search grounding to find ACTUAL upcoming festivals/holidays in India  
- In the "context_data" section, include the ACTUAL weather and festivals you found
- Recommend discounts that make sense with weather (e.g., cold drinks on hot days)
- Suggest bundles for upcoming festivals
- Include actual weather/festival details in recommendation reasons

**OUTPUT FORMAT (STRICT JSON):**
{{
  "context_data": {{
    "weather": "<actual weather description with temperature, e.g., 'Hot and sunny, 32°C in Mumbai'>",
    "festivals": ["<festival 1 name and date>", "<festival 2 name and date>"],
    "stock_suggestions": "<what to stock based on weather and festivals>"
  }},
  "recommendations": {{
    "discounts": [
      {{
        "product_id": <id from inventory>,
        "product_name": "<exact name>",
        "discount_percentage": <10-50>,
        "reason": "<MUST mention specific weather temp/festival with dates>",
        "context": "expiry|weather|festival|news"
      }}
    ],
    "bundles": [
      {{
        "bundle_name": "<name mentioning festival/weather>",
        "product_ids": [<array of IDs>],
        "products": [{{"name": "...", "gtin": "..."}}],
        "discount_percentage": <15-40>,
        "reason": "<why bundle makes sense with specific weather/festival details>",
        "context": "complementary|festival|seasonal"
      }}
    ]
  }}
}}

**EXAMPLE GOOD CONTEXT_DATA:**
{{
  "context_data": {{
    "weather": "Hot and humid, 35°C in Delhi with sunny skies",
    "festivals": ["Republic Day - January 26, 2026", "Basant Panchami - February 3, 2026"],
    "stock_suggestions": "Stock cold beverages, ice creams for hot weather. Stock sweets and snacks for Republic Day celebrations."
  }}
}}

Return ONLY valid JSON with ACTUAL weather and festival data from grounding."""

        # Enable grounding
        grounding_tool = types.Tool(google_search=types.GoogleSearch())
        
        config = types.GenerateContentConfig(
            tools=[grounding_tool],
            temperature=0.7,
            response_mime_type="application/json"
        )
        
        # Call Gemini using the module's client
        print(f"[DEBUG] Calling Gemini API...")
        response = gemini_grounding.client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config=config
        )
        
        print(f"[DEBUG] Response object: {response}")
        print(f"[DEBUG] Response text: {response.text if response else 'None'}")
        
        if not response or not response.text:
            print("❌ Empty response from Gemini")
            return {"recommendations": {"discounts": [], "bundles": []}}
        
        # Parse JSON response - strip markdown code fences if present
        response_text = response.text.strip()
        
        # Remove markdown code fences more aggressively
        # Strip opening fence (```json or ``` or ```\n)
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            # Skip first line if it's just ``` or ```json
            if lines[0].strip() in ['```', '```json', '```JSON']:
                response_text = '\n'.join(lines[1:])
            else:
                # In case ``` is on same line as JSON
                response_text = response_text[3:]  # Remove the ```
        
        # Strip closing fence
        if response_text.endswith('```'):
            response_text = response_text[:-3].strip()
        
        # If there's still a fence somewhere, remove everything after last closing fence
        last_fence_pos = response_text.rfind('```')
        if last_fence_pos > 0:
            response_text = response_text[:last_fence_pos].strip()
        
        # Sometimes Gemini duplicates the JSON - find first complete JSON object
        # Count braces to find first complete object
        if response_text.count('{') > 1:
            brace_count = 0
            end_pos = 0
            for i, char in enumerate(response_text):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_pos = i + 1
                        break
            if end_pos > 0:
                response_text = response_text[:end_pos]
        
        print(f"[DEBUG] Final cleaned JSON: {response_text[:200]}...")
        
        recommendations = json.loads(response_text)
        
        print(f"✅ Generated {len(recommendations.get('recommendations', {}).get('discounts', []))} discounts and {len(recommendations.get('recommendations', {}).get('bundles', []))} bundles")
        
        return recommendations
        
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse Gemini JSON: {str(e)}")
        return {"recommendations": {"discounts": [], "bundles": []}}
    except Exception as e:
        print(f"❌ AI analysis failed: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback:\n{traceback.format_exc()}")
        return {"recommendations": {"discounts": [], "bundles": []}}
