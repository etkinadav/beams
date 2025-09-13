# Simple test to check if the current setup is working for real-time updates
# אמור לרוץ מה-Terminal של Angular

import requests
import time
import json

def test_parameter_updates():
    """Test the complete parameter update flow"""
    
    print("🧪 Testing Parameter Update Flow")
    print("=" * 50)
    
    # Test 1: Send parameters to the Node.js server
    print("\n1️⃣ Testing Node.js server connection...")
    
    test_params = [
        {"a": 2.0, "b": 3.0},
        {"a": 2.5, "b": 3.5},
        {"a": 3.0, "b": 4.0},
    ]
    
    backend_url = "http://localhost:3000/update-blender-params"
    
    for i, params in enumerate(test_params):
        try:
            response = requests.post(backend_url, json=params, timeout=5)
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ Test {i+1}: {params} -> {result['status']}")
            else:
                print(f"   ❌ Test {i+1}: HTTP {response.status_code}")
        except Exception as e:
            print(f"   ❌ Test {i+1}: Connection failed - {e}")
        
        time.sleep(1)  # Wait between tests
    
    # Test 2: Check if params file is being updated
    print("\n2️⃣ Checking params file...")
    
    params_file = "blender_params.json"
    try:
        with open(params_file, 'r') as f:
            data = json.load(f)
        print(f"   ✅ File updated: a={data['a']}, b={data['b']}")
        print(f"   🕐 Timestamp: {data['timestamp']}")
    except Exception as e:
        print(f"   ❌ Cannot read params file: {e}")
    
    print("\n🎯 Next step: Run the auto-updater in Blender")
    print("   Copy/paste this in Blender Text Editor and run:")
    print("   exec(open(r'C:\\Users\\User\\Desktop\\programming\\beams\\beams\\start_auto_updater.py').read())")

if __name__ == "__main__":
    test_parameter_updates()
