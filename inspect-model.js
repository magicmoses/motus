#!/usr/bin/env node
/**
 * GLB Model Inspector
 * Analyzes myology.glb structure to find meshes, materials, and annotations
 */

const fs = require('fs');
const path = require('path');

// Minimal GLB parser to inspect structure
async function inspectGLB(filePath) {
  console.log(`\n📦 Inspecting: ${filePath}\n`);

  const data = fs.readFileSync(filePath);

  // GLB header: magic (4 bytes) + version (4 bytes) + length (4 bytes)
  const magic = data.toString('utf8', 0, 4);
  const version = data.readUInt32LE(4);
  const length = data.readUInt32LE(8);

  console.log(`✓ GLB Format: magic=${magic}, version=${version}, length=${length} bytes`);

  // Parse JSON chunk (usually first chunk)
  let offset = 12; // After header
  const chunkLength = data.readUInt32LE(offset);
  const chunkType = data.toString('utf8', offset + 4, offset + 8);

  console.log(`✓ First chunk: type=${chunkType}, length=${chunkLength} bytes\n`);

  if (chunkType === 'JSON') {
    const jsonData = JSON.parse(data.toString('utf8', offset + 8, offset + 8 + chunkLength));

    // Analyze structure
    console.log('📋 MODEL STRUCTURE:');
    console.log(`   Scenes: ${jsonData.scenes?.length || 0}`);
    console.log(`   Nodes: ${jsonData.nodes?.length || 0}`);
    console.log(`   Meshes: ${jsonData.meshes?.length || 0}`);
    console.log(`   Materials: ${jsonData.materials?.length || 0}`);
    console.log(`   Skins (rigs): ${jsonData.skins?.length || 0}`);
    console.log(`   Animations: ${jsonData.animations?.length || 0}`);

    // List all node names (these are the anatomy parts!)
    console.log('\n🦴 MESH/BONE NAMES (potential anatomy parts):');
    if (jsonData.nodes) {
      jsonData.nodes.forEach((node, i) => {
        if (node.name) {
          const mesh = node.mesh !== undefined ? ` [mesh:${node.mesh}]` : '';
          const children = node.children ? ` (${node.children.length} children)` : '';
          console.log(`   ${i}: ${node.name}${mesh}${children}`);
        }
      });
    }

    // List materials (for coloring info)
    console.log('\n🎨 MATERIALS:');
    if (jsonData.materials) {
      jsonData.materials.forEach((mat, i) => {
        const name = mat.name || `Material_${i}`;
        const color = mat.pbrMetallicRoughness?.baseColorFactor || 'default';
        console.log(`   ${i}: ${name} - color: ${JSON.stringify(color)}`);
      });
    }

    return {
      nodeNames: jsonData.nodes?.map(n => n.name).filter(Boolean) || [],
      materialCount: jsonData.materials?.length || 0,
      meshCount: jsonData.meshes?.length || 0,
    };
  }
}

// Run
const modelPath = path.join(__dirname, 'public/models/myology.glb');
if (fs.existsSync(modelPath)) {
  inspectGLB(modelPath).catch(console.error);
} else {
  console.error(`❌ Model not found at ${modelPath}`);
}
