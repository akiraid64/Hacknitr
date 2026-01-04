import sqlite3
import hashlib
from datetime import datetime

DATABASE_NAME = "toolinc_system.db"  # The actual database being used!

def create_test_ngo():
    """Create test NGO user in the CORRECT database"""
    conn = sqlite3.connect(DATABASE_NAME, timeout=30.0)
    cursor = conn.cursor()
    
    # Hash password
    password_hash = hashlib.sha256("test123".encode()).hexdigest()
    
    try:
        cursor.execute('''
            INSERT INTO users (
                email, password_hash, role, name, 
                company_name, city, is_verified,
                darpan_id, fcra_number,
                created_at
            ) VALUES (?, ?, 'ngo', ?, ?, ?, 1, ?, ?, ?)
        ''', (
            "test@ngo.org",
            password_hash,
            "Test NGO Organization",
            "Test NGO",
            "Mumbai",
            "TEST123",
            "TEST456",
            datetime.now().isoformat()
        ))
        
        conn.commit()
        user_id = cursor.lastrowid
        print(f"✅ Created test NGO in {DATABASE_NAME}")
        print(f"   Email: test@ngo.org")
        print(f"   Password: test123")
        print(f"   ID: {user_id}")
        
    except sqlite3.IntegrityError:
        print(f"⚠️  test@ngo.org already exists")
        cursor.execute('SELECT id, email, name FROM users WHERE email = ?', ("test@ngo.org",))
        user = cursor.fetchone()
        if user:
            print(f"   Found: ID={user[0]}, Email={user[1]}, Name={user[2]}")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    create_test_ngo()
