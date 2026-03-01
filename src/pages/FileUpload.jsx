import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import './FileUpload.css';

function FileUpload() {
  const { isAdmin } = useAuth();
  const history = useHistory();
  const [studentName, setStudentName] = useState('');
  const [formType, setFormType] = useState('');
  const [classification, setClassification] = useState('CONFIDENTIAL');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin()) {
      history.push('/dashboard');
    }
  }, [isAdmin, history]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setMessage('Please select a PDF file only');
        setFile(null);
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        setMessage('File size must be less than 10MB');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let fileUrl = null;
      if (file) {
        const fileName = `${Date.now()}_${file.name}`;
        const { error } = await supabase.storage
          .from('office-forms')
          .upload(fileName, file);
        
        if (error) throw error;
        fileUrl = fileName;
      }

      const { error: dbError } = await supabase
        .from('forms')
        .insert({
          student_name: studentName,
          form_type: formType,
          classification,
          notes,
          file_url: fileUrl,
          created_by: user.id
        });

      if (dbError) throw dbError;

      setMessage('File uploaded successfully!');
      setStudentName('');
      setFormType('');
      setNotes('');
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
      
      setTimeout(() => {
        setMessage('');
        history.push('/files');
      }, 2000);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <button onClick={() => history.push('/dashboard')} className="btn-back">
          ← Back
        </button>
        <h1>Upload File</h1>
      </header>

      <div className="content">
        <div className="form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Student Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter student name"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Form Type</label>
              <input
                type="text"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                placeholder="e.g., Counseling Record, Medical Form"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Classification Level</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                disabled={loading}
              >
                <option value="PUBLIC">Public</option>
                <option value="INTERNAL">Internal</option>
                <option value="CONFIDENTIAL">Confidential</option>
                <option value="RESTRICTED">Restricted</option>
              </select>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes"
                rows="4"
                disabled={loading}
              />
            </div>

            <div className="file-input-container">
              <label htmlFor="file-input" className="file-input-label">
                <div className="file-icon">📎</div>
                <strong>Choose a PDF file</strong>
                <p>or drag and drop here</p>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </label>
              {file && (
                <div className="selected-file">
                  <span className="file-name">📄 {file.name}</span>
                  <span className="file-size">({(file.size / 1024).toFixed(2)} KB)</span>
                </div>
              )}
            </div>

            {message && (
              <div className={`message ${message.includes('success') ? 'message-success' : 'message-error'}`}>
                {message}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Uploading...' : '☁️ Upload File'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default FileUpload;
