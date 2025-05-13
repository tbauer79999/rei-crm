import React, { useState } from 'react';
import axios from 'axios';

export default function AddLead() {
  const [activeTab, setActiveTab] = useState('single');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedFile(null);
    setUploadStatus('');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setUploadStatus('');
  };

  const handleBulkSubmit = async () => {
    if (!selectedFile) return;

    try {
      const text = await selectedFile.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.trim());
        const entry = {};
        headers.forEach((h, i) => {
          entry[h] = values[i] || '';
        });
        return entry;
        
      });

      const res = await axios.post('/api/properties/bulk', data);
      setUploadStatus(`✅ Successfully uploaded ${res.data.length} records.`);
    } catch (err) {
      console.error(err);
      setUploadStatus('❌ Upload failed. Please check your file format.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 bg-white rounded shadow">
      <div className="flex space-x-4 border-b pb-2">
        <button
          className={`font-semibold ${activeTab === 'single' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
          onClick={() => handleTabChange('single')}
        >
          Single Upload
        </button>
        <button
          className={`font-semibold ${activeTab === 'bulk' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
          onClick={() => handleTabChange('bulk')}
        >
          Bulk Upload
        </button>
      </div>

      {activeTab === 'single' && (
        <div>
          <h2 className="text-xl font-bold mb-4">Add Lead (Single)</h2>
          {/* Your existing single lead form goes here */}
          <p className="text-gray-500">Single upload form placeholder</p>
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Bulk Upload</h2>
          <input type="file" accept=".csv" onChange={handleFileSelect} />
          {selectedFile && (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">Selected: {selectedFile.name}</p>
              <button
                onClick={handleBulkSubmit}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Submit
              </button>
            </div>
          )}
          {uploadStatus && (
            <div className="text-sm mt-2 font-medium text-green-700">{uploadStatus}</div>
          )}
        </div>
      )}
    </div>
  );
}
