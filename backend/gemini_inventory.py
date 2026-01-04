"""
Additional Gemini function for retailer inventory analysis
"""

from gemini_grounding import client, init_gemini, types

def analyze_inventory_for_recommendations(inventory_data):
    """
    Use Gemini with grounding to analyze retailer inventory and generate
    contextual discount and bundle recommendations
    
    Args:
        inventory_data: List of dicts with product info (name, gtin, expiry, etc.)
    
    Returns:
        Dict with discounts and bundles in strict JSON format
    """
    global client
    
    if not client:
        if not init_gemini():
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

You are a smart retail pricing assistant. Analyze this retailer's inventory and suggest:
1. **Discounts** for products based on expiry dates, weather, or upcoming events
2. **Bundles** of complementary products

**INVENTORY:**
{json.dumps(inventory_summary, indent=2)}

**CONTEXT TO CONSIDER (use grounding):**
- Current weather conditions
- Upcoming festivals/holidays
- Recent news trends
- Today's date: {today}

**STRICT RULES:**
- Recommend ONLY from the provided inventory
- No external products
- Use grounding for weather/festival data
- Give specific, actionable recommendations

**OUTPUT FORMAT (MUST follow exactly):**
{{
  "recommendations": {{
    "discounts": [
      {{
        "product_id": <id from inventory>,
        "product_name": "<exact name>",
        "discount_percentage": <number 10-50>,
        "reason": "<specific reason with context>",
        "context": "expiry|weather|festival|news"
      }}
    ],
    "bundles": [
      {{
        "bundle_name": "<creative bundle name>",
        "product_ids": [<array of IDs>],
        "products": [{{"name": "...", "gtin": "..."}}],
        "discount_percentage": <number 15-40>,
        "reason": "<why bundle makes sense>",
        "context": "complementary|festival|seasonal"
      }}
    ]
  }}
}}

Return ONLY valid JSON, no other text."""

        # Enable grounding
        grounding_tool = types.Tool(google_search=types.GoogleSearch())
        
        config = types.GenerateContentConfig(
            tools=[grounding_tool],
            temperature=0.7,
            response_mime_type="application/json"
        )
        
        # Call Gemini
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config=config
        )
        
        if not response or not response.text:
            print("❌ Empty response from Gemini")
            return {"recommendations": {"discounts": [], "bundles": []}}
        
        # Parse JSON response
        recommendations = json.loads(response.text)
        
        print(f"✅ Generated {len(recommendations.get('recommendations', {}).get('discounts', []))} discounts and {len(recommendations.get('recommendations', {}).get('bundles', []))} bundles")
        
        return recommendations
        
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse Gemini JSON: {str(e)}")
        return {"recommendations": {"discounts": [], "bundles": []}}
    except Exception as e:
        print(f"❌ AI analysis failed: {str(e)}")
        return {"recommendations": {"discounts": [], "bundles": []}}
