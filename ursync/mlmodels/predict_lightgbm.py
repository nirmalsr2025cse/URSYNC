# mlmodels/predict_lightgbm.py
"""
High-Precision LightGBM Prediction Script for Tender Conflict Detection
------------------------------------------------------------------------
Loads trained .pkl LightGBM bundle and performs high-precision inference:
- Reads calibrated decision threshold and model from .pkl
- Outputs exact conflict probability, label, risk score, and signal breakdown
"""

import os
import json
import pickle
import pandas as pd
from data_utils import transform_sample_for_prediction, PREPROCESSOR_PKL_PATH

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'saved_models')
MODEL_PKL_PATH = os.path.join(MODEL_DIR, 'lightgbm_model.pkl')

class LightGBMConflictPredictor:
    def __init__(self, model_pkl_path=MODEL_PKL_PATH, preprocessor_pkl_path=PREPROCESSOR_PKL_PATH):
        if not os.path.exists(model_pkl_path):
            raise FileNotFoundError(f"Trained LightGBM .pkl model not found at {model_pkl_path}. Run train_lightgbm.py first.")

        with open(model_pkl_path, 'rb') as f:
            bundle = pickle.load(f)

        self.model = bundle['model']
        self.feature_cols = bundle['feature_cols']
        self.threshold = bundle.get('calibrated_threshold', 0.5)

        with open(preprocessor_pkl_path, 'rb') as f:
            self.preprocessor = pickle.load(f)

    def predict_pair(self, tender_a, tender_b, distance_km=None, distance_meters=None):
        """
        Predicts conflict for a single pair of tender records.
        """
        sample = self._build_pair_dict(tender_a, tender_b, distance_km, distance_meters)
        return self.predict_records([sample])[0]

    def predict_records(self, records):
        """
        Predicts conflict probabilities and labels with precision metrics.
        """
        X = transform_sample_for_prediction(records, self.preprocessor)
        probabilities = self.model.predict_proba(X)[:, 1]
        predictions = (probabilities >= self.threshold).astype(int)

        results = []
        for i, (prob, pred) in enumerate(zip(probabilities, predictions)):
            record = records[i] if isinstance(records, list) else records.iloc[i].to_dict()
            prob_float = float(prob)

            if prob_float >= 0.80:
                risk_level = 'CRITICAL'
                confidence = 'Very High'
            elif prob_float >= 0.60:
                risk_level = 'HIGH'
                confidence = 'High'
            elif prob_float >= 0.40:
                risk_level = 'MODERATE'
                confidence = 'Moderate'
            elif prob_float >= 0.20:
                risk_level = 'LOW'
                confidence = 'High'
            else:
                risk_level = 'NEGLIGIBLE'
                confidence = 'Very High'

            results.append({
                'pairId': record.get('pairId', f"pair_{i+1}"),
                'conflictProbability': round(prob_float, 6),
                'conflictLabel': int(pred),
                'conflictStatus': 'Conflict Detected' if pred == 1 else 'No Conflict',
                'riskLevel': risk_level,
                'confidence': confidence,
                'calibratedThreshold': round(self.threshold, 4),
                'distanceKm': record.get('distanceKm', None),
                'distanceMeters': record.get('distanceMeters', None),
                'categoryGroupA': record.get('categoryGroupA', record.get('categoryGroup_a', None)),
                'categoryGroupB': record.get('categoryGroupB', record.get('categoryGroup_b', None)),
                'sameDistrict': bool(record.get('sameDistrict', False)),
            })
        return results

    def _build_pair_dict(self, tender_a, tender_b, distance_km, distance_meters):
        dist_km = distance_km if distance_km is not None else (distance_meters / 1000.0 if distance_meters is not None else 5.0)
        dist_m = distance_meters if distance_meters is not None else dist_km * 1000.0

        return {
            'departmentA': tender_a.get('department', tender_a.get('departmentName', 'Unknown')),
            'departmentB': tender_b.get('department', tender_b.get('departmentName', 'Unknown')),
            'sameDepartment': tender_a.get('department', '') == tender_b.get('department', ''),
            'categoryGroupA': tender_a.get('categoryGroup', tender_a.get('category', 'BUILD')),
            'categoryGroupB': tender_b.get('categoryGroup', tender_b.get('category', 'ROAD')),
            'categorySimilarity': float(tender_a.get('categorySimilarity', 0.8)),
            'titleSimilarity': float(tender_a.get('titleSimilarity', 0.6)),
            'descriptionSimilarity': float(tender_a.get('descriptionSimilarity', 0.5)),
            'districtA': tender_a.get('district', 'Chennai'),
            'districtB': tender_b.get('district', 'Chennai'),
            'sameDistrict': tender_a.get('district', '') == tender_b.get('district', ''),
            'distanceKm': dist_km,
            'distanceMeters': dist_m,
            'conflictRadiusMeters': 5000.0,
            'latitudeA': float(tender_a.get('latitude', 13.0827)),
            'longitudeA': float(tender_a.get('longitude', 80.2707)),
            'latitudeB': float(tender_b.get('latitude', 13.0850)),
            'longitudeB': float(tender_b.get('longitude', 80.2720)),
            'yearA': 2026,
            'yearB': 2026,
        }

if __name__ == '__main__':
    if not os.path.exists(MODEL_PKL_PATH):
        print(f"Model .pkl not found at {MODEL_PKL_PATH}. Please run train_lightgbm.py first.")
    else:
        predictor = LightGBMConflictPredictor()

        sample_a = {
            'tenderId': 'TN/PWD/2026/1',
            'department': 'Public Works Department',
            'category': 'ROAD',
            'district': 'Coimbatore',
            'latitude': 11.0168,
            'longitude': 76.9558,
        }

        sample_b = {
            'tenderId': 'TN/HIGHWAYS/2026/1',
            'department': 'Highways Department',
            'category': 'ROAD',
            'district': 'Coimbatore',
            'latitude': 11.0180,
            'longitude': 76.9570,
        }

        print("=" * 65)
        print("High-Precision LightGBM Conflict Prediction Demo (.pkl)")
        print("=" * 65)
        result = predictor.predict_pair(sample_a, sample_b, distance_km=0.35)
        print(json.dumps(result, indent=2))
