from flask import Flask, request, jsonify, Response
from flask_socketio import SocketIO, emit, disconnect
from prometheus_client import start_http_server, Gauge
from prometheus_client.core import REGISTRY
import prometheus_client as prom
import threading
import time

TIMEOUT = 30

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

metrics = {}
global_metric_timestamps = {}
cleanup_stop_flag = threading.Event()

connected_clients = set()

api_configs = {}

def run_prometheus():
    start_http_server(8000)

def unregister_metric(metric_index):
    try:
        if metric_index in metrics:
            metric = metrics[metric_index]
            REGISTRY.unregister(metric)
            del metrics[metric_index]
            print(f"Unregistered metric: {metric_index}")
    except Exception as e:
        print(f"Failed to unregister metric {metric_index}: {e}")

def create_or_get_metric(name, value, labels):
    metric_index = name.replace('.', '_').replace('-', '_').lower()
    
    if isinstance(value, (int, float)):
        if metric_index not in metrics:
            metrics[metric_index] = Gauge(f'oasees_{metric_index}', f'{name}', list(labels.keys()) if labels else [])
        return metrics[metric_index]
    return None

def process_json_data(data):
    labels = {}
    metric_values = {}
    metric_index = None
    
    for key, value in data.items():
        if key == "metric_index":
            metric_index = str(value)
            label_key = key.replace('.', '_').replace('-', '_').lower()
            labels[label_key] = str(value)
        elif isinstance(value, (int, float)):
            metric_key = key.replace('.', '_').replace('-', '_').lower()
            metric_values[metric_key] = value
        else:
            label_key = key.replace('.', '_').replace('-', '_').lower()
            labels[label_key] = str(value)
    
    return labels, metric_values, metric_index

def cleanup_worker():
    while not cleanup_stop_flag.is_set():
        try:
            current_time = time.time()
            timeout_seconds = TIMEOUT
            stale_metrics = []
            
            for metric_index, last_update in list(global_metric_timestamps.items()):
                if current_time - last_update > timeout_seconds:
                    stale_metrics.append(metric_index)
            
            for metric_index in stale_metrics:
                if metric_index in metrics:
                    metrics[metric_index].clear()
                    unregister_metric(metric_index)
                    print(f"Cleared stale metric: {metric_index}")
                    
                    socketio.emit('metric_removed', {
                        'metric_index': metric_index,
                        'reason': 'stale_timeout'
                    })
                    
                del global_metric_timestamps[metric_index]
                
        except Exception as e:
            print(f"Cleanup error: {e}")
        
        time.sleep(10)

# WebSocket Event Handlers
@socketio.on('connect')
def handle_connect():
    connected_clients.add(request.sid)
    print(f"Client {request.sid} connected. Total clients: {len(connected_clients)}")
    
    # Send current status to newly connected client
    emit('status_update', {
        'active_metrics': len(metrics),
        'tracked_timestamps': len(global_metric_timestamps),
        'connected_clients': len(connected_clients)
    })

@socketio.on('disconnect')
def handle_disconnect():
    connected_clients.discard(request.sid)
    print(f"Client {request.sid} disconnected. Total clients: {len(connected_clients)}")

@socketio.on('push_metric')
def handle_push_metric(data):
    try:
        metric_index = data.get('metric_index')
        if not metric_index:
            emit('error', {"message": "metric_index is required"})
            return
        source = data.get('source')
        if not source:
            emit('error', {"message": "source is required"})
            return
        
        labels, metric_values, metric_index = process_json_data(data)
        created_metrics = []
        current_time = time.time()
        
        for metric_key, value in metric_values.items():
            metric = create_or_get_metric(metric_key, value, labels)
            
            if metric:
                if labels:
                    metric.labels(**labels).set(value)
                else:
                    metric.set(value)
                created_metrics.append(f"oasees_{metric_key}")
                global_metric_timestamps[metric_key] = current_time
        
        emit('metric_pushed', {
            "status": "success",
            "metrics_created": created_metrics,
            "metric_index": metric_index
        })
        
        
        print(f"✓ Pushed {len(metric_values)} metrics via WebSocket: {metric_index}")
        
    except Exception as e:
        emit('error', {"message": f"Failed to push metric: {str(e)}"})


@socketio.on('clear_metrics')
def handle_clear_metrics():
    try:
        for metric_index, metric in metrics.items():
            metric.clear()
        global_metric_timestamps.clear()
        
        emit('metrics_cleared', {"status": "All metrics cleared"})
        socketio.emit('all_metrics_cleared', {"timestamp": time.time()})
        
    except Exception as e:
        emit('error', {"message": f"Failed to clear metrics: {str(e)}"})

@app.route("/")
def status():
    return "WebSocket Metrics Server - up"

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "websocket_enabled": True}), 200

@app.route('/metrics', methods=['GET'])
def metrics_endpoint():
    return Response(prom.generate_latest(), mimetype='text/plain')


@app.route('/remove_metric', methods=['POST'])
def remove_metric():
    """Remove a specific metric by metric_index"""
    try:
        data = request.get_json()
        metric_index = data.get('metric_index')
        
        if not metric_index:
            return jsonify({
                "status": "error",
                "message": "metric_index is required"
            }), 400
        
        if metric_index in metrics:
            unregister_metric(metric_index)
            
            # Also remove from timestamp tracking
            if metric_index in global_metric_timestamps:
                del global_metric_timestamps[metric_index]
            
            # Notify WebSocket clients
            socketio.emit('metric_removed', {
                'metric_index': metric_index,
                'reason': 'manual_removal'
            })
            
            return jsonify({
                "status": "success",
                "message": f"Metric {metric_index} removed"
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": f"Metric {metric_index} not found"
            }), 404
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500



if __name__ == '__main__':
    prom_thread = threading.Thread(target=run_prometheus, daemon=True)
    prom_thread.start()
    
    cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
    cleanup_thread.start()
    
    print("Starting WebSocket server on port 5005...")
    print("Prometheus metrics available on port 8000")
    print("Cleanup worker started")
    
    socketio.run(app, host='0.0.0.0', port=5005, debug=False,allow_unsafe_werkzeug=True)