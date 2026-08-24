import React, { useState, useEffect, useRef } from 'react';

// ==========================================
// Custom SVG Icons (Inline for reliability)
// ==========================================
const ChatIcon = () => (
  <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const DocIcon = () => (
  <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const QuizIcon = () => (
  <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const CardIcon = () => (
  <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const PlannerIcon = () => (
  <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

const UploadCloudIcon = () => (
  <svg className="dropzone-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

// Helper to generate Session ID
const generateSessionId = () => {
  return 'sess_' + Math.random().toString(36).substring(2, 11);
};

const BACKEND_URL = 'http://127.0.0.1:8000';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [sessionId, setSessionId] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('jarvis_api_key') || '');
  const [apiStatus, setApiStatus] = useState({ online: false, configured: false, docsExist: false });
  const [serverLoading, setServerLoading] = useState(true);

  // ------------------------------------------
  // Chat Tab States
  // ------------------------------------------
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am JARVIS, your AI Study Assistant. Choose a study mode from the sidebar, upload your notes, or ask me any question to get started!'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [persona, setPersona] = useState('General Tutor');
  const [useRag, setUseRag] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // ------------------------------------------
  // Documents / RAG Tab States
  // ------------------------------------------
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // ------------------------------------------
  // Quiz Tab States
  // ------------------------------------------
  const [quizTopic, setQuizTopic] = useState('');
  const [quizQuestionsCount, setQuizQuestionsCount] = useState(5);
  const [quizUseRag, setQuizUseRag] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // ------------------------------------------
  // Flashcard Tab States
  // ------------------------------------------
  const [cardTopic, setCardTopic] = useState('');
  const [cardCount, setCardCount] = useState(8);
  const [cardUseRag, setCardUseRag] = useState(false);
  const [cardDeck, setCardDeck] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // ------------------------------------------
  // Study Planner Tab States
  // ------------------------------------------
  const [planSubject, setPlanSubject] = useState('');
  const [planHours, setPlanHours] = useState(10);
  const [planGoal, setPlanGoal] = useState('General understanding and exam prep');
  const [studyPlan, setStudyPlan] = useState(null);
  const [plannerLoading, setPlannerLoading] = useState(false);

  // Initialize Session ID & Check Server Status
  useEffect(() => {
    setSessionId(generateSessionId());
    checkServerStatus();
  }, []);

  // Save API Key to localStorage when updated
  useEffect(() => {
    localStorage.setItem('jarvis_api_key', apiKey);
    checkServerStatus();
  }, [apiKey]);

  // Scroll Chat to Bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading]);

  const checkServerStatus = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['x-gemini-api-key'] = apiKey;
      }
      
      const res = await fetch(`${BACKEND_URL}/api/status`, { headers });
      if (res.ok) {
        const data = await res.json();
        setApiStatus({
          online: true,
          configured: data.gemini_api_key_configured,
          docsExist: data.indexed_docs_exist
        });
      } else {
        setApiStatus({ online: false, configured: false, docsExist: false });
      }
    } catch (e) {
      setApiStatus({ online: false, configured: false, docsExist: false });
    } finally {
      setServerLoading(false);
    }
  };

  // ------------------------------------------
  // Chat Actions
  // ------------------------------------------
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || chatLoading) return;

    const userMessage = inputText;
    setInputText('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setChatLoading(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-gemini-api-key'] = apiKey;

      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
          persona,
          use_rag: useRag
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to get response');
      }

      const data = await res.json();
      setChatMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: data.response,
        ragUsed: data.rag_used
      }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: `Error: ${err.message}. Please verify your API Key and backend connection.` 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePresetPrompt = (promptText) => {
    setInputText(promptText);
  };

  const clearChatHistory = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/clear-chat?session_id=${sessionId}`, { method: 'POST' });
      setChatMessages([
        {
          sender: 'assistant',
          text: 'Conversation history cleared. Let me know what you would like to study next!'
        }
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  // ------------------------------------------
  // Document Operations
  // ------------------------------------------
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const headers = {};
      if (apiKey) headers['x-gemini-api-key'] = apiKey;

      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Upload failed');
      }

      const data = await res.json();
      setUploadSuccess(data.message);
      setUploadedFiles(prev => [...prev, { name: file.name, size: file.size, chunks: data.chunks_count }]);
      checkServerStatus(); // refresh status (docsExist)
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const clearIndexedDocs = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/clear-docs`, { method: 'POST' });
      if (res.ok) {
        setUploadedFiles([]);
        setUploadSuccess('All indexed documents cleared successfully!');
        checkServerStatus();
      }
    } catch (e) {
      setUploadError('Failed to clear documents.');
    }
  };

  // ------------------------------------------
  // Quiz Actions
  // ------------------------------------------
  const generateQuiz = async (e) => {
    e.preventDefault();
    if (!quizTopic.trim()) return;

    setQuizLoading(true);
    setQuizData(null);
    setQuizCompleted(false);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setSelectedOptionIndex(null);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-gemini-api-key'] = apiKey;

      const res = await fetch(`${BACKEND_URL}/api/generate-quiz`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: quizTopic,
          num_questions: quizQuestionsCount,
          use_rag: quizUseRag
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to generate quiz');
      }

      const data = await res.json();
      setQuizData(data);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleOptionSelect = (optionIdx) => {
    if (selectedOptionIndex !== null) return; // Answer locked in
    setSelectedOptionIndex(optionIdx);
    
    if (optionIdx === quizData.questions[currentQuizIndex].correct_option_index) {
      setQuizScore(prev => prev + 1);
    }
  };

  const nextQuizQuestion = () => {
    setSelectedOptionIndex(null);
    if (currentQuizIndex + 1 < quizData.questions.length) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      setQuizCompleted(true);
    }
  };

  // ------------------------------------------
  // Flashcard Actions
  // ------------------------------------------
  const generateFlashcards = async (e) => {
    e.preventDefault();
    if (!cardTopic.trim()) return;

    setCardLoading(true);
    setCardDeck(null);
    setCurrentCardIndex(0);
    setCardFlipped(false);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-gemini-api-key'] = apiKey;

      const res = await fetch(`${BACKEND_URL}/api/generate-flashcards`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: cardTopic,
          num_cards: cardCount,
          use_rag: cardUseRag
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to generate flashcards');
      }

      const data = await res.json();
      setCardDeck(data);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setCardLoading(false);
    }
  };

  const nextCard = () => {
    setCardFlipped(false);
    setTimeout(() => {
      if (currentCardIndex + 1 < cardDeck.cards.length) {
        setCurrentCardIndex(prev => prev + 1);
      }
    }, 150);
  };

  const prevCard = () => {
    setCardFlipped(false);
    setTimeout(() => {
      if (currentCardIndex > 0) {
        setCurrentCardIndex(prev => prev - 1);
      }
    }, 150);
  };

  // ------------------------------------------
  // Study Planner Actions
  // ------------------------------------------
  const generateSchedule = async (e) => {
    e.preventDefault();
    if (!planSubject.trim()) return;

    setPlannerLoading(true);
    setStudyPlan(null);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-gemini-api-key'] = apiKey;

      const res = await fetch(`${BACKEND_URL}/api/generate-schedule`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject: planSubject,
          hours_per_week: planHours,
          target_goal: planGoal
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to generate study schedule');
      }

      const data = await res.json();
      setStudyPlan(data);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setPlannerLoading(false);
    }
  };

  // ==========================================
  // Helper Components
  // ==========================================
  const formatMarkdown = (text) => {
    // Simple formatter for basic markdown rendering in UI
    if (!text) return '';
    return text.split('\n').map((line, idx) => {
      let formattedLine = line;
      // Bold
      formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Inline code
      formattedLine = formattedLine.replace(/`(.*?)`/g, '<code>$1</code>');
      
      // Bullets
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return <li key={idx} dangerouslySetInnerHTML={{ __html: formattedLine.substring(2) }} />;
      }
      
      // Headers
      if (line.trim().startsWith('### ')) {
        return <h4 key={idx} style={{ marginTop: '12px', color: 'var(--color-cyan)' }} dangerouslySetInnerHTML={{ __html: formattedLine.substring(4) }} />;
      }
      if (line.trim().startsWith('## ')) {
        return <h3 key={idx} style={{ marginTop: '16px', color: 'var(--color-cyan)' }} dangerouslySetInnerHTML={{ __html: formattedLine.substring(3) }} />;
      }
      if (line.trim().startsWith('# ')) {
        return <h2 key={idx} style={{ marginTop: '20px', color: 'var(--color-purple)' }} dangerouslySetInnerHTML={{ __html: formattedLine.substring(2) }} />;
      }
      
      // Regular Paragraphs
      return <p key={idx} dangerouslySetInnerHTML={{ __html: formattedLine }} />;
    });
  };

  return (
    <div className="app-container">
      {/* ------------------------------------------ */}
      {/* SIDEBAR PANEL */}
      {/* ------------------------------------------ */}
      <div className="sidebar glass-panel">
        <div>
          <div className="logo-section" style={{ justifyContent: 'center', padding: '10px 0' }}>
            <svg width="200" height="60" viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="jarvis-logo-svg">
              <defs>
                <linearGradient id="logo-cyan-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff4d4d" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
                <linearGradient id="triangle-grad-1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(239, 68, 68, 0.2)" />
                  <stop offset="100%" stopColor="rgba(127, 29, 29, 0.4)" />
                </linearGradient>
                <linearGradient id="triangle-grad-2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(220, 38, 38, 0.08)" />
                  <stop offset="100%" stopColor="rgba(153, 27, 27, 0.25)" />
                </linearGradient>
                <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <g>
                <polygon points="100,6 140,6 120,41" stroke="url(#triangle-grad-1)" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
                <polygon points="105,11 135,11 120,37" stroke="url(#triangle-grad-2)" strokeWidth="1.5" fill="none" opacity="0.6" strokeLinejoin="round" />
              </g>
              <text x="110" y="36" fontFamily="'Outfit', sans-serif" fontWeight="800" fontSize="24" fill="#f8fafc" letterSpacing="0.08em" textAnchor="middle">
                JAR<tspan fill="url(#logo-cyan-grad)" filter="url(#cyan-glow)">V</tspan>IS
              </text>
              <text x="110" y="52" fontFamily="'Inter', sans-serif" fontWeight="600" fontSize="9" fill="var(--text-muted)" letterSpacing="0.18em" textAnchor="middle">
                STUDY ASSISTANT
              </text>
            </svg>
          </div>

          <div className="nav-menu">
            <div 
              className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <ChatIcon /> Chat Assistant
            </div>
            <div 
              className={`nav-item ${activeTab === 'docs' ? 'active' : ''}`}
              onClick={() => setActiveTab('docs')}
            >
              <DocIcon /> Notes & RAG
            </div>
            <div 
              className={`nav-item ${activeTab === 'quiz' ? 'active' : ''}`}
              onClick={() => setActiveTab('quiz')}
            >
              <QuizIcon /> Quiz Generator
            </div>
            <div 
              className={`nav-item ${activeTab === 'flashcards' ? 'active' : ''}`}
              onClick={() => setActiveTab('flashcards')}
            >
              <CardIcon /> Flashcard Hub
            </div>
            <div 
              className={`nav-item ${activeTab === 'planner' ? 'active' : ''}`}
              onClick={() => setActiveTab('planner')}
            >
              <PlannerIcon /> Study Planner
            </div>
          </div>
        </div>

        <div className="status-section">
          <div className="status-indicator">
            <span className={`dot ${apiStatus.online ? 'active' : ''}`}></span>
            {apiStatus.online ? 'Server: Connected' : 'Server: Disconnected'}
          </div>
          <div className="status-indicator">
            <span className={`dot ${apiStatus.configured ? 'active' : 'warning'}`}></span>
            {apiStatus.configured ? 'Gemini Key: Active' : 'Gemini Key: Required'}
          </div>

          {/* Quick API Key Setup Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Dynamically set Gemini Key:</label>
            <input 
              type="password"
              placeholder="Paste AI Studio Key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: 'var(--text-primary)',
                fontSize: '11px',
                outline: 'none'
              }}
            />
          </div>

          {!apiStatus.configured && !apiKey && (
            <div className="key-config-prompt">
              Set GEMINI_API_KEY above or inside <code>backend/.env</code> to unlock AI queries.
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------ */}
      {/* MAIN VIEWPORT */}
      {/* ------------------------------------------ */}
      <div className="main-viewport glass-panel">
        
        {/* VIEW HEADER */}
        {activeTab === 'chat' && (
          <div className="view-header">
            <div>
              <h1>JARVIS Chat Workspace</h1>
              <p>Converse with customizable study personas</p>
            </div>
            <div>
              <button 
                onClick={clearChatHistory}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Clear Conversation
              </button>
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="view-header">
            <div>
              <h1>Document Indexer & RAG</h1>
              <p>Upload study notes or textbook chapters to ask contextually aware questions</p>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="view-header">
            <div>
              <h1>AI Quiz Agent</h1>
              <p>Generate structured multiple-choice quizzes to test your understanding</p>
            </div>
          </div>
        )}

        {activeTab === 'flashcards' && (
          <div className="view-header">
            <div>
              <h1>Flashcard Deck Studio</h1>
              <p>Synthesize concepts into quick study guides for active recall</p>
            </div>
          </div>
        )}

        {activeTab === 'planner' && (
          <div className="view-header">
            <div>
              <h1>Intelligent Study Planner</h1>
              <p>Design schedules custom-tailored to your learning objectives</p>
            </div>
          </div>
        )}

        {/* VIEW CONTENT AREA */}
        <div className="view-content">
          
          {/* 1. CHAT WORKSPACE */}
          {activeTab === 'chat' && (
            <div className="chat-container">
              <div className="chat-messages">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`message ${msg.sender}`}>
                    <div className="avatar">
                      {msg.sender === 'user' ? 'U' : 'J'}
                    </div>
                    <div className="message-bubble">
                      {formatMarkdown(msg.text)}
                      {msg.ragUsed && (
                        <div className="rag-badge">
                          RAG Context Reference Applied
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="message assistant">
                    <div className="avatar">J</div>
                    <div className="message-bubble" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                      JARVIS is formulating answer...
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef}></div>
              </div>

              {/* Preset prompt chips */}
              <div className="preset-chips-container">
                <span className="preset-chip" onClick={() => handlePresetPrompt("Explain Dijkstra's shortest path algorithm step-by-step.")}>Dijkstra's Algorithm</span>
                <span className="preset-chip" onClick={() => handlePresetPrompt("What is the difference between Mitosis and Meiosis?")}>Mitosis vs Meiosis</span>
                <span className="preset-chip" onClick={() => handlePresetPrompt("Give me a cheat sheet on Newtonian physics laws.")}>Newton's Laws</span>
                {apiStatus.docsExist && (
                  <span className="preset-chip" style={{ borderColor: 'var(--color-cyan)', color: '#fff' }} onClick={() => { setUseRag(true); handlePresetPrompt("Synthesize the key points from my uploaded document."); }}>Summarize Uploads</span>
                )}
              </div>

              {/* Input Form Box */}
              <form onSubmit={handleSendMessage} className="chat-input-area">
                <div className="chat-input-row">
                  <textarea
                    rows="2"
                    className="chat-input"
                    placeholder="Enter an academic query or ask to structure study points..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button 
                    type="submit" 
                    className="send-btn"
                    disabled={chatLoading || !inputText.trim() || (!apiStatus.configured && !apiKey)}
                  >
                    <SendIcon />
                  </button>
                </div>

                <div className="chat-actions-row">
                  <div className="chat-toggles">
                    {/* RAG Toggle */}
                    <div 
                      className={`toggle-container ${useRag ? 'active' : ''}`}
                      onClick={() => {
                        if (!apiStatus.docsExist) {
                          alert("Please upload at least one document in the 'Notes & RAG' tab first.");
                          return;
                        }
                        setUseRag(!useRag);
                      }}
                    >
                      <div className="toggle-switch"></div>
                      <span>RAG Mode {apiStatus.docsExist ? '' : '(Upload notes first)'}</span>
                    </div>
                  </div>

                  {/* Persona dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Persona:</label>
                    <select 
                      className="persona-select"
                      value={persona}
                      onChange={(e) => setPersona(e.target.value)}
                    >
                      <option value="General Tutor">General Tutor</option>
                      <option value="Socratic Guide">Socratic Guide</option>
                      <option value="Coding Mentor">Coding Mentor</option>
                      <option value="Literature Critic">Literature Critic</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* 2. DOCUMENTS / RAG WORKSPACE */}
          {activeTab === 'docs' && (
            <div className="doc-split-layout">
              {/* Uploader Panel */}
              <div className="doc-upload-sidebar">
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3 style={{ marginBottom: '14px', fontSize: '15px' }}>Upload Study Notes</h3>
                  <label className="dropzone">
                    <UploadCloudIcon />
                    <p>{uploading ? 'Parsing File...' : 'Drag file here or click to browse'}</p>
                    <span>Supports PDF, TXT, MD</span>
                    <input 
                      type="file" 
                      className="file-input" 
                      accept=".pdf,.txt,.md"
                      onChange={handleFileUpload}
                      disabled={uploading || (!apiStatus.configured && !apiKey)}
                    />
                  </label>

                  {uploading && (
                    <div className="uploading-shimmer" style={{ marginTop: '14px' }}>
                      <div className="shimmer-bar">
                        <div className="shimmer-progress"></div>
                      </div>
                      <span>Extracting text and building vector representations...</span>
                    </div>
                  )}

                  {uploadError && (
                    <div style={{ color: 'var(--color-rose)', fontSize: '12px', marginTop: '12px' }}>
                      {uploadError}
                    </div>
                  )}

                  {uploadSuccess && (
                    <div style={{ color: 'var(--color-emerald)', fontSize: '12px', marginTop: '12px' }}>
                      {uploadSuccess}
                    </div>
                  )}
                </div>

                {/* File inventory list */}
                {uploadedFiles.length > 0 && (
                  <div className="glass-panel docs-list-box" style={{ padding: '20px' }}>
                    <h3>Indexed Documents</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="doc-item">
                          <div>
                            <div className="doc-name">{file.name}</div>
                            <span className="doc-meta">{(file.size / 1024).toFixed(1)} KB • {file.chunks} Chunks</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={clearIndexedDocs} className="clear-docs-btn" style={{ marginTop: '14px' }}>
                      Reset Vector Store
                    </button>
                  </div>
                )}
              </div>

              {/* RAG Guide and Status */}
              <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h2 style={{ color: 'var(--color-cyan)' }}>Retrieval-Augmented Generation (RAG)</h2>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                  By uploading lecture slides, notes, or textbooks here, you build a custom local semantic knowledge base. 
                  When you converse in the <strong>Chat Assistant</strong> and toggle <strong>RAG Mode</strong> on, JARVIS 
                  retrieves relevant information snippets from your specific files before answering, reducing hallucinations and citing custom sources!
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
                  <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid var(--color-cyan)' }}>
                    <h4 style={{ fontSize: '14px', color: 'var(--text-primary)' }}>1. Document Ingestion</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Documents are parsed, chunked into overlap blocks of 1000 characters, and passed to Gemini text embeddings.
                    </p>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid var(--color-purple)' }}>
                    <h4 style={{ fontSize: '14px', color: 'var(--text-primary)' }}>2. Index Retrieval</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      FAISS database conducts local vector similarity checks to select details matching the academic query.
                    </p>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', marginTop: 'auto', background: 'rgba(0, 240, 255, 0.02)' }}>
                  <h4 style={{ color: 'var(--color-cyan)', fontSize: '14px' }}>Vector DB Index Status</h4>
                  <p style={{ fontSize: '13px', marginTop: '6px' }}>
                    {apiStatus.docsExist 
                      ? '✓ Vector Database active. You can now use RAG mode in Chat and study agents.'
                      : '✗ No active documents indexed. Please upload text/PDF files to enable local searches.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. QUIZ GENERATOR WORKSPACE */}
          {activeTab === 'quiz' && (
            <div style={{ height: '100%' }}>
              {!quizData && !quizLoading && (
                <form onSubmit={generateQuiz} className="agent-creation-form glass-panel" style={{ padding: '32px' }}>
                  <h2 style={{ fontSize: '20px', marginBottom: '10px', textAlign: 'center' }}>Configure Study Quiz</h2>
                  
                  <div className="form-group">
                    <label>Quiz Subject or Topic:</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="e.g. Organic Chemistry, Quantum Mechanics, Cellular Mitosis..."
                      value={quizTopic}
                      onChange={(e) => setQuizTopic(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Number of Questions:</label>
                      <select 
                        className="form-input" 
                        value={quizQuestionsCount}
                        onChange={(e) => setQuizQuestionsCount(Number(e.target.value))}
                      >
                        <option value="3">3 Questions</option>
                        <option value="5">5 Questions</option>
                        <option value="8">8 Questions</option>
                        <option value="10">10 Questions</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ justifyContent: 'center', height: '100%', paddingTop: '20px' }}>
                      <div 
                        className={`toggle-container ${quizUseRag ? 'active' : ''}`}
                        onClick={() => {
                          if (!apiStatus.docsExist) {
                            alert("Upload study materials in 'Notes & RAG' first to use custom notes.");
                            return;
                          }
                          setQuizUseRag(!quizUseRag);
                        }}
                      >
                        <div className="toggle-switch"></div>
                        <span>Reference My Notes (RAG)</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ marginTop: '10px' }}
                    disabled={!quizTopic.trim() || (!apiStatus.configured && !apiKey)}
                  >
                    Generate Quiz
                  </button>
                </form>
              )}

              {quizLoading && (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>JARVIS Agent is formulating questions and compiling explanations...</p>
                </div>
              )}

              {quizData && !quizCompleted && (
                <div className="quiz-console glass-panel" style={{ padding: '32px' }}>
                  <div className="quiz-score-header">
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Question {currentQuizIndex + 1} of {quizData.questions.length}
                    </span>
                    <span className="score-badge">Score: {quizScore}</span>
                  </div>

                  <div className="quiz-question-box">
                    <h3 className="quiz-question-text">{quizData.questions[currentQuizIndex].question}</h3>
                    
                    <div className="quiz-options-list">
                      {quizData.questions[currentQuizIndex].options.map((opt, oIdx) => {
                        const isCorrect = oIdx === quizData.questions[currentQuizIndex].correct_option_index;
                        const isSelected = selectedOptionIndex === oIdx;
                        const hasSelectedAny = selectedOptionIndex !== null;

                        let optionClass = '';
                        if (hasSelectedAny) {
                          optionClass += ' disabled';
                          if (isCorrect) optionClass += ' correct';
                          if (isSelected && !isCorrect) optionClass += ' incorrect';
                        }

                        return (
                          <button
                            key={oIdx}
                            className={`quiz-option ${optionClass}`}
                            onClick={() => handleOptionSelect(oIdx)}
                            disabled={hasSelectedAny}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {selectedOptionIndex !== null && (
                      <div className="quiz-explanation">
                        <strong>
                          {selectedOptionIndex === quizData.questions[currentQuizIndex].correct_option_index ? 'Correct! ' : 'Incorrect. '}
                        </strong>
                        {quizData.questions[currentQuizIndex].explanation}
                      </div>
                    )}
                  </div>

                  <div className="quiz-actions">
                    <div></div>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '10px 20px' }}
                      disabled={selectedOptionIndex === null}
                      onClick={nextQuizQuestion}
                    >
                      {currentQuizIndex + 1 === quizData.questions.length ? 'Finish Quiz' : 'Next Question'}
                    </button>
                  </div>
                </div>
              )}

              {quizCompleted && quizData && (
                <div className="quiz-console glass-panel quiz-results-card">
                  <h2>Quiz Complete!</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Here is your score for: "{quizTopic}"</p>
                  
                  <div className="quiz-results-score">
                    {quizScore} / {quizData.questions.length}
                  </div>
                  
                  <p style={{ fontSize: '14px', marginBottom: '24px' }}>
                    {quizScore === quizData.questions.length ? 'Perfect Score! Exceptional work!' : 'Keep practicing to master the material!'}
                  </p>

                  <button 
                    className="btn-primary" 
                    onClick={() => {
                      setQuizData(null);
                      setQuizCompleted(false);
                      setCurrentQuizIndex(0);
                      setQuizScore(0);
                    }}
                  >
                    Generate New Quiz
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. FLASHCARDS WORKSPACE */}
          {activeTab === 'flashcards' && (
            <div style={{ height: '100%' }}>
              {!cardDeck && !cardLoading && (
                <form onSubmit={generateFlashcards} className="agent-creation-form glass-panel" style={{ padding: '32px' }}>
                  <h2 style={{ fontSize: '20px', marginBottom: '10px', textAlign: 'center' }}>Create Flashcard Deck</h2>
                  
                  <div className="form-group">
                    <label>Topic for Study Cards:</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="e.g. Nervous System Vocabulary, CSS Selectors, Macbeth Characters..."
                      value={cardTopic}
                      onChange={(e) => setCardTopic(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Number of Cards:</label>
                      <select 
                        className="form-input" 
                        value={cardCount}
                        onChange={(e) => setCardCount(Number(e.target.value))}
                      >
                        <option value="5">5 Cards</option>
                        <option value="8">8 Cards</option>
                        <option value="12">12 Cards</option>
                        <option value="15">15 Cards</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ justifyContent: 'center', height: '100%', paddingTop: '20px' }}>
                      <div 
                        className={`toggle-container ${cardUseRag ? 'active' : ''}`}
                        onClick={() => {
                          if (!apiStatus.docsExist) {
                            alert("Upload study notes in 'Notes & RAG' first to use custom notes.");
                            return;
                          }
                          setCardUseRag(!cardUseRag);
                        }}
                      >
                        <div className="toggle-switch"></div>
                        <span>Use My Uploaded Notes</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ marginTop: '10px' }}
                    disabled={!cardTopic.trim() || (!apiStatus.configured && !apiKey)}
                  >
                    Build Flashcards
                  </button>
                </form>
              )}

              {cardLoading && (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Synthesizing concepts and forming study cards...</p>
                </div>
              )}

              {cardDeck && (
                <div className="flashcards-hub">
                  <h3 style={{ fontSize: '18px', textAlign: 'center', color: 'var(--text-secondary)' }}>{cardDeck.title}</h3>
                  
                  {/* Flipped card structure */}
                  <div 
                    className={`flashcard-wrapper ${cardFlipped ? 'flipped' : ''}`}
                    onClick={() => setCardFlipped(!cardFlipped)}
                  >
                    <div className="flashcard-inner">
                      <div className="card-front">
                        <h2>{cardDeck.cards[currentCardIndex].front}</h2>
                        <div className="flip-hint">Click to flip and reveal</div>
                      </div>
                      <div className="card-back">
                        <p>{cardDeck.cards[currentCardIndex].back}</p>
                        <div className="flip-hint" style={{ color: 'var(--color-purple)' }}>Click to flip back</div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Row */}
                  <div className="flashcards-nav">
                    <button 
                      className="nav-circle-btn" 
                      onClick={prevCard} 
                      disabled={currentCardIndex === 0}
                    >
                      ←
                    </button>
                    <span className="flashcard-counter">
                      {currentCardIndex + 1} of {cardDeck.cards.length}
                    </span>
                    <button 
                      className="nav-circle-btn" 
                      onClick={nextCard} 
                      disabled={currentCardIndex === cardDeck.cards.length - 1}
                    >
                      →
                    </button>
                  </div>

                  <button 
                    className="btn-primary" 
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                    onClick={() => {
                      setCardDeck(null);
                      setCurrentCardIndex(0);
                      setCardFlipped(false);
                    }}
                  >
                    Create New Deck
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 5. STUDY PLANNER WORKSPACE */}
          {activeTab === 'planner' && (
            <div style={{ height: '100%' }}>
              {!studyPlan && !plannerLoading && (
                <form onSubmit={generateSchedule} className="agent-creation-form glass-panel" style={{ padding: '32px' }}>
                  <h2 style={{ fontSize: '20px', marginBottom: '10px', textAlign: 'center' }}>Generate Weekly Study Plan</h2>
                  
                  <div className="form-group">
                    <label>What Subject or Exam are you studying for?</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="e.g. AP Biology, Linear Algebra, Machine Learning Bootcamp..."
                      value={planSubject}
                      onChange={(e) => setPlanSubject(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>How many study hours can you allocate per week?</label>
                    <input 
                      type="number" 
                      className="form-input"
                      min="2"
                      max="40"
                      value={planHours}
                      onChange={(e) => setPlanHours(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>What is your study target or main goal?</label>
                    <textarea 
                      className="form-input"
                      rows="3"
                      placeholder="e.g. I want to build projects, pass final exams, understand concepts deeply..."
                      value={planGoal}
                      onChange={(e) => setPlanGoal(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={!planSubject.trim() || (!apiStatus.configured && !apiKey)}
                  >
                    Create Study Plan
                  </button>
                </form>
              )}

              {plannerLoading && (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>JARVIS is organizing schedules and tailoring sessions to your objective...</p>
                </div>
              )}

              {studyPlan && (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <div className="glass-panel" style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ color: 'var(--color-cyan)' }}>Study Plan: {studyPlan.subject}</h2>
                      <span className="score-badge" style={{ background: 'rgba(181, 0, 255, 0.1)', color: 'var(--color-purple)' }}>
                        Target: {studyPlan.total_hours} Hours/Week
                      </span>
                    </div>

                    <div className="planner-schedule-grid">
                      {studyPlan.sessions.map((sess, idx) => (
                        <div key={idx} className="glass-panel day-plan-card">
                          <div className="day-header">{sess.day}</div>
                          <div className="sessions-list">
                            <div className="session-row">
                              <div className="session-time">{sess.time_slot}</div>
                              <div className="session-details">
                                <div className="session-topic">{sess.topic}</div>
                                <ul className="session-activities">
                                  {sess.activities.map((act, aIdx) => (
                                    <li key={aIdx}>{act}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {studyPlan.general_tips && studyPlan.general_tips.length > 0 && (
                      <div className="glass-panel planner-tips-card">
                        <h3>Strategic Study Recommendations</h3>
                        <ul className="tips-list">
                          {studyPlan.general_tips.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: '28px' }}>
                      <button 
                        className="btn-primary" 
                        onClick={() => setStudyPlan(null)}
                      >
                        Create Another Study Plan
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
