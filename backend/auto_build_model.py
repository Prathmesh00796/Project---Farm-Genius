"""
=============================================================================
Farm Genius — Auto Download + Prepare + Train Pipeline
=============================================================================
Uses kagglehub (already installed) to download datasets automatically,
then prepares and trains the MobileNetV2 model.

RUN FROM: backend folder
    python auto_build_model.py

NO KAGGLE API KEY NEEDED — uses kagglehub which handles auth.
=============================================================================
"""
from __future__ import annotations

import json
import os
import random
import shutil
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
LABELS_PATH = _HERE / "config" / "labels.json"
MODEL_OUT = _HERE / "model.h5"
DATASET_DIR = _HERE.parent / "dataset"
IMG_SIZE = (224, 224)
BATCH = 16  # Conservative for CPU

EXPECTED_CLASSES = [
    "cotton_bacterial_leaf_blight",
    "cotton_leaf_curl_virus",
    "cotton_healthy",
    "sugarcane_red_rot",
    "sugarcane_rust",
    "sugarcane_healthy",
    "rice_blast",
    "rice_brown_spot",
    "rice_healthy",
    "maize_rust",
    "maize_gray_leaf_spot",
    "maize_healthy",
    "wheat_stripe_rust",
    "wheat_septoria",
    "wheat_healthy",
    "soybean_frog_eye_leaf_spot",
    "soybean_bacterial_blight",
    "soybean_healthy",
]

EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}

def sep(title=""):
    print("\n" + "=" * 65)
    if title:
        print(f"  {title}")
        print("=" * 65)
    print()


# ──────────────────────────────────────────────────────────────────────────────
# STEP 1: DOWNLOAD DATASETS VIA KAGGLEHUB
# ──────────────────────────────────────────────────────────────────────────────

def download_datasets() -> dict[str, Path]:
    """Download all 3 datasets via kagglehub. Returns {name: path}."""
    try:
        import kagglehub
    except ImportError:
        sys.exit("Run: pip install kagglehub")

    sep("STEP 1/4 -- Downloading Datasets via kagglehub")
    datasets = {
        "plantvillage":  "abdallahalidev/plantvillage-dataset",
        "cotton":        "janmejaybhoi/cotton-disease-dataset",
        "sugarcane":     "nirmalsankalana/sugarcane-leaf-disease-dataset",
    }

    paths = {}
    for name, slug in datasets.items():
        print(f"  Downloading {name} ({slug}) ...")
        try:
            p = kagglehub.dataset_download(slug)
            paths[name] = Path(p)
            print(f"  -> {p}")
        except Exception as e:
            print(f"  WARNING: Could not download {name}: {e}")
            print(f"  Will try to continue with other datasets.")
            paths[name] = None
    return paths


# ──────────────────────────────────────────────────────────────────────────────
# STEP 2: MAP FOLDERS TO CLASS NAMES
# ──────────────────────────────────────────────────────────────────────────────

# Mapping: (raw folder name lowercased key) -> class name
RAW_MAP = {
    # PlantVillage — Corn/Maize
    "corn_(maize)___common_rust_":       "maize_rust",
    "corn_(maize)___common_rust":        "maize_rust",
    "corn___common_rust_":               "maize_rust",
    "corn___common_rust":                "maize_rust",
    "corn_(maize)___gray_leaf_spot":     "maize_gray_leaf_spot",
    "corn___gray_leaf_spot":             "maize_gray_leaf_spot",
    "corn_(maize)___healthy":            "maize_healthy",
    "corn___healthy":                    "maize_healthy",
    # PlantVillage — Rice
    "rice___leaf_blast":                 "rice_blast",
    "rice___blast":                      "rice_blast",
    "rice___brown_spot":                 "rice_brown_spot",
    "rice___healthy":                    "rice_healthy",
    # PlantVillage — Wheat
    "wheat___yellow_rust_stripe_rust":   "wheat_stripe_rust",
    "wheat___stripe_rust":               "wheat_stripe_rust",
    "wheat___septoria":                  "wheat_septoria",
    "wheat___leaf_and_stripe_rust":      "wheat_stripe_rust",
    "wheat___healthy":                   "wheat_healthy",
    # PlantVillage — Soybean
    "soybean___frogeye_leaf_spot":       "soybean_frog_eye_leaf_spot",
    "soybean___frog_eye_leaf_spot":      "soybean_frog_eye_leaf_spot",
    "soybean___healthy":                 "soybean_healthy",
    # Cotton dataset
    "bacterial blight":                  "cotton_bacterial_leaf_blight",
    "bacterial_blight":                  "cotton_bacterial_leaf_blight",
    "bacterialblight":                   "cotton_bacterial_leaf_blight",
    "curl virus":                        "cotton_leaf_curl_virus",
    "curl_virus":                        "cotton_leaf_curl_virus",
    "curlvirus":                         "cotton_leaf_curl_virus",
    "leafcurlvirus":                     "cotton_leaf_curl_virus",
    "diseased":                          "cotton_bacterial_leaf_blight",  # some datasets
    # Cotton healthy — handled with context
    # Sugarcane dataset
    "red_rot":                           "sugarcane_red_rot",
    "red rot":                           "sugarcane_red_rot",
    "redrot":                            "sugarcane_red_rot",
    "rust":                              "sugarcane_rust",
    "orange_rust":                       "sugarcane_rust",
    # Already Farm Genius named
    "cotton_bacterial_leaf_blight":      "cotton_bacterial_leaf_blight",
    "cotton_leaf_curl_virus":            "cotton_leaf_curl_virus",
    "cotton_healthy":                    "cotton_healthy",
    "sugarcane_red_rot":                 "sugarcane_red_rot",
    "sugarcane_rust":                    "sugarcane_rust",
    "sugarcane_healthy":                 "sugarcane_healthy",
    "rice_blast":                        "rice_blast",
    "rice_brown_spot":                   "rice_brown_spot",
    "rice_healthy":                      "rice_healthy",
    "maize_rust":                        "maize_rust",
    "maize_gray_leaf_spot":              "maize_gray_leaf_spot",
    "maize_healthy":                     "maize_healthy",
    "wheat_stripe_rust":                 "wheat_stripe_rust",
    "wheat_septoria":                    "wheat_septoria",
    "wheat_healthy":                     "wheat_healthy",
    "soybean_frog_eye_leaf_spot":        "soybean_frog_eye_leaf_spot",
    "soybean_bacterial_blight":          "soybean_bacterial_blight",
    "soybean_healthy":                   "soybean_healthy",
}

# Context-aware: when "healthy" is inside a cotton/sugarcane folder hierarchy
CONTEXT_HEALTHY = {
    "cotton":     "cotton_healthy",
    "sugarcane":  "sugarcane_healthy",
    "rice":       "rice_healthy",
    "maize":      "maize_healthy",
    "wheat":      "wheat_healthy",
    "soybean":    "soybean_healthy",
    "corn":       "maize_healthy",
}


def _infer_class(folder: Path, dataset_context: str = "") -> str | None:
    name_lower = folder.name.lower()
    # Direct match
    if name_lower in RAW_MAP:
        return RAW_MAP[name_lower]
    # Context-aware healthy
    if name_lower in ("healthy", "normal", "disease free"):
        if dataset_context:
            for key, cls in CONTEXT_HEALTHY.items():
                if key in dataset_context.lower():
                    return cls
    return None


def find_images(folder: Path) -> list[Path]:
    return [p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in EXTENSIONS]


def collect_from_path(base: Path, dataset_context: str = "") -> dict[str, list[Path]]:
    """Walk base path and collect images per class."""
    collected: dict[str, list[Path]] = {c: [] for c in EXPECTED_CLASSES}
    if not base or not base.exists():
        return collected

    for subdir in sorted(base.rglob("*")):
        if not subdir.is_dir():
            continue
        cls = _infer_class(subdir, dataset_context)
        if cls and cls in collected:
            imgs = [p for p in subdir.iterdir() if p.is_file() and p.suffix.lower() in EXTENSIONS]
            if imgs:
                collected[cls].extend(imgs)

    return collected


def prepare_dataset(paths: dict[str, Path | None]) -> bool:
    sep("STEP 2/4 -- Organizing Dataset")

    master: dict[str, list[Path]] = {c: [] for c in EXPECTED_CLASSES}

    for name, base in paths.items():
        if base is None:
            print(f"  Skipping {name} (download failed)")
            continue
        print(f"  Scanning {name} at {base} ...")
        result = collect_from_path(base, dataset_context=name)
        for cls, imgs in result.items():
            if imgs:
                master[cls].extend(imgs)
                print(f"    + {len(imgs):>4} images -> {cls}")

    # Stats
    print("\n  Class totals after merge:")
    missing = []
    for cls in EXPECTED_CLASSES:
        n = len(master[cls])
        bar = "#" * min(n // 50, 30)
        status = "OK " if n >= 100 else ("LOW" if n > 0 else "!!!")
        print(f"    [{status}] {cls:<45} {n:>5}  {bar}")
        if n == 0:
            missing.append(cls)

    if missing:
        print(f"\n  WARNING: {len(missing)} classes have 0 images:")
        for m in missing:
            print(f"    - {m}")
        print("  Training will continue with available classes only.")
        print("  These classes will be skipped in dataset split.\n")

    # Split to train/val
    random.seed(42)
    (DATASET_DIR / "train").mkdir(parents=True, exist_ok=True)
    (DATASET_DIR / "val").mkdir(parents=True, exist_ok=True)

    print("\n  Copying files to dataset/ ...")
    total_train = total_val = 0

    for cls in EXPECTED_CLASSES:
        imgs = list(master[cls])
        if not imgs:
            # Create empty placeholder dirs so Keras doesn't error
            (DATASET_DIR / "train" / cls).mkdir(parents=True, exist_ok=True)
            (DATASET_DIR / "val" / cls).mkdir(parents=True, exist_ok=True)
            continue

        random.shuffle(imgs)
        split = max(1, int(len(imgs) * 0.8))
        splits = {"train": imgs[:split], "val": imgs[split:]}

        for s, files in splits.items():
            dest = DATASET_DIR / s / cls
            dest.mkdir(parents=True, exist_ok=True)
            for i, src in enumerate(files):
                dst = dest / f"{cls}_{i:06d}{src.suffix.lower()}"
                if not dst.exists():
                    shutil.copy2(src, dst)

        total_train += len(splits["train"])
        total_val += len(splits["val"])
        print(f"    {cls:<45} train={len(splits['train']):>4}  val={len(splits['val']):>4}")

    print(f"\n  Total: train={total_train}  val={total_val}")
    return total_train > 0


# ──────────────────────────────────────────────────────────────────────────────
# STEP 3: UPDATE LABELS.JSON (only with classes that have data)
# ──────────────────────────────────────────────────────────────────────────────

def get_active_classes() -> list[str]:
    """Return classes that actually have ≥1 image in train/."""
    active = []
    for cls in EXPECTED_CLASSES:
        folder = DATASET_DIR / "train" / cls
        if folder.exists():
            n = len([x for x in folder.iterdir() if x.is_file()])
            if n > 0:
                active.append(cls)
    return active


# ──────────────────────────────────────────────────────────────────────────────
# STEP 4: TRAIN MODEL
# ──────────────────────────────────────────────────────────────────────────────

def train_model(active_classes: list[str]):
    sep("STEP 3/4 -- Training MobileNetV2 Model")

    import numpy as np
    import tensorflow as tf
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
    from tensorflow.keras import layers, Model
    from tensorflow.keras.preprocessing.image import ImageDataGenerator

    print(f"  TensorFlow: {tf.__version__}")
    print(f"  GPU: {bool(tf.config.list_physical_devices('GPU'))}")
    print(f"  Active classes: {len(active_classes)}\n")

    n_cls = len(active_classes)
    if n_cls < 2:
        sys.exit("Need at least 2 classes with images.")

    # ── Generators ─────────────────────────────────────────────────────────────
    train_aug = ImageDataGenerator(
        preprocessing_function=preprocess_input,
        rotation_range=30,
        width_shift_range=0.2,
        height_shift_range=0.2,
        zoom_range=0.25,
        horizontal_flip=True,
        brightness_range=[0.7, 1.3],
        shear_range=0.15,
        fill_mode="nearest",
    )
    val_aug = ImageDataGenerator(preprocessing_function=preprocess_input)

    train_gen = train_aug.flow_from_directory(
        str(DATASET_DIR / "train"),
        target_size=IMG_SIZE,
        batch_size=BATCH,
        class_mode="categorical",
        classes=active_classes,
        shuffle=True,
        seed=42,
    )
    val_gen = val_aug.flow_from_directory(
        str(DATASET_DIR / "val"),
        target_size=IMG_SIZE,
        batch_size=BATCH,
        class_mode="categorical",
        classes=active_classes,
        shuffle=False,
    )

    print(f"  Train samples: {train_gen.samples}")
    print(f"  Val   samples: {val_gen.samples}\n")

    # ── Class weights ──────────────────────────────────────────────────────────
    counts = {}
    for cls, idx in train_gen.class_indices.items():
        folder = DATASET_DIR / "train" / cls
        counts[idx] = max(1, len([f for f in folder.iterdir() if f.is_file()]))

    total = sum(counts.values())
    class_weights = {idx: (total / (n_cls * cnt)) for idx, cnt in counts.items()}

    # ── Build Model ────────────────────────────────────────────────────────────
    inp = layers.Input(shape=(224, 224, 3), name="leaf_input")
    base = MobileNetV2(input_tensor=inp, include_top=False, weights="imagenet", pooling=None)
    base.trainable = False

    x = layers.GlobalAveragePooling2D(name="gap")(base.output)
    x = layers.BatchNormalization(name="bn_top")(x)
    x = layers.Dropout(0.3, name="drop1")(x)
    x = layers.Dense(256, activation="relu", name="fc256")(x)
    x = layers.Dropout(0.2, name="drop2")(x)
    out = layers.Dense(n_cls, activation="softmax", dtype="float32", name="disease")(x)
    model = Model(inputs=inp, outputs=out, name="FarmGenius_DiseaseNet")

    # ── Phase 1: Frozen base ───────────────────────────────────────────────────
    print("  PHASE 1 -- Feature Extraction (base frozen) ...")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    ckpt_dir = _HERE / "checkpoints"
    ckpt_dir.mkdir(exist_ok=True)

    cb1 = [
        tf.keras.callbacks.ModelCheckpoint(
            str(ckpt_dir / "best_frozen.h5"),
            monitor="val_accuracy", save_best_only=True, verbose=0,
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=5, restore_best_weights=True, verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.3, patience=3, min_lr=1e-7, verbose=1,
        ),
    ]

    h1 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=20,
        class_weight=class_weights,
        callbacks=cb1,
        verbose=1,
    )
    best_p1 = max(h1.history.get("val_accuracy", [0]))
    print(f"\n  Phase 1 best val_accuracy: {best_p1:.4f}")

    # ── Phase 2: Fine-tune top 30 MobileNetV2 layers ──────────────────────────
    print("\n  PHASE 2 -- Fine-tuning (unfreeze top 30 MobileNetV2 layers) ...")
    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-4),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    cb2 = [
        tf.keras.callbacks.ModelCheckpoint(
            str(ckpt_dir / "best_finetune.h5"),
            monitor="val_accuracy", save_best_only=True, verbose=0,
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=5, restore_best_weights=True, verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.3, patience=3, min_lr=1e-7, verbose=1,
        ),
    ]

    h2 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=15,
        class_weight=class_weights,
        callbacks=cb2,
        verbose=1,
    )
    best_p2 = max(h2.history.get("val_accuracy", [0]))
    print(f"\n  Phase 2 best val_accuracy: {best_p2:.4f}")

    # ── Save model ─────────────────────────────────────────────────────────────
    model.save(str(MODEL_OUT), include_optimizer=False, save_format="hdf5")
    size_mb = MODEL_OUT.stat().st_size / 1e6
    print(f"\n  Model saved -> {MODEL_OUT}  ({size_mb:.1f} MB)")

    # ── Evaluate ───────────────────────────────────────────────────────────────
    val_loss, val_acc = model.evaluate(val_gen, verbose=0)
    print(f"  Final val_loss:     {val_loss:.4f}")
    print(f"  Final val_accuracy: {val_acc:.4f} ({val_acc*100:.1f}%)")

    # ── Classification report ─────────────────────────────────────────────────
    try:
        from sklearn.metrics import classification_report
        val_gen.reset()
        y_pred = model.predict(val_gen, verbose=0).argmax(axis=1)
        y_true = val_gen.classes
        report = classification_report(y_true, y_pred, target_names=active_classes, digits=3)
        rpath = _HERE / "training_report.txt"
        with open(rpath, "w") as f:
            f.write(f"Phase 1 best: {best_p1:.4f}\nPhase 2 best: {best_p2:.4f}\n\n")
            f.write(report)
        print(f"\n  Per-class report saved -> {rpath}")
        print("\n" + report)
    except Exception as e:
        print(f"  (report skipped: {e})")

    return active_classes, val_acc


# ──────────────────────────────────────────────────────────────────────────────
# STEP 4: UPDATE labels.json with actual trained classes
# ──────────────────────────────────────────────────────────────────────────────

def update_labels_json(active_classes: list[str]):
    sep("STEP 4/4 -- Updating labels.json to match trained model")

    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    old_classes = cfg.get("class_names", [])

    # If active == all 18, keep original order (which is already correct)
    if sorted(active_classes) == sorted(EXPECTED_CLASSES) and len(active_classes) == len(EXPECTED_CLASSES):
        print("  All 18 classes trained. labels.json class_names unchanged.")
        print(f"  Order: {active_classes}")
        return

    # Update to only trained classes
    cfg["class_names"] = active_classes
    with open(LABELS_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)

    print(f"  Updated class_names: {len(active_classes)} classes")
    missing = [c for c in EXPECTED_CLASSES if c not in active_classes]
    if missing:
        print(f"  NOTE: {len(missing)} classes not in model (no training data):")
        for m in missing:
            print(f"    - {m}")
    print(f"  labels.json -> {LABELS_PATH}")


# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────

def main():
    print("\n" + "#" * 65)
    print("  Farm Genius -- Auto Build Pipeline")
    print("  Maharashtra Crop Disease Model (MobileNetV2)")
    print("#" * 65)

    # Check if dataset already exists (re-use if already prepared)
    if DATASET_DIR.exists():
        train_counts = {}
        for cls in EXPECTED_CLASSES:
            folder = DATASET_DIR / "train" / cls
            n = len(list(folder.glob("*"))) if folder.exists() else 0
            train_counts[cls] = n
        total_existing = sum(train_counts.values())
        if total_existing > 500:
            print(f"\n  Found existing dataset with {total_existing} train images.")
            resp = input("  Use existing dataset? [Y/n]: ").strip().lower()
            if resp not in ("n", "no"):
                print("  Skipping download + prepare steps.")
                active = get_active_classes()
                if active:
                    trained_classes, acc = train_model(active)
                    update_labels_json(trained_classes)
                    print(f"\n  Done! Val accuracy: {acc*100:.1f}%")
                    return

    # Download
    paths = download_datasets()

    # Prepare
    ok = prepare_dataset(paths)
    if not ok:
        print("\nERROR: No images found. Check dataset downloads.")
        sys.exit(1)

    # Get active classes (those with training images)
    active = get_active_classes()
    print(f"\n  Active classes for training: {len(active)}")
    for c in active:
        print(f"    - {c}")

    # Train
    trained_classes, acc = train_model(active)

    # Update labels.json
    update_labels_json(trained_classes)

    print("\n" + "#" * 65)
    print(f"  DONE! Model built and saved to backend/model.h5")
    print(f"  Val accuracy: {acc*100:.1f}%")
    print(f"  Classes trained: {len(trained_classes)}")
    print("#" * 65 + "\n")


if __name__ == "__main__":
    main()
