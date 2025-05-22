import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Papa from 'papaparse';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [filterStatus, setFilterStatus] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('single');
  const [fileReady, setFileReady] = useState(false);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      return;
    }

    setLeads(data);
    setFilteredLeads(data);
  };

  useEffect(() => {
    let updated = [...leads];
    if (filterStatus) {
      updated = updated.filter(lead => lead.status === filterStatus);
    }
    if (search.trim()) {
      const lower = search.toLowerCase();
      updated = updated.filter(lead =>
        lead.owner_name?.toLowerCase().includes(lower) ||
        lead.property_address?.toLowerCase().includes(lower)
      );
    }
    setFilteredLeads(updated);
  }, [search, filterStatus, leads]);

  const handleRowClick = (id) => {
    navigate(`/lead/${id}`);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const records = results.data.map(row => ({
          fields: {
            "Owner Name": row["Owner Name"],
            "Property Address": row["Property Address"],
            "City": row["City"],
            "State": row["State"],
            "Zip Code": row["Zip Code"],
            "Phone": row["Phone"],
            "Email": row["Email"],
            "Bedrooms": row["Bedrooms"],
            "Bathrooms": row["Bathrooms"],
            "Square Footage": row["Square Footage"],
            "Notes": row["Notes"],
            "Status": row["Status"] || "New Lead",
            "Campaign": row["Campaign"]
          }
        }));
        setParsedRecords(records);
        setFileReady(true);
        setUploadMessage('');
        setUploadError(false);
      }
    });
  };

  const handleBulkSubmit = async () => {
    try {
      const res = await axios.post('/api/properties/bulk', { records: parsedRecords });
      const { uploaded = 0, skipped = 0, added = 0 } = res.data;
      setUploadMessage(`${uploaded} uploaded. ${skipped} failed. ${added} added.`);
      setUploadError(skipped > 0);
      setFileReady(false);
      setParsedRecords([]);
      await fetchLeads();
    } catch (err) {
      const data = err.response?.data;
      if (data?.uploaded !== undefined) {
        setUploadMessage(`${data.uploaded} uploaded. ${data.skipped} failed. ${data.added} added.`);
        setUploadError(true);
      } else {
        setUploadMessage('Bulk upload failed.');
        setUploadError(true);
      }
    }
  };

  const downloadSampleCSV = () => {
    const headers = [
      'Owner Name', 'Property Address', 'City', 'State', 'Zip Code',
      'Phone', 'Email', 'Bedrooms', 'Bathrooms', 'Square Footage',
      'Notes', 'Campaign'
    ];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statuses = [
    'All',
    'Hot Lead',
    'Warm Lead',
    'Cold Lead',
    'New Lead',
    'Nurtured',
    'Unsubscribed',
  ];

  return (
    <div className="p-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-700">
          Showing {filteredLeads.length} {(filterStatus || 'All').toLowerCase()} lead{filteredLeads.length !== 1 ? 's' : ''}
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 flex items-center gap-2"
        >
          + Add Lead
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-4 rounded-md shadow-md mb-6">
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setTab('single')}
              className={`px-4 py-2 rounded ${tab === 'single' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
            >
              Single Entry
            </button>
            <button
              onClick={() => setTab('bulk')}
              className={`px-4 py-2 rounded ${tab === 'bulk' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
            >
              Bulk Upload
            </button>
          </div>

          {tab === 'bulk' && (
            <div>
              <p className="text-sm mb-2">
                Upload a CSV with standard lead columns.&nbsp;
                <button onClick={downloadSampleCSV} className="text-blue-600 underline text-sm">
                  Download Sample CSV
                </button>
              </p>
              <div className="flex items-center gap-4 mb-4">
                <input type="file" accept=".csv" onChange={handleFileChange} />
              </div>
              {fileReady && (
                <button onClick={handleBulkSubmit} className="bg-blue-600 text-white px-4 py-2 rounded">
                  Submit Bulk Upload
                </button>
              )}
              {uploadMessage && (
                <p className={`mt-2 text-sm ${uploadError ? 'text-red-600' : 'text-green-600'}`}>
                  {uploadMessage}
                </p>
              )}
            </div>
          )}

          {tab === 'single' && (
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Owner Name" className="p-2 border rounded text-sm" />
              <input type="text" placeholder="Property Address" className="p-2 border rounded text-sm" />
              <select className="p-2 border rounded text-sm">
                <option>Status</option>
                <option>New Lead</option>
                <option>Hot Lead</option>
                <option>Warm Lead</option>
                <option>Cold Lead</option>
                <option>Nurtured</option>
                <option>Unsubscribed</option>
              </select>
              <button className="bg-blue-600 text-white rounded px-4 py-2 mt-2 md:mt-0">
                Submit
              </button>
            </form>
          )}
        </div>
      )}

      <div className="flex space-x-2 mb-4">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status === 'All' ? null : status)}
            className={`px-4 py-1.5 rounded-full border text-sm font-medium transition ${
              (filterStatus === status || (status === 'All' && filterStatus === null))
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Search by name or address..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 p-2 w-full border rounded text-sm"
      />

      <div className="overflow-x-auto bg-white rounded-md shadow border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Owner Name</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Property Address</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center text-sm text-gray-500 py-4">
                  No leads found for this view.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead.id} onClick={() => handleRowClick(lead.id)} className="cursor-pointer hover:bg-gray-100">
                  <td className="border-t px-3 py-1 text-sm truncate max-w-xs">
                    {lead.owner_name || '—'}
                  </td>
                  <td className="border-t px-3 py-1 text-sm truncate max-w-xs">
                    {lead.property_address || '—'}
                  </td>
                  <td className="border-t px-3 py-1 text-sm">
                    {lead.status || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
