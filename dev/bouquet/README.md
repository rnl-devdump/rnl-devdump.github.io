# 3D Purple Flower & Bouquet Assets for Web Rendering

A curated, production-ready collection of **12 high-quality 3D purple flower assets** in binary glTF format (`.glb`), featuring **individual purple botanical species** (water lilies, wild orchids, garden roses, faceted low-poly roses, Dutch tulips, irises, lavender, and coneflowers) and **complete bouquets**, optimized specifically for real-time web rendering in **Three.js**, **React Three Fiber (R3F)**, **Babylon.js**, and Google **`<model-viewer>`**.

---

## 📁 Asset Directory Structure

```text
tulip/
├── assets/
│   ├── individual/                        # Standalone purple flowers (standardized meter scale, base at Y=0)
│   │   ├── purple_water_lily.glb          # Water lily (Nymphaea) on lilypad (0.40m)
│   │   ├── purple_orchid.glb              # Wild exotic purple orchid stem (0.48m)
│   │   ├── purple_rose.glb                # High-detail velvet purple garden rose (0.50m)
│   │   ├── lowpoly_purple_rose.glb        # Faceted low-poly purple rose (0.46m)
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
└── serve.js                               # Lightweight local HTTP server with glTF MIME types
```

---

## 🌸 3D Asset Catalog & Specifications

All models are formatted in **glTF 2.0 Binary (`.glb`)** with embedded PBR materials, textures, and sRGB color encoding.

### 1. Bouquets

| Model | File Path | File Size | Triangles | Vertices | Bounding Dimensions (W×H×D) | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Purple Flower Bouquet** | [`assets/bouquet/purple_flower_bouquet.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/bouquet/purple_flower_bouquet.glb) | `22.5 MB` | `52,109` | `45,415` | `0.27 × 0.72 × 0.24 m` | Pre-assembled 24-flower hand-tied bouquet featuring purple roses, irises, eustomas, and tulips in radiating rings, bound with a satin ribbon. |
| **Glass Vase Purple Bouquet** | [`assets/bouquet/glass_vase_purple_flowers.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/bouquet/glass_vase_purple_flowers.glb) | `1.82 MB` | `10,218` | `5,989` | `0.10 × 0.20 × 0.22 m` | Bouquet in a transparent glass vase demonstrating PBR `KHR_materials_transmission` and optical volume. |

### 2. Individual Flowers

| Flower Name | File Path | File Size | Triangles | Vertices | Dimensions (W×H×D) | Visual Characteristics |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Purple Water Lily (Nymphaea)** | [`assets/individual/purple_water_lily.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/purple_water_lily.glb) | `2.27 MB` | `728` | `1,604` | `0.40 × 0.12 × 0.38 m` | Floating water lily flower on a green lilypad tinted in gentle violet-purple petals. |
| **Purple Orchid** | [`assets/individual/purple_orchid.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/purple_orchid.glb) | `2.44 MB` | `3,497` | `7,478` | `0.22 × 0.48 × 0.24 m` | Wild exotic orchid stem with vibrant purple-violet petals and leafy base. |
| **Velvet Purple Rose** | [`assets/individual/purple_rose.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/purple_rose.glb) | `2.99 MB` | `9,940` | `11,031` | `0.21 × 0.50 × 0.22 m` | Lush spiraling velvet purple petals with leafy stem, ideal for close-up inspection. |
| **Low-Poly Purple Rose** | [`assets/individual/lowpoly_purple_rose.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/lowpoly_purple_rose.glb) | `200 KB` | `1,910` | `5,730` | `0.18 × 0.46 × 0.18 m` | Lightweight faceted low-poly rose with royal purple petals and green stem. |
| **Purple Siberian Iris** | [`assets/individual/purple_iris.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/purple_iris.glb) | `8.28 MB` | `9,808` | `9,314` | `0.27 × 0.70 × 0.24 m` | Vivid royal purple blossom with ruffled standards, drooping falls, and tall upright stem. |
| **Purple Eustoma (Lisianthus)** | [`assets/individual/purple_eustoma.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/purple_eustoma.glb) | `8.88 MB` | `29,314` | `22,243` | `0.19 × 0.50 × 0.21 m` | Bell-shaped delicate petals in rich royal purple, smooth natural shading. |
| **Purple Dutch Tulip** | [`assets/individual/purple_tulip.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/purple_tulip.glb) | `2.32 MB` | `2,999` | `2,777` | `0.15 × 0.55 × 0.15 m` | Classic cup-shaped blossom tinted in deep purple with upright stem. |
| **French Lavender** | [`assets/individual/lavender.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/lavender.glb) | `9.42 MB` | `63,984` | `130,288` | `0.45 × 0.56 × 0.38 m` | Clustered lavender florets in soft pastel violet (`#806BB0`) with narrow foliage. |
| **Purple Coneflower (Echinacea)** | [`assets/individual/purple_echinacea.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/purple_echinacea.glb) | `10.8 MB` | `14,554` | `12,878` | `0.64 × 0.78 × 0.71 m` | Prominent spiky cone center surrounded by drooping purple ray florets. |
| **Stylized Purple Blossom** | [`assets/individual/stylized_purple_blossom.glb`](file:///c:/Users/Neil/Desktop/tulip/assets/individual/stylized_purple_blossom.glb) | `4.86 KB` | `80` | `218` | `0.12 × 0.11 × 0.17 m` | Ultra-low poly Kenney blossom tinted in vivid purple, split stem and blossom meshes. |

---

## 🚀 Live Deployment

The gallery is live at:
👉 **[https://kiruu.xyz/dev/bouquet/](https://kiruu.xyz/dev/bouquet/)**

---

## 📜 Licenses & Attribution

- **Water Lily & Orchid**: Poly by Google ([CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/)).
- **Low-Poly Rose**: M Smith Jonn via Poly Pizza ([CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/)).
- **Glass Vase with Flowers**: The Khronos Group glTF Sample Assets ([CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)).
- **Stylized Blossom**: Kenney ([CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)).
