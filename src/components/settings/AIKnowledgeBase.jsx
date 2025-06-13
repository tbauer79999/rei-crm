import React, { useState, useEffect } from 'react';
import axios from 'axios';
import supabase from '../../lib/supabaseClient';
import { Input } from '../ui/input.jsx';
import Button from '../ui/button.jsx';
import { Card } from '../ui/card.jsx';
import { FileText, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

const AIKnowledgeBase = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchKnowledgeBase();
  }, []);

  const fetchKnowledgeBase = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) return console.error('No auth token found');

      const res = await axios.get('http://localhost:5000/api/knowledge/docs', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const docsData = Array.isArray(res.data) ? res.data : res.data.data || [];
      setDocuments(docsData);

    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load documents');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setSelectedFile(file);
    setError('');
    setSuccess('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('No file selected.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token found');

      const { data: profile, error: profileError } = await supabase
        .from('users_profile')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        throw new Error('Could not retrieve tenant information');
      }

      const tenant_id = profile.tenant_id;
      const filePath = `${tenant_id}/${selectedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('documents')
        .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase
        .storage
        .from('documents')
        .getPublicUrl(filePath);

      const file_url = publicData.publicUrl;
      const file_name = selectedFile.name;
      const title = file_name.replace(/\.[^/.]+$/, '');

      const uploadPayload = {
        file_url,
        file_name,
        title,
        description: ''
      };

      const uploadResponse = await axios.post('http://localhost:5000/api/knowledge/upload', uploadPayload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const docId = uploadResponse.data?.record?.id;
      if (!docId) throw new Error('Upload succeeded but document ID missing');

      // 🔥 Trigger Supabase Edge Function to chunk/embed
      await fetch('https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/chunk-and-embed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ document_id: docId })
      });

      setSuccess('File uploaded and processed successfully!');
      setSelectedFile(null);
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      fetchKnowledgeBase();
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('❌ Upload failed:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Upload failed';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token found');

      await axios.delete(`http://localhost:5000/api/knowledge/docs/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Document deleted successfully!');
      fetchKnowledgeBase();
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Delete failed';
      setError(errorMessage);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <FileText className="w-6 h-6 text-gray-600" />
        <div>
          <h2 className="text-xl font-semibold">AI Knowledge Base</h2>
          <p className="text-sm text-gray-500">
            Upload documents and training materials for AI context
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-800 text-sm">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-800 text-sm font-medium">{success}</span>
        </div>
      )}

      <Card className="p-5 space-y-4">
        <div className="flex items-center space-x-3">
          <Input 
            type="file" 
            accept=".pdf" 
            onChange={handleFileChange}
            className="flex-1"
          />
          <Button 
            onClick={handleUpload} 
            disabled={uploading || !selectedFile}
            className="px-6"
          >
            {uploading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Uploading...</span>
              </div>
            ) : (
              'Upload PDF'
            )}
          </Button>
        </div>

        {documents.length > 0 ? (
          <div className="pt-4">
            <h3 className="font-medium mb-3 text-gray-900">Uploaded Documents ({documents.length})</h3>
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li key={doc.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">{doc.title || doc.file_name}</p>
                      <p className="text-xs text-gray-500 mb-2">{doc.file_name}</p>
                      {doc.content && (
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {doc.content.slice(0, 200)}...
                        </p>
                      )}
                      {doc.created_at && (
                        <p className="text-xs text-gray-400 mt-2">
                          Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="pt-4 text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-sm mb-1">No documents uploaded yet.</p>
            <p className="text-gray-400 text-xs">Upload PDFs to provide context for AI responses.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AIKnowledgeBase;
