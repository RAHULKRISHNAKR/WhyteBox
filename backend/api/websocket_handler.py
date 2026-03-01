"""
WebSocket Handler for Real-Time Updates
Provides real-time progress updates and bidirectional communication
"""

from flask_socketio import SocketIO, emit
from flask import request
import logging

logger = logging.getLogger(__name__)

# Initialize SocketIO (will be attached to Flask app in app.py)
socketio = None


def init_socketio(app):
    """Initialize SocketIO with Flask app"""
    global socketio
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",  # Allow all origins for development
        async_mode='threading',
        logger=True,
        engineio_logger=True
    )
    
    # Register event handlers
    register_handlers()
    
    logger.info("✅ WebSocket initialized")
    return socketio


def register_handlers():
    """Register WebSocket event handlers"""
    
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection"""
        logger.info(f"🔌 Client connected: {request.sid}")
        emit('status', {
            'type': 'connected',
            'message': 'Connected to WhyteBox backend',
            'timestamp': get_timestamp()
        })
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        logger.info(f"🔌 Client disconnected: {request.sid}")
    
    @socketio.on('ping')
    def handle_ping(data):
        """Handle ping from client"""
        emit('pong', {
            'type': 'pong',
            'timestamp': get_timestamp()
        })
    
    @socketio.on('subscribe')
    def handle_subscribe(data):
        """Handle subscription to specific channels"""
        channel = data.get('channel', 'default')
        logger.info(f"📡 Client {request.sid} subscribed to {channel}")
        emit('subscribed', {
            'type': 'subscribed',
            'channel': channel,
            'timestamp': get_timestamp()
        })


def send_progress(progress, message, task_id=None):
    """
    Send progress update to all connected clients
    
    Args:
        progress (int): Progress percentage (0-100)
        message (str): Progress message
        task_id (str, optional): Task identifier
    """
    if socketio:
        socketio.emit('progress', {
            'type': 'progress',
            'progress': progress,
            'message': message,
            'task_id': task_id,
            'timestamp': get_timestamp()
        })
        logger.debug(f"📊 Progress: {progress}% - {message}")


def send_result(result_type, data, task_id=None):
    """
    Send result to all connected clients
    
    Args:
        result_type (str): Type of result (e.g., 'inference', 'explainability')
        data (dict): Result data
        task_id (str, optional): Task identifier
    """
    if socketio:
        socketio.emit('result', {
            'type': 'result',
            'result_type': result_type,
            'data': data,
            'task_id': task_id,
            'timestamp': get_timestamp()
        })
        logger.info(f"✅ Result sent: {result_type}")


def send_error(error_message, error_code=None, task_id=None):
    """
    Send error to all connected clients
    
    Args:
        error_message (str): Error message
        error_code (str, optional): Error code
        task_id (str, optional): Task identifier
    """
    if socketio:
        socketio.emit('error', {
            'type': 'error',
            'message': error_message,
            'code': error_code,
            'task_id': task_id,
            'timestamp': get_timestamp()
        })
        logger.error(f"❌ Error sent: {error_message}")


def send_model_update(model_info):
    """
    Send model update to all connected clients
    
    Args:
        model_info (dict): Model information
    """
    if socketio:
        socketio.emit('model_update', {
            'type': 'model_update',
            'model': model_info,
            'timestamp': get_timestamp()
        })
        logger.info(f"🧠 Model update sent: {model_info.get('name', 'unknown')}")


def send_frame_result(frame_number, total_frames, result_data):
    """
    Send video frame processing result
    
    Args:
        frame_number (int): Current frame number
        total_frames (int): Total number of frames
        result_data (dict): Frame processing result
    """
    if socketio:
        progress = int((frame_number / total_frames) * 100)
        socketio.emit('frame_result', {
            'type': 'frame_result',
            'frame_number': frame_number,
            'total_frames': total_frames,
            'progress': progress,
            'data': result_data,
            'timestamp': get_timestamp()
        })
        logger.debug(f"🎬 Frame {frame_number}/{total_frames} processed")


def get_timestamp():
    """Get current timestamp in ISO format"""
    from datetime import datetime
    return datetime.utcnow().isoformat() + 'Z'


# Context manager for progress tracking
class ProgressTracker:
    """Context manager for tracking progress of long-running tasks"""
    
    def __init__(self, task_name, total_steps, task_id=None):
        self.task_name = task_name
        self.total_steps = total_steps
        self.task_id = task_id
        self.current_step = 0
    
    def __enter__(self):
        send_progress(0, f"Starting {self.task_name}...", self.task_id)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            send_progress(100, f"{self.task_name} completed!", self.task_id)
        else:
            send_error(f"{self.task_name} failed: {str(exc_val)}", task_id=self.task_id)
        return False
    
    def update(self, step_name):
        """Update progress"""
        self.current_step += 1
        progress = int((self.current_step / self.total_steps) * 100)
        send_progress(progress, step_name, self.task_id)
    
    def set_progress(self, progress, message):
        """Set specific progress value"""
        send_progress(progress, message, self.task_id)


# Example usage in API endpoints:
"""
from backend.api.websocket_handler import ProgressTracker, send_result

@app.route('/api/long-task', methods=['POST'])
def long_task():
    with ProgressTracker('Model Training', total_steps=5) as tracker:
        tracker.update('Loading data...')
        # ... do work ...
        
        tracker.update('Preprocessing...')
        # ... do work ...
        
        tracker.update('Training model...')
        # ... do work ...
        
        tracker.update('Evaluating...')
        # ... do work ...
        
        tracker.update('Saving results...')
        # ... do work ...
    
    send_result('training', {'accuracy': 0.95})
    return jsonify({'status': 'success'})
"""

# Made with Bob
