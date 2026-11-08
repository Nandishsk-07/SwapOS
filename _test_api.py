"""Quick smoke test for api.py endpoints."""
import requests, json

BASE = "http://127.0.0.1:8000"

# 1. /fleet
print("=" * 50)
print("GET /fleet")
r = requests.get(f"{BASE}/fleet")
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  Batteries returned: {len(data)}")
b = data[0]
print(f"  First battery keys: {list(b.keys())}")
print(f"  Sample: id={b['battery_id']}, class={b['classification']}, "
      f"score={b['suitability_score']}, risk={b['primary_risk_factor']}")

# 2. /metrics
print("\n" + "=" * 50)
print("GET /metrics")
r = requests.get(f"{BASE}/metrics")
m = r.json()
print(f"  Status: {r.status_code}")
print(f"  Baseline: {json.dumps(m['baseline'], indent=4)}")
print(f"  Optimized: {json.dumps(m['optimized'], indent=4)}")

# 3. /verification
print("\n" + "=" * 50)
print("GET /verification")
r = requests.get(f"{BASE}/verification")
checks = r.json()
print(f"  Status: {r.status_code}")
for c in checks:
    status = "PASS" if c["passed"] else "FAIL"
    print(f"  [{status}] {c['name']} — {c['detail']}")

print("\nAll endpoints OK!")
