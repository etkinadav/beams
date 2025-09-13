# קוד פשוט לעדכון פרמטרים בבלנדר מקובץ
# הרץ את זה בבלנדר אחרי כל שינוי ב-Angular

import bpy
import json
import os

def update_from_file():
    params_file = r"C:\Users\User\Desktop\programming\beams\beams\blender_params.json"
    
    try:
        # קרא מקובץ
        if os.path.exists(params_file):
            with open(params_file, 'r') as f:
                data = json.load(f)
            
            a = float(data.get('a', 1.0))
            b = float(data.get('b', 2.0))
            
            print(f"📥 Reading from file: a={a}, b={b}")
            
            # עדכן את המודל - השם הנכון הוא "Plane"
            plane = bpy.data.objects.get("Plane")
            if plane:
                for mod in plane.modifiers:
                    if mod.type == 'NODES' and mod.name == 'GeometryNodes':
                        if mod.node_group:
                            # עדכן דרך node group interface (הדרך הנכונה בBlender 4.x)
                            node_group = mod.node_group
                            
                            # מצא את הinput nodes
                            for node in node_group.nodes:
                                if node.type == 'GROUP_INPUT':
                                    # עדכן את הערכים דרך הoutputs של הgroup input node
                                    for output in node.outputs:
                                        if output.name == 'a':
                                            output.default_value = a
                                            print(f"✅ Set a = {a}")
                                        elif output.name == 'b':
                                            output.default_value = b
                                            print(f"✅ Set b = {b}")
                                    break
                            
                            # גישה חלופית - דרך הmodifier properties
                            try:
                                # בBlender חדש יותר, inputs יכולים להיות ב:
                                if hasattr(mod, '__getitem__'):
                                    mod['Input_2'] = a  # לעיתים a הוא Input_2
                                    mod['Input_3'] = b  # לעיתים b הוא Input_3
                                    print(f"✅ Set via modifier properties: a={a}, b={b}")
                            except:
                                pass
                            
                            # גישה נוספת - דרך node group inputs
                            try:
                                for item in node_group.interface.items_tree:
                                    if item.item_type == 'SOCKET' and item.in_out == 'INPUT':
                                        if item.name == 'a':
                                            item.default_value = a
                                            print(f"✅ Set interface a = {a}")
                                        elif item.name == 'b':
                                            item.default_value = b
                                            print(f"✅ Set interface b = {b}")
                            except:
                                pass
                        
                        break
                
                # רענן
                bpy.context.view_layer.update()
                
                for area in bpy.context.screen.areas:
                    if area.type == 'VIEW_3D':
                        area.tag_redraw()
                
                print(f"✅ Model updated successfully!")
                return "SUCCESS: Updated Plane object"
            else:
                print("❌ Plane not found")
                return "ERROR: Plane not found"
        else:
            print(f"❌ File not found: {params_file}")
            return f"ERROR: File not found"
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return f"ERROR: {str(e)}"

# הרץ את העדכון
result = update_from_file()
