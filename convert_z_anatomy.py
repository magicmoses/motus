#!/usr/bin/env python3
"""
Z-Anatomy OBJ to GLB Batch Converter
Downloads Z-Anatomy from GitHub and converts all OBJ files to a single GLB.
Run with: blender -b --python convert_z_anatomy.py
"""

import os
import subprocess
import sys
from pathlib import Path

# Configuration
TEMP_DIR = Path("D:/temp")
REPO_URL = "https://github.com/Z-Anatomy/Models-of-human-anatomy.git"
SOURCE_DIR = TEMP_DIR / "z-anatomy-source"
OBJ_OUTPUT_DIR = TEMP_DIR / "z-anatomy-objs"
GLB_OUTPUT = TEMP_DIR / "z-anatomy-complete.glb"

def clone_repo():
    """Clone Z-Anatomy repository if not already cloned."""
    if SOURCE_DIR.exists():
        print(f"✓ Repository already exists at {SOURCE_DIR}")
        return

    print(f"📥 Cloning Z-Anatomy from {REPO_URL}...")
    os.chdir(TEMP_DIR)
    result = subprocess.run(['git', 'clone', REPO_URL, str(SOURCE_DIR)],
                          capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Clone failed: {result.stderr}")
        sys.exit(1)
    print("✓ Clone successful")

def extract_zip():
    """Extract Z-Anatomy.zip if not already extracted."""
    zip_file = SOURCE_DIR / "Z-Anatomy.zip"
    extract_dir = SOURCE_DIR / "Z-Anatomy"

    if extract_dir.exists():
        print(f"✓ Z-Anatomy already extracted")
        return

    if not zip_file.exists():
        print(f"❌ Z-Anatomy.zip not found at {zip_file}")
        sys.exit(1)

    print(f"📦 Extracting Z-Anatomy.zip ({zip_file.stat().st_size / (1024**3):.1f} GB)...")
    import zipfile
    try:
        with zipfile.ZipFile(zip_file, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        print(f"✓ Extraction complete")
    except Exception as e:
        print(f"❌ Extraction failed: {e}")
        sys.exit(1)

def find_obj_files():
    """Find all OBJ files in the repository."""
    extract_dir = SOURCE_DIR / "Z-Anatomy"
    obj_files = list(extract_dir.rglob("*.obj"))
    print(f"✓ Found {len(obj_files)} OBJ files")
    return obj_files

def convert_to_glb():
    """Convert OBJ files to GLB using Blender Python API."""
    try:
        import bpy
    except ImportError:
        print("❌ Blender Python API not available. Run with: blender -b --python convert_z_anatomy.py")
        sys.exit(1)

    obj_files = find_obj_files()
    if not obj_files:
        print("❌ No OBJ files found")
        sys.exit(1)

    print(f"\n🔄 Converting {len(obj_files)} OBJ files to GLB...")

    # Clear default scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    # Import all OBJ files
    for i, obj_file in enumerate(obj_files, 1):
        if i % 100 == 0:
            print(f"   Imported {i}/{len(obj_files)} files...")

        try:
            bpy.ops.import_scene.obj(filepath=str(obj_file))
        except Exception as e:
            print(f"   ⚠️  Skipped {obj_file.name}: {e}")
            continue

    print(f"✓ All OBJ files loaded into Blender")

    # Ensure output directory exists
    GLB_OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    # Export as GLB
    print(f"\n💾 Exporting to {GLB_OUTPUT}...")
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_OUTPUT),
        export_format='GLB',
        export_draco_mesh_compression_enabled=False,
        export_animations=False,
        use_visible=True,
        use_renderable=True
    )

    file_size_mb = GLB_OUTPUT.stat().st_size / (1024 * 1024)
    print(f"✓ Export complete!")
    print(f"📦 Output: {GLB_OUTPUT}")
    print(f"📊 File size: {file_size_mb:.1f} MB")
    print(f"\n✅ READY TO USE: Copy to your project and load with Three.js!")

def main():
    """Main execution flow."""
    print("=" * 70)
    print("Z-ANATOMY OBJ → GLB CONVERTER")
    print("=" * 70)
    print(f"Temp dir: {TEMP_DIR}")
    print(f"Output:   {GLB_OUTPUT}\n")

    # Step 1: Clone repo
    print("STEP 1: Downloading Z-Anatomy...")
    clone_repo()

    # Step 1b: Extract ZIP
    print("\nSTEP 1b: Extracting Z-Anatomy.zip...")
    extract_zip()

    # Step 2: Convert to GLB
    print("\nSTEP 2: Converting to GLB...")
    convert_to_glb()

if __name__ == "__main__":
    main()
