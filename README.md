# ApexShot AI: NBA Spatial Shot Quality & Defensive Contest Modeling Engine

ApexShot AI is an advanced sports analytics application and predictive engine designed to evaluate shot quality, shooter talent, and defensive contest impact using spatial and contextual player tracking logs. 

It addresses a major gap in modern sports analytics: standard statistics like Field Goal Percentage (FG%) fail to account for shot difficulty (distance, defender proximity, dribbles, and release types). ApexShot AI trains a **multivariate Logistic Regression model** using Python (`scikit-learn`) on spatial tracking features to calculate **Expected Field Goal Percentage (xeFG%)** and **Expected Points (xPTS)**, isolating player shot selection from execution skill.

---

## 🚀 Key Features

*   **🏀 Spatial Grid Shot Court**:
    *   **Scatter Plot Mode**: Colors individual attempts (Emerald for makes, Coral for misses) with glowing drop shadows.
    *   **Grid Bins Mode**: Bins attempts into 2.5ft squares, calculating and shading each square by efficiency delta (Actual eFG% - Expected eFG%).
    *   **Density Contour Mode**: Uses SVG Gaussian Blur filters and alpha color matrices in the browser to organically merge points into smooth, glowing hot-spots (green for high efficiency, red for low).
    *   **Dynamic Crosshairs**: Follows the cursor to show live range finder distance to the rim.
*   **📐 Live Shot Quality Predictor**:
    *   Adjust sliders for **Distance**, **Defender Proximity**, and **Dribble Counts** to run the regression formula in real-time, displaying success rates (xeFG%) and Expected Points (xPTS).
    *   Includes a **Visual Proximity Simulator** showing shooter and defender icons moving closer or further apart.
    *   Features **Interactive Court Pinning**: Click anywhere on the court to pin coordinates and load them directly into the predictor sliders.
*   **⚠️ Injury Predictor & Load Management**:
    *   Calculates soft-tissue injury risk and fatigue indexes based on sports science conditioning models.
    *   Uses the **Acute-to-Chronic Workload Ratio (ACWR)** (Acute Weekly Minutes / Chronic 4-Week Average Minutes) to visualize training sweet spots (0.8 - 1.3) vs. danger spikes (>1.5).
    *   Generates actionable load-management suggestions (DNP-rests, minute caps) tailored to player age and history.
*   **🎮 Clutch Arcade Mini-Game**:
    *   Control a shooter (`P`, Blue dot) using keyboard arrows/WASD or the mobile touchscreen D-pad.
    *   Evade an AI-controlled close-out defender (`D`, Red dot) chasing you across a mini SVG court and release the shot before the 24s shot clock runs out.
    *   Shot success is computed live based on your final spatial coordinates and defender proximity. Includes **Avatar Selection** (Curry, Giannis, Durant, Doncic) applying their actual skill offsets to gameplay!
*   **🎨 Custom Arena Themes & Cursors**:
    *   Custom SVG basketball cursor.
    *   Live Theme Selector: **Obsidian Dark** (default), **Hardwood Retro** (warm mahogany wood/gold), and **Cyberpunk Arena** (pink/lime green).

---

## 📐 Mathematical Model & Coefficients

The model fits a Logistic Regression to calculate the log-odds (\(z\)) of a shot being made:

\[z = \beta_0 + \beta_1(\text{Distance}) + \beta_2(\text{Defender Proximity}) + \beta_3(\text{Dribbles}) + \beta_4(\text{Is Catch \& Shoot}) + \beta_5(\text{Is Pull-up}) + \beta_6(\text{Is Layup/Dunk})\]

Once the linear combination is evaluated, we apply the sigmoid function:

\[P(\text{make}) = \frac{1}{1 + e^{-z}}\]

### Trained Coefficients (League Average Baseline):
*   **Intercept (\(\beta_0\))**: `-0.0033`
*   **Distance (\(\beta_1\))**: `-0.0282` (further shots reduce success)
*   **Defender Distance (\(\beta_2\))**: `0.1200` (open space increases success)
*   **Dribbles (\(\beta_3\))**: `0.0035`
*   **Is Catch & Shoot (\(\beta_4\))**: `-0.2103`
*   **Is Pull-up (\(\beta_5\))**: `-0.3599` (off-dribble tax)
*   **Is Layup/Dunk (\(\beta_6\))**: `0.5656` (rim shots boost success)

---

## 🛠️ Technology Stack

*   **Frontend**: React 19, TypeScript 6.0, Vite 8.1
*   **Styling**: Vanilla CSS (no CSS frameworks to comply with strict custom styling guidelines)
*   **Data & Modeling Engine**: Python 3.11, Pandas, Numpy, Scikit-Learn

---

## 📦 Installation & Getting Started

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **Python** (3.9+) installed on your machine.

### 2. Setup the Repository
Clone the project and navigate into the root directory:
```bash
git clone https://github.com/sweetyvincent/APEXSHOT-AI.git
cd APEXSHOT-AI
```

### 3. Install Frontend Dependencies
```bash
npm install
```

### 4. Run the Dev Server
Launch the local server:
```bash
npm run dev
```
Open **`http://localhost:5173`** (or the port specified in terminal logs) in your browser.

### 5. Data Re-Generation & Modeling (Optional)
If you wish to re-generate the spatial shot tracking database or re-train the Logistic Regression model, install the Python dependencies and run the script:
```bash
pip install -r model/requirements.txt
python model/generate_and_model.py
```
This updates `src/data/shot_data.json` and `src/data/model_coefficients.json` automatically.

### 6. Build for Production
To compile and bundle the React-TS application:
```bash
npm run build
```
The compiled static assets will be outputted to the `dist/` directory.

---

## 🚀 Sports Science & Business Impact

1.  **Contract Valuations**: Buy low on players with high average Shot Quality (xeFG%) but poor actual recent conversion, as shooting efficiency is highly mean-reverting.
2.  **Scouting & Recruitment**: Defensive contest quality (dSQA) isolates individual contest capabilities, revealing lockdown wing-stoppers or rim protectors even in bad team defensive systems.
3.  **Load Management (Injury Risk Reduction)**: Predicts training fatigue thresholds using the Acute-to-Chronic workload ratio to prevent soft-tissue tissue tear/spikes.
