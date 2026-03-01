"""
WebSocket Manager for WhyteBox Platform

Provides real-time communication for progress tracking, live updates,
and streaming inference results.

Author: WhyteBox Team
Date: 2026-02-26
"""

import asyncio
import json
import logging
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class MessageType(str, Enum):
    """WebSocket message types"""

    # Connection
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    PING = "ping"
    PONG = "pong"

    # Progress tracking
    PROGRESS = "progress"
    STATUS = "status"

    # Inference
    INFERENCE_START = "inference_start"
    INFERENCE_PROGRESS = "inference_progress"
    INFERENCE_COMPLETE = "inference_complete"
    INFERENCE_ERROR = "inference_error"

    # Explainability
    EXPLAIN_START = "explain_start"
    EXPLAIN_PROGRESS = "explain_progress"
    EXPLAIN_COMPLETE = "explain_complete"
    EXPLAIN_ERROR = "explain_error"

    # Model operations
    MODEL_UPLOAD_PROGRESS = "model_upload_progress"
    MODEL_LOAD_PROGRESS = "model_load_progress"
    MODEL_READY = "model_ready"

    # Notifications
    NOTIFICATION = "notification"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class WebSocketMessage(BaseModel):
    """WebSocket message structure"""

    type: MessageType
    data: Dict[str, Any]
    timestamp: str = None
    task_id: Optional[str] = None

    def __init__(self, **data):
        if "timestamp" not in data:
            data["timestamp"] = datetime.utcnow().isoformat()
        super().__init__(**data)

    def to_json(self) -> str:
        """Convert message to JSON string"""
        return self.model_dump_json()


class ConnectionManager:
    """
    Manage WebSocket connections and message broadcasting.

    Features:
    - Connection lifecycle management
    - Room-based broadcasting
    - Task-specific channels
    - Connection tracking
    - Automatic cleanup
    """

    def __init__(self):
        # Active connections: {connection_id: websocket}
        self.active_connections: Dict[str, WebSocket] = {}

        # Room subscriptions: {room_id: {connection_id}}
        self.rooms: Dict[str, Set[str]] = {}

        # Task subscriptions: {task_id: {connection_id}}
        self.task_subscribers: Dict[str, Set[str]] = {}

        # Connection metadata: {connection_id: metadata}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}

        # Statistics
        self.stats = {
            "total_connections": 0,
            "messages_sent": 0,
            "messages_received": 0,
            "errors": 0,
        }

    async def connect(
        self, websocket: WebSocket, connection_id: str, metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Accept and register a new WebSocket connection.

        Args:
            websocket: WebSocket instance
            connection_id: Unique connection identifier
            metadata: Optional connection metadata (user_id, etc.)
        """
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        self.connection_metadata[connection_id] = metadata or {}
        self.stats["total_connections"] += 1

        logger.info(f"WebSocket connected: {connection_id}")

        # Send connection confirmation
        await self.send_personal_message(
            connection_id,
            WebSocketMessage(
                type=MessageType.CONNECT,
                data={"connection_id": connection_id, "message": "Connected successfully"},
            ),
        )

    def disconnect(self, connection_id: str):
        """
        Remove connection and clean up subscriptions.

        Args:
            connection_id: Connection identifier to remove
        """
        # Remove from active connections
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

        # Remove from all rooms
        for room_id in list(self.rooms.keys()):
            if connection_id in self.rooms[room_id]:
                self.rooms[room_id].remove(connection_id)
                if not self.rooms[room_id]:
                    del self.rooms[room_id]

        # Remove from task subscriptions
        for task_id in list(self.task_subscribers.keys()):
            if connection_id in self.task_subscribers[task_id]:
                self.task_subscribers[task_id].remove(connection_id)
                if not self.task_subscribers[task_id]:
                    del self.task_subscribers[task_id]

        # Remove metadata
        if connection_id in self.connection_metadata:
            del self.connection_metadata[connection_id]

        logger.info(f"WebSocket disconnected: {connection_id}")

    async def send_personal_message(self, connection_id: str, message: WebSocketMessage):
        """
        Send message to specific connection.

        Args:
            connection_id: Target connection
            message: Message to send
        """
        if connection_id in self.active_connections:
            try:
                websocket = self.active_connections[connection_id]
                await websocket.send_text(message.to_json())
                self.stats["messages_sent"] += 1
            except Exception as e:
                logger.error(f"Error sending to {connection_id}: {e}")
                self.stats["errors"] += 1
                self.disconnect(connection_id)

    async def broadcast(self, message: WebSocketMessage):
        """
        Broadcast message to all active connections.

        Args:
            message: Message to broadcast
        """
        disconnected = []
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(message.to_json())
                self.stats["messages_sent"] += 1
            except Exception as e:
                logger.error(f"Error broadcasting to {connection_id}: {e}")
                self.stats["errors"] += 1
                disconnected.append(connection_id)

        # Clean up disconnected clients
        for connection_id in disconnected:
            self.disconnect(connection_id)

    async def broadcast_to_room(self, room_id: str, message: WebSocketMessage):
        """
        Broadcast message to all connections in a room.

        Args:
            room_id: Room identifier
            message: Message to broadcast
        """
        if room_id not in self.rooms:
            return

        disconnected = []
        for connection_id in self.rooms[room_id]:
            if connection_id in self.active_connections:
                try:
                    websocket = self.active_connections[connection_id]
                    await websocket.send_text(message.to_json())
                    self.stats["messages_sent"] += 1
                except Exception as e:
                    logger.error(f"Error sending to {connection_id}: {e}")
                    self.stats["errors"] += 1
                    disconnected.append(connection_id)

        # Clean up disconnected clients
        for connection_id in disconnected:
            self.disconnect(connection_id)

    async def send_to_task_subscribers(self, task_id: str, message: WebSocketMessage):
        """
        Send message to all subscribers of a task.

        Args:
            task_id: Task identifier
            message: Message to send
        """
        if task_id not in self.task_subscribers:
            return

        message.task_id = task_id
        disconnected = []

        for connection_id in self.task_subscribers[task_id]:
            if connection_id in self.active_connections:
                try:
                    websocket = self.active_connections[connection_id]
                    await websocket.send_text(message.to_json())
                    self.stats["messages_sent"] += 1
                except Exception as e:
                    logger.error(f"Error sending to {connection_id}: {e}")
                    self.stats["errors"] += 1
                    disconnected.append(connection_id)

        # Clean up disconnected clients
        for connection_id in disconnected:
            self.disconnect(connection_id)

    def join_room(self, connection_id: str, room_id: str):
        """
        Add connection to a room.

        Args:
            connection_id: Connection to add
            room_id: Room to join
        """
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        self.rooms[room_id].add(connection_id)
        logger.debug(f"Connection {connection_id} joined room {room_id}")

    def leave_room(self, connection_id: str, room_id: str):
        """
        Remove connection from a room.

        Args:
            connection_id: Connection to remove
            room_id: Room to leave
        """
        if room_id in self.rooms and connection_id in self.rooms[room_id]:
            self.rooms[room_id].remove(connection_id)
            if not self.rooms[room_id]:
                del self.rooms[room_id]
            logger.debug(f"Connection {connection_id} left room {room_id}")

    def subscribe_to_task(self, connection_id: str, task_id: str):
        """
        Subscribe connection to task updates.

        Args:
            connection_id: Connection to subscribe
            task_id: Task to subscribe to
        """
        if task_id not in self.task_subscribers:
            self.task_subscribers[task_id] = set()
        self.task_subscribers[task_id].add(connection_id)
        logger.debug(f"Connection {connection_id} subscribed to task {task_id}")

    def unsubscribe_from_task(self, connection_id: str, task_id: str):
        """
        Unsubscribe connection from task updates.

        Args:
            connection_id: Connection to unsubscribe
            task_id: Task to unsubscribe from
        """
        if task_id in self.task_subscribers:
            if connection_id in self.task_subscribers[task_id]:
                self.task_subscribers[task_id].remove(connection_id)
                if not self.task_subscribers[task_id]:
                    del self.task_subscribers[task_id]
                logger.debug(f"Connection {connection_id} unsubscribed from task {task_id}")

    def get_connection_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)

    def get_room_count(self) -> int:
        """Get number of active rooms"""
        return len(self.rooms)

    def get_room_members(self, room_id: str) -> List[str]:
        """Get list of connection IDs in a room"""
        return list(self.rooms.get(room_id, set()))

    def get_task_subscribers(self, task_id: str) -> List[str]:
        """Get list of connection IDs subscribed to a task"""
        return list(self.task_subscribers.get(task_id, set()))

    def get_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            **self.stats,
            "active_connections": len(self.active_connections),
            "active_rooms": len(self.rooms),
            "active_tasks": len(self.task_subscribers),
        }


class ProgressTracker:
    """
    Track and broadcast progress for long-running tasks.

    Features:
    - Progress percentage tracking
    - Stage-based progress
    - ETA calculation
    - Automatic broadcasting
    """

    def __init__(self, task_id: str, connection_manager: ConnectionManager, total_steps: int = 100):
        self.task_id = task_id
        self.manager = connection_manager
        self.total_steps = total_steps
        self.current_step = 0
        self.start_time = datetime.utcnow()
        self.current_stage = "initializing"
        self.status = "running"

    async def update(
        self,
        step: Optional[int] = None,
        stage: Optional[str] = None,
        message: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
    ):
        """
        Update progress and broadcast to subscribers.

        Args:
            step: Current step number (increments if None)
            stage: Current stage name
            message: Progress message
            data: Additional data to include
        """
        if step is not None:
            self.current_step = step
        else:
            self.current_step += 1

        if stage:
            self.current_stage = stage

        progress_percent = (self.current_step / self.total_steps) * 100
        elapsed = (datetime.utcnow() - self.start_time).total_seconds()

        # Calculate ETA
        if self.current_step > 0:
            time_per_step = elapsed / self.current_step
            remaining_steps = self.total_steps - self.current_step
            eta_seconds = time_per_step * remaining_steps
        else:
            eta_seconds = 0

        progress_data = {
            "task_id": self.task_id,
            "progress": round(progress_percent, 2),
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "stage": self.current_stage,
            "status": self.status,
            "elapsed_seconds": round(elapsed, 2),
            "eta_seconds": round(eta_seconds, 2),
            **(data or {}),
        }

        if message:
            progress_data["message"] = message

        await self.manager.send_to_task_subscribers(
            self.task_id,
            WebSocketMessage(type=MessageType.PROGRESS, data=progress_data, task_id=self.task_id),
        )

    async def complete(self, message: str = "Task completed", data: Optional[Dict] = None):
        """Mark task as complete and notify subscribers"""
        self.status = "completed"
        self.current_step = self.total_steps

        await self.manager.send_to_task_subscribers(
            self.task_id,
            WebSocketMessage(
                type=MessageType.STATUS,
                data={
                    "task_id": self.task_id,
                    "status": "completed",
                    "message": message,
                    "progress": 100,
                    **(data or {}),
                },
                task_id=self.task_id,
            ),
        )

    async def error(self, message: str, error_details: Optional[Dict] = None):
        """Mark task as failed and notify subscribers"""
        self.status = "failed"

        await self.manager.send_to_task_subscribers(
            self.task_id,
            WebSocketMessage(
                type=MessageType.ERROR,
                data={
                    "task_id": self.task_id,
                    "status": "failed",
                    "message": message,
                    "error": error_details or {},
                },
                task_id=self.task_id,
            ),
        )


# Global connection manager instance
connection_manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    """Dependency to get connection manager"""
    return connection_manager


# Made with Bob
