# Blender HTTP Server - גרסה פשוטה לבדיקה
# הדבק את הקוד הזה בבלנדר ולחץ "Run Script"

import bpy
import http.server
import socketserver
import json
import threading
import time

class SimpleBlenderHandler(http.server.BaseHTTPRequestHandler):
    
    def do_OPTIONS(self):
        """טיפול ב-CORS"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """בדיקת חיבור"""
        try:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                "status": "success",
                "message": "✅ Blender server is working perfectly!",
                "timestamp": time.time()
            }
            
            self.wfile.write(json.dumps(response).encode())
            print("✅ GET request - Server is working!")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            self.send_response(500)
            self.end_headers()
    
    def do_POST(self):
        """עדכון פרמטרים"""
        try:
            if self.path == '/update-params':
                # קרא נתונים
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                params = json.loads(post_data.decode('utf-8'))
                
                print(f"📥 Received: a={params.get('a', 0)}, b={params.get('b', 0)}")
                
                # עדכן Custom Properties
                plane = bpy.data.objects.get("Plane")
                if plane:
                    plane["a"] = float(params.get("a", 1.0))
                    plane["b"] = float(params.get("b", 2.0))
                    print(f"✅ Updated Plane: a={plane['a']}, b={plane['b']}")
                    
                    # רענן תצוגה
                    bpy.context.view_layer.update()
                    for area in bpy.context.screen.areas:
                        if area.type == 'VIEW_3D':
                            area.tag_redraw()
                
                # שלח תשובה
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    "status": "success",
                    "message": "Parameters updated successfully!",
                    "updated_params": params,
                    "speckle_sent": False  # לעת עתה
                }
                
                self.wfile.write(json.dumps(response).encode())
                print("✅ Parameters updated successfully")
                
        except Exception as e:
            print(f"❌ POST Error: {e}")
            self.send_response(500)
            self.end_headers()

def start_simple_server():
    """הפעל שרת פשוט על פורט 8080"""
    try:
        PORT = 8080
        print(f"🚀 Starting Blender server on port {PORT}...")
        
        # עצור שרת קיים
        if hasattr(start_simple_server, 'httpd'):
            try:
                start_simple_server.httpd.shutdown()
                start_simple_server.httpd.server_close()
                print("🛑 Stopped previous server")
            except:
                pass
        
        # התחל שרת חדש
        with socketserver.TCPServer(("", PORT), SimpleBlenderHandler) as httpd:
            start_simple_server.httpd = httpd
            print("🎯 Server is RUNNING!")
            print("💡 Test: http://localhost:8080")
            print("📝 Send to: http://localhost:8080/update-params")
            print("-" * 40)
            httpd.serve_forever()
            
    except OSError as e:
        if "Address already in use" in str(e):
            print("⚠️ Port 8080 is busy. Stop other servers first.")
        else:
            print(f"❌ Server error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

# הפעל את השרת
if __name__ == "__main__":
    # הפעל בthread כדי שלא יחסום את Blender
    server_thread = threading.Thread(target=start_simple_server, daemon=True)
    server_thread.start()
    print("🎯 Blender HTTP Server Started!")
    print("Now test the connection from Angular 🚀")
