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
import TnTendersAct from '../pages/TnTendersAct'
import TendersStatus from '../pages/TenderStatusPage'
import ArchiveTenderPage from '../pages/ArchiveTenderPage'
import ReportsFeedbacks from '../pages/ReportsFeedbacks'
import Downloads from '../pages/Downloads'
import CancelledRetendered from '../pages/CancelledRetendered'
import ApplyTenders    from '../pages/ApplyTenders'
import ApplyTenderForm from '../pages/ApplyTenderForm'
import TenderByDepartment from '../pages/TenderByDepartment'
import YourTenders from '../pages/YourTenders'
import DebarmentList from '../pages/DebarmentList'
import TenderCumAuction from '../pages/TenderCumAuction'
import Announcements from '../pages/Announcements'
import Applications           from '../pages/Applications'
import ApplicationApplicants  from '../pages/ApplicationApplicants'
import ApplicantDetails       from '../pages/ApplicantDetails'
import ApprovedApplicants     from '../pages/ApprovedApplicants'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tn-tenders-act"        element={<TnTendersAct />} />
        <Route path="/tenders-by-location" element={<TendersByLocation />} />
        <Route path="/tender-status" element={<TendersStatus />} />
        <Route path="/archive" element={<ArchiveTenderPage />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="*" element={<Placeholder />} />
        <Route path="/reports" element={<ReportsFeedbacks />} />
        <Route path="/cancelled" element={<CancelledRetendered />} />
        <Route path="/tenders-by-org" element={<TendersByOrganization />} />
        <Route path="/create-saved-tenders" element={<CreateSavedTenders />} />
        <Route path="/create-tender"        element={<CreateTender />} />
        <Route path="/tender-view"        element={<TenderView />} />
        <Route path="/apply-tenders"         element={<ApplyTenders />} />
        <Route path="/apply-tenders/apply" element={<ApplyTenderForm />} />
        <Route path="/tenders-by-dept" element={<TenderByDepartment />} />
        <Route path="/your-tenders" element={<YourTenders />} />
        <Route path="/debarment" element={<DebarmentList />} />
        <Route path="/auction" element={<TenderCumAuction />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/applications"                    element={<Applications />} />
        <Route path="/applications/:tenderId"          element={<ApplicationApplicants />} />
        <Route path="/applications/:tenderId/approved" element={<ApprovedApplicants />} />
        <Route path="/Applicant/:applicationId"        element={<ApplicantDetails />} />
      </Route>
    </Routes>
  )
}