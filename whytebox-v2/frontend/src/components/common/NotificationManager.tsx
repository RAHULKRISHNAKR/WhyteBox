/**
 * Notification Manager Component
 * 
 * Displays notifications from Redux store
 */

import { useEffect } from 'react'
import { Snackbar, Alert } from '@mui/material'
import { useAppSelector, useAppDispatch } from '@/store'
import { removeNotification } from '@/store/slices/uiSlice'

export default function NotificationManager() {
  const dispatch = useAppDispatch()
  const notifications = useAppSelector((state) => state.ui.notifications)

  useEffect(() => {
    // Auto-remove notifications after their duration
    notifications.forEach((notification) => {
      if (notification.duration) {
        const timer = setTimeout(() => {
          dispatch(removeNotification(notification.id))
        }, notification.duration)

        return () => clearTimeout(timer)
      }
    })
  }, [notifications, dispatch])

  return (
    <>
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          style={{ top: `${80 + index * 70}px` }}
        >
          <Alert
            severity={notification.type}
            onClose={() => dispatch(removeNotification(notification.id))}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  )
}

// Made with Bob
