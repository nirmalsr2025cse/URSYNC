# mlmodels/data_utils.py
import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

DATA_FILE_PATH = os.path.join(os.path.dirname(__file__), 'tender_conflict_dataset.csv')
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'saved_models')
PREPROCESSOR_PKL_PATH = os.path.join(MODEL_DIR, 'preprocessor.pkl')

# Base numeric features
BASE_NUMERIC_FEATURES = [
    'categorySimilarity',
    'titleSimilarity',
    'descriptionSimilarity',
    'distanceKm',
    'distanceMeters',
    'conflictRadiusMeters',
    'latitudeA',
    'longitudeA',
    'latitudeB',
    'longitudeB',
    'yearA',
    'yearB',
]

CATEGORICAL_FEATURES = [
    'departmentA',
    'departmentB',
    'categoryGroupA',
    'categoryGroupB',
    'districtA',
    'districtB',
]

BOOLEAN_FEATURES = [
    'sameDepartment',
    'sameDistrict',
]

TARGET_COLUMN = 'conflictLabel'

def engineer_features(df):
    """
    Computes high-precision interaction and geospatial features to maximize
    classification accuracy and probability precision.
    """
    df = df.copy()

    # Numeric conversions with fallback
    for col in BASE_NUMERIC_FEATURES:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
        else:
            df[col] = 0.0

    for col in BOOLEAN_FEATURES:
        if col in df.columns:
            df[col] = df[col].astype(int)
        else:
            df[col] = 0

    # 1. Geospatial coordinate differences
    df['lat_diff'] = np.abs(df['latitudeA'] - df['latitudeB'])
    df['lon_diff'] = np.abs(df['longitudeA'] - df['longitudeB'])
    df['geo_euclidean_dist'] = np.sqrt(df['lat_diff']**2 + df['lon_diff']**2)

    # 2. Distance to conflict radius ratio
    df['distance_radius_ratio'] = df['distanceMeters'] / np.maximum(df['conflictRadiusMeters'], 1.0)
    df['is_within_radius'] = (df['distanceMeters'] <= df['conflictRadiusMeters']).astype(int)

    # 3. Text and Category Similarity Interactions
    df['avg_similarity'] = (df['categorySimilarity'] + df['titleSimilarity'] + df['descriptionSimilarity']) / 3.0
    df['category_x_title_sim'] = df['categorySimilarity'] * df['titleSimilarity']

    # 4. Proximity & Conflict Signal Indices
    df['spatial_proximity_score'] = 1.0 / (1.0 + np.maximum(df['distanceKm'], 0.0))
    df['conflict_signal_index'] = df['avg_similarity'] * df['spatial_proximity_score']
    df['same_dept_and_district'] = (df['sameDepartment'] & df['sameDistrict']).astype(int)

    return df

def load_and_preprocess_dataset(csv_path=DATA_FILE_PATH, drop_direct_leakage=True):
    """
    Loads dataset, calculates high-precision engineered features, and label-encodes categoricals.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")

    raw_df = pd.read_csv(csv_path)
    df = engineer_features(raw_df)

    # Label encode categorical columns
    label_encoders = {}
    for col in CATEGORICAL_FEATURES:
        if col in df.columns:
            le = LabelEncoder()
            df[col] = df[col].fillna('Unknown').astype(str)
            df[col + '_encoded'] = le.fit_transform(df[col])
            label_encoders[col] = le

    # Build final feature list
    engineered_numeric = [
        'lat_diff',
        'lon_diff',
        'geo_euclidean_dist',
        'distance_radius_ratio',
        'is_within_radius',
        'avg_similarity',
        'category_x_title_sim',
        'spatial_proximity_score',
        'conflict_signal_index',
        'same_dept_and_district',
    ]

    feature_cols = []
    feature_cols.extend([c + '_encoded' for c in CATEGORICAL_FEATURES if c in df.columns])
    feature_cols.extend([c for c in BOOLEAN_FEATURES if c in df.columns])
    feature_cols.extend([c for c in BASE_NUMERIC_FEATURES if c in df.columns])
    feature_cols.extend(engineered_numeric)

    if not drop_direct_leakage and 'categoryRelation' in df.columns:
        le_rel = LabelEncoder()
        df['categoryRelation_encoded'] = le_rel.fit_transform(df['categoryRelation'].astype(str))
        label_encoders['categoryRelation'] = le_rel
        feature_cols.append('categoryRelation_encoded')

    X = df[feature_cols]
    y = df[TARGET_COLUMN].astype(int)

    return X, y, feature_cols, label_encoders

def get_train_test_data(csv_path=DATA_FILE_PATH, test_size=0.2, random_state=42, drop_direct_leakage=True):
    """
    Returns stratified train and test sets and saves preprocessor to .pkl file.
    """
    X, y, feature_cols, label_encoders = load_and_preprocess_dataset(
        csv_path=csv_path,
        drop_direct_leakage=drop_direct_leakage
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(PREPROCESSOR_PKL_PATH, 'wb') as f:
        pickle.dump({
            'feature_cols': feature_cols,
            'label_encoders': label_encoders,
            'drop_direct_leakage': drop_direct_leakage
        }, f, protocol=pickle.HIGHEST_PROTOCOL)

    return X_train, X_test, y_train, y_test, feature_cols, label_encoders

def transform_sample_for_prediction(sample_dict, preprocessor=None):
    """
    Transforms arbitrary dictionary, list of dicts, or DataFrame into the model's feature matrix.
    """
    if preprocessor is None:
        if not os.path.exists(PREPROCESSOR_PKL_PATH):
            raise FileNotFoundError(f"Preprocessor file {PREPROCESSOR_PKL_PATH} not found. Please train a model first.")
        with open(PREPROCESSOR_PKL_PATH, 'rb') as f:
            preprocessor = pickle.load(f)

    feature_cols = preprocessor['feature_cols']
    label_encoders = preprocessor['label_encoders']

    if isinstance(sample_dict, dict):
        df = pd.DataFrame([sample_dict])
    elif isinstance(sample_dict, list):
        df = pd.DataFrame(sample_dict)
    elif isinstance(sample_dict, pd.DataFrame):
        df = sample_dict.copy()
    else:
        raise ValueError("sample_dict must be a dictionary, list of dicts, or DataFrame.")

    # Apply engineered features
    df = engineer_features(df)

    # Apply categorical encoders
    for col in CATEGORICAL_FEATURES:
        encoded_col = col + '_encoded'
        if col in df.columns and col in label_encoders:
            le = label_encoders[col]
            classes = set(le.classes_)
            df[encoded_col] = df[col].fillna('Unknown').astype(str).apply(
                lambda v: le.transform([v])[0] if v in classes else 0
            )
        else:
            df[encoded_col] = 0

    # Ensure all columns present
    for col in feature_cols:
        if col not in df.columns:
            df[col] = 0.0

    return df[feature_cols]
