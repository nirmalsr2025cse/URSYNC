import React from 'react'
import { Routes, Route, Navigate , useNavigate } from 'react-router-dom'
import { signupRequest, loginRequest } from '../api/authApi'
import Login from "../pages/Login"
import Signup from '../pages/SignUP'
import Layout from '../components/Layout'
import ProtectedRoute from './ProtectedRoute'
import PublicRoute from './PublicRoute'
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
import SearchResourcePage from '../pages/SearchResourcepage'
import ResourceSharing from '../pages/ResourceSharing'
import GetResourcePage from '../pages/GetResourcePage'
import ResourceDetailPage from '../pages/ResourceDetailPage'
import AppliedTenders from '../pages/AppliedTenders'
import Approved from '../pages/Approved'
import AddResources from '../pages/AddResources'


export default function AppRoutes() {
  const navigate = useNavigate()

  async function handleSignup(formValues) {
    const { token, user } = await signupRequest(formValues)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    navigate('/home')
  }

  async function handleLogin(formValues) {
    const { token, user } = await loginRequest({
      email: formValues.identifier,
      password: formValues.password,
    })
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    navigate('/home')
  }
  return (
    <Routes>
      <Route 
        path='/signup'
        element={
          <PublicRoute>
            <Signup onSubmit={handleSignup} onGoToLogin={() => navigate('/login')} />
          </PublicRoute>
        }
      />
      {/* /login: if already authenticated, PublicRoute bounces to /home
          instead of showing the form again. Otherwise renders Login. */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login onSubmit={handleLogin} />
          </PublicRoute>
        }
      />

      {/* Everything under Layout now requires a valid token. If there's
          no token, ProtectedRoute sends the user to /login and STOPS
          there — it never mounts Home/Layout at all, so there's nothing
          left inside those pages to bounce the user back out again. */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/dashboard/tender-analysis" element={<Dashboard />} />
        <Route path="/tn-tenders-act"        element={<TnTendersAct />} />
        <Route path="/tenders-by-location" element={<TendersByLocation />} />
        <Route path="/tender-status" element={<TendersStatus />} />
        <Route path="/archive" element={<ArchiveTenderPage />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/reports" element={<ReportsFeedbacks />} />
        <Route path="/cancelled" element={<CancelledRetendered />} />
        <Route path="/tenders-by-org" element={<TendersByOrganization />} />
        <Route path="/create-saved-tenders" element={<CreateSavedTenders />} />
        <Route path="/create-tender"     element={<CreateTender />} />
        <Route path="/create-tender/:id"        element={<CreateTender />} />
        <Route path="/tender-view/:id"        element={<TenderView />} />
        <Route path="/tender-details-view/:id" element={<TenderDetailsView />} />
        <Route path="/tenders-by-class"        element={<TenderByClassification />} />
        <Route path="/apply-tenders"         element={<ApplyTenders />} />
        <Route path="/apply-tenders/apply/:tenderCode?" element={<ApplyTenderForm />} />
        <Route path="/tenders-by-dept" element={<TenderByDepartment />} />
        <Route path="/your-tenders" element={<YourTenders />} />
        <Route path="/debarment" element={<DebarmentList />} />
        <Route path="/auction" element={<TenderCumAuction />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/applications"                    element={<Applications />} />
        <Route path="/applications/:tenderId"          element={<ApplicationApplicants />} />
        <Route path="/Applicant/:applicationId"        element={<ApplicantDetails />} />
        <Route path="/applications/:tenderId/approved" element={<ApprovedApplicants />} />
        <Route path="/bidder-selection/:tenderId" element={<BidderList/>} />
        <Route path="/Bidder/:tenderCode/:applicationId" element={<BidderDetails />} />
        <Route path="/approvement" element={<Approvement />} />
        <Route path="/pending" element={<Pending />} />
        <Route path="/finalbidder/:tenderCode" element={<FinalBidder />} />
        <Route path="/apply-tenders/payment/:appId" element={<TenderRegistrationPayment />} />
        <Route path="/apply-tenders/payment/choose-platform/:appId" element={<ChoosePaymentPlatform />} />
        <Route path="/financial-changes" element={<TenderFinancialChangesPage />} />
        <Route path="/review-financial-changes" element={<TenderFinancialReviewPage />} />
        <Route path="/financial-changes/details" element={<TenderFinancialChangeDetailsPage />} />
        <Route path="/conflicts" element={<Conflicts />} />
        <Route path="/conflicts/:id" element={<ConflictDetails />} />
        <Route path="/search-resource" element={<SearchResourcePage />} />
        <Route path="/search-resource/get-resource" element={<GetResourcePage />} />
        <Route path="/search-resource/details" element={<ResourceDetailPage />} />
        <Route path="/resource-sharing" element={<ResourceSharing />} />
        <Route path="/applied-tenders" element={<AppliedTenders />} />
        <Route path="/approved" element={<Approved />} /> 
        <Route path="/add-resources" element={<AddResources />} />
      </Route>

      {/* Wildcard MUST stay last. It was previously listed first — with
          nested/relative routing that risks matching before your real
          routes get a chance, especially with dynamic ":id"-style
          segments. Keeping it last is the conventional, safe order. */}
      <Route path="*" element={<Placeholder />} />
    </Routes>
  )
}