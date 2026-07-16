import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Unauthorized from './pages/Unauthorized';
import AttendancePage from './pages/AttendancePage';
import PrivateRoutes from './utils/PrivateRoutes';
import RoleBaseRoutes from './utils/RoleBaseRoutes';
import AdminSummary from './components/dashboard/AdminSummary';
import DepartmentList from './components/department/DepartmentList';
import AddDepartment from './components/department/AddDepartment';
import EditDepartment from './components/department/EditDepartment';
import List from './components/employee/List';
import Add from './components/employee/Add';
import View from './components/employee/View';
import Edit from './components/employee/Edit';
import AddSalary from './components/salary/Add';
import ViewSalary from './components/salary/View';
import Summary from './components/EmployeeDashboard/Summary';
import LeaveList from './components/leave/List';
import AddLeave from './components/leave/Add';
import Setting from './components/EmployeeDashboard/Setting';
import Table from './components/leave/Table';
import Detail from './components/leave/Detail';
import RegisterFace from './components/attendance/RegisterFace';
import AttendanceAdmin from './components/attendance/AttendanceAdmin';
import AttendanceEmployee from './components/attendance/AttendanceEmployee';
import HolidayManager from './components/attendance/HolidayManager';
import ForcePasswordChange from './pages/ForcePasswordChange';
import EmailSettings from './components/dashboard/EmailSettings';
import SalaryBreakdown from './components/dashboard/SalaryBreakdown';
import LeaveBalanceAdmin from './components/leave/LeaveBalanceAdmin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes — no login needed ── */}
        <Route path='/login' element={<Login />} />
        <Route path='/attendance' element={<AttendancePage />} />
        <Route path='/unauthorized' element={<Unauthorized />} />
        <Route path='/change-password' element={<ForcePasswordChange />} />
        <Route path='/' element={<Navigate to="/login" replace />} />

        {/* ── Admin Dashboard ── */}
        <Route path='/admin-dashboard' element={
          <PrivateRoutes><RoleBaseRoutes requiredRole={['admin']}><AdminDashboard /></RoleBaseRoutes></PrivateRoutes>
        }>
          <Route index element={<AdminSummary />} />
          <Route path="departments" element={<DepartmentList />} />
          <Route path="add-department" element={<AddDepartment />} />
          <Route path="department/:id" element={<EditDepartment />} />
          <Route path="employees" element={<List />} />
          <Route path="add-employee" element={<Add />} />
          <Route path="employees/:id" element={<View />} />
          <Route path="employees/edit/:id" element={<Edit />} />
          <Route path="employees/salary/:id" element={<ViewSalary />} />
          <Route path="salary/add" element={<AddSalary />} />
          <Route path="leaves" element={<Table />} />
          <Route path="leaves/:id" element={<Detail />} />
          <Route path="employees/leaves/:id" element={<LeaveList />} />
          <Route path="setting" element={<Setting />} />
          <Route path="attendance" element={<AttendanceAdmin />} />
          <Route path="attendance/register-face" element={<RegisterFace />} />
          <Route path="holidays" element={<HolidayManager />} />
          <Route path="email-settings" element={<EmailSettings />} />
          <Route path="salary-breakdown" element={<SalaryBreakdown />} />
          <Route path="leave-balances" element={<LeaveBalanceAdmin />} />
        </Route>

        {/* ── Employee Dashboard ── */}
        <Route path='/employee-dashboard' element={
          <PrivateRoutes><RoleBaseRoutes requiredRole={['admin','employee']}><EmployeeDashboard /></RoleBaseRoutes></PrivateRoutes>
        }>
          <Route index element={<Summary />} />
          <Route path="profile/:id" element={<View />} />
          <Route path="leaves/:id" element={<LeaveList />} />
          <Route path="add-leave" element={<AddLeave />} />
          <Route path="salary/:id" element={<ViewSalary />} />
          <Route path="setting" element={<Setting />} />
          <Route path="attendance" element={<AttendanceEmployee />} />
        </Route>

        <Route path='*' element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
