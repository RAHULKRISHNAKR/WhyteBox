"""
WebSocket API Endpoints

Provides WebSocket connections for real-time updates, progress tracking,
and live inference streaming.

Author: WhyteBox Team
Date: 2026-02-26
"""

import asyncio
import logging
import uuid
from typing import Optional

from app.core.websocket import (ConnectionManager, MessageType, WebSocketMessage,
                                get_connection_manager)
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    connection_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    manager: ConnectionManager = Depends(get_connection_manager),
):
    """
    Main WebSocket endpoint for real-time communication.

    Query Parameters:
        connection_id: Optional custom connection ID
        user_id: Optional user identifier

    Message Format:
        {
            "type": "message_type",
            "data": {...},
            "timestamp": "2026-02-26T09:00:00",
            "task_id": "optional_task_id"
        }

    Supported Commands:
        - ping: Health check
        - subscribe_task: Subscribe to task updates
        - unsubscribe_task: Unsubscribe from task updates
        - join_room: Join a room
        - leave_room: Leave a room
    """
    # Generate connection ID if not provided
    if not connection_id:
        connection_id = str(uuid.uuid4())

    # Connect
    await manager.connect(
        websocket, connection_id, metadata={"user_id": user_id} if user_id else {}
    )

    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            manager.stats["messages_received"] += 1

            try:
                # Parse message
                import json

                message_data = json.loads(data)
                message_type = message_data.get("type")
                message_payload = message_data.get("data", {})

                # Handle different message types
                if message_type == "ping":
                    # Respond to ping
                    await manager.send_personal_message(
                        connection_id,
                        WebSocketMessage(type=MessageType.PONG, data={"message": "pong"}),
                    )

                elif message_type == "subscribe_task":
                    # Subscribe to task updates
                    task_id = message_payload.get("task_id")
                    if task_id:
                        manager.subscribe_to_task(connection_id, task_id)
                        await manager.send_personal_message(
                            connection_id,
                            WebSocketMessage(
                                type=MessageType.INFO,
                                data={"message": f"Subscribed to task {task_id}"},
                            ),
                        )

                elif message_type == "unsubscribe_task":
                    # Unsubscribe from task updates
                    task_id = message_payload.get("task_id")
                    if task_id:
                        manager.unsubscribe_from_task(connection_id, task_id)
                        await manager.send_personal_message(
                            connection_id,
                            WebSocketMessage(
                                type=MessageType.INFO,
                                data={"message": f"Unsubscribed from task {task_id}"},
                            ),
                        )

                elif message_type == "join_room":
                    # Join a room
                    room_id = message_payload.get("room_id")
                    if room_id:
                        manager.join_room(connection_id, room_id)
                        await manager.send_personal_message(
                            connection_id,
                            WebSocketMessage(
                                type=MessageType.INFO, data={"message": f"Joined room {room_id}"}
                            ),
                        )

                elif message_type == "leave_room":
                    # Leave a room
                    room_id = message_payload.get("room_id")
                    if room_id:
                        manager.leave_room(connection_id, room_id)
                        await manager.send_personal_message(
                            connection_id,
                            WebSocketMessage(
                                type=MessageType.INFO, data={"message": f"Left room {room_id}"}
                            ),
                        )

                else:
                    # Unknown message type
                    await manager.send_personal_message(
                        connection_id,
                        WebSocketMessage(
                            type=MessageType.WARNING,
                            data={"message": f"Unknown message type: {message_type}"},
                        ),
                    )

            except json.JSONDecodeError:
                await manager.send_personal_message(
                    connection_id,
                    WebSocketMessage(
                        type=MessageType.ERROR, data={"message": "Invalid JSON format"}
                    ),
                )
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await manager.send_personal_message(
                    connection_id,
                    WebSocketMessage(
                        type=MessageType.ERROR,
                        data={"message": f"Error processing message: {str(e)}"},
                    ),
                )

    except WebSocketDisconnect:
        manager.disconnect(connection_id)
        logger.info(f"Client {connection_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for {connection_id}: {e}")
        manager.disconnect(connection_id)


@router.get("/ws/stats", tags=["websocket"])
async def get_websocket_stats(manager: ConnectionManager = Depends(get_connection_manager)):
    """
    Get WebSocket connection statistics.

    Returns:
        Connection counts, message counts, and error counts
    """
    return manager.get_stats()


@router.get("/ws/connections", tags=["websocket"])
async def get_active_connections(manager: ConnectionManager = Depends(get_connection_manager)):
    """
    Get list of active WebSocket connections.

    Returns:
        List of connection IDs and their metadata
    """
    return {
        "active_connections": list(manager.active_connections.keys()),
        "count": manager.get_connection_count(),
        "metadata": manager.connection_metadata,
    }


@router.get("/ws/rooms", tags=["websocket"])
async def get_active_rooms(manager: ConnectionManager = Depends(get_connection_manager)):
    """
    Get list of active rooms and their members.

    Returns:
        Dictionary of room IDs and member lists
    """
    return {
        "rooms": {room_id: manager.get_room_members(room_id) for room_id in manager.rooms.keys()},
        "count": manager.get_room_count(),
    }


@router.get("/ws/tasks", tags=["websocket"])
async def get_active_tasks(manager: ConnectionManager = Depends(get_connection_manager)):
    """
    Get list of active tasks and their subscribers.

    Returns:
        Dictionary of task IDs and subscriber lists
    """
    return {
        "tasks": {
            task_id: manager.get_task_subscribers(task_id)
            for task_id in manager.task_subscribers.keys()
        },
        "count": len(manager.task_subscribers),
    }


@router.post("/ws/broadcast", tags=["websocket"])
async def broadcast_message(
    message_type: str,
    message: str,
    data: Optional[dict] = None,
    manager: ConnectionManager = Depends(get_connection_manager),
):
    """
    Broadcast a message to all connected clients.

    Args:
        message_type: Type of message (info, warning, error, notification)
        message: Message text
        data: Optional additional data

    Returns:
        Success status
    """
    try:
        msg_type = MessageType(message_type)
    except ValueError:
        msg_type = MessageType.NOTIFICATION

    await manager.broadcast(
        WebSocketMessage(type=msg_type, data={"message": message, **(data or {})})
    )

    return {"status": "success", "recipients": manager.get_connection_count()}


@router.post("/ws/room/{room_id}/broadcast", tags=["websocket"])
async def broadcast_to_room(
    room_id: str,
    message_type: str,
    message: str,
    data: Optional[dict] = None,
    manager: ConnectionManager = Depends(get_connection_manager),
):
    """
    Broadcast a message to all clients in a room.

    Args:
        room_id: Room identifier
        message_type: Type of message
        message: Message text
        data: Optional additional data

    Returns:
        Success status and recipient count
    """
    try:
        msg_type = MessageType(message_type)
    except ValueError:
        msg_type = MessageType.NOTIFICATION

    await manager.broadcast_to_room(
        room_id, WebSocketMessage(type=msg_type, data={"message": message, **(data or {})})
    )

    recipients = len(manager.get_room_members(room_id))

    return {"status": "success", "room_id": room_id, "recipients": recipients}


@router.get("/ws/test", response_class=HTMLResponse, tags=["websocket"])
async def websocket_test_page():
    """
    Simple HTML page for testing WebSocket connection.

    Returns:
        HTML page with WebSocket test client
    """
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>WhyteBox WebSocket Test</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
            }
            #messages {
                border: 1px solid #ccc;
                height: 400px;
                overflow-y: scroll;
                padding: 10px;
                margin: 20px 0;
                background: #f5f5f5;
            }
            .message {
                margin: 5px 0;
                padding: 5px;
                border-radius: 3px;
            }
            .connect { background: #d4edda; }
            .disconnect { background: #f8d7da; }
            .info { background: #d1ecf1; }
            .error { background: #f8d7da; }
            .progress { background: #fff3cd; }
            input, button {
                padding: 10px;
                margin: 5px;
            }
            button {
                background: #007bff;
                color: white;
                border: none;
                cursor: pointer;
            }
            button:hover {
                background: #0056b3;
            }
        </style>
    </head>
    <body>
        <h1>WhyteBox WebSocket Test Client</h1>
        
        <div>
            <button onclick="connect()">Connect</button>
            <button onclick="disconnect()">Disconnect</button>
            <button onclick="ping()">Ping</button>
            <button onclick="clearMessages()">Clear</button>
        </div>
        
        <div>
            <input type="text" id="taskId" placeholder="Task ID">
            <button onclick="subscribeTask()">Subscribe to Task</button>
            <button onclick="unsubscribeTask()">Unsubscribe</button>
        </div>
        
        <div>
            <input type="text" id="roomId" placeholder="Room ID">
            <button onclick="joinRoom()">Join Room</button>
            <button onclick="leaveRoom()">Leave Room</button>
        </div>
        
        <div id="status">Status: Disconnected</div>
        <div id="messages"></div>
        
        <script>
            let ws = null;
            const messagesDiv = document.getElementById('messages');
            const statusDiv = document.getElementById('status');
            
            function addMessage(type, data) {
                const msg = document.createElement('div');
                msg.className = 'message ' + type;
                msg.textContent = new Date().toLocaleTimeString() + ' - ' + 
                                 type.toUpperCase() + ': ' + JSON.stringify(data);
                messagesDiv.appendChild(msg);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            
            function connect() {
                const wsUrl = 'ws://' + window.location.host + '/api/v1/ws';
                ws = new WebSocket(wsUrl);
                
                ws.onopen = () => {
                    statusDiv.textContent = 'Status: Connected';
                    statusDiv.style.color = 'green';
                    addMessage('connect', 'Connected to server');
                };
                
                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    addMessage(data.type, data.data);
                };
                
                ws.onclose = () => {
                    statusDiv.textContent = 'Status: Disconnected';
                    statusDiv.style.color = 'red';
                    addMessage('disconnect', 'Disconnected from server');
                };
                
                ws.onerror = (error) => {
                    addMessage('error', 'WebSocket error: ' + error);
                };
            }
            
            function disconnect() {
                if (ws) {
                    ws.close();
                    ws = null;
                }
            }
            
            function sendMessage(type, data) {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type, data }));
                } else {
                    addMessage('error', 'Not connected');
                }
            }
            
            function ping() {
                sendMessage('ping', {});
            }
            
            function subscribeTask() {
                const taskId = document.getElementById('taskId').value;
                if (taskId) {
                    sendMessage('subscribe_task', { task_id: taskId });
                }
            }
            
            function unsubscribeTask() {
                const taskId = document.getElementById('taskId').value;
                if (taskId) {
                    sendMessage('unsubscribe_task', { task_id: taskId });
                }
            }
            
            function joinRoom() {
                const roomId = document.getElementById('roomId').value;
                if (roomId) {
                    sendMessage('join_room', { room_id: roomId });
                }
            }
            
            function leaveRoom() {
                const roomId = document.getElementById('roomId').value;
                if (roomId) {
                    sendMessage('leave_room', { room_id: roomId });
                }
            }
            
            function clearMessages() {
                messagesDiv.innerHTML = '';
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


# Made with Bob
