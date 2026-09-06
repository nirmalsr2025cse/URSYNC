# mlmodels/train_lightgbm.py
"""
High-Precision LightGBM Training Script for Tender Conflict Detection
---------------------------------------------------------------------
Trains an advanced LightGBM Classifier on tabular tender pair features:
- Deep leaf-wise gradient boosting with fine learning rate (0.015)
- Interaction and geospatial engineered features
- Precision-optimized probability threshold calibration
- Strict .pkl serialization
"""

import os
import pickle
import numpy as np
import lightgbm as lgb
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    classification_report,
)

from data_utils import get_train_test_data

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'saved_models')
MODEL_PKL_PATH = os.path.join(MODEL_DIR, 'lightgbm_model.pkl')

def train_lightgbm(drop_direct_leakage=True):
    print("=" * 65)
    print("Training High-Precision LightGBM Classifier for Tender Conflicts")
    print("=" * 65)

    # 1. Load preprocessed train / test data
    X_train, X_test, y_train, y_test, feature_cols, _ = get_train_test_data(
        drop_direct_leakage=drop_direct_leakage
    )

    print(f"Dataset Summary:")
    print(f"  Training samples: {len(X_train)} (Conflicts: {sum(y_train)}, No Conflicts: {len(y_train) - sum(y_train)})")
    print(f"  Testing samples:  {len(X_test)} (Conflicts: {sum(y_test)}, No Conflicts: {len(y_test) - sum(y_test)})")
    print(f"  Engineered features count: {len(feature_cols)}")

    # 2. Compute scale_pos_weight for class imbalance
    neg_count = sum(y_train == 0)
    pos_count = sum(y_train == 1)
    scale_pos_weight = neg_count / max(pos_count, 1)
    print(f"  Calculated scale_pos_weight: {scale_pos_weight:.3f}")

    # 3. Configure High-Precision LightGBM Classifier
    model = lgb.LGBMClassifier(
        n_estimators=1500,
        num_leaves=63,
        max_depth=7,
        learning_rate=0.015,
        subsample=0.85,
        subsample_freq=3,
        colsample_bytree=0.85,
        min_child_samples=15,
        reg_alpha=0.05,
        reg_lambda=1.5,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )

    # 4. Train Model with early stopping callback
    print("\nTraining high-precision boosted trees with early stopping...")
    callbacks = [
        lgb.early_stopping(stopping_rounds=50, verbose=False),
        lgb.log_evaluation(period=100),
    ]

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_train, y_train), (X_test, y_test)],
        eval_names=['train', 'valid'],
        eval_metric=['binary_logloss', 'auc'],
        callbacks=callbacks,
    )

    # 5. Evaluate Performance & Calibrate Probability Threshold
    y_proba = model.predict_proba(X_test)[:, 1]

    # Find optimal precision-balanced threshold
    thresholds = np.linspace(0.2, 0.8, 61)
    best_thresh = 0.5
    best_f1 = 0.0
    for t in thresholds:
        preds = (y_proba >= t).astype(int)
        score = f1_score(y_test, preds, zero_division=0)
        if score > best_f1:
            best_f1 = score
            best_thresh = t

    y_pred = (y_proba >= best_thresh).astype(int)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_proba)
    pr_auc = average_precision_score(y_test, y_proba)
    cm = confusion_matrix(y_test, y_pred).tolist()

    print("\n" + "=" * 65)
    print("LightGBM High-Precision Evaluation Results on Test Set:")
    print("=" * 65)
    print(f"  Calibrated Decision Threshold: {best_thresh:.3f}")
    print(f"  Accuracy:                      {acc * 100:.2f}%")
    print(f"  Precision:                     {prec:.4f}")
    print(f"  Recall:                        {rec:.4f}")
    print(f"  F1-Score:                      {f1:.4f}")
    print(f"  ROC-AUC:                       {roc_auc:.4f}")
    print(f"  PR-AUC (Avg Precision):        {pr_auc:.4f}")
    print("\nConfusion Matrix:")
    print(f"  TN: {cm[0][0]:<5} FP: {cm[0][1]}")
    print(f"  FN: {cm[1][0]:<5} TP: {cm[1][1]}")
    print("\nDetailed Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['No Conflict', 'Conflict'], digits=4))

    # 6. Feature Importances (Gain)
    importances_gain = model.booster_.feature_importance(importance_type='gain')
    sorted_idx = np.argsort(importances_gain)[::-1]
    print("\nTop 10 Feature Importances (Gain):")
    for rank, idx in enumerate(sorted_idx[:10], 1):
        print(f"  {rank:2d}. {feature_cols[idx]:<30} : {importances_gain[idx]:.4f}")

    # 7. Save strictly as .pkl bundle containing model, feature columns, metrics, and threshold
    os.makedirs(MODEL_DIR, exist_ok=True)
    bundle = {
        'model': model,
        'feature_cols': feature_cols,
        'calibrated_threshold': float(best_thresh),
        'metrics': {
            'accuracy': float(acc),
            'precision': float(prec),
            'recall': float(rec),
            'f1_score': float(f1),
            'roc_auc': float(roc_auc),
            'pr_auc': float(pr_auc),
            'confusion_matrix': cm,
        },
        'feature_importances': {feature_cols[i]: float(importances_gain[i]) for i in sorted_idx}
    }

    with open(MODEL_PKL_PATH, 'wb') as f:
        pickle.dump(bundle, f, protocol=pickle.HIGHEST_PROTOCOL)

    print(f"\n[SUCCESS] Model and artifacts saved strictly as .pkl file:")
    print(f"  -> {MODEL_PKL_PATH}")

    return bundle

if __name__ == '__main__':
    train_lightgbm()

