import os
import json
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

# Set random seed for reproducibility
np.random.seed(42)

# Ensure output directory exists
os.makedirs('src/data', exist_ok=True)
os.makedirs('model/data', exist_ok=True) # local backup

# 1. Configuration of Player and Defender Archetypes
PLAYERS = {
    "Stephen Curry": {
        "inside_pct": 0.15, "mid_pct": 0.20, "three_pct": 0.65,
        "inside_skill": -0.02, "mid_skill": 0.08, "three_skill": 0.12, "deep_three_skill": 0.15,
        "dribble_mean": 3.5, "assisted_pct": 0.40
    },
    "Giannis Antetokounmpo": {
        "inside_pct": 0.75, "mid_pct": 0.18, "three_pct": 0.07,
        "inside_skill": 0.12, "mid_skill": -0.12, "three_skill": -0.10, "deep_three_skill": -0.15,
        "dribble_mean": 1.8, "assisted_pct": 0.55
    },
    "LeBron James": {
        "inside_pct": 0.48, "mid_pct": 0.22, "three_pct": 0.30,
        "inside_skill": 0.08, "mid_skill": 0.01, "three_skill": 0.00, "deep_three_skill": -0.02,
        "dribble_mean": 2.8, "assisted_pct": 0.45
    },
    "Kevin Durant": {
        "inside_pct": 0.20, "mid_pct": 0.52, "three_pct": 0.28,
        "inside_skill": 0.04, "mid_skill": 0.12, "three_skill": 0.06, "deep_three_skill": 0.03,
        "dribble_mean": 2.5, "assisted_pct": 0.50
    },
    "Luka Doncic": {
        "inside_pct": 0.32, "mid_pct": 0.28, "three_pct": 0.40,
        "inside_skill": 0.03, "mid_skill": 0.05, "three_skill": -0.01, "deep_three_skill": 0.04,
        "dribble_mean": 5.2, "assisted_pct": 0.15
    }
}

DEFENDERS = {
    "Rudy Gobert": {
        "distance_mult": 0.85, "inside_contest": 0.12, "perimeter_contest": -0.02,
        "description": "Elite Rim Protector"
    },
    "Alex Caruso": {
        "distance_mult": 0.70, "inside_contest": 0.03, "perimeter_contest": 0.08,
        "description": "Lockdown Perimeter Defender"
    },
    "Jaden McDaniels": {
        "distance_mult": 0.75, "inside_contest": 0.05, "perimeter_contest": 0.06,
        "description": "Versatile Wing Stopper"
    },
    "Average Defender": {
        "distance_mult": 1.0, "inside_contest": 0.0, "perimeter_contest": 0.0,
        "description": "Standard Contest"
    },
    "Weak Defender": {
        "distance_mult": 1.3, "inside_contest": -0.06, "perimeter_contest": -0.06,
        "description": "Subpar Contest"
    }
}

# Basketball Court Geometry constants
HOOP_X = 0.0
HOOP_Y = 4.75 # Feet from baseline

# 2. Data Generation Process
def generate_shot_locations(player_name, size=1500):
    p_config = PLAYERS[player_name]
    shot_types = np.random.choice(["inside", "mid", "three"], size=size, p=[p_config["inside_pct"], p_config["mid_pct"], p_config["three_pct"]])
    
    xs, ys, dists, angles = [], [], [], []
    for st in shot_types:
        if st == "inside":
            # Restricted area & close paint (0-6 ft)
            r = np.random.triangular(0.5, 2.0, 6.0)
            theta = np.random.uniform(0, 180) * np.pi / 180
            x = HOOP_X + r * np.cos(theta)
            y = HOOP_Y + r * np.sin(theta)
        elif st == "mid":
            # Mid-range area (6-22 ft)
            r = np.random.uniform(6.0, 21.5)
            theta = np.random.uniform(10, 170) * np.pi / 180
            x = HOOP_X + r * np.cos(theta)
            y = HOOP_Y + r * np.sin(theta)
        else: # three
            # 3-pointers (22-35 ft)
            r = np.random.triangular(22.0, 25.0, 35.0)
            theta = np.random.uniform(5, 175) * np.pi / 180
            x = HOOP_X + r * np.cos(theta)
            y = HOOP_Y + r * np.sin(theta)
            
        # Add slight randomness
        x += np.random.normal(0, 0.2)
        y += np.random.normal(0, 0.2)
        
        # Clip inside bounds
        x = np.clip(x, -25.0, 25.0)
        y = np.clip(y, 0.0, 40.0)
        
        # Calculate actual distance & angle
        d = np.sqrt((x - HOOP_X)**2 + (y - HOOP_Y)**2)
        ang = np.arctan2(y - HOOP_Y, x - HOOP_X) * 180 / np.pi
        
        xs.append(float(round(x, 2)))
        ys.append(float(round(y, 2)))
        dists.append(float(round(d, 2)))
        angles.append(float(round(ang, 2)))
        
    return xs, ys, dists, angles

# Create dataset
records = []
total_shots_per_player = 1600

for player_name, p_config in PLAYERS.items():
    xs, ys, dists, angles = generate_shot_locations(player_name, size=total_shots_per_player)
    
    for i in range(total_shots_per_player):
        dist = dists[i]
        angle = angles[i]
        x = xs[i]
        y = ys[i]
        
        # Assign defender
        def_name = np.random.choice(list(DEFENDERS.keys()))
        d_config = DEFENDERS[def_name]
        
        # Determine defender distance (feet) based on player style, shot distance, and defender archetype
        # Close range is usually more contested
        if dist <= 4.0:
            def_dist_base = np.random.exponential(scale=2.2) + 0.5
        elif dist <= 22.0:
            def_dist_base = np.random.normal(loc=3.8, scale=1.2)
        else:
            def_dist_base = np.random.normal(loc=4.8, scale=1.5)
            
        # Apply defender multiplier and clip
        def_dist = np.clip(def_dist_base * d_config["distance_mult"], 0.2, 15.0)
        def_dist = float(round(def_dist, 2))
        
        # Dribbles before shot
        # Catch and shoot vs pull up
        is_assisted = np.random.rand() < p_config["assisted_pct"]
        if is_assisted or dist <= 3.0:
            dribbles = 0
            shot_type = "Catch & Shoot" if dist > 4.0 else "Layup/Dunk"
        else:
            dribbles = int(np.random.poisson(p_config["dribble_mean"]) + 1)
            shot_type = "Pull-up" if dist > 4.0 else "Layup/Dunk"
            
        # Categorical indicators
        is_catch = 1 if shot_type == "Catch & Shoot" else 0
        is_pull = 1 if shot_type == "Pull-up" else 0
        is_layup = 1 if shot_type == "Layup/Dunk" else 0
        
        # 3-pointer indicator
        # NBA 3pt line: 22 ft in corners (angle < 14 or > 166), 23.75 ft elsewhere
        is_three = 0
        if (angle < 14 or angle > 166) and dist >= 22.0:
            is_three = 1
        elif dist >= 23.75:
            is_three = 1
            
        # Baseline probability modeling (League average)
        if dist <= 4.0:
            p_base = 0.68 - 0.02 * dist
        elif dist <= 14.0:
            p_base = 0.50 - 0.012 * (dist - 4.0)
        elif dist <= 22.0:
            p_base = 0.40 - 0.006 * (dist - 14.0)
        else:
            p_base = 0.37 - 0.008 * (dist - 22.0)
            
        # Contest factor impact (logistic-like scaling)
        # Tight contest (< 2.5 ft) reduces completion, wide open (> 6.0 ft) boosts it
        if def_dist <= 2.5:
            contest_effect = -0.15 * (1.0 - (def_dist / 2.5))
        elif def_dist >= 5.0:
            contest_effect = 0.10 * min((def_dist - 5.0) / 5.0, 1.0)
        else:
            contest_effect = 0.0
            
        # Shot type factors
        shot_type_effect = 0.04 if is_catch else (-0.03 if is_pull else 0.05)
        
        # Combine base probability
        p_league = np.clip(p_base + contest_effect + shot_type_effect, 0.10, 0.90)
        
        # Player skill multiplier adjustment
        skill_adj = 0.0
        if dist <= 4.0:
            skill_adj = p_config["inside_skill"] - (d_config["inside_contest"] if dist <= 6.0 else 0)
        elif dist <= 22.0:
            skill_adj = p_config["mid_skill"] - (d_config["perimeter_contest"] * 0.5)
        else: # 3pt
            if dist > 27.5:
                skill_adj = p_config["deep_three_skill"] - d_config["perimeter_contest"]
            else:
                skill_adj = p_config["three_skill"] - d_config["perimeter_contest"]
                
        # Player specific shot quality effect
        p_final = np.clip(p_league + skill_adj, 0.05, 0.95)
        
        # Simulate shot outcome
        shot_made = 1 if np.random.rand() < p_final else 0
        
        records.append({
            "player": player_name,
            "defender": def_name,
            "x": x,
            "y": y,
            "distance": dist,
            "angle": angle,
            "defender_distance": def_dist,
            "dribbles": dribbles,
            "shot_type": shot_type,
            "is_catch_and_shoot": is_catch,
            "is_pull_up": is_pull,
            "is_layup_dunk": is_layup,
            "is_three": is_three,
            "p_league": float(round(p_league, 4)),
            "p_final": float(round(p_final, 4)),
            "shot_made": shot_made
        })

df = pd.DataFrame(records)

# 3. Model Training (League Average Shot Quality Model)
# Features used to calculate Expected eFG%
X_cols = ["distance", "defender_distance", "dribbles", "is_catch_and_shoot", "is_pull_up", "is_layup_dunk"]
X = df[X_cols]
y = df["shot_made"]

# Fit logistic regression
model = LogisticRegression(fit_intercept=True)
model.fit(X, y)

# Retrieve coefficients
coefs = model.coef_[0]
intercept = model.intercept_[0]

model_coefs = {
    "intercept": float(round(intercept, 4)),
    "distance": float(round(coefs[0], 4)),
    "defender_distance": float(round(coefs[1], 4)),
    "dribbles": float(round(coefs[2], 4)),
    "is_catch_and_shoot": float(round(coefs[3], 4)),
    "is_pull_up": float(round(coefs[4], 4)),
    "is_layup_dunk": float(round(coefs[5], 4))
}

# 4. Apply Model to Calculate Expected eFG% (xeFG)
# xeFG = P(Make) for 2-pointers; P(Make) * 1.5 for 3-pointers
# Logit formula: p = 1 / (1 + exp(-z))
# z = intercept + w_dist*dist + w_def*def_dist + w_drib*dribbles + w_catch*is_catch + w_pull*is_pull + w_layup*is_layup
log_odds = (
    intercept + 
    df["distance"] * coefs[0] + 
    df["defender_distance"] * coefs[1] + 
    df["dribbles"] * coefs[2] + 
    df["is_catch_and_shoot"] * coefs[3] + 
    df["is_pull_up"] * coefs[4] + 
    df["is_layup_dunk"] * coefs[5]
)
df["expected_make_prob"] = 1.0 / (1.0 + np.exp(-log_odds))
df["expected_efg"] = np.where(df["is_three"] == 1, df["expected_make_prob"] * 1.5, df["expected_make_prob"])
df["actual_efg"] = np.where(df["is_three"] == 1, df["shot_made"] * 1.5, df["shot_made"])

# Round for storage efficiency
df["expected_make_prob"] = df["expected_make_prob"].round(4)
df["expected_efg"] = df["expected_efg"].round(4)

# 5. Aggregate Player Metrics
player_stats = []
for p_name in PLAYERS.keys():
    p_df = df[df["player"] == p_name]
    attempts = len(p_df)
    makes = int(p_df["shot_made"].sum())
    three_att = int(p_df["is_three"].sum())
    three_make = int(p_df[p_df["is_three"] == 1]["shot_made"].sum())
    
    actual_efg = float(round(p_df["actual_efg"].mean(), 4))
    expected_efg = float(round(p_df["expected_efg"].mean(), 4))
    shot_making = float(round(actual_efg - expected_efg, 4))
    
    avg_dist = float(round(p_df["distance"].mean(), 2))
    avg_def_dist = float(round(p_df["defender_distance"].mean(), 2))
    avg_dribbles = float(round(p_df["dribbles"].mean(), 2))
    
    # Zone breakdowns
    zones = {}
    zone_definitions = {
        "Restricted Area": p_df[p_df["distance"] <= 4.0],
        "Paint (Non-RA)": p_df[(p_df["distance"] > 4.0) & (p_df["distance"] <= 14.0) & (p_df["x"].abs() <= 8.0)],
        "Mid-Range": p_df[(p_df["distance"] > 4.0) & (p_df["distance"] < 22.0) & ((p_df["distance"] > 14.0) | (p_df["x"].abs() > 8.0))],
        "Corner 3": p_df[(p_df["is_three"] == 1) & (p_df["y"] <= 14.0)],
        "Above the Break 3": p_df[(p_df["is_three"] == 1) & (p_df["y"] > 14.0)]
    }
    
    for z_name, z_df in zone_definitions.items():
        z_att = len(z_df)
        if z_att > 0:
            z_efg = float(round(z_df["actual_efg"].mean(), 4))
            z_xefg = float(round(z_df["expected_efg"].mean(), 4))
            z_sm = float(round(z_efg - z_xefg, 4))
        else:
            z_efg, z_xefg, z_sm = 0.0, 0.0, 0.0
            
        zones[z_name] = {
            "attempts": z_att,
            "efg": z_efg,
            "xefg": z_xefg,
            "shot_making": z_sm
        }
        
    player_stats.append({
        "player": p_name,
        "attempts": attempts,
        "makes": makes,
        "three_attempts": three_att,
        "three_makes": three_make,
        "actual_efg": actual_efg,
        "expected_efg": expected_efg,
        "shot_making": shot_making,
        "avg_distance": avg_dist,
        "avg_defender_distance": avg_def_dist,
        "avg_dribbles": avg_dribbles,
        "zones": zones
    })

# 6. Aggregate Defender Metrics
defender_stats = []
for d_name, d_config in DEFENDERS.items():
    d_df = df[df["defender"] == d_name]
    attempts = len(d_df)
    actual_efg_allowed = float(round(d_df["actual_efg"].mean(), 4))
    expected_efg_allowed = float(round(d_df["expected_efg"].mean(), 4))
    # Defensive contest quality: expected eFG allowed minus actual eFG allowed
    # Positive is good: held opponents below their expected shot percentages
    defensive_impact = float(round(expected_efg_allowed - actual_efg_allowed, 4))
    
    avg_def_dist = float(round(d_df["defender_distance"].mean(), 2))
    
    # Distance breakdown
    inside_df = d_df[d_df["distance"] <= 6.0]
    perimeter_df = d_df[d_df["distance"] > 6.0]
    
    inside_attempts = len(inside_df)
    inside_efg_allowed = float(round(inside_df["actual_efg"].mean(), 4)) if inside_attempts > 0 else 0.0
    inside_xefg_allowed = float(round(inside_df["expected_efg"].mean(), 4)) if inside_attempts > 0 else 0.0
    inside_impact = float(round(inside_xefg_allowed - inside_efg_allowed, 4)) if inside_attempts > 0 else 0.0
    
    perimeter_attempts = len(perimeter_df)
    perimeter_efg_allowed = float(round(perimeter_df["actual_efg"].mean(), 4)) if perimeter_attempts > 0 else 0.0
    perimeter_xefg_allowed = float(round(perimeter_df["expected_efg"].mean(), 4)) if perimeter_attempts > 0 else 0.0
    perimeter_impact = float(round(perimeter_xefg_allowed - perimeter_efg_allowed, 4)) if perimeter_attempts > 0 else 0.0
    
    defender_stats.append({
        "defender": d_name,
        "description": d_config["description"],
        "attempts": attempts,
        "actual_efg_allowed": actual_efg_allowed,
        "expected_efg_allowed": expected_efg_allowed,
        "defensive_impact": defensive_impact,
        "avg_defender_distance": avg_def_dist,
        "inside": {
            "attempts": inside_attempts,
            "actual_efg_allowed": inside_efg_allowed,
            "expected_efg_allowed": inside_xefg_allowed,
            "defensive_impact": inside_impact
        },
        "perimeter": {
            "attempts": perimeter_attempts,
            "actual_efg_allowed": perimeter_efg_allowed,
            "expected_efg_allowed": perimeter_xefg_allowed,
            "defensive_impact": perimeter_impact
        }
    })

# 7. Write outputs to files
# Save coefficients & overall stats
model_output = {
    "coefficients": model_coefs,
    "player_stats": player_stats,
    "defender_stats": defender_stats
}

with open('src/data/model_coefficients.json', 'w') as f:
    json.dump(model_output, f, indent=2)
with open('model/data/model_coefficients.json', 'w') as f:
    json.dump(model_output, f, indent=2)

# Save raw shot data (compacted representation for frontend network efficiency)
# Columns: [player, defender, x, y, distance, defender_distance, dribbles, shot_type, is_three, expected_make_prob, shot_made]
shot_data_compact = []
for index, row in df.iterrows():
    shot_data_compact.append({
        "p": row["player"],
        "d": row["defender"],
        "x": float(round(row["x"], 1)),
        "y": float(round(row["y"], 1)),
        "dst": float(round(row["distance"], 1)),
        "ddst": float(round(row["defender_distance"], 1)),
        "drb": int(row["dribbles"]),
        "st": row["shot_type"],
        "t": int(row["is_three"]),
        "prob": float(round(row["expected_make_prob"], 3)),
        "m": int(row["shot_made"])
    })

with open('src/data/shot_data.json', 'w') as f:
    json.dump(shot_data_compact, f)
with open('model/data/shot_data.json', 'w') as f:
    json.dump(shot_data_compact, f)

print(f"Data generation and training complete! Generated {len(df)} shots.")
print(f"Model Intercept: {intercept:.4f}")
print("Features & Coefficients:")
for feat, coef in model_coefs.items():
    if feat != "intercept":
        print(f"  {feat}: {coef:.4f}")
