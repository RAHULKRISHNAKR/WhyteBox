/**
 * Data Table Component
 * 
 * Reusable table with sorting, pagination, and actions
 */

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material'
import { useState } from 'react'

export interface Column<T> {
  id: keyof T | string
  label: string
  minWidth?: number
  align?: 'left' | 'right' | 'center'
  format?: (value: any, row: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  rowsPerPageOptions?: number[]
  defaultRowsPerPage?: number
  onRowClick?: (row: T) => void
  getRowId?: (row: T, index: number) => string | number
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  rowsPerPageOptions = [10, 25, 50, 100],
  defaultRowsPerPage = 10,
  onRowClick,
  getRowId = (_row: T, index: number) => index,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage)
  const [orderBy, setOrderBy] = useState<string>('')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleSort = (columnId: string) => {
    const isAsc = orderBy === columnId && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(columnId)
  }

  const sortedData = [...data].sort((a, b) => {
    if (!orderBy) return 0

    const aValue = a[orderBy]
    const bValue = b[orderBy]

    if (aValue === bValue) return 0

    const comparison = aValue < bValue ? -1 : 1
    return order === 'asc' ? comparison : -comparison
  })

  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={String(column.id)}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleSort(String(column.id))}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow
                hover
                key={getRowId(row, index)}
                onClick={() => onRowClick?.(row)}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                }}
              >
                {columns.map((column) => {
                  const value = row[column.id as keyof T]
                  return (
                    <TableCell key={String(column.id)} align={column.align}>
                      {column.format ? column.format(value, row) : value}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={data.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  )
}

// Made with Bob
