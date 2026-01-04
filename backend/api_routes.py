"""
TOOL Inc API Routes - Phase 2
Complete API endpoints for Manufacturer, Retailer, and NGO portals
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import sqlite3
import qrcode
import io
import base64
import re
import hashlib

DATABASE_NAME = 'toolinc_system.db'

# ========================
# PYDANTIC MODELS
# ========================

# Auth Models
class SignupRequest(BaseModel):
    email: str
    password: str
    role: str = Field(..., description="manufacturer, retailer, ngo, admin")
    name: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    wallet_address: Optional[str] = None
    # For manufacturers
    gstin: Optional[str] = None
    pan: Optional[str] = None
    # For NGOs
    registration_number: Optional[str] = None
    fcra_number: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    token: str
    user_id: int
    role: str
    name: str
    email: str

# Manufacturer Models
class BatchCreateRequest(BaseModel):
    product_name: str
    gtin: str = Field(..., description="GS1 Global Trade Item Number (14 digits)")
    batch_id: str = Field(..., description="Unique batch identifier")
    quantity: int = Field(..., gt=0, description="Number of items in batch")
    weight_kg: float = Field(..., description="Total weight in kilograms")
    manufacturing_date: str = Field(..., description="YYYY-MM-DD format")
    expiry_date: str = Field(..., description="YYYY-MM-DD format")
    gstin: str = Field(..., description="Manufacturer GSTIN")
    destination_retailer_email: Optional[str] = None
    
    @validator('manufacturing_date', 'expiry_date')
    def validate_date_format(cls, v):
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')
    
    @validator('gtin')
    def validate_gtin(cls, v):
        if not v.isdigit() or len(v) != 14:
            raise ValueError('GTIN must be 14 digits')
        return v

class BatchCreateResponse(BaseModel):
    product_id: int
    batch_id: str
    gtin: str
    digital_link_url: str
    qr_code_base64: str
    status: str

# Retailer Models
class ShipmentReceiveRequest(BaseModel):
    scanned_url: str  # From QR code scan

class SaleRecordRequest(BaseModel):
    product_id: int
    batch_id: str
    gtin: str
    quantity_sold: int = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)
    weather_condition: Optional[str] = None
    temperature_celsius: Optional[float] = None

# Stats Models
class DashboardStats(BaseModel):
    total_batches: int
    total_quantity: int
    total_sales: int
    total_donations: int
    expiring_soon: int
    active_retailers: int

# ========================
# HELPER FUNCTIONS
# ========================

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE_NAME, timeout=30.0)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify session token and return user data"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT u.* FROM users u
        JOIN sessions s ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > ?
    ''', (token, datetime.now().isoformat()))
    
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return dict(user)
    return None

def create_session(user_id: int) -> str:
    """Create new session token"""
    token = hashlib.sha256(f"{user_id}_{datetime.now().isoformat()}".encode()).hexdigest()
    expires_at = datetime.now() + timedelta(days=7)
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO sessions (user_id, session_token, expires_at)
        VALUES (?, ?, ?)
    ''', (user_id, token, expires_at.isoformat()))
    conn.commit()
    conn.close()
    
    return token

# Dependency for auth
async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authentication token")
    
    token = authorization.replace("Bearer ", "")
    user = verify_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user

# ========================
# ROUTERS
# ========================

router = APIRouter()

# ========================
# AUTHENTICATION
# ========================

@router.post("/auth/signup", response_model=AuthResponse, tags=["Authentication"])
async def signup(request: SignupRequest):
    """Create new user account"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if email exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (request.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    password_hash = hash_password(request.password)
    
    # Insert user
    try:
        cursor.execute('''
            INSERT INTO users (
                email, password_hash, role, name, company_name, phone,
                address, city, state, pincode, wallet_address,
                gstin, pan, registration_number, fcra_number,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (
            request.email, password_hash, request.role, request.name,
            request.company_name, request.phone, request.address,
            request.city, request.state, request.pincode, request.wallet_address,
            request.gstin, request.pan, request.registration_number, request.fcra_number
        ))
        conn.commit()
        user_id = cursor.lastrowid
        
        # Create session
        token = create_session(user_id)
        
        conn.close()
        
        return AuthResponse(
            token=token,
            user_id=user_id,
            role=request.role,
            name=request.name,
            email=request.email
        )
        
    except sqlite3.Error as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/auth/login", response_model=AuthResponse, tags=["Authentication"])
async def login(request: LoginRequest):
    """User login"""
    conn = get_db()
    cursor = conn.cursor()
    
    password_hash = hash_password(request.password)
    
    cursor.execute('''
        SELECT id, email, role, name FROM users
        WHERE email = ? AND password_hash = ?
    ''', (request.email, password_hash))
    
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = dict(user)
    token = create_session(user['id'])
    
    return AuthResponse(
        token=token,
        user_id=user['id'],
        role=user['role'],
        name=user['name'],
        email=user['email']
    )

# ========================
# MANUFACTURER ENDPOINTS
# ========================

@router.post("/manufacturer/create-batch", response_model=BatchCreateResponse, tags=["Manufacturer"])
async def create_batch(request: BatchCreateRequest, user: dict = Depends(get_current_user)):
    """Create new product batch and generate QR code"""
    if user['role'] != 'manufacturer':
        raise HTTPException(status_code=403, detail="Only manufacturers can create batches")
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Check if batch ID already exists
        cursor.execute("SELECT id FROM products WHERE batch_id = ?", (request.batch_id,))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="Batch ID already exists")
        
        # Create GS1 Digital Link URL
        expiry_dt = datetime.strptime(request.expiry_date, '%Y-%m-%d')
        formatted_expiry = expiry_dt.strftime('%y%m%d')  # YYMMDD format
        digital_link_url = f"https://toolinc.id/01/{request.gtin}/10/{request.batch_id}/17/{formatted_expiry}"
        
        # Insert product
        cursor.execute('''
            INSERT INTO products (
                manufacturer_id, product_name, gtin, batch_id,
                quantity, weight_kg, manufacturing_date, expiry_date,
                digital_link_url, lifecycle_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manufactured', ?)
        ''', (
            user['id'], request.product_name, request.gtin, request.batch_id,
            request.quantity, request.weight_kg, request.manufacturing_date,
            request.expiry_date, digital_link_url, datetime.now().isoformat()
        ))
        
        product_id = cursor.lastrowid
        
        # Generate QR Code
        qr = qrcode.QRCode(version=1, box_size=10, border=4, error_correction=qrcode.constants.ERROR_CORRECT_H)
        qr.add_data(digital_link_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        # Log audit
        cursor.execute('''
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (?, 'create_batch', 'product', ?, ?)
        ''', (user['id'], product_id, f"Batch {request.batch_id} created"))
        
        conn.commit()
        conn.close()
        
        return BatchCreateResponse(
            product_id=product_id,
            batch_id=request.batch_id,
            gtin=request.gtin,
            digital_link_url=digital_link_url,
            qr_code_base64=f"data:image/png;base64,{img_base64}",
            status="SUCCESS"
        )
        
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/manufacturer/batches", tags=["Manufacturer"])
async def get_manufacturer_batches(user: dict = Depends(get_current_user)):
    """Get all batches created by manufacturer"""
    if user['role'] != 'manufacturer':
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            id, product_name, gtin, batch_id, quantity,
            weight_kg, manufacturing_date, expiry_date,
            lifecycle_status, created_at
        FROM products
        WHERE manufacturer_id = ?
        ORDER BY created_at DESC
    ''', (user['id'],))
    
    batches = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return {"batches": batches, "total": len(batches)}

@router.get("/manufacturer/stats", tags=["Manufacturer"])
async def get_manufacturer_stats(user: dict = Depends(get_current_user)):
    """Get manufacturer dashboard statistics"""
    if user['role'] != 'manufacturer':
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Total batches
    cursor.execute("SELECT COUNT(*) as count FROM products WHERE manufacturer_id = ?", (user['id'],))
    total_batches = cursor.fetchone()['count']
    
    # Total items manufactured
    cursor.execute("SELECT SUM(quantity) as total FROM products WHERE manufacturer_id = ?", (user['id'],))
    total_quantity = cursor.fetchone()['total'] or 0
    
    # Active shipments
    cursor.execute('''
        SELECT COUNT(*) as count FROM shipments s
        JOIN products p ON s.product_id = p.id
        WHERE p.manufacturer_id = ? AND s.status IN ('in_transit', 'pending')
    ''', (user['id'],))
    active_shipments = cursor.fetchone()['count']
    
    # Total retailers receiving shipments
    cursor.execute('''
        SELECT COUNT(DISTINCT s.retailer_id) as count FROM shipments s
        JOIN products p ON s.product_id = p.id
        WHERE p.manufacturer_id = ?
    ''', (user['id'],))
    total_retailers = cursor.fetchone()['count']
    
    conn.close()
    
    return {
        "total_batches": total_batches,
        "total_quantity": total_quantity,
        "active_shipments": active_shipments,
        "total_retailers": total_retailers
    }

# ========================
# RETAILER ENDPOINTS
# ========================

@router.post("/retailer/scan-shipment", tags=["Retailer"])
async def scan_shipment(request: ShipmentReceiveRequest, user: dict = Depends(get_current_user)):
    """Scan QR code to receive shipment"""
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Only retailers can receive shipments")
    
    try:
        url = request.scanned_url
        
        # Extract GS1 data
        gtin_match = re.search(r'/01/(\d{14})', url)
        batch_match = re.search(r'/10/([^/]+)', url)
        expiry_match = re.search(r'/17/(\d{6})', url)
        
        if not (gtin_match and batch_match):
            raise HTTPException(status_code=400, detail="Invalid QR code format")
        
        gtin = gtin_match.group(1)
        batch_id = batch_match.group(1)
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Find product
        cursor.execute('''
            SELECT id, product_name, quantity, expiry_date FROM products
            WHERE gtin = ? AND batch_id = ?
        ''', (gtin, batch_id))
        
        product = cursor.fetchone()
        if not product:
            conn.close()
            raise HTTPException(status_code=404, detail="Product not found")
        
        product = dict(product)
        
        # Create shipment record
        cursor.execute('''
            INSERT INTO shipments (
                product_id, retailer_id, quantity_shipped,
                shipment_date, status
            ) VALUES (?, ?, ?, ?, 'delivered')
        ''', (product['id'], user['id'], product['quantity'], datetime.now().isoformat()))
        
        shipment_id = cursor.lastrowid
        
        # Add to inventory
        cursor.execute('''
            INSERT INTO inventory (
                retailer_id, product_id, batch_id, gtin,
                quantity_in_stock, expiry_date, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(retailer_id, product_id) DO UPDATE SET
                quantity_in_stock = quantity_in_stock + ?,
                last_updated = ?
        ''', (
            user['id'], product['id'], batch_id, gtin,
            product['quantity'], product['expiry_date'], datetime.now().isoformat(),
            product['quantity'], datetime.now().isoformat()
        ))
        
        # Update product lifecycle
        cursor.execute('''
            UPDATE products SET lifecycle_status = 'in_retail' WHERE id = ?
        ''', (product['id'],))
        
        conn.commit()
        conn.close()
        
        # Calculate days to expiry
        expiry_dt = datetime.strptime(product['expiry_date'], '%Y-%m-%d')
        days_remaining = (expiry_dt - datetime.now()).days
        
        return {
            "status": "SUCCESS",
            "shipment_id": shipment_id,
            "product_name": product['product_name'],
            "quantity": product['quantity'],
            "gtin": gtin,
            "batch_id": batch_id,
            "expiry_date": product['expiry_date'],
            "days_remaining": days_remaining
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retailer/record-sale", tags=["Retailer"])
async def record_sale(request: SaleRecordRequest, user: dict = Depends(get_current_user)):
    """Record a sale transaction"""
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Check inventory
        cursor.execute('''
            SELECT quantity_in_stock FROM inventory
            WHERE retailer_id = ? AND product_id = ?
        ''', (user['id'], request.product_id))
        
        inventory = cursor.fetchone()
        if not inventory or inventory['quantity_in_stock'] < request.quantity_sold:
            conn.close()
            raise HTTPException(status_code=400, detail="Insufficient stock")
        
        # Record sale
        sale_timestamp = datetime.now()
        total_price = request.quantity_sold * request.unit_price
        
        cursor.execute('''
            INSERT INTO sales (
                retailer_id, product_id, batch_id, gtin,
                quantity_sold, unit_price, total_price,
                sale_timestamp, sale_date, day_of_week, is_weekend, month,
                weather_condition, temperature_celsius
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user['id'], request.product_id, request.batch_id, request.gtin,
            request.quantity_sold, request.unit_price, total_price,
            sale_timestamp.isoformat(), sale_timestamp.date().isoformat(),
            sale_timestamp.weekday(), sale_timestamp.weekday() >= 5, sale_timestamp.month,
            request.weather_condition, request.temperature_celsius
        ))
        
        # Update inventory
        cursor.execute('''
            UPDATE inventory
            SET quantity_in_stock = quantity_in_stock - ?,
                last_updated = ?
            WHERE retailer_id = ? AND product_id = ?
        ''', (request.quantity_sold, datetime.now().isoformat(), user['id'], request.product_id))
        
        conn.commit()
        sale_id = cursor.lastrowid
        conn.close()
        
        return {
            "status": "SUCCESS",
            "sale_id": sale_id,
            "total_price": total_price,
            "timestamp": sale_timestamp.isoformat()
        }
        
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/retailer/inventory", tags=["Retailer"])
async def get_inventory(user: dict = Depends(get_current_user)):
    """Get retailer's current inventory"""
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            i.id, i.product_id, i.batch_id, i.gtin,
            p.product_name, i.quantity_in_stock, i.expiry_date,
            JULIANDAY(i.expiry_date) - JULIANDAY('now') as days_to_expiry
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.retailer_id = ? AND i.quantity_in_stock > 0
        ORDER BY days_to_expiry ASC
    ''', (user['id'],))
    
    items = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # Add expiry status
    for item in items:
        days = item['days_to_expiry']
        if days < 0:
            item['expiry_status'] = 'EXPIRED'
        elif days <= 2:
            item['expiry_status'] = 'CRITICAL'
        elif days <= 7:
            item['expiry_status'] = 'WARNING'
        else:
            item['expiry_status'] = 'GOOD'
    
    return {"inventory": items, "total_items": len(items)}

@router.get("/retailer/stats", tags=["Retailer"])
async def get_retailer_stats(user: dict = Depends(get_current_user)):
    """Get retailer dashboard statistics"""
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Total inventory
    cursor.execute('''
        SELECT SUM(quantity_in_stock) as total FROM inventory WHERE retailer_id = ?
    ''', (user['id'],))
    total_stock = cursor.fetchone()['total'] or 0
    
    # Total sales (last 30 days)
    cursor.execute('''
        SELECT COUNT(*) as count, SUM(total_price) as revenue
        FROM sales
        WHERE retailer_id = ? AND sale_timestamp > datetime('now', '-30 days')
    ''', (user['id'],))
    sales_data = dict(cursor.fetchone())
    
    # Expiring soon (< 3 days)
    cursor.execute('''
        SELECT COUNT(*) as count FROM inventory
        WHERE retailer_id = ? AND JULIANDAY(expiry_date) - JULIANDAY('now') <= 3
    ''', (user['id'],))
    expiring_soon = cursor.fetchone()['count']
    
    # Total donations made
    cursor.execute('''
        SELECT COUNT(*) as count FROM donations WHERE retailer_id = ?
    ''', (user['id'],))
    total_donations = cursor.fetchone()['count']
    
    conn.close()
    
    return {
        "total_stock": int(total_stock),
        "total_sales": sales_data['count'] or 0,
        "revenue_30_days": float(sales_data['revenue'] or 0),
        "expiring_soon": expiring_soon,
        "total_donations": total_donations
    }

# ========================
# AI & PREDICTIONS
# ========================

@router.get("/ai/demand-prediction/{product_id}", tags=["AI & Analytics"])
async def get_demand_prediction(product_id: int, user: dict = Depends(get_current_user)):
    """
    Get AI-powered demand prediction for a product
    Returns structured JSON with predictions based on historical sales data
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get product info
    cursor.execute("SELECT product_name, gtin FROM products WHERE id = ?", (product_id,))
    product = cursor.fetchone()
    
    if not product:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = dict(product)
    
    # Get historical sales data (last 30 days)
    cursor.execute('''
        SELECT 
            DATE(sale_date) as date,
            SUM(quantity_sold) as total_sold,
            AVG(temperature_celsius) as avg_temp,
            weather_condition,
            is_weekend
        FROM sales
        WHERE product_id = ? AND sale_timestamp > datetime('now', '-30 days')
        GROUP BY DATE(sale_date)
        ORDER BY date DESC
    ''', (product_id,))
    
    historical_data = [dict(row) for row in cursor.fetchall()]
    
    # Simple prediction algorithm (will be replaced with LSTM in Phase 4)
    # Calculate average daily sales
    if historical_data:
        total_sales = sum(d['total_sold'] for d in historical_data)
        avg_daily_sale = total_sales / len(historical_data)
        weekend_boost = 1.3 if any(d.get('is_weekend') for d in historical_data[-3:]) else 1.0
        
        # Next 7 days prediction
        predictions = []
        for i in range(7):
            future_date = datetime.now() + timedelta(days=i+1)
            is_weekend = future_date.weekday() >= 5
            predicted_quantity = int(avg_daily_sale * (1.3 if is_weekend else 1.0))
            
            predictions.append({
                "date": future_date.strftime('%Y-%m-%d'),
                "day_name": future_date.strftime('%A'),
                "predicted_quantity": predicted_quantity,
                "confidence": 0.75 if len(historical_data) > 7 else 0.5,
                "is_weekend": is_weekend,
                "factors": {
                    "historical_avg": round(avg_daily_sale, 2),
                    "weekend_factor": 1.3 if is_weekend else 1.0,
                    "data_points": len(historical_data)
                }
            })
    else:
        predictions = []
    
    # Check current inventory
    cursor.execute('''
        SELECT SUM(quantity_in_stock) as total_stock
        FROM inventory
        WHERE product_id = ?
    ''', (product_id,))
    
    inventory_result = cursor.fetchone()
    current_stock = inventory_result['total_stock'] if inventory_result and inventory_result['total_stock'] else 0
    
    # Calculate projected stock depletion
    total_predicted_demand = sum(p['predicted_quantity'] for p in predictions)
    days_until_stockout = None
    running_stock = current_stock
    
    for pred in predictions:
        running_stock -= pred['predicted_quantity']
        if running_stock <= 0 and days_until_stockout is None:
            days_until_stockout = pred['date']
    
    conn.close()
    
    # Return structured JSON
    return {
        "product": {
            "id": product_id,
            "name": product['product_name'],
            "gtin": product['gtin']
        },
        "current_inventory": {
            "total_stock": int(current_stock),
            "last_updated": datetime.now().isoformat()
        },
        "predictions": predictions,
        "summary": {
            "7_day_demand": total_predicted_demand,
            "days_until_stockout": days_until_stockout,
            "reorder_recommended": current_stock < total_predicted_demand,
            "reorder_quantity": max(0, total_predicted_demand - current_stock + 50) if current_stock < total_predicted_demand else 0
        },
        "model_info": {
            "version": "simple_v1",
            "next_version": "LSTM (Phase 4)",
            "data_points_used": len(historical_data),
            "confidence": "medium" if len(historical_data) > 7 else "low"
        }
    }

@router.get("/ai/reorder-suggestions", tags=["AI & Analytics"])
async def get_reorder_suggestions(user: dict = Depends(get_current_user)):
    """
    Get AI-powered reorder suggestions based on current inventory and demand predictions
    Returns structured JSON that updates based on live inventory changes
    """
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Only retailers can access reorder suggestions")
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all inventory items
    cursor.execute('''
        SELECT 
            i.product_id,
            p.product_name,
            p.gtin,
            p.batch_id,
            i.quantity_in_stock,
            i.expiry_date,
            JULIANDAY(i.expiry_date) - JULIANDAY('now') as days_to_expiry
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.retailer_id = ? AND i.quantity_in_stock >= 0
    ''', (user['id'],))
    
    inventory_items = [dict(row) for row in cursor.fetchall()]
    
    suggestions = []
    
    for item in inventory_items:
        # Get recent sales velocity (last 7 days)
        cursor.execute('''
            SELECT 
                COUNT(*) as transaction_count,
                SUM(quantity_sold) as total_sold,
                AVG(quantity_sold) as avg_per_transaction
            FROM sales
            WHERE product_id = ? AND retailer_id = ?
            AND sale_timestamp > datetime('now', '-7 days')
        ''', (item['product_id'], user['id']))
        
        sales_data = dict(cursor.fetchone())
        
        daily_velocity = (sales_data['total_sold'] or 0) / 7
        days_of_stock = (item['quantity_in_stock'] / daily_velocity) if daily_velocity > 0 else 999
        
        # Determine urgency
        if days_of_stock < 3 and item['days_to_expiry'] > 7:
            urgency = "CRITICAL"
            action = "ORDER_NOW"
        elif days_of_stock < 7 and item['days_to_expiry'] > 14:
            urgency = "HIGH"
            action = "ORDER_SOON"
        elif item['quantity_in_stock'] == 0:
            urgency = "OUT_OF_STOCK"
            action = "IMMEDIATE_ORDER"
        else:
            urgency = "NORMAL"
            action = "MONITOR"
        
        # Calculate recommended order quantity
        target_stock_days = 14  # 2 weeks of stock
        recommended_quantity = max(0, int(daily_velocity * target_stock_days - item['quantity_in_stock']))
        
        if recommended_quantity > 0 or urgency != "NORMAL":
            suggestions.append({
                "product": {
                    "id": item['product_id'],
                    "name": item['product_name'],
                    "gtin": item['gtin'],
                    "batch_id": item['batch_id']
                },
                "current_status": {
                    "stock_level": item['quantity_in_stock'],
                    "days_to_expiry": int(item['days_to_expiry']),
                    "expiry_date": item['expiry_date']
                },
                "sales_analysis": {
                    "daily_velocity": round(daily_velocity, 2),
                    "days_of_stock_remaining": round(days_of_stock, 1),
                    "last_7_days_sold": sales_data['total_sold'] or 0,
                    "transaction_count": sales_data['transaction_count'] or 0
                },
                "recommendation": {
                    "action": action,
                    "urgency": urgency,
                    "recommended_quantity": recommended_quantity,
                    "target_stock_days": target_stock_days,
                    "reason": f"Current stock will last {round(days_of_stock, 1)} days at current velocity"
                },
                "timestamp": datetime.now().isoformat()
            })
    
    # Sort by urgency
    urgency_order = {"OUT_OF_STOCK": 0, "CRITICAL": 1, "HIGH": 2, "NORMAL": 3}
    suggestions.sort(key=lambda x: urgency_order[x['recommendation']['urgency']])
    
    conn.close()
    
    return {
        "retailer_id": user['id'],
        "total_suggestions": len(suggestions),
        "critical_count": sum(1 for s in suggestions if s['recommendation']['urgency'] in ['CRITICAL', 'OUT_OF_STOCK']),
        "suggestions": suggestions,
        "last_updated": datetime.now().isoformat(),
        "auto_refresh_interval_seconds": 300  # Refresh every 5 minutes
    }

@router.get("/ai/inventory-alerts", tags=["AI & Analytics"])
async def get_inventory_alerts(user: dict = Depends(get_current_user)):
    """
    Get real-time inventory alerts (expiry warnings, stockouts, etc.)
    Returns structured JSON for live dashboard updates
    """
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Only retailers can access inventory alerts")
    
    conn = get_db()
    cursor = conn.cursor()
    
    alerts = []
    
    # Expiry alerts
    cursor.execute('''
        SELECT 
            i.product_id,
            p.product_name,
            p.batch_id,
            i.quantity_in_stock,
            i.expiry_date,
            JULIANDAY(i.expiry_date) - JULIANDAY('now') as days_to_expiry
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.retailer_id = ? 
        AND i.quantity_in_stock > 0
        AND JULIANDAY(i.expiry_date) - JULIANDAY('now') <= 7
        ORDER BY days_to_expiry ASC
    ''', (user['id'],))
    
    expiry_items = [dict(row) for row in cursor.fetchall()]
    
    for item in expiry_items:
        days = int(item['days_to_expiry'])
        
        if days < 0:
            severity = "EXPIRED"
            message = f"{item['product_name']} has EXPIRED {abs(days)} days ago. Remove from inventory immediately."
            action = "REMOVE_FROM_SHELF"
        elif days <= 2:
            severity = "CRITICAL"
            message = f"{item['product_name']} expires in {days} days. DONATE to NGO immediately to earn tokens!"
            action = "DONATE_NOW"
        elif days <= 7:
            severity = "WARNING"
            message = f"{item['product_name']} expires in {days} days. Consider donation or discount."
            action = "PLAN_DONATION"
        else:
            continue
        
        alerts.append({
            "type": "EXPIRY_ALERT",
            "severity": severity,
            "product": {
                "id": item['product_id'],
                "name": item['product_name'],
                "batch_id": item['batch_id']
            },
            "details": {
                "quantity": item['quantity_in_stock'],
                "expiry_date": item['expiry_date'],
                "days_remaining": days
            },
            "message": message,
            "recommended_action": action,
            "token_opportunity": days <= 2,  # Can earn tokens by donating
            "timestamp": datetime.now().isoformat()
        })
    
    # Stock-out alerts
    cursor.execute('''
        SELECT 
            i.product_id,
            p.product_name,
            p.batch_id,
            i.quantity_in_stock
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.retailer_id = ? AND i.quantity_in_stock <= 0
    ''', (user['id'],))
    
    stockout_items = [dict(row) for row in cursor.fetchall()]
    
    for item in stockout_items:
        alerts.append({
            "type": "STOCK_OUT",
            "severity": "HIGH",
            "product": {
                "id": item['product_id'],
                "name": item['product_name'],
                "batch_id": item['batch_id']
            },
            "details": {
                "quantity": item['quantity_in_stock']
            },
            "message": f"{item['product_name']} is OUT OF STOCK. Reorder immediately.",
            "recommended_action": "REORDER",
            "token_opportunity": False,
            "timestamp": datetime.now().isoformat()
        })
    
    conn.close()
    
    return {
        "retailer_id": user['id'],
        "total_alerts": len(alerts),
        "critical_count": sum(1 for a in alerts if a['severity'] in ['CRITICAL', 'EXPIRED']),
        "alerts": alerts,
        "last_updated": datetime.now().isoformat(),
        "auto_refresh_interval_seconds": 60  # Refresh every minute for alerts
    }


@router.get("/retailer/available-ngos", tags=["Retailer"])
async def get_available_ngos(user: dict = Depends(get_current_user)):
    """Get list of NGOs available for donations (including dummy test NGO)"""
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Only retailers can view NGOs")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, name, email, darpan_id, fcra_number, city, is_verified
        FROM users
        WHERE role = 'ngo'
        ORDER BY is_verified DESC, name ASC
    ''')
    
    ngos = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return {
        "ngos": ngos,
        "total": len(ngos),
        "note": "Includes test NGO (test@ngo.org) for demo purposes"
    }


class CreateDonationRequest(BaseModel):
    product_id: int
    batch_id: str
    ngo_id: int
    quantity: int = Field(..., gt=0, description="Quantity to donate")


@router.post("/retailer/create-donation", tags=["Retailer"])
async def create_donation(request: CreateDonationRequest, user: dict = Depends(get_current_user)):
    """
    Retailer creates a donation for an NGO
    Generates QR code that NGO can scan to confirm receipt
    """
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Only retailers can create donations")
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Verify product exists and retailer owns it
        cursor.execute('''
            SELECT p.id, p.product_name, p.gtin, p.batch_id, p.expiry_date,
                   i.quantity_in_stock, i.retailer_id
            FROM products p
            JOIN inventory i ON p.id = i.product_id
            WHERE p.id = ? AND p.batch_id = ? AND i.retailer_id = ?
        ''', (request.product_id, request.batch_id, user['id']))
        
        product = cursor.fetchone()
        if not product:
            conn.close()
            raise HTTPException(status_code=404, detail="Product not found in your inventory")
        
        product = dict(product)
        
        # Check quantity available
        if request.quantity > product['quantity_in_stock']:
            conn.close()
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Available: {product['quantity_in_stock']}"
            )
        
        # Verify NGO exists
        cursor.execute('SELECT id, name, email FROM users WHERE id = ? AND role = "ngo"', (request.ngo_id,))
        ngo = cursor.fetchone()
        if not ngo:
            conn.close()
            raise HTTPException(status_code=404, detail="NGO not found")
        
        ngo = dict(ngo)
        
        # Generate QR code URL (GS1 Digital Link format)
        # This is the same URL that NGO will scan
        qr_url = f"https://toolinc.id/01/{product['gtin']}/10/{product['batch_id']}/17/{product['expiry_date'].replace('-', '')}"
        
        # Generate QR code image
        qr_code_base64 = generate_qr_code(qr_url)
        
        # Create donation record (status: pending)
        cursor.execute('''
            INSERT INTO donations (
                retailer_id, ngo_id, product_id, batch_id,
                quantity, donation_date, status,
                retailer_signature
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        ''', (
            user['id'], request.ngo_id, request.product_id, request.batch_id,
            request.quantity, datetime.now().isoformat(),
            'retailer_created_' + datetime.now().strftime('%Y%m%d%H%M%S')
        ))
        
        donation_id = cursor.lastrowid
        
        # Reserve inventory (don't remove yet, wait for NGO confirmation)
        cursor.execute('''
            UPDATE inventory
            SET reserved_for_donation = reserved_for_donation + ?
            WHERE product_id = ? AND retailer_id = ?
        ''', (request.quantity, request.product_id, user['id']))
        
        conn.commit()
        conn.close()
        
        return {
            "donation_id": donation_id,
            "status": "created",
            "qr_code_url": qr_url,
            "qr_code_image": qr_code_base64,
            "ngo": {
                "id": ngo['id'],
                "name": ngo['name'],
                "email": ngo['email']
            },
            "product": {
                "name": product['product_name'],
                "batch_id": product['batch_id'],
                "quantity": request.quantity
            },
            "next_step": "Share this QR code with the NGO. They will scan it to confirm receipt.",
            "created_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# NGO ENDPOINTS
# ========================

@router.post("/ngo/scan-donation", tags=["NGO"])
async def scan_donation_qr(request: ShipmentReceiveRequest, user: dict = Depends(get_current_user)):
    """
    Scan retailer's QR code to see donation details
    Returns product info without confirming the donation yet
    """
    if user['role'] != 'ngo':
        raise HTTPException(status_code=403, detail="Only NGOs can scan donations")
    
    try:
        url = request.scanned_url
        
        # Extract GS1 data
        gtin_match = re.search(r'/01/(\d{14})', url)
        batch_match = re.search(r'/10/([^/]+)', url)
        
        if not (gtin_match and batch_match):
            raise HTTPException(status_code=400, detail="Invalid QR code format")
        
        gtin = gtin_match.group(1)
        batch_id = batch_match.group(1)
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Find product
        cursor.execute('''
            SELECT p.id, p.product_name, p.batch_id, p.expiry_date, p.manufacturer_id,
                   i.quantity_in_stock, i.retailer_id
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.gtin = ? AND p.batch_id = ?
        ''', (gtin, batch_id))
        
        product = cursor.fetchone()
        if not product:
            conn.close()
            raise HTTPException(status_code=404, detail="Product not found")
        
        product = dict(product)
        
        # Get retailer info
        if product['retailer_id']:
            cursor.execute('''
                SELECT name, city FROM users WHERE id = ?
            ''', (product['retailer_id'],))
            retailer = dict(cursor.fetchone())
        else:
            retailer = {"name": "Unknown Retailer", "city": "Unknown"}
        
        conn.close()
        
        return {
            "product": {
                "id": product['id'],
                "name": product['product_name'],
                "batch_id": product['batch_id'],
                "expiry_date": product['expiry_date'],
                "quantity_available": product['quantity_in_stock'] or 0
            },
            "retailer": {
                "name": retailer['name'],
                "location": retailer.get('city', 'Unknown')
            },
            "status": "ready_for_confirmation"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DonationConfirmRequest(BaseModel):
    product_id: int
    batch_id: str
    quantity_received: int = Field(..., gt=0)
    ngo_signature: str
    retailer_id: int


@router.post("/ngo/confirm-donation", tags=["NGO"])
async def confirm_donation(request: DonationConfirmRequest, user: dict = Depends(get_current_user)):
    """
    Confirm donation receipt and calculate GOODWILL tokens
    Uses Gemini to get market price if API key available, otherwise uses estimate
    """
    if user['role'] != 'ngo':
        raise HTTPException(status_code=403, detail="Only NGOs can confirm donations")
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get product details
        cursor.execute('''
            SELECT product_name, gtin FROM products WHERE id = ?
        ''', (request.product_id,))
        
        product = cursor.fetchone()
        if not product:
            conn.close()
            raise HTTPException(status_code=404, detail="Product not found")
        
        product = dict(product)
        
        # Get market price (Priority: 1.DB MRP, 2.Gemini, 3.Estimate)
        market_price_per_unit = estimate_market_price(product['product_name'], request.product_id)
        
        # Calculate total value
        total_value_inr = market_price_per_unit * request.quantity_received
        
        # GOODWILL Token Formula: Market Price × 0.00001
        goodwill_tokens = total_value_inr * 0.00001
        
        # Create donation record
        cursor.execute('''
            INSERT INTO donations (
                retailer_id, ngo_id, product_id, batch_id,
                quantity, market_price_per_unit, total_value_inr,
                goodwill_tokens_earned, donation_date, status,
                retailer_signature, ngo_signature
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?)
        ''', (
            request.retailer_id, user['id'], request.product_id, request.batch_id,
            request.quantity_received, market_price_per_unit, total_value_inr,
            goodwill_tokens, datetime.now().isoformat(),
            'demo_retailer_sig', request.ngo_signature
        ))
        
        donation_id = cursor.lastrowid
        
        # Update retailer's GOODWILL token balance
        cursor.execute('''
            INSERT INTO goodwill_tokens (user_id, balance, last_updated)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                balance = balance + ?,
                last_updated = ?
        ''', (
            request.retailer_id, goodwill_tokens, datetime.now().isoformat(),
            goodwill_tokens, datetime.now().isoformat()
        ))
        
        # Get new balance
        cursor.execute('''
            SELECT balance FROM goodwill_tokens WHERE user_id = ?
        ''', (request.retailer_id,))
        
        balance_row = cursor.fetchone()
        new_balance = balance_row['balance'] if balance_row else goodwill_tokens
        
        # Update inventory (reduce quantity)
        cursor.execute('''
            UPDATE inventory
            SET quantity_in_stock = quantity_in_stock - ?,
                last_updated = ?
            WHERE product_id = ? AND retailer_id = ?
        ''', (request.quantity_received, datetime.now().isoformat(), request.product_id, request.retailer_id))
        
        # Log audit
        cursor.execute('''
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (?, 'confirm_donation', 'donation', ?, ?)
        ''', (user['id'], donation_id, f"Donation of {request.quantity_received} units confirmed"))
        
        conn.commit()
        conn.close()
        
        return {
            "donation_id": donation_id,
            "status": "confirmed",
            "calculation": {
                "market_price_per_unit": market_price_per_unit,
                "quantity": request.quantity_received,
                "total_value_inr": total_value_inr,
                "goodwill_tokens_earned": round(goodwill_tokens, 6)
            },
            "retailer_new_balance": round(new_balance, 6),
            "ngo_contribution": f"{request.quantity_received} units received",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))


def estimate_market_price(product_name: str, product_id: int = None) -> float:
    """
    Get market price - priority order:
    1. Check database for stored MRP (from manufacturer)
    2. Use Gemini AI lookup (real-time)
    3. Use fallback estimates
    """
    
    # Priority 1: Check database for stored MRP
    if product_id:
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('SELECT mrp_per_item FROM products WHERE id = ?', (product_id,))
            result = cursor.fetchone()
            conn.close()
            
            if result and result['mrp_per_item']:
                mrp = float(result['mrp_per_item'])
                print(f"✅ Using stored MRP for {product_name}: ₹{mrp}")
                return mrp
        except Exception as e:
            print(f"⚠️ Database MRP lookup failed: {e}")
    
    # Priority 2: Use Gemini AI
    try:
        from gemini_simple import get_market_price_simple
        
        result = get_market_price_simple(product_name)
        
        if result.get("success") and "price_inr" in result:
            print(f"✅ Using Gemini price for {product_name}: ₹{result['price_inr']}")
            return float(result["price_inr"])
        
        if "price_inr" in result:
            return float(result["price_inr"])
            
    except Exception as e:
        print(f"⚠️ Gemini lookup failed: {e}")
    
    # Priority 3: Fallback estimates
    from gemini_simple import get_fallback_price
    price = get_fallback_price(product_name)
    print(f"⚠️ Using fallback estimate for {product_name}: ₹{price}")
    return price


@router.get("/ngo/donation-history", tags=["NGO"])
async def get_donation_history(user: dict = Depends(get_current_user)):
    """Get NGO's donation history"""
    if user['role'] != 'ngo':
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            d.id, d.donation_date, d.quantity, d.total_value_inr,
            d.goodwill_tokens_earned, d.status,
            p.product_name, p.batch_id,
            u.name as retailer_name
        FROM donations d
        JOIN products p ON d.product_id = p.id
        JOIN users u ON d.retailer_id = u.id
        WHERE d.ngo_id = ?
        ORDER BY d.donation_date DESC
        LIMIT 50
    ''', (user['id'],))
    
    donations = [dict(row) for row in cursor.fetchall()]
    
    # Calculate totals
    cursor.execute('''
        SELECT 
            COUNT(*) as total_donations,
            SUM(quantity) as total_items,
            SUM(total_value_inr) as total_value,
            SUM(goodwill_tokens_earned) as total_tokens_generated
        FROM donations
        WHERE ngo_id = ?
    ''', (user['id'],))
    
    stats = dict(cursor.fetchone())
    
    conn.close()
    
    return {
        "donations": donations,
        "stats": {
            "total_donations": stats['total_donations'] or 0,
            "total_items_received": stats['total_items'] or 0,
            "total_value_inr": float(stats['total_value'] or 0),
            "total_tokens_generated": round(float(stats['total_tokens_generated'] or 0), 6)
        }
    }


# ========================
# ADMIN / DASHBOARD
# ========================

@router.get("/dashboard/live-stats", tags=["Dashboard"])
async def get_live_stats():
    """Get live platform statistics"""
    conn = get_db()
    cursor = conn.cursor()
    
    # User statistics
    cursor.execute("SELECT role, COUNT(*) as count FROM users GROUP BY role")
    users_by_role = {row['role']: row['count'] for row in cursor.fetchall()}
    
    # Total products/batches
    cursor.execute("SELECT COUNT(*) as count, SUM(quantity) as total_qty FROM products")
    products_data = dict(cursor.fetchone())
    
    # Total sales
    cursor.execute("SELECT COUNT(*) as count, SUM(total_price) as revenue FROM sales")
    sales_data = dict(cursor.fetchone())
    
    # Total donations
    cursor.execute("SELECT COUNT(*) as count, SUM(quantity) as total_qty FROM donations WHERE status = 'verified'")
    donations_data = dict(cursor.fetchone())
    
    # Products expiring soon
    cursor.execute('''
        SELECT COUNT(*) as count FROM products
        WHERE JULIANDAY(expiry_date) - JULIANDAY('now') <= 7
    ''')
    expiring_soon = cursor.fetchone()['count']
    
    conn.close()
    
    return {
        "users": {
            "manufacturers": users_by_role.get('manufacturer', 0),
            "retailers": users_by_role.get('retailer', 0),
            "ngos": users_by_role.get('ngo', 0),
            "admins": users_by_role.get('admin', 0),
            "total": sum(users_by_role.values())
        },
        "products": {
            "total_batches": products_data['count'] or 0,
            "total_items": products_data['total_qty'] or 0
        },
        "sales": {
            "total_transactions": sales_data['count'] or 0,
            "total_revenue": float(sales_data['revenue'] or 0)
        },
        "donations": {
            "total_donations": donations_data['count'] or 0,
            "total_items_donated": donations_data['total_qty'] or 0
        },
        "alerts": {
            "expiring_soon": expiring_soon
        },
        "last_updated": datetime.now().isoformat()
    }
