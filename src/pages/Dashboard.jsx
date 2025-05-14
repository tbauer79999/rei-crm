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
  const navigate = useNavigate();

  const goToAnalytics = () => navigate('/analytics');
  const goToSettings = () => navigate('/settings');

  useEffect(() => {
    fetchLeads();
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
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold text-gray-800">Lead Dashboard</h1>
        <div className="flex gap-3">
          <button onClick={goToAnalytics} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm">Analytics</button>
          <button onClick={goToSettings} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm">Settings</button>
          <button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm">
            {showForm ? 'Close Form' : 'Add Lead'}
          </button>
        </div>
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
              <input type="text" placeholder="Owner Name" className="p-2 border rounded" />
              <input type="text" placeholder="Property Address" className="p-2 border rounded" />
              <select className="p-2 border rounded">
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

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
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
              className={`bg-white p-4 rounded-md shadow text-center cursor-pointer ${
                filterStatus === status ? 'border-blue-600 border-2' : 'border'
              }`}
            >
              <div className="text-sm text-gray-600">{status}</div>
              <div className="text-2xl font-bold text-gray-800">{count}</div>
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

      <div className="overflow-x-auto bg-white rounded-md shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Owner Name</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Property Address</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center text-sm text-gray-500 py-6">
                    No leads found for this view.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} onClick={() => handleRowClick(lead.id)} className="cursor-pointer hover:bg-gray-100">
                    <td className="border px-4 py-2">{lead.fields?.["Owner Name"] || '—'}</td>
                    <td className="border px-4 py-2">{lead.fields?.["Property Address"] || '—'}</td>
                    <td className="border px-4 py-2">{lead.fields?.Status || '—'}</td>
                  </tr>
                ))
              )}
</tbody>

        </table>
      </div>
    </div>
  );
}
