import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

/**
 * Note type
 * @typedef {Object} Note
 * @property {string} id - unique id
 * @property {string} title - note title
 * @property {string} body - note content
 * @property {number} updatedAt - timestamp for sorting
 */

// Helpers
const STORAGE_KEY = 'notes_app_items_v1';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) { /* ignore */ }

  // Seed sample data first load
  const seed = [
    {
      id: generateId(),
      title: 'Welcome to Ocean Notes',
      body:
        'This is a simple, modern notes app.\n\n- Create new notes with the + New button\n- Click a note to edit\n- Changes save automatically\n- Delete with the trash icon\n\nEnjoy!',
      updatedAt: Date.now() - 1000 * 60 * 60 * 12,
    },
    {
      id: generateId(),
      title: 'Project Ideas',
      body: '• Build a task tracker\n• Experiment with React hooks\n• Improve UI polish\n',
      updatedAt: Date.now() - 1000 * 60 * 60 * 6,
    },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function saveNotes(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (_) { /* ignore */ }
}

// PUBLIC_INTERFACE
function App() {
  /** Theme handling: default light, toggle persists in localStorage */
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  /** Notes state */
  const [notes, setNotes] = useState(loadNotes);
  const [activeId, setActiveId] = useState(notes[0]?.id || null);
  const activeNote = useMemo(() => notes.find(n => n.id === activeId) || null, [notes, activeId]);

  // Persist notes to localStorage whenever they change
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  // CRUD operations
  // PUBLIC_INTERFACE
  const createNote = () => {
    const now = Date.now();
    const newNote = {
      id: generateId(),
      title: 'Untitled',
      body: '',
      updatedAt: now,
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveId(newNote.id);
  };

  // PUBLIC_INTERFACE
  const updateActiveNote = (fields) => {
    if (!activeId) return;
    setNotes(prev =>
      prev
        .map(n => (n.id === activeId ? { ...n, ...fields, updatedAt: Date.now() } : n))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  };

  // PUBLIC_INTERFACE
  const deleteActiveNote = () => {
    if (!activeId) return;
    const note = notes.find(n => n.id === activeId);
    const confirmed = window.confirm(`Delete note "${note?.title || 'Untitled'}"?`);
    if (!confirmed) return;
    setNotes(prev => {
      const filtered = prev.filter(n => n.id !== activeId);
      // Select next logical note
      const nextActive = filtered[0]?.id || null;
      setActiveId(nextActive);
      return filtered;
    });
  };

  const selectNote = (id) => setActiveId(id);

  // Filter/search (simple client-side)
  const [query, setQuery] = useState('');
  const filteredNotes = useMemo(() => {
    if (!query.trim()) return notes;
    const q = query.toLowerCase();
    return notes.filter(
      n =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q)
    );
  }, [notes, query]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo" aria-hidden>📝</div>
          <div className="brand-text">
            <h1 className="app-title">Ocean Notes</h1>
            <p className="app-subtitle">Simple, modern note taking</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn primary" onClick={createNote} aria-label="Create new note">
            + New
          </button>
          <button
            className="btn ghost"
            onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <div className="search-wrap">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search notes..."
              className="search-input"
              aria-label="Search notes"
            />
          </div>

          <NotesList
            notes={filteredNotes}
            activeId={activeId}
            onSelect={selectNote}
          />
        </aside>

        <section className="editor">
          {activeNote ? (
            <NoteEditor
              note={activeNote}
              onChangeTitle={(t) => updateActiveNote({ title: t })}
              onChangeBody={(b) => updateActiveNote({ body: b })}
              onDelete={deleteActiveNote}
            />
          ) : (
            <EmptyState onCreate={createNote} />
          )}
        </section>
      </main>
    </div>
  );
}

/**
 * Sidebar notes list
 */
function NotesList({ notes, activeId, onSelect }) {
  if (notes.length === 0) {
    return (
      <div className="empty-list">
        <p>No notes found.</p>
        <p className="muted">Create a new note to get started.</p>
      </div>
    );
  }

  return (
    <ul className="notes-list" role="list">
      {notes.map(note => (
        <li
          key={note.id}
          className={`note-item ${note.id === activeId ? 'active' : ''}`}
          onClick={() => onSelect(note.id)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSelect(note.id);
          }}
          role="button"
          aria-pressed={note.id === activeId}
        >
          <div className="note-title">{note.title || 'Untitled'}</div>
          <div className="note-snippet">{(note.body || '').split('\n')[0]}</div>
          <div className="note-meta">{new Date(note.updatedAt).toLocaleString()}</div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Editor panel
 */
function NoteEditor({ note, onChangeTitle, onChangeBody, onDelete }) {
  return (
    <div className="editor-card">
      <div className="editor-toolbar">
        <input
          className="title-input"
          value={note.title}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="Note title"
          aria-label="Note title"
        />
        <button className="btn danger subtle" onClick={onDelete} aria-label="Delete note" title="Delete note">
          🗑️
        </button>
      </div>
      <textarea
        className="body-input"
        value={note.body}
        onChange={(e) => onChangeBody(e.target.value)}
        placeholder="Write your note here..."
        aria-label="Note body"
      />
      <div className="save-hint">
        Changes are saved automatically • Updated {new Date(note.updatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}

/**
 * Empty state shown when there is no active note
 */
function EmptyState({ onCreate }) {
  return (
    <div className="empty-editor">
      <h2>Nothing selected</h2>
      <p className="muted">Choose a note from the list or create a new one.</p>
      <button className="btn primary" onClick={onCreate}>Create a Note</button>
    </div>
  );
}

export default App;
