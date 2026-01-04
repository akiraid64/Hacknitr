from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator
from datetime import datetime, timedelta
import qrcode
import io
import base64
import re
from typing import Optional, List
from PIL import Image
from pyzbar import pyzbar
import io

# Import database functions
import database

# Import new API routes
from api_routes import router as api_router

app = FastAPI(
    title="TOOL Inc API",
    description="Complete Backend for TOOL Inc Food Donation Platform",
    version="3.0.0"
)

# CORS Middleware - Updated to fix login issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"  # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# Include all new API routes
app.include_router(api_router, prefix="/api/v1")

# ========================
# LEGACY/COMPATIBILITY ENDPOINTS (kept for backward compatibility)
# ========================

class SignupRequest(BaseModel):
    email: str
    password: str
    role: str = Field(..., description="manufacturer, retailer, or ngo")
    name: str
    wallet_address: Optional[str] = None
    company: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    token: str
    user_id: int
    role: str
    name: str

@app.post("/auth/signup", response_model=AuthResponse, tags=["Authentication"])
async def signup(request: SignupRequest):
    if request.role not in ['manufacturer', 'retailer', 'ngo']:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user_id = database.create_user(
        email=request.email,
        password=request.password,
        role=request.role,
        name=request.name,
        company=request.company,
        wallet_address=request.wallet_address
    )
    
    if not user_id:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    token = database.create_session(user_id)
    return AuthResponse(token=token, user_id=user_id, role=request.role, name=request.name)

@app.post("/auth/login", response_model=AuthResponse, tags=["Authentication"])
async def login(request: LoginRequest):
    user = database.verify_user(request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = database.create_session(user['id'])
    return AuthResponse(token=token, user_id=user['id'], role=user['role'], name=user['name'])


# Dependency to get current user
async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authentication token")
    
    token = authorization.replace("Bearer ", "")
    user = database.get_user_by_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


# ========================
# MANUFACTURER ENDPOINTS
# ========================

class ManufacturerRequest(BaseModel):
    gstin: str = Field(..., description="Tax ID")
    gtin: str = Field(..., description="Global Trade Item Number")
    batch_id: str
    expiry_date: str
    manufacturing_date: str
    product_name: str
    weight_kg: float
    item_count: int
    
    @validator('expiry_date', 'manufacturing_date')
    def validate_date_format(cls, v):
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')

class ManufacturerResponse(BaseModel):
    digital_link_url: str
    qr_image_base64: str
    product_id: int

@app.post("/manufacturer/generate-qr", response_model=ManufacturerResponse, tags=["Manufacturer"])
async def generate_qr_code(request: ManufacturerRequest, user: dict = Depends(get_current_user)):
    if user['role'] != 'manufacturer':
        raise HTTPException(status_code=403, detail="Only manufacturers can generate QR codes")

    try:
        # Parse dates
        expiry_dt = datetime.strptime(request.expiry_date, '%Y-%m-%d')
        formatted_expiry = expiry_dt.strftime('%y%m%d')
        
        # Construct GS1 Digital Link URL
        # Format: https://id.domain.com/01/{gtin}/10/{batch_id}/17/{expiry}/21/{serial}
        # We start with basic keys
        digital_link_url = f"https://id.yourdomain.com/01/{request.gtin}/10/{request.batch_id}/17/{formatted_expiry}"
        
        # Save to database
        product_id = database.create_product(
            user_id=user['id'],
            gtin=request.gtin,
            batch_id=request.batch_id,
            expiry_date=request.expiry_date,
            digital_link_url=digital_link_url,
            product_name=request.product_name,
            gstin=request.gstin,
            manufacturing_date=request.manufacturing_date,
            weight_kg=request.weight_kg,
            item_count=request.item_count
        )
        
        # Generate QR Code
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(digital_link_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return ManufacturerResponse(
            digital_link_url=digital_link_url,
            qr_image_base64=f"data:image/png;base64,{img_base64}",
            product_id=product_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# RETAILER ENDPOINTS
# ========================

class RetailerScanRequest(BaseModel):
    scanned_url: str

@app.post("/retailer/scan-item", tags=["Retailer"])
async def scan_item(request: RetailerScanRequest, user: dict = Depends(get_current_user)):
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Only retailers can scan items")
        
    try:
        url = request.scanned_url
        
        # Extract basic GS1 keys using Regex
        gtin_match = re.search(r'/01/(\d+)', url)
        batch_match = re.search(r'/10/([^/]+)', url)
        expiry_match = re.search(r'/17/(\d{6})', url)
        
        if not gtin_match:
            raise HTTPException(status_code=400, detail="Invalid GS1 URL: Missing GTIN")
            
        gtin = gtin_match.group(1)
        batch = batch_match.group(1) if batch_match else "UNKNOWN"
        expiry_gs1 = expiry_match.group(1) if expiry_match else None
        
        expiry_iso = None
        days_remaining = None
        
        if expiry_gs1:
            # Convert YYMMDD to YYYY-MM-DD
            year = int(expiry_gs1[0:2])
            full_year = 2000 + year if year <= 49 else 1900 + year
            month = int(expiry_gs1[2:4])
            day = int(expiry_gs1[4:6])
            
            expiry_dt = datetime(full_year, month, day)
            expiry_iso = expiry_dt.strftime('%Y-%m-%d')
            days_remaining = (expiry_dt - datetime.now()).days

        # Record scan
        database.create_scan(
            user_id=user['id'],
            product_gtin=gtin,
            batch_id=batch,
            expiry_date=expiry_iso or "UNKNOWN",
            days_remaining=days_remaining or 0
        )

        return {
            "status": "success",
            "gtin": gtin,
            "batch": batch,
            "expiry_date": expiry_iso,
            "days_remaining": days_remaining,
            "scanned_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/retailer/scan-qr-image", tags=["Retailer"])
async def scan_qr_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload QR code image and extract product info"""
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Only retailers can scan QR codes")
    
    try:
        import requests
        from PIL import Image
        
        # Read and save uploaded image temporarily
        contents = await file.read()
        
        # Call api.qrserver.com - requires multipart file upload
        api_url = "https://api.qrserver.com/v1/read-qr-code/"
        
        files = {'file': ('qr.png', contents, 'image/png')}
        response = requests.post(api_url, files=files, timeout=15)
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to decode QR code from API")
        
        result = response.json()
        
        # api.qrserver.com returns array of results
        if not result or len(result) == 0:
            raise HTTPException(status_code=400, detail="No QR code found in image")
        
        qr_content = result[0].get('symbol')
        if not qr_content or len(qr_content) == 0:
            raise HTTPException(status_code=400, detail="Could not read QR code content")
        
        qr_data = qr_content[0].get('data', '')
        
        if not qr_data:
            raise HTTPException(status_code=400, detail="QR code is empty")
        
        # Extract GS1 data from URL
        gtin_match = re.search(r'/01/(\d+)', qr_data)
        batch_match = re.search(r'/10/([^/]+)', qr_data)
        expiry_match = re.search(r'/17/(\d{6})', qr_data)
        
        if not gtin_match:
            raise HTTPException(status_code=400, detail="Invalid GS1 URL in QR code")
        
        gtin = gtin_match.group(1)
        batch = batch_match.group(1) if batch_match else "UNKNOWN"
        expiry_gs1 = expiry_match.group(1) if expiry_match else None
        
        expiry_iso = None
        days_remaining = None
        
        if expiry_gs1:
            year = int(expiry_gs1[0:2])
            full_year = 2000 + year if year <= 49 else 1900 + year
            month = int(expiry_gs1[2:4])
            day = int(expiry_gs1[4:6])
            
            expiry_dt = datetime(full_year, month, day)
            expiry_iso = expiry_dt.strftime('%Y-%m-%d')
            days_remaining = (expiry_dt - datetime.now()).days
        
        # Add product to inventory (add timestamp to make duplicates unique)
        unique_qr_url = f"{qr_data}#uploaded_{int(datetime.now().timestamp())}"
        
        product_id = database.create_product(
            user_id=user['id'],
            gtin=gtin,
            batch_id=batch,
            expiry_date=expiry_iso or "UNKNOWN",
            digital_link_url=unique_qr_url,  # Unique URL with timestamp
            product_name=f"Product {gtin}",
            gstin=None,
            manufacturing_date=None,
            weight_kg=1.0,
            item_count=50
        )

        
        return {
            "status": "success",
            "product_id": product_id,
            "gtin": gtin,
            "batch": batch,
            "expiry_date": expiry_iso,
            "days_remaining": days_remaining,
            "scanned_at": datetime.now().isoformat(),
            "source": "image_upload",
            "message": "✅ Product added to inventory!"
        }

        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"API connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing QR image: {str(e)}")

# ========================
# HEALTH CHECK
# ========================

@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "online", "version": "2.0.0"}

# ========================
# RETAILER AI ENDPOINTS
# ========================

@app.get("/api/v1/retailer/inventory", tags=["Retailer"])
async def get_retailer_inventory_endpoint(user: dict = Depends(get_current_user)):
    """Get retailer's full inventory with product details"""
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Only retailers can access inventory")
    
    try:
        inventory = database.get_retailer_inventory(user['id'])
        return {
            "status": "success",
            "total_products": len(inventory),
            "inventory": inventory
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching inventory: {str(e)}")


@app.post("/api/v1/retailer/get-ai-recommendations", tags=["Retailer"])
async def get_ai_recommendations_endpoint(user: dict = Depends(get_current_user)):
    """Get Gemini AI recommendations for discounts and bundles"""
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Only retailers can get AI recommendations")
    
    try:
        # Get inventory
        inventory = database.get_retailer_inventory(user['id'])
        
        if not inventory:
            raise HTTPException(status_code=400, detail="No inventory to analyze")
        
        # Call Gemini
        from gemini_inventory import analyze_inventory_for_recommendations
        recommendations = analyze_inventory_for_recommendations(inventory)
        
        return {
            "status": "success",
            "recommendations": recommendations,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")


@app.post("/api/v1/retailer/ai-chat", tags=["Retailer"])
async def ai_chat(request: dict, user: dict = Depends(get_current_user)):
    """Chat with AI about inventory in Hindi/English"""
    print(f"\n{'='*60}")
    print(f"[DEBUG] AI Chat called by: {user.get('name')}")
    
    if user['role'] != 'retailer':
        print("[ERROR] Access denied - not a retailer")
        raise HTTPException(status_code=403, detail="Only retailers")
    
    try:
        user_message = request.get('message', '')
        chat_history = request.get('history', [])
        
        print(f"[DEBUG] User message: {user_message[:50] if user_message else 'empty'}...")
        
        if not user_message:
            raise HTTPException(status_code=400, detail="Message required")
        
        # Get inventory context
        inventory = database.get_retailer_inventory(user['id'])
        print(f"[DEBUG] Inventory context: {len(inventory)} items")
        
        # Call Gemini chat
        from gemini_chat import chat_with_inventory
        response = chat_with_inventory(inventory, user_message, chat_history)
        
        print(f"[SUCCESS] AI response generated")
        print(f"{'='*60}\n")
        
        return {
            "status": "success",
            "response": response,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"[ERROR] Chat failed: {str(e)}")
        import traceback
        print(f"[TRACEBACK]:\n{traceback.format_exc()}")
        print(f"{'='*60}\n")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.post("/api/v1/retailer/scan-barcode-image", tags=["Retailer"])
async def scan_barcode_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload barcode image and reduce inventory"""
    
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Only retailers")
    
    try:
        # Decode barcode from image
        image_data = await file.read()
        img = Image.open(io.BytesIO(image_data))
        barcodes = pyzbar.decode(img)
        
        if not barcodes:
            raise HTTPException(status_code=400, detail="No barcode found in image")
        
        gtin = barcodes[0].data.decode('utf-8')
        barcode_type = barcodes[0].type
        
        # Reduce quantity using barcode_scanner module
        from barcode_scanner import scan_barcode
        result = scan_barcode(gtin, user['id'])
        
        if not result['success']:
            raise HTTPException(status_code=404, detail=result.get('error'))
        
        # Auto-trigger AI
        inventory = database.get_retailer_inventory(user['id'])
        from gemini_inventory import analyze_inventory_for_recommendations
        ai_recs = analyze_inventory_for_recommendations(inventory)
        
        return {
            "status": "success",
            "barcode_type": barcode_type,
            "gtin": gtin,
            "product": result['product'],
            "quantity_change": result['quantity_change'],
            "ai_recommendations": ai_recs
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/manufacturer/product-analytics", tags=["Manufacturer"])
async def get_product_analytics(user: dict = Depends(get_current_user)):
    """
    Get analytics for manufacturer's products
    Shows which retailers have products and inventory levels
    """
    if user['role'] != 'manufacturer':
        raise HTTPException(status_code=403, detail="Only manufacturers can access analytics")
    
    try:
        from manufacturer_analytics import get_manufacturer_product_analytics
        
        analytics = get_manufacturer_product_analytics(user['id'])
        
        return {
            "status": "success",
            "analytics": analytics
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analytics: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print(" " * 15 + "🚀 TOOL Inc Backend Starting...")
    print("="*60)
    print("📊 Initializing database...")
    database.create_database()
    print("✅ Database ready!")
    print("🌐 API Documentation: http://localhost:8000/docs")
    print("🔗 New API Prefix: /api/v1")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
