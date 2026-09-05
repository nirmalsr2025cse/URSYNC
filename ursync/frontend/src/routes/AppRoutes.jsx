import React from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { signupRequest, loginRequest } from '../api/authApi'
import Login from '../pages/Login'
import Signup from '../pages/SignUP'
import Layout from '../components/Layout'
import PublicRoute from './PublicRoute'
import RoleRoute from './RoleRoute'
import { ROLES, useRole } from '../components/RoleContext'
import NotFound from '../pages/NotFound'

import TendersByLocation from '../pages/TenderByLocation'
import Home from '../pages/Home'
import Dashboard from '../pages/Dashboard'
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
import ApplyTenders from '../pages/ApplyTenders'
import ApplyTenderForm from '../pages/ApplyTenderForm'
import TenderByDepartment from '../pages/TenderByDepartment'
import YourTenders from '../pages/YourTenders'
import DebarmentList from '../pages/DebarmentList'
import TenderCumAuction from '../pages/TenderCumAuction'
import Announcements from '../pages/Announcements'
import Applications from '../pages/Applications'
import ApplicationApplicants from '../pages/ApplicationApplicants'
import ApplicantDetails from '../pages/ApplicantDetails'
import ApprovedApplicants from '../pages/ApprovedApplicants'
import BidderList from '../pages/BidderList'
import BidderDetails from '../pages/BidderDetails'
import TenderByClassification from '../pages/TenderByClassification'
import TenderDetailsView from '../pages/TenderDetailsView'
import Approvement from '../pages/Approvement'
import Pending from '../pages/Pending'
import FinalBidder from '../pages/FinalBidder'
import TenderRegistrationPayment from '../pages/TenderRegistrationPayment'
import ChoosePaymentPlatform from '../pages/ChoosePaymentPlatform'
import TenderFinancialChangeDetailsPage from '../pages/TenderFinancialChangeDetailsPage'
import TenderFinancialReviewPage from '../pages/TenderFinancialReviewPage'
import TenderFinancialChangesPage from '../pages/TenderFinancialChangesPage'
import Conflicts from '../pages/Conflicts'
import ConflictDetails from '../pages/ConflictDetails'
import SearchResourcePage from '../pages/Searchresourcepage'
import ResourceSharing from '../pages/ResourceSharing'
import GetResourcePage from '../pages/GetResourcePage'
import ResourceDetailPage from '../pages/ResourceDetailPage'
import AppliedTenders from '../pages/AppliedTenders'
import Approved from '../pages/Approved'
import AddResources from '../pages/AddResources'
import AppliedResourcesPage from '../pages/AppliedResourcesPage'

function FinancialChangesDispatcher() {
  const { role } = useRole()
  if (role === ROLES.DEPARTMENT_HEAD) {
    return <TenderFinancialReviewPage />
  }
  if (role === ROLES.FINANCIAL) {
    return <TenderFinancialChangesPage />
  }
  return <NotFound />
}

const ALL_ROLES = Object.values(ROLES)

export default function AppRoutes() {
  const navigate = useNavigate()
  const { refreshUser } = useRole()

  async function handleSignup(formValues) {
    const { token, user } = await signupRequest(formValues)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    await refreshUser()
    navigate('/home')
  }

  async function handleLogin(formValues) {
    const { token, user } = await loginRequest({
      email: formValues.identifier,
      password: formValues.password,
    })
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    await refreshUser()
    navigate('/home')
  }

  return (
    <Routes>
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup onSubmit={handleSignup} onGoToLogin={() => navigate('/login')} />
          </PublicRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login onSubmit={handleLogin} />
          </PublicRoute>
        }
      />

      <Route element={<Layout />}>
        <Route index element={<Navigate to="/home" replace />} />
        
        {/* Universal Routes (Accessible to all authenticated roles) */}
        <Route path="/home" element={<RoleRoute allowedRoles={ALL_ROLES}><Home /></RoleRoute>} />
        <Route path="/cancelled" element={<RoleRoute allowedRoles={ALL_ROLES}><CancelledRetendered /></RoleRoute>} />
        <Route path="/tender-view/:id" element={<RoleRoute allowedRoles={ALL_ROLES}><TenderView /></RoleRoute>} />
        <Route path="/tender-details-view/:id" element={<RoleRoute allowedRoles={ALL_ROLES}><TenderDetailsView /></RoleRoute>} />

        {/* Public-specific Routes */}
        <Route path="/tn-tenders-act" element={<RoleRoute allowedRoles={[ROLES.PUBLIC]}><TnTendersAct /></RoleRoute>} />
        <Route path="/downloads" element={<RoleRoute allowedRoles={[ROLES.PUBLIC]}><Downloads /></RoleRoute>} />
        <Route path="/debarment" element={<RoleRoute allowedRoles={[ROLES.PUBLIC]}><DebarmentList /></RoleRoute>} />
        <Route path="/announcements" element={<RoleRoute allowedRoles={[ROLES.PUBLIC]}><Announcements /></RoleRoute>} />
        <Route path="/tenders-by-class" element={<RoleRoute allowedRoles={[ROLES.PUBLIC]}><TenderByClassification /></RoleRoute>} />

        {/* Dashboard & Status */}
        <Route
          path="/dashboard/tender-analysis"
          element={
            <RoleRoute allowedRoles={[ROLES.PUBLIC, ROLES.DEPARTMENT_EMPLOYEE, ROLES.DEPARTMENT_HEAD, ROLES.ADMINISTRATOR]}>
              <Dashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/tender-status"
          element={
            <RoleRoute allowedRoles={[ROLES.PUBLIC, ROLES.DEPARTMENT_EMPLOYEE, ROLES.DEPARTMENT_HEAD, ROLES.ADMINISTRATOR]}>
              <TendersStatus />
            </RoleRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleRoute allowedRoles={[ROLES.DEPARTMENT_EMPLOYEE, ROLES.DEPARTMENT_HEAD, ROLES.ADMINISTRATOR]}>
              <ReportsFeedbacks />
            </RoleRoute>
          }
        />

        {/* Public & Tender Person shared exploration */}
        <Route path="/tenders-by-location" element={<RoleRoute allowedRoles={[ROLES.PUBLIC, ROLES.TENDER_PERSON]}><TendersByLocation /></RoleRoute>} />
        <Route path="/tenders-by-org" element={<RoleRoute allowedRoles={[ROLES.PUBLIC, ROLES.TENDER_PERSON]}><TendersByOrganization /></RoleRoute>} />
        <Route path="/archive" element={<RoleRoute allowedRoles={[ROLES.PUBLIC, ROLES.TENDER_PERSON]}><ArchiveTenderPage /></RoleRoute>} />
        <Route path="/auction" element={<RoleRoute allowedRoles={[ROLES.PUBLIC, ROLES.TENDER_PERSON]}><TenderCumAuction /></RoleRoute>} />

        {/* Department Employee & Department Head */}
        <Route path="/create-saved-tenders" element={<RoleRoute allowedRoles={[ROLES.DEPARTMENT_EMPLOYEE, ROLES.DEPARTMENT_HEAD]}><CreateSavedTenders /></RoleRoute>} />
        <Route path="/create-tender" element={<RoleRoute allowedRoles={[ROLES.DEPARTMENT_EMPLOYEE, ROLES.DEPARTMENT_HEAD]}><CreateTender /></RoleRoute>} />
        <Route path="/create-tender/:id" element={<RoleRoute allowedRoles={[ROLES.DEPARTMENT_EMPLOYEE, ROLES.DEPARTMENT_HEAD]}><CreateTender /></RoleRoute>} />

        {/* Approved Bidders List (Internal roles) */}
        <Route
          path="/approved"
          element={
            <RoleRoute allowedRoles={[ROLES.DEPARTMENT_EMPLOYEE, ROLES.DEPARTMENT_HEAD, ROLES.ADMINISTRATOR, ROLES.FINANCIAL, ROLES.TENDER_AUTHORITY]}>
              <Approved />
            </RoleRoute>
          }
        />

        {/* Department Head & Administrator */}
        <Route path="/conflicts" element={<RoleRoute allowedRoles={[ROLES.DEPARTMENT_HEAD, ROLES.ADMINISTRATOR]}><Conflicts /></RoleRoute>} />
        <Route path="/conflicts/:id" element={<RoleRoute allowedRoles={[ROLES.DEPARTMENT_HEAD, ROLES.ADMINISTRATOR]}><ConflictDetails /></RoleRoute>} />
        <Route path="/approvement" element={<RoleRoute allowedRoles={[ROLES.DEPARTMENT_HEAD, ROLES.ADMINISTRATOR]}><Approvement /></RoleRoute>} />

        {/* Department Head Only */}
        <Route path="/resource-sharing" element={<RoleRoute allowedRoles={[ROLES.DEPARTMENT_HEAD]}><ResourceSharing /></RoleRoute>} />
        <Route path="/add-resources" element={<RoleRoute allowedRoles={[ROLES.DEPARTMENT_HEAD]}><AddResources /></RoleRoute>} />

        {/* Financial & Tender Authority shared */}
        <Route path="/pending" element={<RoleRoute allowedRoles={[ROLES.FINANCIAL, ROLES.TENDER_AUTHORITY]}><Pending /></RoleRoute>} />

        {/* Department Head & Financial - Tender Financial Changes Dispatcher */}
        <Route
          path="/review-financial-changes"
          element={
            <RoleRoute allowedRoles={[ROLES.FINANCIAL, ROLES.DEPARTMENT_HEAD]}>
              <FinancialChangesDispatcher />
            </RoleRoute>
          }
        />
        <Route
          path="/financial-changes"
          element={
            <RoleRoute allowedRoles={[ROLES.FINANCIAL, ROLES.DEPARTMENT_HEAD]}>
              <FinancialChangesDispatcher />
            </RoleRoute>
          }
        />
        <Route
          path="/review-financial-changes/details"
          element={
            <RoleRoute allowedRoles={[ROLES.FINANCIAL, ROLES.DEPARTMENT_HEAD]}>
              <TenderFinancialChangeDetailsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/financial-changes/details"
          element={
            <RoleRoute allowedRoles={[ROLES.FINANCIAL, ROLES.DEPARTMENT_HEAD]}>
              <TenderFinancialChangeDetailsPage />
            </RoleRoute>
          }
        />

        {/* Tender Authority Only */}
        <Route path="/applications" element={<RoleRoute allowedRoles={[ROLES.TENDER_AUTHORITY]}><Applications /></RoleRoute>} />
        <Route path="/applications/:tenderId" element={<RoleRoute allowedRoles={[ROLES.TENDER_AUTHORITY]}><ApplicationApplicants /></RoleRoute>} />
        <Route path="/Applicant/:applicationId" element={<RoleRoute allowedRoles={[ROLES.TENDER_AUTHORITY]}><ApplicantDetails /></RoleRoute>} />
        <Route path="/applications/:tenderId/approved" element={<RoleRoute allowedRoles={[ROLES.TENDER_AUTHORITY]}><ApprovedApplicants /></RoleRoute>} />
        <Route path="/bidder-selection/:tenderId" element={<RoleRoute allowedRoles={[ROLES.TENDER_AUTHORITY]}><BidderList /></RoleRoute>} />
        <Route path="/Bidder/:tenderCode/:applicationId" element={<RoleRoute allowedRoles={[ROLES.TENDER_AUTHORITY]}><BidderDetails /></RoleRoute>} />
        <Route path="/finalbidder/:tenderCode" element={<RoleRoute allowedRoles={[ROLES.TENDER_AUTHORITY]}><FinalBidder /></RoleRoute>} />

        {/* Tender Person (Bidder) Only */}
        <Route path="/apply-tenders" element={<RoleRoute allowedRoles={[ROLES.TENDER_PERSON]}><ApplyTenders /></RoleRoute>} />
        <Route path="/apply-tenders/apply/:tenderCode?" element={<RoleRoute allowedRoles={[ROLES.TENDER_PERSON]}><ApplyTenderForm /></RoleRoute>} />
        <Route path="/apply-tenders/payment/:appId" element={<RoleRoute allowedRoles={[ROLES.TENDER_PERSON]}><TenderRegistrationPayment /></RoleRoute>} />
        <Route path="/apply-tenders/payment/choose-platform/:appId" element={<RoleRoute allowedRoles={[ROLES.TENDER_PERSON]}><ChoosePaymentPlatform /></RoleRoute>} />
        <Route path="/applied-tenders" element={<RoleRoute allowedRoles={[ROLES.TENDER_PERSON]}><AppliedTenders /></RoleRoute>} />
        <Route path="/tenders-by-dept" element={<RoleRoute allowedRoles={[ROLES.TENDER_PERSON]}><TenderByDepartment /></RoleRoute>} />
        <Route path="/your-tenders" element={<RoleRoute allowedRoles={[ROLES.TENDER_PERSON]}><YourTenders /></RoleRoute>} />
        <Route path="/search-resource" element={<RoleRoute allowedRoles={[ROLES.TENDER_PERSON]}><SearchResourcePage /></RoleRoute>} />
        <Route path="/search-resource/get-resource" element={<RoleRoute allowedRoles={[ROLES.TENDER_PERSON]}><GetResourcePage /></RoleRoute>} />
        <Route path="/search-resource/details" element={<RoleRoute allowedRoles={[ROLES.TENDER_PERSON]}><ResourceDetailPage /></RoleRoute>} />
        <Route path="/applied-resources" element={<RoleRoute allowedRoles={[ROLES.TENDER_PERSON]}><AppliedResourcesPage /></RoleRoute>} />
      </Route>

      {/* Wildcard 404 Catch-All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}