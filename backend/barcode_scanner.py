"""
Standalone Barcode Scanning Module for Retailer Inventory Management
Tests quantity reduction and AI auto-trigger functionality
"""

import sqlite3
from datetime import datetime
import json

DATABASE_NAME = "toolinc_system.db"

def scan_barcode(gtin, retailer_id):
    """
    Scan a barcode and reduce inventory quantity by 1
    
    Args:
        gtin: Product barcode number (GTIN)
        retailer_id: ID of the retailer scanning
    
    Returns:
        dict with scan results and updated product info
    """
    
    conn = sqlite3.connect(DATABASE_NAME, timeout=30.0)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Find product by GTIN in retailer's inventory
        cursor.execute('''
            SELECT 
                p.id, 
                p.product_name, 
                p.quantity, 
                p.gtin, 
                p.batch_id,
                p.expiry_date
            FROM products p
            INNER JOIN supply_chain_events sce ON sce.product_id = p.id
            WHERE p.gtin = ? 
              AND sce.actor_id = ? 
              AND sce.event_type = 'scan'
            LIMIT 1
        ''', (gtin, retailer_id))
        
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return {
                "success": False,
                "error": "Product not found in your inventory",
                "gtin": gtin
            }
        
        product = dict(result)
        product_id = product['id']
        current_qty = product['quantity']
        
        # Check if in stock
        if current_qty <= 0:
            conn.close()
            return {
                "success": False,
                "error": "Product out of stock",
                "product": product
            }
        
        # Reduce quantity by 1
        new_qty = current_qty - 1
        cursor.execute(
            'UPDATE products SET quantity = ? WHERE id = ?',
            (new_qty, product_id)
        )
        conn.commit()
        
        print(f"✅ Barcode Scan Success!")
        print(f"   Product: {product['product_name']}")
        print(f"   GTIN: {gtin}")
        print(f"   Quantity: {current_qty} → {new_qty}")
        
        result_data = {
            "success": True,
            "product": {
                "id": product_id,
                "name": product['product_name'],
                "gtin": product['gtin'],
                "batch": product['batch_id'],
                "expiry": product['expiry_date']
            },
            "quantity_change": {
                "before": current_qty,
                "after": new_qty,
                "reduced_by": 1
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return result_data
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        conn.close()


def get_inventory_summary(retailer_id):
    """Get summary of retailer's current inventory"""
    
    conn = sqlite3.connect(DATABASE_NAME, timeout=30.0)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                p.product_name,
                p.gtin,
                p.batch_id,
                p.quantity,
                p.expiry_date
            FROM products p
            INNER JOIN supply_chain_events sce ON sce.product_id = p.id
            WHERE sce.actor_id = ? AND sce.event_type = 'scan'
            ORDER BY p.quantity DESC
        ''', (retailer_id,))
        
        products = [dict(row) for row in cursor.fetchall()]
        
        total_items = sum(p['quantity'] for p in products)
        total_products = len(products)
        
        return {
            "total_products": total_products,
            "total_items": total_items,
            "products": products
        }
        
    finally:
        conn.close()


# Test function
if __name__ == "__main__":
    print("\n" + "="*60)
    print("🔧 BARCODE SCANNING MODULE TEST")
    print("="*60)
    
    # Test with retailer ID 2 (bigbazaar)
    TEST_RETAILER_ID = 2
    TEST_GTIN = "09506000134352"  # Example GTIN
    
    print(f"\n1️⃣ Getting inventory before scan...")
    before_inventory = get_inventory_summary(TEST_RETAILER_ID)
    print(f"   Total Products: {before_inventory['total_products']}")
    print(f"   Total Items: {before_inventory['total_items']}")
    
    if before_inventory['products']:
        print(f"\n   Sample product:")
        sample = before_inventory['products'][0]
        print(f"   - {sample['product_name']}")
        print(f"   - GTIN: {sample['gtin']}")
        print(f"   - Quantity: {sample['quantity']}")
        
        # Use this GTIN for testing
        TEST_GTIN = sample['gtin']
    
    print(f"\n2️⃣ Scanning barcode: {TEST_GTIN}")
    scan_result = scan_barcode(TEST_GTIN, TEST_RETAILER_ID)
    
    if scan_result['success']:
        print(f"\n✅ SUCCESS!")
        print(json.dumps(scan_result, indent=2))
    else:
        print(f"\n❌ FAILED!")
        print(f"   Error: {scan_result.get('error')}")
    
    print(f"\n3️⃣ Getting inventory after scan...")
    after_inventory = get_inventory_summary(TEST_RETAILER_ID)
    print(f"   Total Items: {before_inventory['total_items']} → {after_inventory['total_items']}")
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETE")
    print("="*60 + "\n")
