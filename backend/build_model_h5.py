"""
One-shot: MobileNetV2 + softmax matching backend/config/labels.json class order.
Downloads ImageNet backbone weights once, then saves backend/model.h5 next to app.py.
"""
import json
from pathlib import Path

_HERE = Path(__file__).resolve().parent
LABELS_PATH = _HERE / "config" / "labels.json"
OUT_PATH = _HERE / "model.h5"


def main():
    import tensorflow as tf
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras import layers

    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    class_names = [n for n in cfg["class_names"] if isinstance(n, str)]
    n_cls = len(class_names)
    if n_cls == 0:
        raise SystemExit("No class_names in labels.json")

    inp = layers.Input(shape=(224, 224, 3), name="leaf_input")
    # Prefer ImageNet weights; fallback to random init if offline / blocked
    try:
        base = MobileNetV2(
            input_tensor=inp,
            include_top=False,
            weights="imagenet",
            pooling=None,
            alpha=1.0,
        )
        print("MobileNetV2 loaded with ImageNet weights.")
    except Exception as exc:
        print("ImageNet weights unavailable, using random init:", exc)
        base = MobileNetV2(
            input_tensor=inp,
            include_top=False,
            weights=None,
            pooling=None,
            alpha=1.0,
        )

    base.trainable = False

    x = layers.GlobalAveragePooling2D()(base.output)
    x = layers.Dropout(0.2)(x)
    out = layers.Dense(n_cls, activation="softmax", dtype="float32", name="disease")(x)
    model = tf.keras.models.Model(inputs=inp, outputs=out)
    model.save(OUT_PATH.as_posix(), include_optimizer=False, save_format="hdf5")
    print(f"Saved {OUT_PATH.as_posix()} with {n_cls} classes:")
    for i, name in enumerate(class_names):
        print(f"  {i}: {name}")


if __name__ == "__main__":
    main()
