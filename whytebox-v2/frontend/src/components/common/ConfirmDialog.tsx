/**
 * Confirm Dialog Component
 * 
 * Reusable confirmation dialog
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  severity?: 'info' | 'warning' | 'error'
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  severity = 'info',
}: ConfirmDialogProps) {
  const getConfirmColor = () => {
    switch (severity) {
      case 'error':
        return 'error'
      case 'warning':
        return 'warning'
      default:
        return 'primary'
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} color={getConfirmColor()} variant="contained" autoFocus>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// Made with Bob
