"""
=============================================================================
Farm Genius — Maharashtra Crop Disease Model Trainer
=============================================================================
Trains MobileNetV2 on 18 classes that exactly match backend/config/labels.json.

USAGE
-----
  cd backend
  python train_disease_model.py --data_dir ../dataset --epochs_frozen 20 --epochs_finetune 15

DATASET STRUCTURE EXPECTED
---------------------------
  dataset/
  ├── train/
  │   ├── cotton_bacterial_leaf_blight/
  │   ├── cotton_leaf_curl_virus/
  │   ├── cotton_healthy/
  │   ├── sugarcane_red_rot/
  │   ├── sugarcane_rust/
  │   ├── sugarcane_healthy/
  │   ├── rice_blast/
  │   ├── rice_brown_spot/
  │   ├── rice_healthy/
  │   ├── maize_rust/
  │   ├── maize_gray_leaf_spot/
  │   ├── maize_healthy/
  │   ├── wheat_stripe_rust/
  │   ├── wheat_septoria/
  │   ├── wheat_healthy/
  │   ├── soybean_frog_eye_leaf_spot/
  │   ├── soybean_bacterial_blight/
  │   └── soybean_healthy/
  └── val/
      └── (same 18 folders, ~20% split)

DATASETS TO DOWNLOAD
--------------------
  1. PlantVillage   → https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset
  2. Cotton         → https://www.kaggle.com/datasets/janmejaybhoi/cotton-disease-dataset
  3. Sugarcane      → https://www.kaggle.com/datasets/nirmalsankalana/sugarcane-leaf-disease-dataset

After training, model.h5 is saved to backend/ automatically.
=============================================================================
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent
LABELS_PATH = _HERE / "config" / "labels.json"
MODEL_OUT = _HERE / "model.h5"

IMG_SIZE = (224, 224)
BATCH = 32

# Exact class order from labels.json — DO NOT CHANGE ORDER
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


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def verify_labels_json():
    """Make sure labels.json class order matches EXPECTED_CLASSES."""
    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    labels = cfg.get("class_names", [])
    if labels != EXPECTED_CLASSES:
        print("\n⚠  labels.json class order mismatch!")
        print("Expected:", EXPECTED_CLASSES)
        print("Got:     ", labels)
        sys.exit(
            "Fix labels.json or EXPECTED_CLASSES before training. "
            "Order MUST match softmax output indices."
        )
    print(f"✅ labels.json verified — {len(labels)} classes.\n")
    return labels


def check_dataset(data_dir: Path, split: str = "train") -> dict:
    """Return {class_name: count} for a split folder."""
    split_path = data_dir / split
    if not split_path.exists():
        sys.exit(f"❌ Folder not found: {split_path}")

    counts = {}
    missing = []
    for cls in EXPECTED_CLASSES:
        cls_path = split_path / cls
        if not cls_path.exists():
            missing.append(cls)
            counts[cls] = 0
        else:
            n = len([x for x in cls_path.iterdir() if x.is_file()])
            counts[cls] = n

    if missing:
        print(f"\n⚠  Missing class folders in {split}/:")
        for m in missing:
            print(f"   ✗ {m}")
        print(
            "\nCreate these folders and add at least 200 images each.\n"
            "See backend/train_disease_model.py header for dataset links.\n"
        )
        sys.exit("Aborting — dataset incomplete.")

    total = sum(counts.values())
    low = {k: v for k, v in counts.items() if v < 100}
    if low:
        print(f"\n⚠  Low image count (<100) for {split}:")
        for k, v in low.items():
            print(f"   {k}: {v} images")
        print("Consider adding more images for better accuracy.\n")

    print(f"📦 {split} split — {total} images across {len(counts)} classes")
    for cls, cnt in counts.items():
        bar = "█" * min(cnt // 20, 30)
        print(f"   {cls:<45} {cnt:>5}  {bar}")
    print()
    return counts


# ──────────────────────────────────────────────────────────────────────────────
# BUILD DATA PIPELINES
# ──────────────────────────────────────────────────────────────────────────────

def build_generators(data_dir: Path, batch: int = BATCH):
    """Return (train_gen, val_gen) with MobileNetV2 preprocessing."""
    import tensorflow as tf
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

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

    val_aug = ImageDataGenerator(
        preprocessing_function=preprocess_input,
    )

    # classes= kwarg forces exact alphabetical-free ordering matching EXPECTED_CLASSES
    train_gen = train_aug.flow_from_directory(
        str(data_dir / "train"),
        target_size=IMG_SIZE,
        batch_size=batch,
        class_mode="categorical",
        classes=EXPECTED_CLASSES,
        shuffle=True,
        seed=42,
    )

    val_gen = val_aug.flow_from_directory(
        str(data_dir / "val"),
        target_size=IMG_SIZE,
        batch_size=batch,
        class_mode="categorical",
        classes=EXPECTED_CLASSES,
        shuffle=False,
    )

    # Sanity-check class index map
    actual_cls = {v: k for k, v in train_gen.class_indices.items()}
    print("\n🗂  Class index → folder mapping (must match labels.json):")
    for i, expected in enumerate(EXPECTED_CLASSES):
        actual = actual_cls.get(i, "MISSING")
        status = "✅" if actual == expected else "❌"
        print(f"   {status} [{i:02d}] {actual}")
    print()

    mismatches = [
        i for i, e in enumerate(EXPECTED_CLASSES)
        if actual_cls.get(i) != e
    ]
    if mismatches:
        sys.exit(
            f"❌ Class order mismatch at indices {mismatches}. "
            "Ensure all 18 class folders exist and match labels.json."
        )

    return train_gen, val_gen


# ──────────────────────────────────────────────────────────────────────────────
# BUILD MODEL
# ──────────────────────────────────────────────────────────────────────────────

def build_model(n_classes: int):
    """MobileNetV2 + custom head. Base frozen for Phase 1."""
    import tensorflow as tf
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras import layers, Model

    inp = layers.Input(shape=(224, 224, 3), name="leaf_input")

    base = MobileNetV2(
        input_tensor=inp,
        include_top=False,
        weights="imagenet",
        pooling=None,
        alpha=1.0,
    )
    base.trainable = False  # Frozen for Phase 1

    x = layers.GlobalAveragePooling2D(name="gap")(base.output)
    x = layers.BatchNormalization(name="bn_top")(x)
    x = layers.Dropout(0.3, name="drop1")(x)
    x = layers.Dense(256, activation="relu", name="fc256")(x)
    x = layers.Dropout(0.2, name="drop2")(x)
    out = layers.Dense(n_classes, activation="softmax", dtype="float32", name="disease")(x)

    model = Model(inputs=inp, outputs=out, name="FarmGenius_DiseaseNet")
    return model, base


# ──────────────────────────────────────────────────────────────────────────────
# CALLBACKS
# ──────────────────────────────────────────────────────────────────────────────

def make_callbacks(phase: str, output_dir: Path):
    import tensorflow as tf

    os.makedirs(output_dir, exist_ok=True)
    best_path = str(output_dir / f"best_{phase}.h5")

    return [
        tf.keras.callbacks.ModelCheckpoint(
            best_path,
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=5,
            restore_best_weights=True,
            verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.3,
            patience=3,
            min_lr=1e-7,
            verbose=1,
        ),
        tf.keras.callbacks.CSVLogger(
            str(output_dir / f"log_{phase}.csv"),
            append=False,
        ),
    ]


# ──────────────────────────────────────────────────────────────────────────────
# CLASS WEIGHTS (handle imbalanced data)
# ──────────────────────────────────────────────────────────────────────────────

def compute_class_weights(train_gen) -> dict:
    import numpy as np
    counts = {}
    for cls_name, idx in train_gen.class_indices.items():
        counts[idx] = len(list((Path(train_gen.directory) / cls_name).glob("*")))

    total = sum(counts.values())
    n_cls = len(counts)
    weights = {
        idx: (total / (n_cls * cnt)) if cnt > 0 else 1.0
        for idx, cnt in counts.items()
    }
    print("⚖️  Class weights (to handle imbalance):")
    for idx, w in weights.items():
        cls = {v: k for k, v in train_gen.class_indices.items()}[idx]
        print(f"   [{idx:02d}] {cls:<45} weight={w:.3f}")
    print()
    return weights


# ──────────────────────────────────────────────────────────────────────────────
# TRAINING
# ──────────────────────────────────────────────────────────────────────────────

def train(args):
    import tensorflow as tf

    print(f"\n🌾 Farm Genius — Maharashtra Disease Model Trainer")
    print(f"   TensorFlow: {tf.__version__}")
    print(f"   GPU available: {bool(tf.config.list_physical_devices('GPU'))}")
    print(f"   Data dir: {args.data_dir}\n")

    # Mixed precision for faster GPU training
    if tf.config.list_physical_devices("GPU"):
        tf.keras.mixed_precision.set_global_policy("mixed_float16")
        print("⚡ Mixed precision (float16) enabled for GPU speedup.\n")

    labels = verify_labels_json()
    n_classes = len(labels)

    # ── Dataset validation ────────────────────────────────────────────────────
    data_dir = Path(args.data_dir).resolve()
    check_dataset(data_dir, "train")
    check_dataset(data_dir, "val")

    # ── Data generators ───────────────────────────────────────────────────────
    train_gen, val_gen = build_generators(data_dir, batch=args.batch)

    # ── Class weights ─────────────────────────────────────────────────────────
    class_weights = compute_class_weights(train_gen)

    # ── Model ─────────────────────────────────────────────────────────────────
    model, base = build_model(n_classes)
    model.summary(line_length=100)

    ckpt_dir = _HERE / "checkpoints"

    # ════════════════════════════════════════════════════════════════════════
    # PHASE 1 — Train only the top head (base frozen)
    # ════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 60)
    print("PHASE 1 — Feature Extraction (Base Frozen)")
    print("=" * 60 + "\n")

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    history_p1 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=args.epochs_frozen,
        class_weight=class_weights,
        callbacks=make_callbacks("frozen", ckpt_dir),
        verbose=1,
    )

    best_val_p1 = max(history_p1.history.get("val_accuracy", [0]))
    print(f"\n✅ Phase 1 best val_accuracy: {best_val_p1:.4f}")

    # ════════════════════════════════════════════════════════════════════════
    # PHASE 2 — Fine-tune last 30 layers of MobileNetV2
    # ════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 60)
    print("PHASE 2 — Fine-tuning (Unfreeze top 30 MobileNetV2 layers)")
    print("=" * 60 + "\n")

    # Unfreeze top N layers of the base
    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False

    trainable_count = sum(1 for l in model.layers if l.trainable)
    print(f"   Trainable layers: {trainable_count} / {len(model.layers)}\n")

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    history_p2 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=args.epochs_finetune,
        class_weight=class_weights,
        callbacks=make_callbacks("finetune", ckpt_dir),
        verbose=1,
    )

    best_val_p2 = max(history_p2.history.get("val_accuracy", [0]))
    print(f"\n✅ Phase 2 best val_accuracy: {best_val_p2:.4f}")

    # ════════════════════════════════════════════════════════════════════════
    # SAVE FINAL MODEL
    # ════════════════════════════════════════════════════════════════════════
    model.save(str(MODEL_OUT), include_optimizer=False, save_format="hdf5")
    print(f"\n💾 Model saved → {MODEL_OUT}")
    print(f"   Size: {MODEL_OUT.stat().st_size / 1e6:.1f} MB")

    # ── Final evaluation ──────────────────────────────────────────────────────
    print("\n🔍 Final evaluation on validation set:")
    val_loss, val_acc = model.evaluate(val_gen, verbose=0)
    print(f"   Val Loss:     {val_loss:.4f}")
    print(f"   Val Accuracy: {val_acc:.4f} ({val_acc*100:.1f}%)")

    # ── Per-class report ──────────────────────────────────────────────────────
    try:
        import numpy as np
        from sklearn.metrics import classification_report

        print("\n📊 Per-class classification report:")
        val_gen.reset()
        y_pred = model.predict(val_gen, verbose=0)
        y_pred_cls = y_pred.argmax(axis=1)
        y_true = val_gen.classes

        report = classification_report(
            y_true,
            y_pred_cls,
            target_names=EXPECTED_CLASSES,
            digits=3,
        )
        print(report)

        # Save report
        report_path = _HERE / "training_report.txt"
        with open(report_path, "w") as f:
            f.write(f"Farm Genius Disease Model — Training Report\n")
            f.write(f"Phase 1 best val_accuracy: {best_val_p1:.4f}\n")
            f.write(f"Phase 2 best val_accuracy: {best_val_p2:.4f}\n")
            f.write(f"Final val_accuracy: {val_acc:.4f}\n\n")
            f.write(report)
        print(f"   Report saved → {report_path}")

    except ImportError:
        print("   (Install scikit-learn for detailed per-class report: pip install scikit-learn)")

    print("\n🎉 Training complete!")
    print(f"   Output model: {MODEL_OUT}")
    print(f"   Replace this file as backend/model.h5 if training on another machine.\n")


# ──────────────────────────────────────────────────────────────────────────────
# QUICK INFERENCE TEST (smoke test without API)
# ──────────────────────────────────────────────────────────────────────────────

def smoke_test(image_path: str):
    """Quick inference test on a single image."""
    import numpy as np
    from PIL import Image
    import tensorflow as tf
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

    print(f"\n🔬 Smoke test: {image_path}")
    model = tf.keras.models.load_model(str(MODEL_OUT))

    img = Image.open(image_path).convert("RGB").resize(IMG_SIZE, Image.Resampling.BILINEAR)
    arr = np.expand_dims(np.asarray(img, dtype=np.float32), 0)
    arr = preprocess_input(arr)

    preds = model.predict(arr, verbose=0).flatten()
    top3 = sorted(enumerate(preds), key=lambda x: -x[1])[:3]

    print("\nTop-3 predictions:")
    for idx, prob in top3:
        cls = EXPECTED_CLASSES[idx]
        print(f"  [{idx:02d}] {cls:<45} {prob*100:.2f}%")


# ──────────────────────────────────────────────────────────────────────────────
# DATASET SETUP HELPER (print instructions)
# ──────────────────────────────────────────────────────────────────────────────

def print_dataset_instructions():
    lines = [
        "",
        "=" * 78,
        "  DATASET DOWNLOAD GUIDE -- Maharashtra Crop Disease Model (Farm Genius)",
        "=" * 78,
        "",
        "  STEP 1: Install Kaggle CLI",
        "    pip install kaggle",
        "",
        "  STEP 2: Setup API Key",
        "    Go to: https://www.kaggle.com/settings -> API -> Create New Token",
        "    Save kaggle.json to: C:/Users/<YOU>/.kaggle/kaggle.json",
        "",
        "  STEP 3: Download Datasets",
        "",
        "  [RICE, MAIZE, WHEAT, SOYBEAN] -- PlantVillage",
        "    kaggle datasets download -d abdallahalidev/plantvillage-dataset",
        "    -> Extract and use: Corn, Rice, Wheat, Soybean folders",
        "",
        "  [COTTON] -- Cotton Disease Dataset",
        "    kaggle datasets download -d janmejaybhoi/cotton-disease-dataset",
        "    -> Use: Bacterial_Blight, Curl_Virus, Healthy folders",
        "",
        "  [SUGARCANE] -- Sugarcane Leaf Disease",
        "    kaggle datasets download -d nirmalsankalana/sugarcane-leaf-disease-dataset",
        "    -> Use: Red_Rot, Rust, Healthy folders",
        "",
        "  STEP 4: Organize using prepare_dataset.py:",
        "    python prepare_dataset.py --source_dir ../raw_downloads --output_dir ../dataset",
        "",
        "  STEP 5: Train the model:",
        "    cd backend && python train_disease_model.py --data_dir ../dataset",
        "",
        "=" * 78,
        "",
    ]
    print("\n".join(lines))


# ──────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ──────────────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(
        description="Farm Genius — Maharashtra Crop Disease Model Trainer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument(
        "--data_dir",
        type=str,
        default="../dataset",
        help="Root directory with train/ and val/ sub-folders (default: ../dataset)",
    )
    p.add_argument(
        "--epochs_frozen",
        type=int,
        default=20,
        help="Phase 1 epochs with frozen base (default: 20)",
    )
    p.add_argument(
        "--epochs_finetune",
        type=int,
        default=15,
        help="Phase 2 fine-tuning epochs (default: 15)",
    )
    p.add_argument(
        "--batch",
        type=int,
        default=32,
        help="Batch size (default: 32; use 16 if OOM on GPU)",
    )
    p.add_argument(
        "--smoke_test",
        type=str,
        default=None,
        metavar="IMAGE_PATH",
        help="Run inference on a single image using saved model.h5",
    )
    p.add_argument(
        "--instructions",
        action="store_true",
        help="Print dataset download instructions",
    )
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()

    if args.instructions:
        print_dataset_instructions()
        sys.exit(0)

    if args.smoke_test:
        smoke_test(args.smoke_test)
        sys.exit(0)

    train(args)
