import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../utils/api';
import { MESSAGE_TYPES, DIAGRAM_UPDATE_DEBOUNCE_MS } from '../constants';
import { 
  AllWebSocketMessages, 
  DiagramStateMessage, 
  DiagramUpdateMessage, 
  EventBus,
  ElementRegistry,
  Canvas,
  Overlays,
  SelectionChangedEvent,
  EventBusChangeEvent
} from '../types';
import './DiagramEditor.css';
import { sanitizeFileName, triggerDownload } from '../utils/utils';

const DiagramEditor: React.FC = () => {
  const { diagramId } = useParams<{ diagramId: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [diagramName, setDiagramName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [userName, setUserName] = useState(() => {
    // Load from localStorage or use empty string
    return localStorage.getItem('bpmn_user_name') || '';
  });
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserLockedElementsRef = useRef<Set<string>>(new Set());
  const elementLocksRef = useRef<Record<string, { user_id: string; user_name: string }>>({}); // All locks from server
  const isApplyingRemoteUpdateRef = useRef<boolean>(false);
  const myUserNameRef = useRef<string>('');

  const updateLockMarker = useCallback((elementId: string, userName: string) => {
    if (!modelerRef.current) return;

    const canvas = modelerRef.current.get('canvas') as Canvas;
    const elementRegistry = modelerRef.current.get('elementRegistry') as ElementRegistry;
    const overlays = modelerRef.current.get('overlays') as Overlays;

    const element = elementRegistry.get(elementId);
    if (!element) return;

    // Remove existing marker
    canvas.removeMarker(elementId, 'user-lock');

    // Add new marker
    canvas.addMarker(elementId, 'user-lock');

    // Add overlay with user name
    overlays.remove({ element: elementId, type: 'lock-overlay' });
    overlays.add(elementId, 'lock-overlay', {
      position: { top: -10, left: 0 },
      html: `<div class="lock-overlay">🔒 ${userName}</div>`,
    });
  }, []);

  const removeLockMarker = useCallback((elementId: string) => {
    if (!modelerRef.current) return;

    const canvas = modelerRef.current.get('canvas') as Canvas;
    const overlays = modelerRef.current.get('overlays') as Overlays;

    canvas.removeMarker(elementId, 'user-lock');
    overlays.remove({ element: elementId, type: 'lock-overlay' });
  }, []);

  const updateLockMarkers = useCallback((locks: Record<string, { user_id: string; user_name: string }>) => {
    if (!modelerRef.current) return;
    // Get all current elements to check which ones need marker removal
    const elementRegistry = modelerRef.current.get('elementRegistry') as ElementRegistry;
    const allElements = elementRegistry.getAll();
    const allElementIds = new Set(allElements.map((el: any) => el.id).filter(Boolean));

    // First, remove markers for elements that are no longer locked
    // Check current locks in ref against new locks
    Object.keys(elementLocksRef.current).forEach((elementId) => {

      if (!locks[elementId] && allElementIds.has(elementId)) {
        // Element is no longer locked, remove marker
        removeLockMarker(elementId);
      }
    });

    // Update our locks tracking - filter out root and invalid elements
    const validLocks: Record<string, { user_id: string; user_name: string }> = {};
    Object.keys(locks).forEach((elementId) => {
        validLocks[elementId] = locks[elementId];
    });
    elementLocksRef.current = validLocks;

    // Update markers - only show locks from other users
    Object.keys(validLocks).forEach((elementId) => {
      const lock = validLocks[elementId];
      if (lock.user_name !== myUserNameRef.current) {
        // Only show marker if locked by another user
        updateLockMarker(elementId, lock.user_name);
      } else {
        // Remove marker if it's our own lock (we don't need to see our own locks)
        // removeLockMarker(elementId);
        selectElementsById(modelerRef.current, [elementId])
      }
    });
  }, [updateLockMarker, removeLockMarker]);

  const handleWebSocketMessage = useCallback((message: AllWebSocketMessages) => {
    if (!modelerRef.current) return;
    
    switch (message.type) {
      case MESSAGE_TYPES.DIAGRAM_STATE: {
        const stateMessage = message as DiagramStateMessage;
        // Set our user name from the initial state
        if (stateMessage.data?.my_user_name) {
          myUserNameRef.current = stateMessage.data.my_user_name;
        }
        if (stateMessage.data?.xml) {
          isApplyingRemoteUpdateRef.current = true;
          modelerRef.current.importXML(stateMessage.data.xml).then(() => {
            setTimeout(() => {
              isApplyingRemoteUpdateRef.current = false;
            }, 100);
          });
        }
        break;
      }

      case MESSAGE_TYPES.DIAGRAM_UPDATE: {
        const updateMessage = message as DiagramUpdateMessage;
        // Only apply updates from other users
        if (updateMessage.data?.xml && modelerRef.current && updateMessage.user) {
          // Set flag to prevent sending our own update back
          isApplyingRemoteUpdateRef.current = true;
          
          modelerRef.current.importXML(updateMessage.data.xml).then(() => {
            // Clear flag after a short delay to allow import to complete
            setTimeout(() => {
              isApplyingRemoteUpdateRef.current = false;
            }, 150);
          }).catch((err) => {
            console.error('Error applying remote update:', err);
            isApplyingRemoteUpdateRef.current = false;
          });
        }
        break;
      }

      case MESSAGE_TYPES.ELEMENT_LOCKED:
        if (message.data) {
          const { element_id, user_id, user_name } = message.data;
          // Update our locks tracking
          elementLocksRef.current[element_id] = { user_id, user_name };
          // Only show marker if locked by another user
          if (user_name !== myUserNameRef.current) {
            updateLockMarker(element_id, user_name);
          } else {
            // If we locked it, add to our locked elements ref
            currentUserLockedElementsRef.current.add(element_id);
          }
        }
        break;

      case MESSAGE_TYPES.ELEMENT_UNLOCKED:
        if (message.data?.element_id) {
          const elementId = message.data.element_id;
          // Remove from locks tracking
          delete elementLocksRef.current[elementId];
          // Also remove from our locked elements ref if it was there
          currentUserLockedElementsRef.current.delete(elementId);
          // Remove marker
          removeLockMarker(elementId);
        }
        break;
      default:
        break;
    }
  }, [removeLockMarker, updateLockMarker]);

  const { connected, sendMessage, users, elementLocks } = useWebSocket({
    diagramId,
    userName: userName || undefined, // Pass custom name if set
    onMessage: handleWebSocketMessage,
    onError: () => {
      // Error handler is only called for real errors (not connection failures)
      setError('Connection error. Attempting to reconnect...');
      // Clear error after a delay
      setTimeout(() => setError(null), 5000);
    },
  });

  const selectElementsById = (
    modeler: any,
    ids: string[]
  ) => {

  if(! modeler) return
  const elementRegistry = modeler.get('elementRegistry');
  const selection = modeler.get('selection');

  const elements = ids
    .map(id => elementRegistry.get(id))
    .filter((el): el is any => !!el); // drop missing IDs

  selection.select(elements);
}

  // Update my user name when users list changes
  useEffect(() => {
    if (users.length > 0) {
      // Set our user name to the last one in the list (most likely us)
      // This will be updated when we receive the user_list message
      if (!myUserNameRef.current) {
        myUserNameRef.current = users[users.length - 1];
      }
    }
  }, [users]);

  const saveDiagram = useCallback(async () => {
    if (!modelerRef.current) return;

    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      sendMessage(MESSAGE_TYPES.DIAGRAM_UPDATE, { xml });
    } catch (err) {
      console.error('Error saving diagram:', err);
    }
  }, [sendMessage]);

  const isLockedByOther = (elementId: string): boolean => {
      const lock = elementLocksRef.current[elementId];
      return lock !== undefined && lock.user_name !== myUserNameRef.current;
    };

  const unlockElement = useCallback((elementId: string) => {
    // Only unlock if we locked this element
    if (currentUserLockedElementsRef.current.has(elementId)) {
      currentUserLockedElementsRef.current.delete(elementId);
      // Remove from elementLocksRef immediately (optimistic update)
      delete elementLocksRef.current[elementId];
      // Remove marker immediately - we're unlocking it
      removeLockMarker(elementId);
      // Send unlock message to server
      sendMessage(MESSAGE_TYPES.ELEMENT_UNLOCK, { element_id: elementId });
    }
  }, [sendMessage, removeLockMarker]);

  const lockElement = useCallback((elementId: string) => {
    if(isLockedByOther(elementId)) return;

    // Lock new element (add to local state and send message)
    currentUserLockedElementsRef.current.add(elementId);
    elementLocksRef.current[elementId] = {user_id: '', user_name: myUserNameRef.current}

    sendMessage(MESSAGE_TYPES.ELEMENT_LOCK, { element_id: elementId });

  }, [sendMessage,]);

  const diffSelections = (oldSelectionIds: string[], newSelectionIds: string[]) => {
  
    const newSet = new Set(newSelectionIds);
    const intersection: Record<string, boolean> = {};

    // Find all IDs that exist in both
    for (const id of oldSelectionIds) {
      if (newSet.has(id)) intersection[id] = true;
    }

    // Filter out common ones
    const remainingOld = oldSelectionIds.filter(id => !intersection[id]);
    const remainingNew = newSelectionIds.filter(id => !intersection[id]);

  return {
    remainingOld,
    remainingNew,
  };
}


  const setupEventListeners = useCallback(() => {
    if (!modelerRef.current) return;

    const eventBus = modelerRef.current.get('eventBus') as EventBus;

    // Listen for diagram changes - catch all types of changes
    const eventBusChangeHandler = (e: EventBusChangeEvent) => {
      // Prevent changes to locked elements
      if (e) {
        const elementId = e.element?.id || e.shape?.id || e.connection?.id;
        if (elementId && isLockedByOther(elementId)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Don't send updates if we're applying a remote update
      if (isApplyingRemoteUpdateRef.current) return;

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        if (!isApplyingRemoteUpdateRef.current) {
          saveDiagram();
        }
      }, DIAGRAM_UPDATE_DEBOUNCE_MS);
    };

    // Listen to multiple events to catch all changes
    eventBus.on('commandStack.changed', eventBusChangeHandler);
    eventBus.on('shape.move', eventBusChangeHandler);
    eventBus.on('element.changed', eventBusChangeHandler);
    eventBus.on('connection.changed', eventBusChangeHandler);

    // Prevent dragging locked elements
    eventBus.on('drag.start', (e: any) => {
      if (e.shape && isLockedByOther(e.shape.id)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    // Prevent resizing locked elements
    eventBus.on('resize.start', (e: any) => {
      if (e.shape && isLockedByOther(e.shape.id)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    // Prevent connecting to/from locked elements
    eventBus.on('connect.start', (e: any) => {
      if (e.shape && isLockedByOther(e.shape.id)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    // Prevent direct editing of locked elements
    eventBus.on('element.updateProperties', (e: any) => {
      if (e.element && isLockedByOther(e.element.id)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    // Listen for selection changes - when selection is cleared, unlock
    const selectionChangedHandler = (e: SelectionChangedEvent) => {
      const oldSelectionIds = (e.oldSelection || []).map((el) => el.id).filter(Boolean) as string[];
      const newSelectionIds = (e.newSelection || []).map((el) => el.id).filter(Boolean) as string[];

      const { remainingNew, remainingOld } = diffSelections(oldSelectionIds, newSelectionIds);

      if (remainingOld.length > 0) {
        remainingOld.forEach((id: string) => {
          unlockElement(id);
        });
      }

      if (remainingNew.length > 0) {
        remainingNew.forEach((id: string) => {
          lockElement(id);
        });
      }
    };
    eventBus.on('selection.changed', selectionChangedHandler);
  }, [saveDiagram, lockElement, unlockElement]);

  const loadDiagram = useCallback(async () => {
    if (!diagramId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const diagram = await api.getDiagram(diagramId);
      setDiagramName(diagram.name);

      if (modelerRef.current && diagram.xml) {
        console.log('Importing XML into modeler...');
        await modelerRef.current.importXML(diagram.xml);
        console.log('XML imported successfully');
      } else {
        console.warn('Modeler not ready or no XML data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load diagram';
      setError(errorMessage);
      console.error('Error loading diagram:', err);
      // Don't navigate away immediately, let user see the error
    } finally {
      setLoading(false);
      console.log('Loading complete');
    }
  }, [diagramId]);

  // Initialize BPMN modeler
  useEffect(() => {
    if (!diagramId || !containerRef.current) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const initializeModeler = async () => {
      try {
        if (!modelerRef.current) {
          modelerRef.current = new BpmnModeler({
            container: containerRef.current!,
          });
          setupEventListeners();
        }

        if (mounted && modelerRef.current) {
          await loadDiagram();
        }
      } catch (err) {
        console.error('Error initializing modeler:', err);
        if (mounted) {
          setError('Failed to initialize diagram editor');
          setLoading(false);
        }
      }
    };

    // Small delay to ensure container is ready
    const timer = setTimeout(() => {
      initializeModeler();
    }, 50);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    };
  }, [diagramId, loadDiagram, setupEventListeners]);

  // Update lock markers when elementLocks change
  useEffect(() => {
    // Sync elementLocks from hook to ref
    elementLocksRef.current = elementLocks;
    // Update markers based on current locks
    if (modelerRef.current) updateLockMarkers(elementLocks);
    
  }, [elementLocks, updateLockMarkers]);

  const handleShare = async () => {
    if (!diagramId) return;

    const shareUrl = `${window.location.origin}/diagram/${diagramId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy share link');
    }
  };

  const handleExportDiagram = useCallback(async () => {
    if (!modelerRef.current) return;

    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      const filename = `${sanitizeFileName(diagramName, 'diagram')}.bpmn`;
      if(xml) triggerDownload(xml, filename, 'application/xml');
    } catch (err) {
      console.error('Failed to export diagram:', err);
      alert('Failed to export diagram.');
    }
  }, [diagramName]);

  const handleSetName = () => {
    setShowNameModal(true);
  };

  const handleSaveName = () => {
    const trimmedName = userName.trim();
    if (trimmedName) {
      localStorage.setItem('bpmn_user_name', trimmedName);
      setShowNameModal(false);
      // Reload page to reconnect with new name
      window.location.reload();
    } else {
      // Clear name if empty
      localStorage.removeItem('bpmn_user_name');
      setShowNameModal(false);
      window.location.reload();
    }
  };

  const handleCancelName = () => {
    // Restore original name from localStorage
    setUserName(localStorage.getItem('bpmn_user_name') || '');
    setShowNameModal(false);
  };

  return (
    <div className="diagram-editor-container">
      <div className="diagram-editor-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/')}>
            ← Back
          </button>
          <h2>{diagramName || 'Untitled Diagram'}</h2>
        </div>
        <div className="header-right">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          <div className="users-indicator">
            <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? '🟢' : '🔴'}
            </span>
            <span className="users-count">
              {users.length} user{users.length !== 1 ? 's' : ''} online
            </span>
            {users.length > 0 && (
              <div className="users-list">
                {users.map((user, idx) => (
                  <span key={idx} className="user-badge">
                    {user}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button className="name-button" onClick={handleSetName} title="Set your name">
            👤 {userName || 'Set Name'}
          </button>
          <button className="export-button" onClick={handleExportDiagram}>
            ⬇️ Export
          </button>
          <button className="share-button" onClick={handleShare}>
            🔗 Share
          </button>
          {showNameModal && (
            <div className="modal-overlay" onClick={handleCancelName}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Set Your Name</h3>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={30}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveName();
                    } else if (e.key === 'Escape') {
                      handleCancelName();
                    }
                  }}
                />
                <div className="modal-buttons">
                  <button className="modal-button primary" onClick={handleSaveName}>
                    Save
                  </button>
                  <button className="modal-button" onClick={handleCancelName}>
                    Cancel
                  </button>
                </div>
                <p className="modal-hint">Leave empty to use auto-generated name</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="diagram-editor-content">
        {loading && (
          <div className="loading-overlay">
            <div className="loading">Loading diagram...</div>
          </div>
        )}
        <div ref={containerRef} className="bpmn-container"></div>
      </div>
    </div>
  );
};

export default DiagramEditor;
