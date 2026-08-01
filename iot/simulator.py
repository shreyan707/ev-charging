import time
import json
import random
import requests
import paho.mqtt.client as mqtt

API_BASE_URL = "http://localhost:5000/api"
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
POLL_INTERVAL = 3.0  # seconds
TARGET_ENERGY_WH = 250.0  # low threshold (250 Wh) for rapid and reliable live demo cycles

# Track active sessions local status
# sessionId -> { "energy": float, "voltage": float }
session_states = {}

def on_connect(client, userdata, flags, rc):
    if rc == 0:
      print("Connected successfully to MQTT Broker.")
    else:
      print(f"Failed to connect, return code {rc}")

def run_simulator():
    print("Initializing VoltNet IoT Charging Station Simulator...")
    
    # Setup MQTT Client
    client = mqtt.Client("VoltNetSimulator")
    client.on_connect = on_connect
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
    except Exception as e:
        print(f"CRITICAL: Failed to connect to MQTT Broker: {e}")
        print("Make sure Mosquitto container is running via Docker Compose.")
        return

    try:
        while True:
            # Poll backend for currently active charging sessions
            try:
                response = requests.get(f"{API_BASE_URL}/sessions/charging", timeout=2)
                charging_sessions = response.json()
            except Exception as err:
                print(f"Backend connection error: {err}")
                time.sleep(5)
                continue

            if not charging_sessions:
                print("Standing by... No active charging sessions.")
                # Clear completed sessions from tracking
                session_states.clear()
                time.sleep(POLL_INTERVAL)
                continue

            # Track current session IDs to clear stale ones
            active_ids = []

            for session in charging_sessions:
                session_id = session.get("sessionId")
                active_ids.append(session_id)

                # Initialize state if new
                if session_id not in session_states:
                    session_states[session_id] = {
                        "energy": float(session.get("energyConsumedWh", 0)),
                        "voltage": 230.0
                    }
                    print(f"\n[New Session Detected] Session ID: {session_id} on Station: {session.get('stationId')}")

                # Simulate telemetry variations
                state = session_states[session_id]
                
                # Voltage: fluctuates between 228V and 232V
                state["voltage"] = round(230.0 + random.uniform(-2.0, 2.0), 1)
                
                # Current: standard Level 2 charging is around 32 Amps
                current = round(32.0 + random.uniform(-0.8, 0.8), 2)
                
                # Power (Watts) = Volts * Amps
                power = round(state["voltage"] * current, 1)
                
                # Energy consumed delta in Wh: (Power * time_delta_seconds) / 3600
                energy_delta = (power * POLL_INTERVAL) / 3600.0
                state["energy"] += energy_delta
                
                # Build payload
                payload = {
                    "sessionId": session_id,
                    "current": current,
                    "voltage": state["voltage"],
                    "power": power,
                    "energyConsumedWh": round(state["energy"], 2)
                }

                # Publish payload to MQTT topic
                topic = f"voltnet/session/{session_id}/telemetry"
                client.publish(topic, json.dumps(payload))
                
                print(f"Session {session_id} -> Volts: {state['voltage']}V | Amps: {current}A | Power: {round(power/1000.0, 2)}kW | Energy: {round(state['energy'], 1)} Wh")

                # Check if energy target is reached
                if state["energy"] >= TARGET_ENERGY_WH:
                    print(f"\n[Target Reached] Session {session_id} consumed {round(state['energy'], 1)} Wh (Target: {TARGET_ENERGY_WH} Wh)")
                    print(f"Triggering session completion request to backend API...")
                    
                    try:
                        end_payload = {
                            "sessionId": session_id,
                            "energyConsumedWh": int(state["energy"])
                        }
                        end_resp = requests.post(f"{API_BASE_URL}/sessions/end", json=end_payload, timeout=5)
                        if end_resp.status_code == 200:
                            print(f"Successfully completed Session {session_id} on-chain. Response: {end_resp.json().get('message')}")
                        else:
                            print(f"Warning: Backend returned status code {end_resp.status_code}: {end_resp.text}")
                    except Exception as end_err:
                        print(f"Failed to submit endCharging API call: {end_err}")

            # Clean up local session_states for non-active sessions
            for sid in list(session_states.keys()):
                if sid not in active_ids:
                    print(f"[Session Removed] Session ID: {sid} is no longer active in the simulator.")
                    del session_states[sid]

            time.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    run_simulator()
