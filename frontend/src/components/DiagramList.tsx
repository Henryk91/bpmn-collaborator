import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Diagram } from '../types';
import './DiagramList.css';

const DiagramList: React.FC = () => {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDiagramName, setNewDiagramName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDiagrams();
  }, []);

  const fetchDiagrams = async () => {
    try {
      setError(null);
      const data = await api.getDiagrams();
      setDiagrams(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load diagrams';
      setError(errorMessage);
      console.error('Error fetching diagrams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiagram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiagramName.trim() || isCreating) return;

    try {
      setIsCreating(true);
      setError(null);
      const diagram = await api.createDiagram(newDiagramName.trim());
      navigate(`/diagram/${diagram.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create diagram';
      setError(errorMessage);
      console.error('Error creating diagram:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleShare = async (diagramId: string) => {
    const shareUrl = `${window.location.origin}/diagram/${diagramId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Could use a toast notification here instead of alert
      alert('Share link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy share link');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Check if it's an XML file
    if (!file.name.endsWith('.xml') && !file.name.endsWith('.bpmn')) {
      setError('Please select a valid BPMN XML file (.xml or .bpmn)');
      return;
    }

    try {
      setIsImporting(true);
      setError(null);

      // Read file content
      const fileContent = await file.text();

      // Validate it's XML
      if (!fileContent.trim().startsWith('<?xml') && !fileContent.trim().startsWith('<bpmn')) {
        setError('Invalid BPMN XML file. The file must contain valid XML.');
        return;
      }

      // Extract diagram name from filename (without extension)
      const diagramName = file.name.replace(/\.(xml|bpmn)$/i, '') || 'Imported Diagram';

      // Create diagram with imported XML
      const diagram = await api.createDiagram(diagramName, fileContent);
      navigate(`/diagram/${diagram.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import diagram';
      setError(errorMessage);
      console.error('Error importing diagram:', err);
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="diagram-list-container">
        <div className="loading">Loading diagrams...</div>
      </div>
    );
  }

  return (
    <div className="diagram-list-container">
      <div className="diagram-list-header">
        <h1>BPMN Collaborator</h1>
        <p className="subtitle">Real-time collaborative BPMN diagram editor</p>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="diagram-list-content">
        <div className="create-section">
          <div className="action-buttons">
            <button
              className="create-button"
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setNewDiagramName('');
                setError(null);
              }}
              disabled={isCreating || isImporting}
            >
              {showCreateForm ? 'Cancel' : '+ Create New Diagram'}
            </button>
            <button
              className="import-button"
              onClick={handleImportClick}
              disabled={isCreating || isImporting}
            >
              {isImporting ? 'Importing...' : '📥 Import Diagram'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.bpmn"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateDiagram} className="create-form">
              <input
                type="text"
                placeholder="Diagram name"
                value={newDiagramName}
                onChange={(e) => setNewDiagramName(e.target.value)}
                className="create-input"
                autoFocus
                disabled={isCreating}
                maxLength={200}
              />
              <button type="submit" className="submit-button" disabled={isCreating || !newDiagramName.trim()}>
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </form>
          )}
        </div>

        {!diagrams || diagrams.length === 0 ? (
          <div className="empty-state">
            <p>No diagrams yet. Create your first diagram to get started!</p>
          </div>
        ) : (
          <div className="diagrams-grid">
            {diagrams.map((diagram) => (
              <div key={diagram.id} className="diagram-card">
                <div className="diagram-card-header">
                  <h3>{diagram.name}</h3>
                  <button
                    className="share-button list-share-button"
                    onClick={() => handleShare(diagram.id)}
                    title="Copy share link"
                  >
                    🔗 Share
                  </button>
                </div>
                <div className="diagram-card-info">
                  <p>Updated: {new Date(diagram.updated_at).toLocaleDateString()}</p>
                </div>
                <button
                  className="open-button"
                  onClick={() => navigate(`/diagram/${diagram.id}`)}
                >
                  Open Diagram
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagramList;
