import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import TendersByLocation from '../pages/TenderByLocation'
import Home from '../pages/Home'
import Dashboard from '../pages/Dashboard'
import Placeholder from '../pages/Placeholder'
import TendersByOrganization from '../pages/TenderByOrganization'
import CreateSavedTenders from '../pages/CreateSavedTenders'
import CreateTender from '../pages/CreateTender'
import TenderView from '../pages/TenderView'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tenders-by-location" element={<TendersByLocation />} />
        <Route path="*" element={<Placeholder />} />
        <Route path="/tenders-by-org" element={<TendersByOrganization />} />
        <Route path="/create-saved-tenders" element={<CreateSavedTenders />} />
        <Route path="/create-tender"        element={<CreateTender />} />
        <Route path="/tender-view"        element={<TenderView />} />
      </Route>
    </Routes>
  )
}