# Battery Health Assessment & Dynamic Allocation Engine (SwapOS)

An intelligent, safety-critical battery assessment and dynamic allocation system designed for Electric Vehicle (EV) battery swapping stations.

The platform classifies battery fleet health, calculates multi-criteria suitability scores, and uses global combinatorial optimization (Hungarian Algorithm) to dynamically match incoming EV demand with optimal battery packs while guaranteeing zero unsafe allocations.

---

## 🌟 Key Features

1. **Rule-Based Safety Classifier (`classifier.py`)**:
   - Classifies battery packs into three states: `Safe and Available`, `Degraded but Usable`, and `Unsafe/Quarantine`.
   - Generates transparent, explainable **risk factors** (e.g., thermal runaway risk, cell imbalance, high internal resistance, deep degradation).

2. **Multi-Criteria Suitability Scoring (`scorer.py`)**:
   - Computes a normalized 0–100 suitability score balancing State of Health (SoH), State of Charge (SoC), Internal Resistance, Cycle Count, and Cell Imbalance.

3. **Global Combinatorial Optimization (`allocator.py`)**:
   - Employs the **Hungarian Algorithm** (`scipy.optimize.linear_sum_assignment`) for global cost minimization.
   - Embeds priority-based unserved penalties (`Critical`, `High`, `Medium`, `Low`) directly into the cost matrix, outperforming standard greedy heuristics under scarce battery conditions.

4. **Guaranteed Safety Constraint Verification (`metrics.py`)**:
   - Verifies 0% unsafe allocations, strict minimum SoC fulfillment, and 1-to-1 uniqueness constraints.

5. **Full-Stack SwapOS Dashboard (`api.py` + `frontend/`)**:
   - **Backend**: FastAPI web server with REST endpoints and WebSocket channels (`/live`, `/simulate`) for real-time telemetry streaming.
   - **Frontend**: Modern React + Vite + Tailwind CSS + Recharts dashboard with interactive fleet gauges, priority queues, and live allocation feeds.

---

## 📁 Project Structure

```
battery_project/
├── api.py                 # FastAPI backend (REST & WebSocket streams)
├── main.py                # End-to-end CLI pipeline (loads data, runs optimizer, saves outputs)
├── config.py              # Centralized configuration (thresholds, weights, penalties)
├── classifier.py          # Battery health classification & risk factor deduction
├── scorer.py              # Multi-criteria suitability scoring engine
├── allocator.py           # Hungarian Algorithm global optimizer
├── baseline.py            # Highest-SoC-First baseline allocation for comparison
├── metrics.py             # Performance evaluation & safety constraint checkers
├── simulator.py           # Real-time event replay and telemetry streamer
├── visualize.py           # Automated chart generator (PNG outputs)
├── summary.py             # Summary report generator
├── stress_test.py         # Optimizer vs Greedy stress test under battery scarcity
├── data_generator.py      # Synthetic fleet & vehicle demand generator
├── requirements.txt       # Python dependencies
├── data/                  # Input datasets (CSV format)
├── outputs/               # Generated reports, metrics comparison, and plots
└── frontend/              # SwapOS React + Vite + Tailwind CSS console
    ├── src/               # React components, hooks, and styles
    ├── package.json       # Frontend dependencies and scripts
    └── vite.config.js     # Vite configuration
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites

- **Python**: 3.10 or newer
- **Node.js**: v18+ and `npm`

---

### 2. Standalone Data Pipeline (CLI)

Run the entire pipeline (classification → scoring → allocation → baseline comparison → verification → chart generation):

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Run the end-to-end pipeline
python main.py
```

Generated charts and CSV files will be saved in the [`outputs/`](outputs/) folder:
- `1_suitability_distribution.png`
- `2_allocation_by_priority.png`
- `3_method_vs_baseline.png`
- `4_unsafe_batteries.png`
- `5_risk_factor_breakdown.png`
- `metrics_comparison.csv`
- `final_submission_table.csv`
- `one_page_summary.md`

---

### 3. Interactive Web Dashboard (SwapOS)

To run the full-stack web application:

#### **Terminal 1: Start FastAPI Backend**
```bash
uvicorn api:app --reload --port 8000
```
*API docs available at: [http://localhost:8000/docs](http://localhost:8000/docs)*

#### **Terminal 2: Start Vite React Frontend**
```bash
cd frontend
npm install
npm run dev
```
*Dashboard will open at: [http://localhost:5173](http://localhost:5173)*

---

## 📊 Performance Comparison

| Metric | Our Optimization Method | Highest-SoC Baseline | Improvement |
| :--- | :---: | :---: | :---: |
| **High/Critical Priority Served** | **100%** | 100% | Maintained |
| **Unsafe Allocations** | **0 (0%)** | 0 (0%) | 100% Safe |
| **Average Allocated SoH** | **91.3%** | 80.3% | **+11.0%** |
| **Average Suitability Score** | **77.0 / 100** | 63.6 / 100 | **+13.4 pts** |

---

## 🧪 Additional Tools

- **Run Scarcity Stress Test**:
  ```bash
  python stress_test.py
  ```
- **Generate Fresh Practice Data**:
  ```bash
  python data_generator.py
  ```

---

## 🛡️ License

This project is licensed under the MIT License.
