import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DataTable from 'react-data-table-component';
import { columns, DepartmentButtons, customTableStyles } from '../../utils/DepartmentHelper'
import axios from "axios"
import { API_BASE } from '../../utils/apiConfig'
import { FaBuilding } from 'react-icons/fa'

const DepartmentList = () => {

  const [departments, setDepartments] = useState([]);
  const [depLoading, setDepLoading] = useState(false);
  const [filteredDepartments, setFilteredDepartments] = useState([]);

  const onDepartmentDelete = () => { fetchDepartments(); }

  const fetchDepartments = async () => {
    setDepLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/department`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      })
      if (response.data.success) {
        let sno = 1;
        const data = response.data.departments.map((dep) => ({
          _id: dep._id,
          sno: sno++,
          dep_name: dep.dep_name,
          action: (<DepartmentButtons Id={dep._id} onDepartmentDelete={onDepartmentDelete} />),
        }));
        setDepartments(data);
        setFilteredDepartments(data);
      }
    } catch (error) {
      if (error.response && !error.response.data.success) {
        alert(error.response.data.error);
      }
    } finally {
      setDepLoading(false);
    }
  };

  useEffect(() => { fetchDepartments(); }, []);

  const filterDepartments = (e) => {
    const records = departments.filter(dep =>
      dep.dep_name.toLowerCase().includes(e.target.value.toLowerCase()))
    setFilteredDepartments(records);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center shadow-md">
            <FaBuilding className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Departments</h2>
            <p className="text-sm text-gray-500">{departments.length} total departments</p>
          </div>
        </div>
        <Link
          to="/admin-dashboard/add-department"
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition"
        >
          + Add Department
        </Link>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by department name..."
            onChange={filterDepartments}
            className="w-72 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        {depLoading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : (
          <DataTable.default
            columns={columns}
            data={filteredDepartments}
            pagination
            customStyles={customTableStyles}
          />
        )}
      </div>
    </div>
  )
}

export default DepartmentList