import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const BUCKET = 'documents';

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
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch knowledge docs:', error);
    } else {
      setDocs(data);
    }
  };

  const uploadFile = async (file) => {
    const filePath = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return {
      url: publicUrlData.publicUrl,
      name: file.name,
      path: filePath
    };
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);

    try {
      for (const file of files) {
        const uploaded = await uploadFile(file);

        const { error } = await supabase.from('knowledge_base').insert([
          {
            title,
            description,
            file_url: uploaded.url,
            file_name: uploaded.name,
            created_at: new Date().toISOString()
          }
        ]);

        if (error) throw error;
      }

      setFiles([]);
      setTitle('');
      setDescription('');
      await fetchDocs();
    } catch (err) {
      console.error('Upload failed:', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchDocs();
    } catch (err) {
      console.error('Delete failed:', err.message);
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
          {files.length > 0
            ? `${files.length} file${files.length > 1 ? 's' : ''} selected: ${files
                .map((f) => f.name)
                .join(', ')}`
            : 'No files selected.'}
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
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        className="text-blue-600 underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {doc.file_name || 'View File'}
                      </a>
                    )}
                  </td>
                  <td className="py-2">{doc.title || '-'}</td>
                  <td className="py-2">{doc.description || '-'}</td>
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
