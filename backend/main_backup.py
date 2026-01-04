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
            "scanned_at": datetime.now().isoformat(),
            "source": "image_upload"
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
