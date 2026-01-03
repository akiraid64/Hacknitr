from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator
from datetime import datetime, timedelta
import qrcode
import io
import base64
import re
from typing import Optional

app = FastAPI(
    title="GS1 Digital Link API",
    description="Manufacturer & Retailer endpoints for GS1 Digital Link QR code generation and parsing",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========================
# MANUFACTURER ENDPOINTS
# ========================

class ManufacturerRequest(BaseModel):
    gtin: str = Field(..., description="Global Trade Item Number", example="09506000134352")
    batch_id: str = Field(..., description="Batch/Lot Number", example="LOT123456")
    expiry_date: str = Field(..., description="Expiry date in YYYY-MM-DD format", example="2026-12-31")
    
    @validator('expiry_date')
    def validate_date_format(cls, v):
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('expiry_date must be in YYYY-MM-DD format')


class ManufacturerResponse(BaseModel):
    digital_link_url: str
    qr_image_base64: str
    gtin: str
    batch_id: str
    expiry_date: str
    formatted_expiry_gs1: str


@app.post("/manufacturer/generate-qr", response_model=ManufacturerResponse, tags=["Manufacturer"])
async def generate_qr_code(request: ManufacturerRequest):
    """
    **Manufacturer Dashboard Endpoint**
    
    Generate a valid GS1 Digital Link (QR Code URL) for a product batch.
    
    - **GTIN**: Global Trade Item Number (typically 13-14 digits)
    - **Batch ID**: Lot/Batch identifier
    - **Expiry Date**: Product expiration date in YYYY-MM-DD format
    
    Returns the GS1 Digital Link URL and QR code image as base64.
    """
    try:
        # Parse the expiry date
        expiry_dt = datetime.strptime(request.expiry_date, '%Y-%m-%d')
        
        # Convert to GS1 format (YYMMDD)
        formatted_date = expiry_dt.strftime('%y%m%d')
        
        # Construct the GS1 Digital Link URL
        # Format: https://id.yourdomain.com/01/{gtin}/10/{batch_id}/17/{expiry_date}
        digital_link_url = f"https://id.yourdomain.com/01/{request.gtin}/10/{request.batch_id}/17/{formatted_date}"
        
        # Generate QR Code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(digital_link_url)
        qr.make(fit=True)
        
        # Create QR code image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return ManufacturerResponse(
            digital_link_url=digital_link_url,
            qr_image_base64=f"data:image/png;base64,{img_base64}",
            gtin=request.gtin,
            batch_id=request.batch_id,
            expiry_date=request.expiry_date,
            formatted_expiry_gs1=formatted_date
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating QR code: {str(e)}")


@app.post("/manufacturer/generate-qr-image", tags=["Manufacturer"])
async def generate_qr_image(request: ManufacturerRequest):
    """
    **Manufacturer Dashboard Endpoint - Image Version**
    
    Generate a GS1 Digital Link QR Code and return it as a viewable PNG image.
    
    This endpoint returns the QR code as an actual image file that you can view directly.
    """
    try:
        # Parse the expiry date
        expiry_dt = datetime.strptime(request.expiry_date, '%Y-%m-%d')
        
        # Convert to GS1 format (YYMMDD)
        formatted_date = expiry_dt.strftime('%y%m%d')
        
        # Construct the GS1 Digital Link URL
        digital_link_url = f"https://id.yourdomain.com/01/{request.gtin}/10/{request.batch_id}/17/{formatted_date}"
        
        # Generate QR Code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(digital_link_url)
        qr.make(fit=True)
        
        # Create QR code image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to bytes
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return StreamingResponse(buffer, media_type="image/png")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating QR code: {str(e)}")


# ========================
# RETAILER ENDPOINTS
# ========================

class RetailerRequest(BaseModel):
    scanned_url: str = Field(
        ..., 
        description="The full GS1 Digital Link URL from barcode scanner",
        example="https://id.yourdomain.com/01/09506000134352/10/LOT123456/17/261231"
    )


class RetailerResponse(BaseModel):
    product_id: str
    gtin: str
    batch: str
    expiry_date: str
    days_remaining: int
    serial_number: Optional[str] = None
    parsed_successfully: bool


@app.post("/retailer/scan-item", response_model=RetailerResponse, tags=["Retailer"])
async def scan_item(request: RetailerRequest):
    """
    **Retailer Inventory System Endpoint**
    
    Parse a scanned GS1 Digital Link and extract product details.
    
    - Extracts GTIN (AI 01)
    - Extracts Batch Number (AI 10)
    - Extracts Expiry Date (AI 17) and converts from YYMMDD to YYYY-MM-DD
    - Extracts Serial Number (AI 21) if present
    - Calculates days until expiry
    """
    try:
        url = request.scanned_url
        
        # GS1 Application Identifier patterns
        # AI 01 = GTIN (14 digits)
        # AI 10 = Batch/Lot Number
        # AI 17 = Expiry Date (YYMMDD)
        # AI 21 = Serial Number
        
        # Extract GTIN (AI 01)
        gtin_match = re.search(r'/01/(\d{13,14})', url)
        if not gtin_match:
            raise HTTPException(status_code=400, detail="Invalid URL format: GTIN (01) not found")
        gtin = gtin_match.group(1)
        
        # Extract Batch Number (AI 10)
        batch_match = re.search(r'/10/([^/]+)', url)
        if not batch_match:
            raise HTTPException(status_code=400, detail="Invalid URL format: Batch Number (10) not found")
        batch = batch_match.group(1)
        
        # Extract Expiry Date (AI 17)
        expiry_match = re.search(r'/17/(\d{6})', url)
        if not expiry_match:
            raise HTTPException(status_code=400, detail="Invalid URL format: Expiry Date (17) not found")
        expiry_gs1 = expiry_match.group(1)
        
        # Extract Serial Number (AI 21) - Optional
        serial_match = re.search(r'/21/([^/]+)', url)
        serial_number = serial_match.group(1) if serial_match else None
        
        # Convert GS1 date format (YYMMDD) to ISO format (YYYY-MM-DD)
        try:
            # Handle century correctly
            year = int(expiry_gs1[0:2])
            # Assume dates 00-49 are 2000-2049, 50-99 are 1950-1999
            if year <= 49:
                full_year = 2000 + year
            else:
                full_year = 1900 + year
            
            month = int(expiry_gs1[2:4])
            day = int(expiry_gs1[4:6])
            
            expiry_dt = datetime(full_year, month, day)
            expiry_iso = expiry_dt.strftime('%Y-%m-%d')
            
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid expiry date format: {str(e)}")
        
        # Calculate days until expiry
        current_date = datetime.now()
        days_remaining = (expiry_dt - current_date).days
        
        return RetailerResponse(
            product_id=gtin,
            gtin=gtin,
            batch=batch,
            expiry_date=expiry_iso,
            days_remaining=days_remaining,
            serial_number=serial_number,
            parsed_successfully=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing scanned URL: {str(e)}")


# ========================
# HEALTH CHECK
# ========================

@app.get("/", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "GS1 Digital Link API",
        "endpoints": {
            "manufacturer": "/manufacturer/generate-qr",
            "manufacturer_image": "/manufacturer/generate-qr-image",
            "retailer": "/retailer/scan-item",
            "dashboard": "/dashboard",
            "docs": "/docs"
        }
    }


@app.get("/dashboard", response_class=HTMLResponse, tags=["Dashboard"])
async def dashboard():
    """Interactive Dashboard for QR Code Generation and Scanning"""
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GS1 Digital Link - Dashboard</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 2rem;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            h1 {
                color: white;
                text-align: center;
                margin-bottom: 2rem;
                font-size: 2.5rem;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            }
            
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
                gap: 2rem;
                margin-bottom: 2rem;
            }
            
            .card {
                background: white;
                border-radius: 20px;
                padding: 2rem;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            
            .card h2 {
                color: #667eea;
                margin-bottom: 1.5rem;
                font-size: 1.5rem;
            }
            
            .form-group {
                margin-bottom: 1.5rem;
            }
            
            label {
                display: block;
                margin-bottom: 0.5rem;
                color: #333;
                font-weight: 600;
            }
            
            input, textarea {
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e0e0e0;
                border-radius: 10px;
                font-size: 1rem;
                transition: border-color 0.3s;
            }
            
            input:focus, textarea:focus {
                outline: none;
                border-color: #667eea;
            }
            
            button {
                width: 100%;
                padding: 1rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            
            button:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
            }
            
            button:active {
                transform: translateY(0);
            }
            
            .result {
                margin-top: 1.5rem;
                padding: 1.5rem;
                background: #f8f9fa;
                border-radius: 10px;
                display: none;
            }
            
            .result.show {
                display: block;
                animation: fadeIn 0.3s;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .qr-display {
                text-align: center;
                margin: 1rem 0;
            }
            
            .qr-display img {
                max-width: 300px;
                border: 3px solid #667eea;
                border-radius: 10px;
                padding: 1rem;
                background: white;
            }
            
            .info-item {
                margin: 0.5rem 0;
                padding: 0.5rem;
                background: white;
                border-radius: 5px;
            }
            
            .info-label {
                font-weight: 600;
                color: #667eea;
            }
            
            .error {
                background: #fee;
                color: #c33;
                padding: 1rem;
                border-radius: 10px;
                margin-top: 1rem;
            }
            
            .success {
                background: #efe;
                color: #3c3;
                padding: 1rem;
                border-radius: 10px;
                margin-top: 1rem;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏭 GS1 Digital Link Dashboard</h1>
            
            <div class="grid">
                <!-- Manufacturer Card -->
                <div class="card">
                    <h2>📦 Manufacturer - Generate QR Code</h2>
                    <form id="manufacturerForm">
                        <div class="form-group">
                            <label>GTIN (Global Trade Item Number)</label>
                            <input type="text" id="gtin" value="09506000134352" required>
                        </div>
                        <div class="form-group">
                            <label>Batch ID</label>
                            <input type="text" id="batch_id" value="LOT123456" required>
                        </div>
                        <div class="form-group">
                            <label>Expiry Date (YYYY-MM-DD)</label>
                            <input type="date" id="expiry_date" value="2026-12-31" required>
                        </div>
                        <button type="submit">Generate QR Code</button>
                    </form>
                    
                    <div id="manufacturerResult" class="result">
                        <div class="qr-display">
                            <img id="qrImage" src="" alt="QR Code">
                        </div>
                        <div class="info-item">
                            <span class="info-label">Digital Link URL:</span>
                            <div id="digitalLink" style="word-break: break-all; margin-top: 0.5rem;"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Retailer Card -->
                <div class="card">
                    <h2>🛒 Retailer - Scan & Parse QR Code</h2>
                    <form id="retailerForm">
                        <div class="form-group">
                            <label>Scanned URL</label>
                            <textarea id="scanned_url" rows="3" placeholder="Paste the GS1 Digital Link URL here..." required></textarea>
                        </div>
                        <button type="submit">Parse QR Code</button>
                    </form>
                    
                    <div id="retailerResult" class="result">
                        <div class="info-item">
                            <span class="info-label">Product ID (GTIN):</span>
                            <div id="productId"></div>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Batch Number:</span>
                            <div id="batchNumber"></div>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Expiry Date:</span>
                            <div id="expiryDate"></div>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Days Until Expiry:</span>
                            <div id="daysRemaining"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            // Manufacturer Form Handler
            document.getElementById('manufacturerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const resultDiv = document.getElementById('manufacturerResult');
                resultDiv.classList.remove('show');
                
                const data = {
                    gtin: document.getElementById('gtin').value,
                    batch_id: document.getElementById('batch_id').value,
                    expiry_date: document.getElementById('expiry_date').value
                };
                
                try {
                    const response = await fetch('/manufacturer/generate-qr', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    
                    if (!response.ok) throw new Error('Failed to generate QR code');
                    
                    const result = await response.json();
                    
                    document.getElementById('qrImage').src = result.qr_image_base64;
                    document.getElementById('digitalLink').textContent = result.digital_link_url;
                    document.getElementById('scanned_url').value = result.digital_link_url;
                    
                    resultDiv.classList.add('show');
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            });
            
            // Retailer Form Handler
            document.getElementById('retailerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const resultDiv = document.getElementById('retailerResult');
                resultDiv.classList.remove('show');
                
                const data = {
                    scanned_url: document.getElementById('scanned_url').value
                };
                
                try {
                    const response = await fetch('/retailer/scan-item', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    
                    if (!response.ok) throw new Error('Failed to parse QR code');
                    
                    const result = await response.json();
                    
                    document.getElementById('productId').textContent = result.gtin;
                    document.getElementById('batchNumber').textContent = result.batch;
                    document.getElementById('expiryDate').textContent = result.expiry_date;
                    
                    const daysText = result.days_remaining > 0 
                        ? `${result.days_remaining} days` 
                        : result.days_remaining === 0 
                        ? 'Expires today!' 
                        : `Expired ${Math.abs(result.days_remaining)} days ago`;
                    document.getElementById('daysRemaining').textContent = daysText;
                    
                    resultDiv.classList.add('show');
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            });
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
