import React, { useEffect, useState } from 'react'
import { fetchDepartments } from '../../utils/EmployeeHelper';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE, apiUrl, fileUrl } from '../../utils/apiConfig'

const Add = () => {
    const [departments, setDepartments] = useState([]);
    const [formData, setFormData] = useState({})
    const [error, setError] = useState('')
    const navigate = useNavigate();
    const today = new Date().toISOString().split('T')[0]
    // Max DOB: must be at least 18 years old
    const maxDob = new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]

    useEffect(() => {
        fetchDepartments().then(setDepartments)
    }, [])

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setError('')
        if (name === "image") setFormData(p => ({ ...p, [name]: files[0] }))
        else setFormData(p => ({ ...p, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (parseInt(formData.salary) <= 0) { setError('Salary must be a positive number.'); return }
        if (formData.dob && formData.dob >= today) { setError('Date of birth must be in the past.'); return }

        const formDataObj = new FormData();
        Object.keys(formData).forEach(key => formDataObj.append(key, formData[key]));
        try {
            const r = await axios.post(`${API_BASE}/api/employee/add`, formDataObj, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            if (r.data.success) navigate("/admin-dashboard/employees");
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to add employee');
        }
    }

    const inputCls = 'mt-1 p-2.5 block w-full border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400'
    const labelCls = 'block text-sm font-medium text-stone-700'

    return (
        <div className="p-6 bg-stone-50 min-h-full">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-stone-800">Add New Employee</h2>
                   
                </div>
                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                    <form onSubmit={handleSubmit}>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                            <div><label className={labelCls}>Full Name</label><input type="text" name='name' onChange={handleChange} placeholder='Ram Kumar' className={inputCls} required /></div>
                            <div><label className={labelCls}>Email Address</label><input type="email" name='email' onChange={handleChange} placeholder='ram@company.com' className={inputCls} required /></div>
                            <div><label className={labelCls}>Employee ID</label><input type="text" name='employeeId' onChange={handleChange} placeholder='EMP001' className={inputCls} required /></div>
                            <div>
                                <label className={labelCls}>Date of Birth</label>
                                <input type="date" name='dob' onChange={handleChange} max={maxDob}
                                    className={inputCls} required />
          
                            </div>
                            <div>
                                <label className={labelCls}>Gender</label>
                                <select name="gender" onChange={handleChange} className={inputCls} required>
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Marital Status</label>
                                <select name="maritalStatus" onChange={handleChange} className={inputCls} required>
                                    <option value="">Select Status</option>
                                    <option value="single">Single</option>
                                    <option value="married">Married</option>
                                </select>
                            </div>
                            <div><label className={labelCls}>Designation</label><input type="text" name='designation' onChange={handleChange} placeholder='Software Engineer' className={inputCls} required /></div>
                            <div>
                                <label className={labelCls}>Department</label>
                                <select name="department" onChange={handleChange} className={inputCls} required>
                                    <option value="">Select Department</option>
                                    {departments.map(dep => <option key={dep._id} value={dep._id}>{dep.dep_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Salary (Rs.)</label>
                                <input type="number" name='salary' onChange={handleChange} placeholder='50000' min="1" className={inputCls} required />
                               
                            </div>
                            <div>
    <label className={labelCls}>Temporary Password</label>
    <input type="password" name='password' onChange={handleChange} placeholder='Set a temporary password' className={inputCls} required />
   
</div>
                            <div>
                                <label className={labelCls}>Role</label>
                                <select name="role" onChange={handleChange} className={inputCls} required>
                                    <option value="">Select Role</option>
                                    <option value="admin">Admin</option>
                                    <option value="employee">Employee</option>
                                </select>
                            </div>
                            <div><label className={labelCls}>Profile Photo</label><input type="file" name='image' onChange={handleChange} accept='image/*' className={inputCls} required /></div>
                        </div>
                        <button type='submit' className='w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl transition'>
                            Add Employee
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
export default Add
