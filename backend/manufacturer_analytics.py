"""
Manufacturer Analytics Module
Shows which retailers have manufacturer's products and sales data
NO DATABASE CHANGES - Only SELECT queries
"""

import sqlite3

DATABASE_NAME = "toolinc_system.db"

def get_manufacturer_product_analytics(manufacturer_id):
    """
    Get analytics for manufacturer's products across all retailers
    Shows: retailers who have products, inventory levels, sales data
    
    SAFE: Only SELECT queries, no schema changes
    """
    
    conn = sqlite3.connect(DATABASE_NAME, timeout=30.0)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Get all products created by this manufacturer
        cursor.execute('''
            SELECT DISTINCT
                p.id as product_id,
                p.product_name,
                p.gtin,
                p.batch_id,
                p.expiry_date
            FROM products p
            WHERE p.manufacturer_id = ?
        ''', (manufacturer_id,))
        
        manufacturer_products = [dict(row) for row in cursor.fetchall()]
        
        if not manufacturer_products:
            return {
                "total_products": 0,
                "total_retailers": 0,
                "product_distribution": []
            }
        
        # For each product, find which retailers have it
        product_distribution = []
        
        for product in manufacturer_products:
            cursor.execute('''
                SELECT 
                    u.id as retailer_id,
                    u.name as retailer_name,
                    u.email as retailer_email,
                    u.company_name,
                    p.quantity as current_quantity,
                    p.id as inventory_product_id,
                    COUNT(DISTINCT sce.id) as total_scans
                FROM products p
                INNER JOIN supply_chain_events sce ON sce.product_id = p.id
                INNER JOIN users u ON u.id = sce.actor_id
                WHERE p.gtin = ? 
                  AND p.batch_id = ?
                  AND sce.event_type = 'scan'
                  AND u.role = 'retailer'
                GROUP BY u.id, p.id
            ''', (product['gtin'], product['batch_id']))
            
            retailers_with_product = [dict(row) for row in cursor.fetchall()]
            
            if retailers_with_product:
                product_distribution.append({
                    "product": product,
                    "retailers": retailers_with_product,
                    "total_retailers": len(retailers_with_product),
                    "total_inventory": sum(r['current_quantity'] for r in retailers_with_product)
                })
        
        # Calculate totals
        total_retailers = len(set(
            r['retailer_id'] 
            for pd in product_distribution 
            for r in pd['retailers']
        ))
        
        return {
            "manufacturer_id": manufacturer_id,
            "total_products": len(manufacturer_products),
            "total_retailers": total_retailers,
            "product_distribution": product_distribution
        }
        
    finally:
        conn.close()


# Test function
if __name__ == "__main__":
    print("\n" + "="*60)
    print("📊 MANUFACTURER ANALYTICS TEST")
    print("="*60)
    
    # Test with manufacturer ID 1
    TEST_MANUFACTURER_ID = 1
    
    print(f"\n🔍 Getting analytics for Manufacturer ID: {TEST_MANUFACTURER_ID}")
    
    analytics = get_manufacturer_product_analytics(TEST_MANUFACTURER_ID)
    
    print(f"\n✅ Results:")
    print(f"   Total Products Created: {analytics['total_products']}")
    print(f"   Total Retailers: {analytics['total_retailers']}")
    
    if analytics['product_distribution']:
        print(f"\n📦 Product Distribution:")
        for pd in analytics['product_distribution']:
            print(f"\n   Product: {pd['product']['product_name']}")
            print(f"   GTIN: {pd['product']['gtin']}")
            print(f"   Total Inventory Across Retailers: {pd['total_inventory']}")
            print(f"   Number of Retailers: {pd['total_retailers']}")
            
            for retailer in pd['retailers']:
                print(f"      → {retailer['retailer_name']}: {retailer['current_quantity']} units")
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETE")
    print("="*60 + "\n")
