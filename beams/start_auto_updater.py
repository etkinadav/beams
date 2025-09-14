import bpy
import os

# Get the path to the auto updater script
script_dir = os.path.dirname(bpy.data.filepath)
if not script_dir:
    # If file is not saved, use current working directory
    script_dir = r"C:\Users\User\Desktop\programming\beams\beams"

auto_updater_path = os.path.join(script_dir, "blender_auto_updater.py")

print(f"🔄 Starting auto updater from: {auto_updater_path}")

# Execute the auto updater script
if os.path.exists(auto_updater_path):
    with open(auto_updater_path, 'r') as file:
        script_content = file.read()
    
    exec(script_content)
    print("✅ Auto updater started successfully!")
else:
    print(f"❌ Auto updater script not found at: {auto_updater_path}")
