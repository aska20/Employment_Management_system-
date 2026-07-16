import { useNavigate } from "react-router-dom";
import { FaEye, FaMagic } from "react-icons/fa";

export const columns = [
  { name: "S.No",       selector: row => row.sno,        width: "60px" },
  { name: "Emp ID",     selector: row => row.employeeId, width: "100px" },
  { name: "Name",       selector: row => row.name,       width: "130px" },
  { name: "Leave Type", selector: row => row.leaveType,  width: "140px" },
  { name: "Department", selector: row => row.department, width: "150px" },
  { name: "Days",       selector: row => row.days,       width: "70px" },
  {
    name: "Status",
    selector: row => row.status,
    width: "110px",
    cell: row => {
      const map = {
        Approved: "bg-emerald-100 text-emerald-700",
        Rejected: "bg-red-100 text-red-700",
        Pending:  "bg-amber-100 text-amber-700"
      }
      return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[row.status] || "bg-stone-100 text-stone-600"}`}>{row.status}</span>
    }
  },
  { name: "Action", selector: row => row.action, center: true }
];

export const LeaveButtons = ({ Id, status }) => {
  const navigate = useNavigate();
  return (
    <button
      className="inline-flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition"
      onClick={() => navigate(`/admin-dashboard/leaves/${Id}`)}>
      <FaEye />
      {status === "Pending" ? <span className="flex items-center gap-0.5">Review <FaMagic className="text-teal-200 text-xs" /></span> : "View"}
    </button>
  );
};
