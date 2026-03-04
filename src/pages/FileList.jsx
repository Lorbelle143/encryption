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
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const fetchFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('folders')
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

  const openFolder = (folder) => {
    setSelectedFolder(folder);
    setShowPasswordModal(true);
    setPasswordInput('');
    setPasswordError('');
  };

  const verifyPassword = () => {
    if (passwordInput === selectedFolder.folder_password) {
      setShowPasswordModal(false);
      setPasswordError('');
      // Show files in the folder
      alert(`Folder unlocked! Files: ${selectedFolder.file_urls.length}`);
      // You can implement a file viewer here
    } else {
      setPasswordError('Incorrect password');
    }
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
      a.download = fileUrl.split('/').pop();
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
      
      window.open(url, '_blank');
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      alert('Error viewing file: ' + error.message);
    }
  };

  const deleteFile = async (folderId, fileUrls) => {
    if (!window.confirm('Are you sure you want to delete this folder and all its files?')) {
      return;
    }

    try {
      // Delete all files in the folder
      if (fileUrls && fileUrls.length > 0) {
        await supabase.storage.from('office-forms').remove(fileUrls);
      }

      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      fetchFiles();
    } catch (error) {
      alert('Error deleting folder: ' + error.message);
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
            {files.map((folder) => (
              <div key={folder.id} className="file-item">
                <div className="file-info">
                  <div className="file-header">
                    <span className="file-icon-large">📁</span>
                    <div>
                      <h3>{folder.folder_name}</h3>
                      <p>{folder.file_count} file(s)</p>
                    </div>
                  </div>
                  <div className="file-meta">
                    <span className="file-date">
                      {new Date(folder.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {folder.notes && (
                    <p className="folder-notes">{folder.notes}</p>
                  )}
                </div>
                <div className="file-actions">
                  <span className={`badge badge-${folder.classification.toLowerCase()}`}>
                    {folder.classification}
                  </span>
                  <button
                    onClick={() => openFolder(folder)}
                    className="btn-view"
                    title="Open Folder"
                  >
                    🔓 Open
                  </button>
                  <button
                    onClick={() => deleteFile(folder.id, folder.file_urls)}
                    className="btn-danger"
                    title="Delete Folder"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && selectedFolder && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>🔒 Enter Password</h2>
            <p>This folder is password protected</p>
            <p><strong>{selectedFolder.folder_name}</strong></p>
            
            <div className="form-group" style={{ marginTop: '20px' }}>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter folder password"
                onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
                autoFocus
              />
            </div>

            {passwordError && (
              <div className="message" style={{ color: '#eb445a', marginTop: '10px' }}>
                {passwordError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={verifyPassword} className="btn-primary">
                Unlock
              </button>
              <button onClick={() => setShowPasswordModal(false)} className="btn-secondary">
                Cancel
              </button>
            </div>

            {/* Show files after unlock */}
            {passwordInput === selectedFolder.folder_password && (
              <div style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
                <h3>Files in folder:</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {selectedFolder.file_urls.map((fileUrl, index) => (
                    <div key={index} style={{ 
                      padding: '10px', 
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>📄 {fileUrl.split('/').pop()}</span>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => viewFile(fileUrl)}
                          className="btn-view"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => downloadFile(fileUrl)}
                          className="btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          ⬇️ Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FileList;
