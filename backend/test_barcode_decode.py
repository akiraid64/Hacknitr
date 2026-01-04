"""
Test barcode decoding using pyzbar library (better for barcodes than QR API)
"""

from PIL import Image
from pyzbar import pyzbar
import sqlite3

# Image path from user
IMAGE_PATH = r"C:\Users\sabat\Downloads\WhatsApp Image 2026-01-04 at 5.38.06 AM.jpeg"
DATABASE_NAME = "toolinc_system.db"

def decode_barcode_pyzbar(image_path):
    """Decode barcode using pyzbar library"""
    
    print(f"\n📸 Reading image: {image_path}")
    
    try:
        # Open image
        img = Image.open(image_path)
        print(f"✅ Image loaded: {img.size[0]}x{img.size[1]} pixels")
        
        # Decode barcodes
        print("🔍 Scanning for barcodes...")
        barcodes = pyzbar.decode(img)
        
        if barcodes:
            print(f"✅ Found {len(barcodes)} barcode(s)!")
            
            for barcode in barcodes:
                barcode_data = barcode.data.decode('utf-8')
                barcode_type = barcode.type
                
                print(f"\n   Type: {barcode_type}")
                print(f"   Data: {barcode_data}")
                
                return barcode_data
        else:
            print("❌ No barcodes found in image")
            print("   (Image might be too blurry or barcode not clear)")
            return None
            
    except FileNotFoundError:
        print(f"❌ Image file not found: {image_path}")
        return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def check_inventory(gtin):
    """Check if this barcode/GTIN exists in inventory"""
    
    print(f"\n🔎 Searching inventory for GTIN: {gtin}")
    
    conn = sqlite3.connect(DATABASE_NAME, timeout=30.0)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                p.id,
                p.product_name,
                p.gtin,
                p.batch_id,
                p.quantity,
                p.expiry_date
            FROM products p
            WHERE p.gtin = ?
        ''', (gtin,))
        
        results = cursor.fetchall()
        
        if results:
            print(f"✅ MATCH FOUND! {len(results)} product(s) in inventory:")
            for product in results:
                print(f"\n   📦 Product: {product['product_name']}")
                print(f"   🔢 GTIN: {product['gtin']}")
                print(f"   📋 Batch: {product['batch_id']}")
                print(f"   📊 Quantity: {product['quantity']}")
                print(f"   📅 Expiry: {product['expiry_date']}")
            return True
        else:
            print("❌ No matching products found in inventory")
            
            # Show all GTINs in database
            cursor.execute('SELECT DISTINCT gtin, product_name FROM products LIMIT 10')
            all_gtins = cursor.fetchall()
            if all_gtins:
                print("\n📋 GTINs currently in database:")
                for g in all_gtins:
                    print(f"   - {g['gtin']} ({g['product_name']})")
            else:
                print("\n(Database is empty - scan some QR codes first)")
            
            return False
            
    finally:
        conn.close()


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🔧 BARCODE DECODER TEST (using pyzbar)")
    print("="*60)
    
    # Step 1: Decode barcode from image
    barcode_number = decode_barcode_pyzbar(IMAGE_PATH)
    
    if barcode_number:
        # Step 2: Check if it exists in inventory
        match_found = check_inventory(barcode_number)
        
        if match_found:
            print("\n🎉 SUCCESS! Barcode matches inventory!")
        else:
            print("\n⚠️ Barcode decoded but not in inventory yet")
    else:
        print("\n❌ Could not decode barcode from image")
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETE")
    print("="*60 + "\n")
