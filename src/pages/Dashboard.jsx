import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Papa from 'papaparse';

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
  const [statusOptions, setStatusOptions] = useState([]);
  const navigate = useNavigate();

  const goToAnalytics = () => navigate('/analytics');
  const goToSettings = () => navigate('/settings');

  useEffect(() => {
    fetchLeads();
    fetchStatuses();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await axios.get('/api/properties');
      setLeads(res.data);
      setFilteredLeads(res.data);
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  const fetchStatuses = async () => {
    try {
      const res = await axios.get('/api/settings');
      const raw = res.data?.['Statuses']?.value || '';
      const split = raw.split('\n').map(s => s.trim()).filter(Boolean);
      setStatusOptions(split);
    } catch (err) {
      console.error('Failed to load statuses:', err);
    }
  };

  useEffect(() => {
    let updated = [...leads];
    if (filterStatus) {
      updated = updated.filter(lead => lead.fields?.Status === filterStatus);
    }
    if (search.trim()) {
      const lower = search.toLowerCase();
      updated = updated.filter(lead =>
        lead.fields?.["Owner Name"]?.toLowerCase().includes(lower) ||
        lead.fields?.["Property Address"]?.toLowerCase().includes(lower)
      );
    }
    setFilteredLeads(updated);
  }, [search, filterStatus, leads]);

  const handleCardClick = (status) => {
    setFilterStatus(status === 'All' ? null : status);
  };

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
      'Notes', 'Status', 'Campaign'
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Lead Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={goToAnalytics}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Analytics
          </button>
          <button
            onClick={goToSettings}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Settings
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {showForm ? 'Close Form' : 'Add Lead'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-100 p-4 rounded shadow mb-6">
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
                <button
                  onClick={handleBulkSubmit}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
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
              <input type="text" placeholder="Owner Name" className="p-2 border rounded" />
              <input type="text" placeholder="Property Address" className="p-2 border rounded" />
              <select className="p-2 border rounded">
                <option disabled selected>Select Status</option>
                {statusOptions.map((status, i) => (
                  <option key={i}>{status}</option>
                ))}
              </select>
              <button className="bg-blue-600 text-white rounded px-4 py-2 mt-2 md:mt-0">
                Submit
              </button>
            </form>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-6">
        {[
          'All',
          'Hot Lead',
          'Warm Lead',
          'Cold Lead',
          'New Lead',
          'Nurtured',
          'Unsubscribed',
        ].map((status) => {
          const count =
            status === 'All'
              ? leads.length
              : leads.filter((l) => l.fields?.Status === status).length;

          return (
            <div
              key={status}
              onClick={() => handleCardClick(status)}
              className={`p-4 rounded shadow cursor-pointer border text-center ${
                filterStatus === status ? 'bg-blue-100' : 'bg-white'
              }`}
            >
              <div className="text-sm font-medium">{status}</div>
              <div className="text-xl font-bold">{count}</div>
            </div>
          );
        })}
      </div>

      <input
        type="text"
        placeholder="Search by name or address..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 p-2 w-full border rounded"
      />

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left">Owner Name</th>
              <th className="px-4 py-2 text-left">Property Address</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => handleRowClick(lead.id)}
                className="cursor-pointer hover:bg-gray-100"
              >
                <td className="border px-4 py-2">{lead.fields?.["Owner Name"] || '—'}</td>
                <td className="border px-4 py-2">{lead.fields?.["Property Address"] || '—'}</td>
                <td className="border px-4 py-2">{lead.fields?.Status || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
