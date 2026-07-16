import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from '../utils/apiConfig'
import { useState } from "react";
import ConfirmModal from '../components/ConfirmModal';

export const DepartmentButtons = ({ Id, onDepartmentDelete }) => {
    const navigate = useNavigate();
    const [showConfirm, setShowConfirm] = useState(false);

    const handleDelete = async () => {
        setShowConfirm(false);
        try {
            const response = await axios.delete(`${API_BASE}/api/department/${Id}`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            })
            if (response.data.success) onDepartmentDelete();
        } catch (error) {
            if (error.response && !error.response.data.success) {
                alert(error.response.data.error);
            }
        }
    };

    return (
        <>
            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Department?"
                message="Are you sure you want to delete this department?"
                onConfirm={handleDelete}
                onCancel={() => setShowConfirm(false)}
            />
            <div className="flex gap-2">
                <button
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition"
                    onClick={() => navigate(`/admin-dashboard/department/${Id}`)}>
                    Edit
                </button>
                <button
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition"
                    onClick={() => setShowConfirm(true)}>
                    Delete
                </button>
            </div>
        </>
    );
};

export const columns = [
    { name: "S.No",            selector: row => row.sno,      width: "80px" },
    { name: "Department Name", selector: row => row.dep_name, sortable: true, grow: 2 },
    { name: "Action",          selector: row => row.action },
];

// Custom styles to override DataTable's default purple theme
export const customTableStyles = {
    headRow: {
        style: {
            backgroundColor: '#f5f5f4',
            borderBottom: '1px solid #e7e5e4',
            fontWeight: '700',
            fontSize: '12px',
            textTransform: 'uppercase',
            color: '#78716c',
            letterSpacing: '0.05em',
        }
    },
    headCells: { style: { paddingLeft: '20px', paddingRight: '20px' } },
    cells:     { style: { paddingLeft: '20px', paddingRight: '20px', paddingTop: '12px', paddingBottom: '12px' } },
    rows: {
        style: { fontSize: '14px', color: '#44403c', borderBottom: '1px solid #f5f5f4' },
        highlightOnHoverStyle: { backgroundColor: '#f0fdf9', borderBottomColor: '#e7e5e4', transition: 'all 0.1s' },
    },
    pagination: {
        style: { borderTop: '1px solid #e7e5e4', backgroundColor: '#fafaf9', color: '#78716c', fontSize: '13px' }
    },
};
