import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import './FileList.css';

function FileList() {
  const { isAdmin, loading: authLoading } = useAuth();
  const history = useHistory();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setFiles(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return; // ⛔ wait for auth
    
    console.log('FileList useEffect - isAdmin:', isAdmin());
    
    if (!isAdmin()) {
      console.log('Not admin, redirecting to dashboard');
      history.push('/dashboard');
    } else {
      console.log('Is admin, fetching files');
      fetchFiles();
    }
  }, [authLoading]);

  const getFileIcon = (fileName) => {
    return '📕';
  };

  const getFileType = (fileName) => {
    return 'PDF';
  };

  const downloadFile = async (fileUrl) => {
    try {
      const { data, error } = await supabase.storage
        .from('office-forms')
        .download(fileUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileUrl.split('_').slice(1).join('_') || fileUrl;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error downloading file: ' + error.message);
    }
  };

  const viewFile = async (fileUrl) => {
    try {
      const { data, error } = await supabase.storage
        .from('office-forms')
        .download(fileUrl);

      if (error) throw error;

      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Open PDF in new tab
      window.open(url, '_blank');
      
      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      alert('Error viewing file: ' + error.message);
    }
  };

  const deleteFile = async (fileId, fileUrl) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      if (fileUrl) {
        await supabase.storage.from('office-forms').remove([fileUrl]);
      }

      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
      fetchFiles();
    } catch (error) {
      alert('Error deleting file: ' + error.message);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <button 
          type="button"
          onClick={() => history.push('/dashboard')} 
          className="btn-back"
        >
          ← Back
        </button>
        <h1>Files</h1>
      </header>

      <div className="content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h2>No Files Yet</h2>
            <p>Upload your first document to get started</p>
          </div>
        ) : (
          <div className="files-list">
            {files.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-info">
                  <div className="file-header">
                    <span className="file-icon-large">{getFileIcon(file.file_url || '')}</span>
                    <div>
                      <h3>{file.student_name}</h3>
                      <p>{file.form_type}</p>
                    </div>
                  </div>
                  <div className="file-meta">
                    <span className="file-type-badge">{getFileType(file.file_url || '')}</span>
                    <span className="file-date">
                      {new Date(file.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="file-actions">
                  <span className={`badge badge-${file.classification.toLowerCase()}`}>
                    {file.classification}
                  </span>
                  {file.file_url && (
                    <>
                      <button
                        onClick={() => viewFile(file.file_url)}
                        className="btn-view"
                        title="View Document"
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => downloadFile(file.file_url)}
                        className="btn-secondary"
                        title="Download Document"
                      >
                        ⬇️ Download
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => deleteFile(file.id, file.file_url)}
                    className="btn-danger"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FileList;
