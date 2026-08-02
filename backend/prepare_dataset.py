"""
=============================================================================
Farm Genius — Dataset Organizer
=============================================================================
Automatically maps PlantVillage / Cotton / Sugarcane raw downloads
into the exact folder structure required by train_disease_model.py.

USAGE
-----
  python prepare_dataset.py --source_dir ../raw_downloads --output_dir ../dataset

Run this AFTER downloading the datasets. It will:
  1. Scan source_dir for known class folder names (PlantVillage naming)
  2. Copy/rename them into train/ and val/ with correct class names
  3. Apply 80/20 train-val split
=============================================================================
"""

from __future__ import annotations

import argparse
import random
import shutil
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# MAPPING: raw folder names (from downloads) → Farm Genius class name
# ──────────────────────────────────────────────────────────────────────────────

FOLDER_MAP = {
    # ── PlantVillage folder names ──────────────────────────────────────────────
    "Corn_(maize)___Common_rust_": "maize_rust",
    "Corn_(maize)___Common_rust": "maize_rust",
    "Corn___Common_rust_": "maize_rust",
    "Corn___Common_rust": "maize_rust",

    "Corn_(maize)___Gray_leaf_spot": "maize_gray_leaf_spot",
    "Corn___Gray_leaf_spot": "maize_gray_leaf_spot",

    "Corn_(maize)___healthy": "maize_healthy",
    "Corn___healthy": "maize_healthy",

    "Rice___Leaf_blast": "rice_blast",
    "Rice___blast": "rice_blast",
    "Rice___Brown_spot": "rice_brown_spot",
    "Rice___Healthy": "rice_healthy",
    "Rice___healthy": "rice_healthy",

    "Wheat___Yellow_Rust_Stripe_Rust": "wheat_stripe_rust",
    "Wheat___Stripe_rust": "wheat_stripe_rust",
    "Wheat___stripe_rust": "wheat_stripe_rust",

    "Wheat___Septoria": "wheat_septoria",
    "Wheat___Leaf_and_Stripe_Rust": "wheat_stripe_rust",

    "Wheat___healthy": "wheat_healthy",
    "Wheat___Healthy": "wheat_healthy",

    "Soybean___Frogeye_leaf_spot": "soybean_frog_eye_leaf_spot",
    "Soybean___frogeye_leaf_spot": "soybean_frog_eye_leaf_spot",
    "Soybean___frog_eye_leaf_spot": "soybean_frog_eye_leaf_spot",

    "Soybean___healthy": "soybean_healthy",
    "Soybean___Healthy": "soybean_healthy",

    # ── Cotton dataset folder names ────────────────────────────────────────────
    "Bacterial Blight": "cotton_bacterial_leaf_blight",
    "bacterial_blight": "cotton_bacterial_leaf_blight",
    "Bacterial_Blight": "cotton_bacterial_leaf_blight",
    "Bacterialblight": "cotton_bacterial_leaf_blight",
    "cotton_bacterial_blight": "cotton_bacterial_leaf_blight",

    "Curl Virus": "cotton_leaf_curl_virus",
    "curl_virus": "cotton_leaf_curl_virus",
    "Curl_Virus": "cotton_leaf_curl_virus",
    "LeafCurlVirus": "cotton_leaf_curl_virus",
    "Leaf_Curl": "cotton_leaf_curl_virus",
    "cotton_curl": "cotton_leaf_curl_virus",

    "Healthy": "cotton_healthy",          # Cotton dataset
    "healthy": "cotton_healthy",           # fallback — will be overridden by crop context
    "Cotton_Healthy": "cotton_healthy",
    "cotton_healthy": "cotton_healthy",

    # ── Sugarcane dataset folder names ─────────────────────────────────────────
    "Red_Rot": "sugarcane_red_rot",
    "Red Rot": "sugarcane_red_rot",
    "redrot": "sugarcane_red_rot",
    "RedRot": "sugarcane_red_rot",
    "sugarcane_red_rot": "sugarcane_red_rot",

    "Rust": "sugarcane_rust",
    "rust": "sugarcane_rust",
    "Orange_Rust": "sugarcane_rust",
    "sugarcane_rust": "sugarcane_rust",

    "sugarcane_Healthy": "sugarcane_healthy",
    "Sugarcane_Healthy": "sugarcane_healthy",
    "sugarcane_healthy": "sugarcane_healthy",

    # ── If already Farm Genius named ───────────────────────────────────────────
    "cotton_bacterial_leaf_blight": "cotton_bacterial_leaf_blight",
    "cotton_leaf_curl_virus": "cotton_leaf_curl_virus",
    "sugarcane_red_rot": "sugarcane_red_rot",
    "sugarcane_rust": "sugarcane_rust",
    "sugarcane_healthy": "sugarcane_healthy",
    "rice_blast": "rice_blast",
    "rice_brown_spot": "rice_brown_spot",
    "rice_healthy": "rice_healthy",
    "maize_rust": "maize_rust",
    "maize_gray_leaf_spot": "maize_gray_leaf_spot",
    "maize_healthy": "maize_healthy",
    "wheat_stripe_rust": "wheat_stripe_rust",
    "wheat_septoria": "wheat_septoria",
    "wheat_healthy": "wheat_healthy",
    "soybean_frog_eye_leaf_spot": "soybean_frog_eye_leaf_spot",
    "soybean_bacterial_blight": "soybean_bacterial_blight",
    "soybean_healthy": "soybean_healthy",
}

# Soybean bacterial blight — not in PlantVillage. These folders can be from
# supplementary datasets like vipoooool/new-plant-diseases-dataset
SOYBEAN_BLIGHT_ALIASES = [
    "Soybean___Bacterial_Blight",
    "soybean_bacterial_blight",
    "Soybean_Bacterial_blight",
]
for alias in SOYBEAN_BLIGHT_ALIASES:
    FOLDER_MAP[alias] = "soybean_bacterial_blight"

ALL_CLASSES = list(dict.fromkeys(FOLDER_MAP.values()))  # preserve unique order

EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def find_image_files(folder: Path) -> list[Path]:
    return [p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in EXTENSIONS]


def copy_split(
    src_files: list[Path],
    target_class: str,
    output_dir: Path,
    train_ratio: float = 0.8,
    seed: int = 42,
) -> tuple[int, int]:
    """Copy images into train/ and val/ splits."""
    random.seed(seed)
    shuffled = list(src_files)
    random.shuffle(shuffled)

    split_idx = int(len(shuffled) * train_ratio)
    splits = {"train": shuffled[:split_idx], "val": shuffled[split_idx:]}

    counts = {"train": 0, "val": 0}
    for split, files in splits.items():
        dest_dir = output_dir / split / target_class
        dest_dir.mkdir(parents=True, exist_ok=True)
        for i, src in enumerate(files):
            ext = src.suffix.lower()
            dest = dest_dir / f"{target_class}_{i:05d}{ext}"
            shutil.copy2(src, dest)
            counts[split] += 1

    return counts["train"], counts["val"]


# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────

def prepare(args):
    source_dir = Path(args.source_dir).resolve()
    output_dir = Path(args.output_dir).resolve()

    if not source_dir.exists():
        print(f"❌ Source directory not found: {source_dir}")
        return

    print(f"\n🌾 Farm Genius — Dataset Organizer")
    print(f"   Source: {source_dir}")
    print(f"   Output: {output_dir}")
    print(f"   Train ratio: {args.train_ratio:.0%}\n")

    # Collect all sub-folders recursively
    all_subdirs = [d for d in source_dir.rglob("*") if d.is_dir()]

    class_collected: dict[str, list[Path]] = {cls: [] for cls in ALL_CLASSES}
    matched_dirs = []

    for subdir in all_subdirs:
        folder_name = subdir.name
        target = FOLDER_MAP.get(folder_name)
        if target:
            imgs = find_image_files(subdir)
            if imgs:
                class_collected[target].extend(imgs)
                matched_dirs.append((folder_name, target, len(imgs)))

    if not matched_dirs:
        print("⚠  No matching folders found in source directory.")
        print("   Make sure you extracted the Kaggle downloads into source_dir.")
        print("\n   Expected folder names (examples):")
        for raw, mapped in list(FOLDER_MAP.items())[:10]:
            print(f"     '{raw}' → {mapped}")
        return

    print("📁 Matched folders:")
    for raw, target, cnt in matched_dirs:
        print(f"   {raw:<50} → {target} ({cnt} images)")

    print("\n📦 Copying & splitting:")
    summary = []
    for cls in ALL_CLASSES:
        files = class_collected[cls]
        if not files:
            print(f"   ⚠  {cls:<45} — NO IMAGES FOUND")
            summary.append((cls, 0, 0))
            continue
        t, v = copy_split(files, cls, output_dir, train_ratio=args.train_ratio)
        print(f"   ✅ {cls:<45} train={t:>4}  val={v:>4}")
        summary.append((cls, t, v))

    # ── Summary ────────────────────────────────────────────────────────────────
    print("\n" + "=" * 65)
    print("SUMMARY")
    print("=" * 65)
    total_train = sum(s[1] for s in summary)
    total_val = sum(s[2] for s in summary)
    missing = [s[0] for s in summary if s[1] == 0]

    print(f"   Total train images: {total_train}")
    print(f"   Total val   images: {total_val}")

    if missing:
        print(f"\n⚠  Still missing ({len(missing)} classes with 0 images):")
        for m in missing:
            print(f"   ✗ {m}")
        print("\n   → Download additional datasets for these classes.")
        print("   → See: python train_disease_model.py --instructions\n")
    else:
        print(f"\n✅ All {len(ALL_CLASSES)} classes populated!")
        print(f"   Run training:")
        print(f"   cd backend && python train_disease_model.py --data_dir {output_dir}\n")


def parse_args():
    p = argparse.ArgumentParser(description="Farm Genius Dataset Organizer")
    p.add_argument("--source_dir", default="../raw_downloads",
                   help="Directory with unzipped Kaggle datasets (default: ../raw_downloads)")
    p.add_argument("--output_dir", default="../dataset",
                   help="Output directory for organized dataset (default: ../dataset)")
    p.add_argument("--train_ratio", type=float, default=0.8,
                   help="Train split ratio (default: 0.8 = 80/20)")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    prepare(args)
