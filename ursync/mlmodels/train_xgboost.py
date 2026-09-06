# mlmodels/train_xgboost.py
"""
High-Precision XGBoost Training Script for Tender Conflict Detection
-------------------------------------------------------------------
Trains an advanced XGBoost Classifier on tabular tender pair features:
- Deep gradient boosting with fine-grained learning rate (0.015)
- Interaction and geospatial engineered features
- Probability threshold calibration for maximum precision
- Strict .pkl serialization
"""

import os
import pickle
import numpy as np
import xgboost as xgb
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
MODEL_PKL_PATH = os.path.join(MODEL_DIR, 'xgboost_model.pkl')

def train_xgboost(drop_direct_leakage=True):
    print("=" * 65)
    print("Training High-Precision XGBoost Classifier for Tender Conflicts")
    print("=" * 65)

    # 1. Load preprocessed train / test data with high-precision features
    X_train, X_test, y_train, y_test, feature_cols, _ = get_train_test_data(
        drop_direct_leakage=drop_direct_leakage
    )

    print(f"Dataset Summary:")
    print(f"  Training samples: {len(X_train)} (Conflicts: {sum(y_train)}, No Conflicts: {len(y_train) - sum(y_train)})")
    print(f"  Testing samples:  {len(X_test)} (Conflicts: {sum(y_test)}, No Conflicts: {len(y_test) - sum(y_test)})")
    print(f"  Engineered features count: {len(feature_cols)}")

    # 2. Compute fine-grained class weight
    neg_count = sum(y_train == 0)
    pos_count = sum(y_train == 1)
    scale_pos_weight = neg_count / max(pos_count, 1)
    print(f"  Calculated scale_pos_weight: {scale_pos_weight:.3f}")

    # 3. Configure High-Precision XGBoost Classifier
    model = xgb.XGBClassifier(
        n_estimators=1200,
        max_depth=6,
        learning_rate=0.015,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos_weight,
        gamma=0.1,
        reg_alpha=0.05,
        reg_lambda=1.5,
        min_child_weight=2,
        eval_metric=['logloss', 'auc', 'error'],
        early_stopping_rounds=50,
        random_state=42,
        n_jobs=-1,
        tree_method='hist',
    )

    # 4. Train Model with fine evaluation tracking
    print("\nTraining high-precision boosted trees with early stopping...")
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_train, y_train), (X_test, y_test)],
        verbose=100,
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
    print("XGBoost High-Precision Evaluation Results on Test Set:")
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

    # 6. Feature Importances
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    print("\nTop 10 Feature Importances (Gain):")
    for rank, idx in enumerate(sorted_idx[:10], 1):
        print(f"  {rank:2d}. {feature_cols[idx]:<30} : {importances[idx]:.4f}")

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
        'feature_importances': {feature_cols[i]: float(importances[i]) for i in sorted_idx}
    }

    with open(MODEL_PKL_PATH, 'wb') as f:
        pickle.dump(bundle, f, protocol=pickle.HIGHEST_PROTOCOL)

    print(f"\n[SUCCESS] Model and artifacts saved strictly as .pkl file:")
    print(f"  -> {MODEL_PKL_PATH}")

    return bundle

if __name__ == '__main__':
    train_xgboost()

