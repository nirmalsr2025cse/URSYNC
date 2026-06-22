import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./layouts/Header.jsx";
import Sidebar from "./layouts/Sidebar.jsx";
import TendersByOrganization from "./pages/TendersByOrganization.jsx";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<PlaceholderPage title="Home" />} />
            <Route path="/tn-tenders-act" element={<PlaceholderPage title="TN Tenders Act" />} />
            <Route path="/dashboard" element={<PlaceholderPage title="Dashboard" />} />
            <Route
              path="/tenders-by-location"
              element={<PlaceholderPage title="Tenders by Location" />}
            />
            <Route path="/tenders-by-organization" element={<TendersByOrganization />} />
            <Route
              path="/tenders-by-classification"
              element={<PlaceholderPage title="Tenders by Classification" />}
            />
            <Route
              path="/tenders-archive"
              element={<PlaceholderPage title="Tenders in Archive" />}
            />
            <Route path="/tender-status" element={<PlaceholderPage title="Tender Status" />} />
            <Route path="/downloads" element={<PlaceholderPage title="Downloads" />} />
            <Route
              path="/department-list"
              element={<PlaceholderPage title="Department List" />}
            />
            <Route path="/announcements" element={<PlaceholderPage title="Announcements" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
