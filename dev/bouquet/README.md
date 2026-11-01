# 3D Purple Flower & Bouquet Assets for Web Rendering

A curated, production-ready collection of **9 high-quality 3D assets** in binary glTF format (`.glb`), featuring **individual purple flower species** and **complete bouquets**, optimized specifically for real-time web rendering in **Three.js**, **React Three Fiber (R3F)**, **Babylon.js**, and Google **`<model-viewer>`**.

---

## 📁 Asset Directory Structure

```text
tulip/
├── assets/
│   ├── individual/                        # Standalone purple flowers (standardized meter scale, base at Y=0)
│   │   ├── purple_rose.glb                # Velvet purple garden rose (0.50m)
│   │   ├── purple_iris.glb                # Siberian violet iris (0.70m)
│   │   ├── purple_eustoma.glb             # Bell-shaped lisianthus / eustoma (0.50m)
│   │   ├── purple_tulip.glb               # Royal purple Dutch tulip (0.55m)
│   │   ├── lavender.glb                   # Botanical French lavender stem (0.56m)
│   │   ├── purple_echinacea.glb           # Purple coneflower with spiky cone (0.78m)
│   │   └── stylized_purple_blossom.glb    # Ultra-lightweight low-poly blossom (4.8 KB)
│   └── bouquet/                           # Assembled multi-stem floral arrangements
│       ├── purple_flower_bouquet.glb      # Hand-tied 24-stem multi-species purple bouquet
│       └── glass_vase_purple_flowers.glb  # Bouquet in transparent PBR refractive glass vase
├── index.html                             # Interactive 3D WebGL preview gallery & inspector
├── serve.js                               # Lightweight local HTTP server with glTF MIME types
├── build_bouquet.js                       # Node.js procedural bouquet assembly generator
├── process_individual.js                  # Model normalization and tinting pipeline
└── inspect_all.js                         # Asset inspection & polygon validation utility
```

---

## 🌸 3D Asset Catalog & Specifications

All models are formatted in **glTF 2.0 Binary (`.glb`)** with embedded PBR materials (metallic/roughness), textures, normals, and sRGB color encoding.

### 1. Bouquets

| Model | File Path | File Size | Triangles | Vertices | Bounding Dimensions (W×H×D) | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Purple Flower Bouquet** | [`assets/bouquet/purple_flower_bouquet.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/bouquet/purple_flower_bouquet.glb) | `22.5 MB` | `52,109` | `45,415` | `0.27 × 0.72 × 0.24 m` | Pre-assembled 24-flower hand-tied bouquet featuring purple roses, irises, eustomas, and tulips in radiating rings, bound with a satin ribbon. |
| **Glass Vase Purple Bouquet** | [`assets/bouquet/glass_vase_purple_flowers.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/bouquet/glass_vase_purple_flowers.glb) | `1.82 MB` | `10,218` | `5,989` | `0.10 × 0.20 × 0.22 m` | Bouquet in a transparent glass vase demonstrating PBR `KHR_materials_transmission` and optical volume. |

### 2. Individual Flowers

| Flower Name | File Path | File Size | Triangles | Vertices | Dimensions (W×H×D) | Visual Characteristics |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Purple Rose** | [`assets/individual/purple_rose.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/purple_rose.glb) | `2.99 MB` | `9,940` | `11,031` | `0.21 × 0.50 × 0.22 m` | Lush spiraling velvet purple petals with leafy stem, ideal for close-up inspection. |
| **Purple Siberian Iris** | [`assets/individual/purple_iris.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/purple_iris.glb) | `8.28 MB` | `9,808` | `9,314` | `0.27 × 0.70 × 0.24 m` | Vivid royal purple blossom with ruffled standards, drooping falls, and tall upright stem. |
| **Purple Eustoma (Lisianthus)** | [`assets/individual/purple_eustoma.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/purple_eustoma.glb) | `8.88 MB` | `29,314` | `22,243` | `0.19 × 0.50 × 0.21 m` | Bell-shaped delicate petals in rich royal purple, smooth natural shading. |
| **Purple Dutch Tulip** | [`assets/individual/purple_tulip.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/purple_tulip.glb) | `2.32 MB` | `2,999` | `2,777` | `0.15 × 0.55 × 0.15 m` | Classic cup-shaped blossom tinted in deep purple with upright stem. |
| **French Lavender** | [`assets/individual/lavender.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/lavender.glb) | `9.42 MB` | `63,984` | `130,288` | `0.45 × 0.56 × 0.38 m` | Clustered lavender florets in soft pastel violet (`#806BB0`) with narrow foliage. |
| **Purple Coneflower (Echinacea)** | [`assets/individual/purple_echinacea.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/purple_echinacea.glb) | `10.8 MB` | `14,554` | `12,878` | `0.64 × 0.78 × 0.71 m` | Prominent spiky cone center surrounded by drooping purple ray florets. |
| **Stylized Purple Blossom** | [`assets/individual/stylized_purple_blossom.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/stylized_purple_blossom.glb) | `4.86 KB` | `80` | `218` | `0.12 × 0.11 × 0.17 m` | Ultra-low poly Kenney blossom tinted in vivid purple, split stem and blossom meshes. |

---

## 🚀 Live Interactive 3D Web Viewer

An interactive WebGL showcase application is included in [`index.html`](file:///c:/Users/Neil/Desktop/tulip/index.html).

### Starting the Local Server

```powershell
node serve.js
```
Then navigate to: **`http://localhost:3000/`** in any modern web browser.

### Features
- **Real-time 3D Viewport**: Orbit, zoom, and pan controls via Three.js `OrbitControls`.
- **Auto-Rotation & Wireframe**: One-click toggles for auto-spinning and topology inspection.
- **Lighting & Tone Control**: Switch between dark studio mode and bright natural lighting.
- **Dynamic Stats Inspector**: Live readouts for triangle count, vertex count, bounding box, and file size.
- **Direct GLB Download**: One-click download buttons for each asset.
- **Code Snippet Generator**: Copy-paste integration snippets for Three.js, React Three Fiber, and `<model-viewer>`.

---

## 💻 Web Integration Code Examples

### 1. Three.js (Vanilla JavaScript)

```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Setup Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0.6, 0.5, 0.9);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.8);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(2, 4, 2);
scene.add(dirLight);

// Load 3D Purple Flower Bouquet
const loader = new GLTFLoader();
loader.load('assets/bouquet/purple_flower_bouquet.glb', (gltf) => {
    const bouquet = gltf.scene;
    bouquet.position.set(0, 0, 0);
    scene.add(bouquet);
});

// Render Loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
```

---

### 2. React Three Fiber (R3F)

```tsx
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';

function PurpleBouquet(props) {
  const { scene } = useGLTF('/assets/bouquet/purple_flower_bouquet.glb');
  return <primitive object={scene} {...props} />;
}

export default function FlowerScene() {
  return (
    <Canvas camera={{ position: [0.6, 0.5, 0.9], fov: 45 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} />
      <Suspense fallback={null}>
        <PurpleBouquet position={[0, -0.2, 0]} />
        <Environment preset="city" />
      </Suspense>
      <OrbitControls autoRotate autoRotateSpeed={1.5} />
    </Canvas>
  );
}

useGLTF.preload('/assets/bouquet/purple_flower_bouquet.glb');
```

---

### 3. Google `<model-viewer>` (HTML Web Component)

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
</head>
<body>
  <!-- 3D Flower Bouquet Viewer -->
  <model-viewer
    src="assets/bouquet/purple_flower_bouquet.glb"
    alt="3D Purple Flower Bouquet"
    auto-rotate
    camera-controls
    shadow-intensity="1"
    exposure="1.1"
    style="width: 100vw; height: 100vh; background: #12131a;"
  ></model-viewer>
</body>
</html>
```

---

## 📜 Licenses & Attribution

- **Glass Vase with Flowers**: The Khronos Group glTF Sample Assets ([CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)). Models by Rico Cilliers (Flowers) and Eric Chadwick (Vase).
- **Stylized Blossom**: Kenney ([CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)), Nature Pack. Modified by Don McCurdy.
- **Roses, Irises, Eustomas, Tulips**: Open source floral 3D models curated and arranged into standardized Y-up meter-scale glTF binary assets with PBR texturing.

