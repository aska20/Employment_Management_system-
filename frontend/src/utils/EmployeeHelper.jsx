import axios from "axios";
import { FaEye, FaEdit, FaTrash, FaMoneyBillWave } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { API_BASE, apiUrl, fileUrl } from '../utils/apiConfig'
import { useState } from "react";
import ConfirmModal from '../components/ConfirmModal';

export const columns = [
  { name: "#",          selector: row => row.sno,        width: "55px" },
  { name: "Emp ID",     selector: row => row.employeeId, width: "100px" },
  {
    name: "Name",
    cell: row => (
      <div className="flex items-center gap-2 py-1">
        <img src={`${API_BASE}/${row.profileImage}`}
          className="w-8 h-8 rounded-full object-cover border-2 border-stone-200 flex-shrink-0"
          onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&size=32&background=0f766e&color=fff` }} />
        <span className="font-semibold text-stone-700 text-sm">{row.name}</span>
      </div>
    ),
    width: "200px"
  },
  { name: "Department", selector: row => row.dep_name,   width: "150px" },
  { name: "DOB",        selector: row => row.dob,        width: "110px" },
  { name: "Action",     selector: row => row.action,     center: true,  width: "180px" }
];

export const EmployeeButtons = ({ Id }) => {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setShowConfirm(false);
    try {
      const r = await axios.delete(`${API_BASE}/api/employee/${Id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (r.data.success) window.location.reload();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete employee");
    }
  };

  return (
    <>
      <ConfirmModal
        isOpen={showConfirm}
        title="Delete Employee?"
        message="This will permanently remove the employee and their login account."
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
      <div className="flex items-center gap-1.5 py-1">
        <button onClick={() => navigate(`/admin-dashboard/employees/${Id}`)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg transition text-xs font-semibold border border-teal-100"
          title="View Profile">
          <FaEye className="text-xs" /> View
        </button>
        <button onClick={() => navigate(`/admin-dashboard/employees/edit/${Id}`)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition text-xs font-semibold border border-amber-100"
          title="Edit">
          <FaEdit className="text-xs" /> Edit
        </button>
        <button onClick={() => setShowConfirm(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition text-xs font-semibold border border-red-100"
          title="Delete">
          <FaTrash className="text-xs" /> Del
        </button>
      </div>
    </>
  );
};

export const fetchDepartments = async () => {
  try {
    const r = await axios.get(`${API_BASE}/api/department`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    return r.data.success ? r.data.departments : [];
  } catch { return [] }
};

export const getEmployees = async (depId) => {
  try {
    const r = await axios.get(`${API_BASE}/api/employee/department/${depId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    return r.data.success ? r.data.employees : [];
  } catch { return [] }
};
