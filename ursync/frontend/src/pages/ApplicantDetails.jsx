// src/pages/ApplicantDetails.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useApi } from '../api/client'

const HIDDEN_FORM_FIELDS = ['bidAmount', 'emdAmount', 'securityDeposit']

const SKIP_IN_GENERIC_GRID = [
  'tenderId', 'tenderName', 'department', 'tenderCategory',
  'acceptTerms', 'applicantSignature', 'userId',
]

function toLabel(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function Toast({ toast }) {
  if (!toast) return null
  const isError = toast.type === 'error'
  return (
    <div className={[
      'fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2',
      isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    ].join(' ')}>
      <span className={['w-2 h-2 rounded-full flex-shrink-0', isError ? 'bg-red-500' : 'bg-emerald-500'].join(' ')} />
      {toast.msg}
    </div>
  )
}

// In-page preview modal. Renders the actual file inline instead of
// opening a new tab:
//   - image/* (jpeg, jpg, png)  -> <img>
//   - application/pdf           -> <iframe> (browsers render PDFs natively)
//   - anything else             -> falls back to a "can't preview" message
//     with a direct download button, rather than showing a broken embed.
function PreviewModal({ file, onClose, onDownload }) {
  if (!file) return null

  const isImage = file.contentType?.startsWith('image/')
  const isPdf = file.contentType === 'application/pdf'

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#FFE5BF]">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0A2240] truncate">{file.title}</p>
            <p className="text-xs text-[#6B7A8D] truncate">{file.originalName}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onDownload}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#FFE5BF] text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#FFFAF3] flex items-center justify-center min-h-[300px]">
          {isImage ? (
            <img src={file.blobUrl} alt={file.originalName} className="max-w-full max-h-[75vh] object-contain" />
          ) : isPdf ? (
            <iframe src={file.blobUrl} title={file.title} className="w-full h-[75vh] border-0" />
          ) : (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-[#0A2240] mb-1">Preview not available for this file type.</p>
              <p className="text-xs text-[#6B7A8D]">Use the Download button above to open it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// A document/signature row with Preview + Download buttons. The file URL
// returned by the backend (e.g. /temp-applications/file/:fileId) is
// protected by auth middleware, so a plain <a href> can't carry the
// Authorization header. Both buttons fetch the file WITH the token via
// fetchFileBlobUrl(), then either open it in the in-page PreviewModal
// (Preview) or trigger a save-to-disk (Download).
function DocumentRow({ icon, title, subtitle, fileUrl, contentType, originalName, downloadName, fetchFileBlobUrl, onError, onPreview }) {
  const [busy, setBusy] = useState(null) // 'preview' | 'download' | null

  async function handlePreview() {
    setBusy('preview')
    try {
      const blobUrl = await fetchFileBlobUrl(fileUrl)
      onPreview({ blobUrl, contentType, title, originalName })
    } catch (err) {
      onError(err.message || 'Failed to open file')
    } finally {
      setBusy(null)
    }
  }

  async function handleDownload() {
    setBusy('download')
    try {
      const blobUrl = await fetchFileBlobUrl(fileUrl)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = downloadName || 'document'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
    } catch (err) {
      onError(err.message || 'Failed to download file')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-[#FFFAF3] border border-[#FFE5BF] rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <div className="min-w-0">
          <span className="text-sm font-medium text-[#0A2240] truncate block">{title}</span>
          {subtitle && <span className="text-[10px] text-[#6B7A8D] truncate block">{subtitle}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={handlePreview}
          disabled={busy !== null}
          title="Preview"
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-[#FFE5BF] text-[#1A4A8C] hover:bg-[#FFE5BF] transition-colors disabled:opacity-50"
        >
          {busy === 'preview' ? (
            <div className="w-3 h-3 border-2 border-[#1A4A8C] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy !== null}
          title="Download"
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-[#FFE5BF] text-[#1A4A8C] hover:bg-[#FFE5BF] transition-colors disabled:opacity-50"
        >
          {busy === 'download' ? (
            <div className="w-3 h-3 border-2 border-[#1A4A8C] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default function ApplicantDetails() {
  const navigate  = useNavigate()
  const { applicationId } = useParams()
  const location  = useLocation()
  const decodedAppId = decodeURIComponent(applicationId || '')
  const { apiFetch, fetchFileBlobUrl } = useApi()

  // Read-only mode: reached from the Approved page's Bidders-tab card via
  // ApplicationApplicants.jsx's handleView(), which now passes both flags
  // through navigation state. `tenderId` here is actually the tender's
  // tenderCode (same value used throughout the read-only bidders flow).
  const readOnly = location.state?.readOnly === true
  const tenderCode = location.state?.tenderId

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [tender, setTender] = useState(null)
  const [applicant, setApplicant] = useState(null)

  const [status, setStatus] = useState('Pending')
  const [toast,  setToast]  = useState(null)
  const [previewFile, setPreviewFile] = useState(null) // { blobUrl, contentType, title, originalName }

  useEffect(() => {
    if (!decodedAppId) return

    // Read-only: this applicant is a finalized bidder (FinalBidders for
    // department_head/employee, BiddersList for tender_authority) — fetch
    // from the approved-bidders detail endpoint instead of the
    // pending-applicants one, which never had this applicant's data.
    if (readOnly) {
      if (!tenderCode) {
        setLoadError('Missing tender reference for this bidder.')
        setLoading(false)
        return
      }
      setLoading(true)
      setLoadError(null)
      apiFetch(`/approvement/bidders/${encodeURIComponent(tenderCode)}/applicants/${encodeURIComponent(decodedAppId)}`)
        .then((res) => {
          setTender(res.data.tender)
          setApplicant(res.data.applicant)
          // Status reflects document-review state (isDocumentApproved is
          // the flag the review queue and backend actually flip on
          // approve/reject — see applicationApplicantsController.js).
          // isPaid is an unrelated payment flag and was wrongly used here
          // before, which showed "Pending" for approved-but-unpaid bidders.
          setStatus(res.data.applicant.isDocumentApproved ? 'Approved' : 'Pending')
        })
        .catch((err) => setLoadError(err.message || 'Failed to load bidder'))
        .finally(() => setLoading(false))
      return
    }

    setLoading(true)
    setLoadError(null)
    apiFetch(`/tenders/applications/applicants/${encodeURIComponent(decodedAppId)}`)
      .then((res) => {
        setTender(res.data.tender)
        setApplicant(res.data.applicant)
        setStatus(res.data.applicant.isDocumentApproved ? 'Approved' : 'Pending')
      })
      .catch((err) => setLoadError(err.message || 'Failed to load applicant'))
      .finally(() => setLoading(false))
  }, [decodedAppId, readOnly, tenderCode, apiFetch])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function closePreview() {
    if (previewFile?.blobUrl) URL.revokeObjectURL(previewFile.blobUrl)
    setPreviewFile(null)
  }

  function downloadPreviewedFile() {
    if (!previewFile) return
    const a = document.createElement('a')
    a.href = previewFile.blobUrl
    a.download = previewFile.originalName || 'document'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#1A4A8C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError || !tender || !applicant) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="font-bold text-[#0A2240] mb-2">{loadError || 'Applicant not found.'}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-[#1A4A8C] underline">Go Back</button>
      </div>
    )
  }

  const STATUS_STYLE = {
    Pending:  'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
  }

  const formData = applicant.formData || {}
  const genericFields = Object.entries(formData).filter(
    ([key]) => !HIDDEN_FORM_FIELDS.includes(key) && !SKIP_IN_GENERIC_GRID.includes(key)
  )

  const docIcon = (
    <svg className="w-4 h-4 text-[#1A4A8C] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
    </svg>
  )
  const signatureIcon = (
    <svg className="w-4 h-4 text-[#1A4A8C] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.94l-3.242 1.08 1.08-3.242a4 4 0 01.94-1.414z" />
    </svg>
  )

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-screen animate-fade-in">
      <Toast toast={toast} />
      <PreviewModal file={previewFile} onClose={closePreview} onDownload={downloadPreviewedFile} />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-[#0A2240]">Applicant Details</h1>
            <p className="text-xs text-[#6B7A8D] mt-0.5">{applicant.applicationId}</p>
          </div>
        </div>
        <span className={['text-xs font-semibold px-3 py-1.5 rounded-full border', STATUS_STYLE[status]].join(' ')}>
          {status}
        </span>
      </div>

      <Section title="Tender Details">
        <InfoGrid items={[
          { label: 'Tender ID',   value: tender.id },
          { label: 'Title',       value: tender.title },
          { label: 'Department',  value: tender.department },
          { label: 'Value',       value: tender.value != null ? `${tender.currency} ${tender.value.toLocaleString('en-IN')}` : '—' },
        ]} />
      </Section>

      <Section title="Application Information">
        {genericFields.length === 0 ? (
          <p className="text-sm text-[#6B7A8D] text-center py-4">No additional information submitted.</p>
        ) : (
          <InfoGrid items={genericFields.map(([key, value]) => ({
            label: toLabel(key),
            value: value === '' || value === null || value === undefined ? '—' : String(value),
          }))} />
        )}
      </Section>

      <Section title="Documents">
        {applicant.documents.length === 0 ? (
          <p className="text-sm text-[#6B7A8D] text-center py-6">No documents uploaded.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {applicant.documents.map((doc) => (
              <DocumentRow
                key={doc.fileId}
                icon={docIcon}
                title={doc.label}
                subtitle={`${doc.originalName}${doc.size ? ` · ${formatFileSize(doc.size)}` : ''}`}
                fileUrl={doc.url}
                contentType={doc.contentType}
                originalName={doc.originalName}
                downloadName={doc.originalName}
                fetchFileBlobUrl={fetchFileBlobUrl}
                onError={(msg) => showToast(msg, 'error')}
                onPreview={setPreviewFile}
              />
            ))}
            {applicant.signature && (
              <DocumentRow
                icon={signatureIcon}
                title="Signature"
                subtitle={applicant.signature.originalName}
                fileUrl={applicant.signature.url}
                contentType={applicant.signature.contentType}
                originalName={applicant.signature.originalName}
                downloadName={applicant.signature.originalName || 'signature'}
                fetchFileBlobUrl={fetchFileBlobUrl}
                onError={(msg) => showToast(msg, 'error')}
                onPreview={setPreviewFile}
              />
            )}
          </div>
        )}
      </Section>

      <div className="bg-white border border-[#FFE5BF] rounded-2xl shadow-sm px-4 py-4 lg:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-end gap-3">
          <button onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-[#FFE5BF] text-[#0A2240] bg-white hover:bg-[#FFF2DB] transition-colors">
            Back
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl p-5 shadow-sm">
      <h2 className="text-sm font-bold text-[#0A2240] mb-3 pb-3 border-b border-[#FFE5BF]">{title}</h2>
      {children}
    </div>
  )
}

function InfoGrid({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map(({ label, value }) => (
        <div key={label}>
          <p className="text-[10px] font-semibold text-[#6B7A8D] uppercase tracking-wide">{label}</p>
          <p className="text-sm font-medium text-[#0A2240] mt-0.5 break-words">{value}</p>
        </div>
      ))}
    </div>
  )
}