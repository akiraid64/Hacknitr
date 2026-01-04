"""
Barcode Image Scanning Endpoint
Integrates pyzbar decoder with inventory reduction
"""

from fastapi import UploadFile, File, HTTPException, Depends
from PIL import Image
from pyzbar import pyzbar
import io
from barcode_scanner import scan_barcode
from datetime import datetime

async def scan_barcode_image_endpoint(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """
    Upload barcode image, decode it, and reduce inventory quantity
    
    Flow:
    1. Upload barcode image
    2. Decode using pyzbar
    3. Find product by GTIN
    4. Reduce quantity by 1
    5. Auto-trigger AI recommendations
    """
    
    if user['role'] != 'retailer':
        raise HTTPException(status_code=403, detail="Only retailers can scan barcodes")
    
    try:
        # Read uploaded image
        image_data = await file.read()
        
        # Decode barcode using pyzbar
        img = Image.open(io.BytesIO(image_data))
        barcodes = pyzbar.decode(img)
        
        if not barcodes:
            raise HTTPException(
                status_code=400, 
                detail="No barcode found in image. Please ensure barcode is clear and visible."
            )
        
        # Get first barcode
        barcode_data = barcodes[0].data.decode('utf-8')
        barcode_type = barcodes[0].type
        
        print(f"✅ Barcode decoded: {barcode_type} = {barcode_data}")
        
        # Use barcode_scanner module to reduce quantity
        scan_result = scan_barcode(barcode_data, user['id'])
        
        if not scan_result['success']:
            raise HTTPException(
                status_code=404 if 'not found' in scan_result.get('error', '').lower() else 400,
                detail=scan_result.get('error', 'Unknown error')
            )
        
        # Auto-trigger AI recommendations
        from database import get_retailer_inventory
        from gemini_inventory import analyze_inventory_for_recommendations
        
        inventory = get_retailer_inventory(user['id'])
        ai_recommendations = analyze_inventory_for_recommendations(inventory)
        
        return {
            "status": "success",
            "barcode_type": barcode_type,
            "barcode_data": barcode_data,
            "product": scan_result['product'],
            "quantity_change": scan_result['quantity_change'],
            "ai_recommendations": ai_recommendations,
            "scanned_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing barcode: {str(e)}")


# Copy this function into main.py as:
# @app.post("/api/v1/retailer/scan-barcode-image", tags=["Retailer"])
# async def scan_barcode_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
#     ... (paste above code)
