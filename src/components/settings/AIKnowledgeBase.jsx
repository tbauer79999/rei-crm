// File: AIKnowledgeBase.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CLOUD_NAME = 'dku1a0kjh'; // Replace with your actual Cloudinary cloud name
const UPLOAD_PRESET = 'unsigned_upload'; // Replace with your actual upload preset

export default function AIKnowledgeBase() {
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await axios.get('/api/knowledge-docs');
      setDocs(res.data);
    } catch (err) {
      console.error('Failed to load knowledge base documents', err);
    }
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!data.secure_url) throw new Error('Cloudinary upload failed');
    return data.secure_url;
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fileUrl = await uploadToCloudinary(file);
        await axios.post('/api/knowledge-upload', {
          title,
          description,
          fileUrl,
          fileName: file.name,
        });
      }

      setFiles([]);
      setTitle('');
      setDescription('');
      await fetchDocs();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/knowledge-docs/${id}`);
      await fetchDocs();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">AI Knowledge Base</h2>

      <div className="bg-white p-4 rounded shadow space-y-4">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <input
          type="file"
          multiple
          onChange={(e) => setFiles([...e.target.files])}
        />
        <p className="text-sm text-gray-600">
          {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} selected: ${files.map(f => f.name).join(', ')}` : 'No files selected.'}
        </p>
        <button
          onClick={handleUpload}
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Uploaded Documents</h3>
        {docs.length === 0 ? (
          <p className="text-gray-500 text-sm">No files uploaded yet.</p>
        ) : (
          <table className="w-full text-sm text-left border-t">
            <thead>
              <tr className="border-b font-medium text-gray-700">
                <th className="py-2">Filename</th>
                <th className="py-2">Title</th>
                <th className="py-2">Description</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b">
                  <td className="py-2">
                    {doc.fields.File && doc.fields.File[0] && (
                      <a
                        href={doc.fields.File[0].url}
                        className="text-blue-600 underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {doc.fields.File[0].filename}
                      </a>
                    )}
                  </td>
                  <td className="py-2">{doc.fields.Title || '-'}</td>
                  <td className="py-2">{doc.fields.Description || '-'}</td>
                  <td className="py-2">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
