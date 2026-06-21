import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { RoleProvider } from './components/RoleContext'
import AppRoutes from './routes/AppRoutes'

export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <AppRoutes />
      </RoleProvider>
    </BrowserRouter>
  )
}