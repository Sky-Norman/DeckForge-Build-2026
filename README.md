# 🖋️ DeckForge.ink
**A Community-Driven Lorcana Gameplay Simulator**

DeckForge is a high-fidelity, web-based simulator for the Disney Lorcana TCG. Built by and for the community to test deck archetypes and gameplay logic in a clean, modern environment.

## 🚀 Vision
Our goal is to create a "Star Trek-grade" tactical interface for Lorcana. We prioritize:
- **Accuracy:** Precise implementation of Ink, Lore, and Challenge mechanics.
- **Performance:** A lightweight React-based engine that runs in any browser.
- **Data-First:** Leveraging community standards like LorcanaJSON.

## 🛠️ Tech Stack
- **Framework:** React 19+
- **Styling:** Tailwind CSS (Dark Mode / Ink Aesthetic)
- **Data Source:** LorcanaJSON (Remote Referencing)
- **Icons:** Lucide-React

## 📦 Deployment (Azure Storage / Static Hosting)

This project is pre-configured for static hosting.

1. **Build the Project:**
   ```bash
   npm run build
   ```
   This generates a `dist` folder containing `index.html` and optimized assets.

2. **Azure Storage:**
   - Create a Storage Account.
   - Enable "Static website" in the Data Management blade.
   - Set Index document name to `index.html`.
   - Upload the **contents** of the `dist` folder to the `$web` container.

3. **Production Note:**
   The `index.html` currently contains a Tailwind CDN script for preview environments. For a pure production build, the build process generates its own optimized CSS. You can safely remove the `<script src="https://cdn.tailwindcss.com"></script>` tag from `index.html` before deploying if you wish to save bandwidth, though it will work fine as-is.

## ⚖️ Legal Disclaimer
DeckForge is a fan-made project and is NOT affiliated with, endorsed by, or sponsored by Disney or Ravensburger. All card art, names, and lore are property of Disney and Ravensburger. This tool is for personal, educational use only.