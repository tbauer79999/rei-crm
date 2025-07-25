import React, { useState, useEffect } from 'react';
import axios from 'axios';
import supabase from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../lib/permissions';
import { Input } from '../ui/input.jsx';
import Button from '../ui/button.jsx';
import { Card } from '../ui/card.jsx';
import { FileText, Trash2, AlertCircle, CheckCircle, Globe, Plus, RefreshCw } from 'lucide-react';

const AIKnowledgeBase = () => {
  const { user, hasPermission } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Permission checks
  const canViewKnowledgeBase = hasPermission(PERMISSIONS.VIEW_AI_BUNDLE_PREVIEW) || hasPermission(PERMISSIONS.UPLOAD_KNOWLEDGE_BASE_DOCS);
  const canUploadDocs = hasPermission(PERMISSIONS.UPLOAD_KNOWLEDGE_BASE_DOCS);
  const canDeleteDocs = hasPermission(PERMISSIONS.DELETE_KB_DOCS);
  
  // New state for websites
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' or 'websites'
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteTitle, setWebsiteTitle] = useState('');
  const [addingWebsite, setAddingWebsite] = useState(false);
  const [websites, setWebsites] = useState([]);
  const [processingWebsites, setProcessingWebsites] = useState(new Set());

  useEffect(() => {
    // ADD THESE DEBUG LOGS:
    console.log('🔍 Current user:', user);
    console.log('🔍 User tenant_id:', user?.tenant_id);
    console.log('🔍 User role:', user?.role);
    console.log('🔍 canViewKnowledgeBase:', canViewKnowledgeBase);
    if (canViewKnowledgeBase) {
      fetchKnowledgeBase();
      if (activeTab === 'websites') {
        fetchWebsites();
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [activeTab, canViewKnowledgeBase]);

  const fetchKnowledgeBase = async () => {
    if (!canViewKnowledgeBase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) return console.error('No auth token found');

      const res = await axios.get(`${process.env.REACT_APP_API_URL}/knowledge/docs`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const docsData = Array.isArray(res.data) ? res.data : res.data.data || [];
      
      // Filter out websites - only show actual documents
      const documentsOnly = docsData.filter(doc => 
        doc.source_type !== 'website' && 
        !doc.website_url && 
        doc.file_url && 
        !doc.title?.startsWith('http')
      );

      setDocuments(documentsOnly);

    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load documents');
    }
  };

  const fetchWebsites = async () => {
    if (!canViewKnowledgeBase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const { data: profile } = await supabase
        .from('users_profile')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

      if (!profile?.tenant_id) return;

      const { data: websiteData, error: fetchError } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('source_type', 'website')
        .order('created_at', { ascending: false });

      if (!fetchError && websiteData) {
        setWebsites(websiteData);
      }
    } catch (err) {
      console.error('Failed to fetch websites:', err);
    }
  };

  const handleFileChange = (e) => {
    if (!canUploadDocs) {
      setError("You don't have permission to upload documents.");
      return;
    }

    const file = e.target.files?.[0];
    setSelectedFile(file);
    setError('');
    setSuccess('');
  };

  const handleUpload = async () => {
    if (!canUploadDocs) {
      setError("You don't have permission to upload documents.");
      return;
    }

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

      const uploadResponse = await axios.post(
        `${process.env.REACT_APP_API_URL}/knowledge/upload`,
        uploadPayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const docId = uploadResponse.data?.record?.id;
      if (!docId) throw new Error('Upload succeeded but document ID missing');

      // ✅ REMOVED EDGE FUNCTION CALL - Database trigger will handle processing automatically

      setSuccess('File uploaded successfully! Processing will begin automatically.');
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

  const handleAddWebsite = async () => {
    if (!canUploadDocs) {
      setError("You don't have permission to add websites to the knowledge base.");
      return;
    }

    if (!websiteUrl || !websiteUrl.startsWith('http')) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setAddingWebsite(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No authentication found');

      const { data: profile } = await supabase
        .from('users_profile')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Could not retrieve tenant information');

      // Insert website into knowledge_base
      const { data: insertData, error: insertError } = await supabase
        .from('knowledge_base')
        .insert({
          tenant_id: profile.tenant_id,
          source_type: 'website',
          website_url: websiteUrl,
          title: websiteTitle || new URL(websiteUrl).hostname,
          ingestion_status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess('Website added successfully! It will be processed shortly.');
      setWebsiteUrl('');
      setWebsiteTitle('');
      fetchWebsites();
      
      // Start processing indicator
      setProcessingWebsites(prev => new Set(prev).add(insertData.id));
      
      setTimeout(() => {
        setSuccess('');
        // Poll for status updates
        pollWebsiteStatus(insertData.id);
      }, 3000);

    } catch (err) {
      console.error('Failed to add website:', err);
      setError(err.message || 'Failed to add website');
    } finally {
      setAddingWebsite(false);
    }
  };

  const pollWebsiteStatus = async (websiteId) => {
    const maxAttempts = 180; // 15 minutes total
    let attempts = 0;
    
    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const { data, error } = await supabase
          .from('knowledge_base')
          .select('ingestion_status')
          .eq('id', websiteId)
          .single();

        if (data?.ingestion_status === 'complete' || data?.ingestion_status === 'failed') {
          clearInterval(interval);
          setProcessingWebsites(prev => {
            const newSet = new Set(prev);
            newSet.delete(websiteId);
            return newSet;
          });
          fetchWebsites();
          
          if (data.ingestion_status === 'complete') {
            setSuccess('Website processed successfully!');
            setTimeout(() => setSuccess(''), 3000);
          } else {
            setError('Website processing failed. Please try again.');
            setTimeout(() => setError(''), 5000);
          }
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setProcessingWebsites(prev => {
            const newSet = new Set(prev);
            newSet.delete(websiteId);
            return newSet;
          });
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 5000); // Check every 5 seconds
  };

  const handleDeleteWebsite = async (websiteId) => {
    if (!canDeleteDocs) {
      setError("You don't have permission to delete knowledge base content.");
      return;
    }

    if (!window.confirm('Are you sure you want to delete this website and all its content?')) return;

    try {
      // Delete website and its chunks
      const { error: deleteError } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', websiteId);

      if (deleteError) throw deleteError;

      setSuccess('Website deleted successfully!');
      fetchWebsites();
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError(err.message || 'Failed to delete website');
    }
  };

  const handleDelete = async (docId) => {
    if (!canDeleteDocs) {
      setError("You don't have permission to delete documents.");
      return;
    }

    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token found');

      await axios.delete(
        `${process.env.REACT_APP_API_URL}/knowledge/docs/${docId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSuccess('Document deleted successfully!');
      fetchKnowledgeBase();
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Delete failed';
      setError(errorMessage);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'complete':
        return <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Complete</span>;
      case 'pending':
        return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Processing</span>;
      case 'failed':
        return <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Failed</span>;
      default:
        return null;
    }
  };

  // Permission check - show access denied if user can't view knowledge base
  if (!canViewKnowledgeBase) {
    return (
      <div className="p-6 text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to view the AI knowledge base.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <FileText className="w-6 h-6 text-gray-600" />
        <div>
          <h2 className="text-xl font-semibold">AI Knowledge Base</h2>
          <p className="text-sm text-gray-500">
            Upload documents and add websites for AI context
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

      {/* Permission Check Alert */}
      {!canUploadDocs && canViewKnowledgeBase && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800">
            You have read-only access to the knowledge base. Admin permissions required to upload documents or add websites.
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'documents'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="font-medium">Documents</span>
        </button>
        <button
          onClick={() => setActiveTab('websites')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'websites'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span className="font-medium">Websites</span>
        </button>
      </div>

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center space-x-3">
            <Input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange}
              disabled={!canUploadDocs}
              className="flex-1"
            />
            <Button 
              onClick={handleUpload} 
              disabled={uploading || !selectedFile || !canUploadDocs}
              className="px-6"
            >
              {uploading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </div>
              ) : (
                canUploadDocs ? 'Upload PDF' : 'Upload Restricted'
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
                        {canDeleteDocs && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
              <p className="text-gray-400 text-xs">
                {canUploadDocs 
                  ? 'Upload PDFs to provide context for AI responses.' 
                  : 'Contact an admin to upload documents for AI context.'
                }
              </p>
            </div>
          )}
        </Card>
      )}

      [...everything exactly as you sent, unchanged...]

      {/* Websites Tab */}
      {activeTab === 'websites' && (
        <Card className="p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={!canUploadDocs}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <Input
                  type="text"
                  placeholder="Website name"
                  value={websiteTitle}
                  onChange={(e) => setWebsiteTitle(e.target.value)}
                  disabled={!canUploadDocs}
                  className="w-full"
                />
              </div>
              <Button
                onClick={handleAddWebsite}
                disabled={addingWebsite || !websiteUrl || !canUploadDocs}
                className="px-6 flex items-center space-x-2"
              >
                {addingWebsite ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{canUploadDocs ? 'Add Website' : 'Add Restricted'}</span>
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              {canUploadDocs 
                ? 'The website and its main navigation pages will be automatically scraped and indexed.'
                : 'Contact an admin to add websites to the knowledge base.'
              }
            </p>
          </div>

          {websites.length > 0 ? (
            <div className="pt-4">
              <h3 className="font-medium mb-3 text-gray-900">Added Websites ({websites.length})</h3>
              <ul className="space-y-3">
                {websites.map((website) => (
                  <li key={website.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <p className="font-semibold text-gray-900">{website.title}</p>
                          {getStatusBadge(website.ingestion_status)}
                          {processingWebsites.has(website.id) && (
                            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                          )}
                        </div>
                        <a 
                          href={website.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {website.website_url}
                        </a>
                        {website.created_at && (
                          <p className="text-xs text-gray-400 mt-2">
                            Added: {new Date(website.created_at).toLocaleDateString()}
                          </p>
                        )}
                        {website.metadata?.pages_scraped && (
                          <p className="text-xs text-gray-500 mt-1">
                            {website.metadata.pages_scraped} pages • {website.metadata.total_chunks} chunks indexed
                          </p>
                        )}
                      </div>
                      {canDeleteDocs && (
                        <button
                          onClick={() => handleDeleteWebsite(website.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 ml-4"
                          title="Delete website"
                          disabled={processingWebsites.has(website.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
};

export default AIKnowledgeBase;
