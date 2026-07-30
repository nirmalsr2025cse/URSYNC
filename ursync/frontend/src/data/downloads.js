// Dummy static data for the Downloads page.
// icon field maps to a react-icons component handled in DownloadCard.jsx
// color field gives each icon tile a distinct tint, matching the reference design.
//
// type: "link"     -> opens `url` in a new tab
// type: "download" -> forces a file download using `url` (and `fileName` as the saved name)

export const downloadsData = [
  {
    id: 1,
    title: "LibreOffice Suite",
    category: "Software",
    description: "Required for viewing and editing tender documents.",
    icon: "spreadsheet",
    color: "#1E8E5A",
    type: "link",
    url: "https://www.libreoffice.org/download",
  },
  {
    id: 2,
    title: "PDF Reader",
    category: "Software",
    description: "Open and view tender documents and specifications.",
    icon: "pdf",
    color: "#D93025",
    type: "link",
    url: "http://get.adobe.com/reader",
  },
  {
    id: 3,
    title: "BoQ Template",
    category: "Templates",
    description: "Download Bill of Quantity templates for tender submission.",
    icon: "template",
    color: "#1E8E5A",
    type: "download",
    url: "https://tntenders.gov.in/nicgep/app?component=%24DirectLink&page=StandardBiddingDocuments&service=direct&session=T&sp=Sz1q1AhqhqhqTpshuVf6wsTysQksKZeY%2F%2FmPXZ4CFZN8%3D",
    fileName: "V3_BOQ_Mixed_Template.xls",
  },
  {
    id: 4,
    title: "Bidder Manual",
    category: "Manuals",
    description: "Guidelines for online tender registration and submission.",
    icon: "manual",
    color: "#C56A2D",
    type: "download",
    url: "https://eprocure.gov.in/cppp/sites/default/files/brochure/GePNIC_Brochure.pdf",
    fileName: "GePNIC_Brochure.pdf",
  },
  {
    id: 5,
    title: "Digital Signature Setup",
    category: "Software",
    description: "Required tools for DSC based tender authentication.",
    icon: "shield",
    color: "#2563EB",
    type: "link",
    url: "http://www.pdfforge.org/download",
  },
  {
    id: 6,
    title: "JRE (Java Runtime)",
    category: "Software",
    description: "Required for running Java based applications.",
    icon: "settings",
    color: "#C56A2D",
    type: "download",
    url: "https://eprocure.gov.in/mmp/jre-windows-i586.exe",
    fileName: "jre-windows-i586.exe",
  },
  {
    id: 7,
    title: "Firefox ESR Browser",
    category: "Software",
    description: "Recommended browser for e-Procurement portal access.",
    icon: "browser",
    color: "#E8622C",
    type: "download",
    url: "https://ftp.mozilla.org/pub/firefox/releases/52.0.2esr/win32/en-US/Firefox%20Setup%2052.0.2esr.exe",
    fileName: "Firefox-Setup-52.0.2esr.exe",
  },
  {
    id: 8,
    title: "AutoCAD DWF Viewer",
    category: "Software",
    description: "View DWF files and engineering drawings.",
    icon: "dwg",
    color: "#2563EB",
    type: "link",
    url: "https://viewer.autodesk.com/",
  },
  {
    id: 9,
    title: "Organisation Structure Form",
    category: "Forms",
    description: "Template to create and submit organisation structure.",
    icon: "form",
    color: "#7C3AED",
    type: "download",
    // Place this file in your `public/downloads/` folder (see note).
    url: "/downloads/Organisation_Structure_Creation_Form.xls",
    fileName: "Organisation_Structure_Creation_Form.xls",
  },
  {
    id: 10,
    title: "Auction Properties Input Form",
    category: "Forms",
    description: "Input form for auction properties submission.",
    icon: "auction",
    color: "#15803D",
    type: "download",
    url: "https://tntenders.gov.in/nicgep/app?component=%24DirectLink&page=StandardBiddingDocuments&service=direct&session=T&sp=SLkaINV6KAKaGmSajKMpz9LVC8ZuUGl0XrQNxt87zhbV5vZEs1vHGJ%2F%2BVUMVxQp2g",
    fileName: "Auction_Properties_Input_Form.pdf",
  },
];

export const resourcesData = [
  {
    id: 1,
    title: "Bid Submission Guide PDF",
    description: "Step-by-step guide for bid submission.",
    icon: "pdf",
    color: "#D93025",
  },
  {
    id: 2,
    title: "Tender User Manual",
    description: "Complete user manual for e-tendering portal.",
    icon: "book",
    color: "#2563EB",
  },
  {
    id: 3,
    title: "e-Procurement Guidelines",
    description: "Guidelines and policies for e-procurement.",
    icon: "guideline",
    color: "#1E8E5A",
  },
  {
    id: 4,
    title: "FAQ Document",
    description: "Frequently asked questions and answers.",
    icon: "faq",
    color: "#C56A2D",
  },
];

export const categories = ["All", "Software", "Forms", "Templates", "Manuals", "Guidelines"];