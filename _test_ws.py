"""Minimal WS test."""
import asyncio, json, websockets

async def main():
    ws = await websockets.connect("ws://127.0.0.1:8000/live")
    for i in range(3):
        raw = await ws.recv()
        msg = json.loads(raw)
        vid = msg.get("vehicle", {}).get("vehicle_id", "?")
        bid = msg.get("battery", {})
        bid = bid.get("battery_id") if bid else "UNSERVED"
        print(f"  [{i}] {msg['event']}: vehicle={vid} -> battery={bid} ({msg.get('status','')})")
    await ws.close()
    print("OK")

asyncio.run(main())
