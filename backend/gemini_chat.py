"""
Gemini Chat for Retailer Inventory Q&A
Supports Hindi and English, answers only from database context
"""

import gemini_grounding
from google.genai import types

def chat_with_inventory(inventory_data, user_message, chat_history=None):
    """
    Chat with retailer about their inventory in Hindi/English
    
    Args:
        inventory_data: List of inventory items from database
        user_message: User's question (Hindi or English)
        chat_history: Previous messages for context
    
    Returns:
        AI response string
    """
    
    if not gemini_grounding.client:
        if not gemini_grounding.init_gemini():
            return "Sorry, AI is not available right now."
    
    try:
        import json
        from datetime import datetime
        
        print(f"[DEBUG] Chat received {len(inventory_data)} inventory items")
        print(f"[DEBUG] User question: {user_message[:100]}...")
        
        # Prepare inventory summary
        inventory_summary = []
        for item in inventory_data:
            inventory_summary.append({
                "name": item.get('product_name', 'Unknown'),
                "quantity": item.get('quantity', 0),
                "expiry_date": item.get('expiry_date'),
                "days_remaining": item.get('days_remaining', 0),
                "batch_id": item.get('batch_id')
            })
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Build comprehensive prompt with inventory embedded
        full_prompt = f"""You are a helpful retail inventory assistant. Today is {today}.

**THIS RETAILER'S ACTUAL INVENTORY:**
{json.dumps(inventory_summary, indent=2)}

**CRITICAL RULES:**
1. The inventory data above is the ACTUAL current inventory
2. Answer questions ONLY based on this specific data
3. Support both Hindi and English - respond in the same language
4. Be specific: mention product names, quantities, and days remaining
5. If asked "what's in my inventory", list ALL products from the data above
6. DO NOT say you need more information - you have the complete inventory above!

**USER QUESTION:** {user_message}

Answer based on the specific inventory data provided above. Be helpful and specific."""

        print(f"[DEBUG] Calling Gemini for chat...")
        
        config = types.GenerateContentConfig(temperature=0.7)
        
        response = gemini_grounding.client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=full_prompt,
            config=config
        )
        
        if not response or not response.text:
            print("[ERROR] Empty response from Gemini")
            return "I couldn't generate a response. Please try again."
        
        answer = response.text.strip()
        print(f"[SUCCESS] Generated answer: {answer[:100]}...")
        
        return answer
        
    except Exception as e:
        print(f"❌ Chat error: {str(e)}")
        import traceback
        print(f"[TRACEBACK]:\n{traceback.format_exc()}")
        return f"Error: {str(e)}"
