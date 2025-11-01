import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import React, { Suspense } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Reports from "./pages/Reports";
import ManageWasteTypes from "./pages/ManageWasteTypes";
import ManageUsers from "./pages/ManageUsers";
import CreateShipment from "./pages/CreateShipment";
import SystemLogs from "./pages/SystemLogs";
import AuthLogs from "./pages/AuthLogs";
import DriverTracking from "./pages/DriverTracking";
import MultiLocationTracking from "./pages/MultiLocationTracking";
import CompanyImporter from "./pages/CompanyImporter";
import PublicCompanyRegister from "./pages/PublicCompanyRegister";
import ActiveDriversDetails from "./pages/ActiveDriversDetails";
import CompaniesDetails from "./pages/CompaniesDetails";
import ActiveShipmentsDetails from "./pages/ActiveShipmentsDetails";
import TotalShipmentsDetails from "./pages/TotalShipmentsDetails";
import PendingUsersDetails from "./pages/PendingUsersDetails";
import TotalDriversDetails from "./pages/TotalDriversDetails";
import CompanyDashboard from "./pages/CompanyDashboard";
import AdminCompaniesStats from "./pages/AdminCompaniesStats";
import UserCompanyAssignment from "./pages/UserCompanyAssignment";
import TestingDashboard from "./pages/TestingDashboard";
import CompanySignatures from "./pages/CompanySignatures";
import TermsAndConditions from "./pages/TermsAndConditions";
import ViewTermsAcceptance from "./pages/ViewTermsAcceptance";

const ShipmentDetails = React.lazy(() => import('./pages/ShipmentDetails'));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/shipment/:id" element={
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>}>
                <ShipmentDetails />
              </Suspense>
            } />
            <Route path="/reports" element={<Reports />} />
            <Route path="/manage-waste-types" element={<ManageWasteTypes />} />
            <Route path="/manage-users" element={<ManageUsers />} />
            <Route path="/create-shipment" element={<CreateShipment />} />
            <Route path="/system-logs" element={<SystemLogs />} />
            <Route path="/auth-logs" element={<AuthLogs />} />
            <Route path="/driver-tracking" element={<DriverTracking />} />
            <Route path="/multi-location-tracking" element={<MultiLocationTracking />} />
            <Route path="/company-importer" element={<CompanyImporter />} />
            <Route path="/register-company" element={<PublicCompanyRegister />} />
            <Route path="/active-drivers" element={<ActiveDriversDetails />} />
        <Route path="/companies" element={<CompaniesDetails />} />
        <Route path="/companies-details" element={<CompaniesDetails />} />
          <Route path="/user-company-assignment" element={<UserCompanyAssignment />} />
          <Route path="/testing-dashboard" element={<TestingDashboard />} />
            <Route path="/active-shipments" element={<ActiveShipmentsDetails />} />
            <Route path="/total-shipments" element={<TotalShipmentsDetails />} />
            <Route path="/pending-users" element={<PendingUsersDetails />} />
            <Route path="/total-drivers" element={<TotalDriversDetails />} />
            <Route path="/company-dashboard" element={<CompanyDashboard />} />
            <Route path="/admin-companies-stats" element={<AdminCompaniesStats />} />
            <Route path="/company-signatures" element={<CompanySignatures />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/view-terms-acceptance" element={<ViewTermsAcceptance />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
