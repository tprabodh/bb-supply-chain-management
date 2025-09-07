import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import AdminProfile from './pages/roles/AdminProfile';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

// Import all the role-based pages
import AdminDashboard from './pages/roles/AdminDashboard';
import AdminInput from './pages/roles/AdminInput';
import HrDashboard from './pages/roles/HrDashboard';
import HrInput from './pages/roles/HrInput';
import FinanceDashboard from './pages/roles/FinanceDashboard';
import FinanceInput from './pages/roles/FinanceInput';
import BusinessHeadDashboard from './pages/roles/BusinessHeadDashboard';
import BusinessHeadInput from './pages/roles/BusinessHeadInput';
import CityOperationsHeadDashboard from './pages/roles/CityOperationsHeadDashboard';
import CityOperationsHeadInput from './pages/roles/CityOperationsHeadInput';
import ZonalHeadDashboard from './pages/roles/ZonalHeadDashboard';
import ZonalHeadInput from './pages/roles/ZonalHeadInput';
import TeamLeadDashboard from './pages/roles/TeamLeadDashboard';
import TeamLeadInput from './pages/roles/TeamLeadInput';
import SalesExecutiveDashboard from './pages/roles/SalesExecutiveDashboard';
import SalesExecutiveInput from './pages/roles/SalesExecutiveInput';
import ProcurementManagerDashboard from './pages/roles/ProcurementManagerDashboard';
import ProcurementManagerInput from './pages/roles/ProcurementManagerInput';
import StockManagerDashboard from './pages/roles/StockManagerDashboard';
import StockManagerInput from './pages/roles/StockManagerInput';
import KitchenManagerDashboard from './pages/roles/KitchenManagerDashboard';
import KitchenManagerInput from './pages/roles/KitchenManagerInput';
import LogisticsManagerDashboard from './pages/roles/LogisticsManagerDashboard';
import LogisticsManagerInput from './pages/roles/LogisticsManagerInput';
import OrganizationChart from './pages/OrganizationChart';
import RecipeManagement from './pages/roles/RecipeManagement';
import KitchenAssignment from './pages/roles/KitchenAssignment';

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin/create-profile" element={<ProtectedRoute roles={['Admin']}><AdminProfile /></ProtectedRoute>} />
        <Route path="/admin/recipe-management" element={<ProtectedRoute roles={['Admin']}><RecipeManagement /></ProtectedRoute>} />
        <Route path="/admin/kitchen-assignment" element={<ProtectedRoute roles={['Admin']}><KitchenAssignment /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/Admin/dashboard" element={<ProtectedRoute roles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/Admin/input" element={<ProtectedRoute roles={['Admin']}><AdminInput /></ProtectedRoute>} />

        {/* HR & Training Routes */}
        <Route path="/HR&Training/dashboard" element={<ProtectedRoute roles={['HR & Training']}><HrDashboard /></ProtectedRoute>} />
        <Route path="/HR&Training/input" element={<ProtectedRoute roles={['HR & Training']}><HrInput /></ProtectedRoute>} />

        {/* Finance and Accounts Routes */}
        <Route path="/FinanceandAccounts/dashboard" element={<ProtectedRoute roles={['Finance and Accounts']}><FinanceDashboard /></ProtectedRoute>} />
        <Route path="/FinanceandAccounts/input" element={<ProtectedRoute roles={['Finance and Accounts']}><FinanceInput /></ProtectedRoute>} />
        {/* Business Head Routes */}
        <Route path="/BusinessHead/dashboard" element={<ProtectedRoute roles={['Business Head']}><BusinessHeadDashboard /></ProtectedRoute>} />
        <Route path="/BusinessHead/input" element={<ProtectedRoute roles={['Business Head']}><BusinessHeadInput /></ProtectedRoute>} />

        {/* City operations Head Routes */}
        <Route path="/CityoperationsHead/dashboard" element={<ProtectedRoute roles={['City operations Head']}><CityOperationsHeadDashboard /></ProtectedRoute>} />
        <Route path="/CityoperationsHead/input" element={<ProtectedRoute roles={['City operations Head']}><CityOperationsHeadInput /></ProtectedRoute>} />

        {/* Zonal Head Routes */}
        <Route path="/ZonalHead/dashboard" element={<ProtectedRoute roles={['Zonal Head']}><ZonalHeadDashboard /></ProtectedRoute>} />
        <Route path="/ZonalHead/input" element={<ProtectedRoute roles={['Zonal Head']}><ZonalHeadInput /></ProtectedRoute>} />

        {/* Team Lead Routes */}
        <Route path="/TeamLead/dashboard" element={<ProtectedRoute roles={['Team Lead']}><TeamLeadDashboard /></ProtectedRoute>} />
        <Route path="/TeamLead/input" element={<ProtectedRoute roles={['Team Lead']}><TeamLeadInput /></ProtectedRoute>} />

        {/* Sales Executive Routes */}
        <Route path="/SalesExecutive/dashboard" element={<ProtectedRoute roles={['Sales Executive']}><SalesExecutiveDashboard /></ProtectedRoute>} />
        <Route path="/SalesExecutive/input" element={<ProtectedRoute roles={['Sales Executive']}><SalesExecutiveInput /></ProtectedRoute>} />

        {/* Procurement Manager Routes */}
        <Route path="/ProcurementManager/dashboard" element={<ProtectedRoute roles={['Procurement Manager']}><ProcurementManagerDashboard /></ProtectedRoute>} />
        <Route path="/ProcurementManager/input" element={<ProtectedRoute roles={['Procurement Manager']}><ProcurementManagerInput /></ProtectedRoute>} />

        {/* Stock Manager Routes */}
        <Route path="/StockManager/dashboard" element={<ProtectedRoute roles={['Stock Manager']}><StockManagerDashboard /></ProtectedRoute>} />
        <Route path="/StockManager/input" element={<ProtectedRoute roles={['Stock Manager']}><StockManagerInput /></ProtectedRoute>} />

        {/* Kitchen Manager Routes */}
        <Route path="/KitchenManager/dashboard" element={<ProtectedRoute roles={['Kitchen Manager']}><KitchenManagerDashboard /></ProtectedRoute>} />
        <Route path="/KitchenManager/input" element={<ProtectedRoute roles={['Kitchen Manager']}><KitchenManagerInput /></ProtectedRoute>} />

        {/* Logistics Manager Routes */}
        <Route path="/LogisticsManager/dashboard" element={<ProtectedRoute roles={['Logistics Manager']}><LogisticsManagerDashboard /></ProtectedRoute>} />
        <Route path="/LogisticsManager/input" element={<ProtectedRoute roles={['Logistics Manager']}><LogisticsManagerInput /></ProtectedRoute>} />

        <Route path="/organization-chart" element={<ProtectedRoute roles={['Admin']}><OrganizationChart /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;