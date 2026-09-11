'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, AudioLines, Bot, Check, ChevronDown, ChevronRight, Code2, Compass, Copy, Download, FileText, Gift, Globe2, History, Languages, Layers3, Loader2, MessageCircle, Mic, PanelLeftClose, PanelLeftOpen, Paperclip, Plus, Search, Send, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Square, Trash2, WandSparkles, X, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { defaultSettings, models, providerNames, providers, type Provider, type Settings } from '@/lib/models';
import type { ChatMessage } from '@/db/schema';

type Conversation = { id: string; title: string; model: string; messages: ChatMessage[]; updatedAt: string };
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const features = [
  { name: 'AI Space Designer', category: 'REIMAGINE YOUR SPACE', description: 'A little inspiration. A whole new space.', image: '/images/interior.jpg', tag: 'Popular', prompt: 'Help me design a warm, modern living room. Suggest a color palette, furniture, lighting, and materials.', icon: Layers3 },
  { name: 'Creative Writing', category: 'FIND YOUR WORDS', description: 'Turn a spark into something remarkable.', image: '/images/creative.jpg', tag: 'Creative', prompt: 'Be my creative writing partner. Help me turn an idea into a compelling story. Start by asking me about the genre and mood.', icon: FileText },
  { name: 'Travel Companion', category: 'GO BEYOND THE ORDINARY', description: 'Less planning. More discovering.', image: '/images/travel.jpg', tag: 'Explore', prompt: 'Help me plan a memorable trip. Ask me about my destination, budget, and travel style, then build a personal itinerary.', icon: Globe2 },
];
const assistants = [
  { name: 'Translator', detail: 'Break the language barrier', icon: Languages, color: 'green', prompt: 'Act as my translator. Ask me which languages I want to translate between and what text I need translated.' },
  { name: 'Writing Assistant', detail: 'Make every word count', icon: FileText, color: 'purple', prompt: 'Help me improve my writing. Ask me to share a draft and the tone I want to achieve.' },
  { name: 'Code Companion', detail: 'Build something brilliant', icon: Code2, color: 'blue', prompt: 'Be my coding companion. Ask me what I am building and which programming language I am using.' },
  { name: 'Life Coach', detail: 'A little clarity, every day', icon: Sparkles, color: 'orange', prompt: 'Help me reflect on my goals and build a realistic plan. Start by asking me what I would most like to improve.' },
];

export default function Home() {
  const [sidebar, setSidebar] = useState(true);
  const [view, setView] = useState<'explore' | 'chat' | 'assistants' | 'history'>('explore');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [keys, setKeys] = useState<Record<Provider,string>>({ openai: '', anthropic: '', openrouter: '' });
  const [modal, setModal] = useState<'settings' | 'models' | 'install' | 'features' | 'welcome' | null>(null);
  const [settingsTab, setSettingsTab] = useState<'model' | 'personalize'>('model');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [listening, setListening] = useState(false);
  const [online, setOnline] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const activeModel = models[settings.provider].find(m => m.id === settings.model);
  const modelName = activeModel?.name || settings.model;
  const notify = (text: string) => { setToast(text); };
  const refreshHistory = async () => {
    try { const res = await fetch('/api/conversations'); if(res.ok) setHistory(await res.json()); } catch { /* Offline history remains in memory. */ }
  };
  useEffect(() => {
    try { const saved = localStorage.getItem('nex-settings'); if(saved) { const parsed = JSON.parse(saved); if(providers.includes(parsed.provider)) setSettings({ ...defaultSettings, ...parsed }); } } catch { /* Use defaults for invalid local settings. */ }
    if(window.innerWidth < 850) setSidebar(false);
    setOnline(navigator.onLine);
    setInstalled(window.matchMedia('(display-mode: standalone)').matches);
    const status = () => setOnline(navigator.onLine);
    const install = (e: Event) => { e.preventDefault(); setInstallPrompt(e as InstallEvent); };
    window.addEventListener('online', status); window.addEventListener('offline', status); window.addEventListener('beforeinstallprompt', install);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    refreshHistory();
    return () => { window.removeEventListener('online', status); window.removeEventListener('offline', status); window.removeEventListener('beforeinstallprompt', install); recognitionRef.current?.stop(); };
  }, []);
  useEffect(() => { if(toast) { const timer = setTimeout(() => setToast(''), 3200); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => {
    if(!modal) return;
    const previous = document.activeElement as HTMLElement;
    const timer = setTimeout(() => dialogRef.current?.focus(), 20);
    const keydown = (event: KeyboardEvent) => {
      if(event.key === 'Escape') setModal(null);
      if(event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex="0"]');
        if(!focusable?.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if(event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
        else if(!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { clearTimeout(timer); document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [modal]);
  function saveSettings() { localStorage.setItem('nex-settings', JSON.stringify(settings)); setModal(null); notify('Your preferences are saved. Make yourself at home.'); }
  function selectProvider(provider: Provider) { setSettings(s => ({ ...s, provider, model: models[provider][0].id })); }
  function newChat(prompt = '') { if(loading) return; setMessages([]); setConversationId(null); setError(''); setInput(prompt); setAttachment(null); setView('chat'); setModal(null); if(window.innerWidth < 850) setSidebar(false); setTimeout(() => inputRef.current?.focus(), 50); }
  function navigate(next: typeof view) { if(loading) return; setView(next); if(window.innerWidth < 850) setSidebar(false); }
  function openConversation(chat: Conversation) { if(loading) return; setMessages(chat.messages); setConversationId(chat.id); setError(''); setView('chat'); setInput(''); if(window.innerWidth < 850) setSidebar(false); }
  async function deleteChat(id: string) { try { const res = await fetch('/api/conversations', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); if(!res.ok) throw new Error(); setHistory(h => h.filter(c => c.id !== id)); if(conversationId === id) newChat(); notify('Conversation deleted.'); } catch { notify('Could not delete this conversation. Try again.'); } }
  async function send() {
    if(!input.trim() || loading) return;
    if(!online) { setError('You’re offline. Your draft is safe — reconnect to send a message.'); return; }
    const content = input.trim() + (attachment ? `\n\nAttached file: ${attachment.name}\n${attachment.content}` : '');
    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(next); setInput(''); setAttachment(null); setView('chat'); setLoading(true); setError('');
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...settings, apiKey: keys[settings.provider], messages: next, conversationId }), signal: controller.signal });
      const data = await response.json();
      if(!response.ok) { if(data.needsKey) { setSettingsTab('model'); setModal('settings'); } throw new Error(data.error); }
      setMessages([...next, { role: 'assistant', content: data.content }]); setConversationId(data.conversationId); refreshHistory();
    } catch(e) {
      if(e instanceof Error && e.name === 'AbortError') setError('Generation stopped. You can edit your message and send it again.');
      else setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setMessages(messages); setInput(content);
    } finally { setLoading(false); abortRef.current = null; }
  }
  function startVoice() {
    if(listening) { recognitionRef.current?.stop(); return; }
    type Recognition = { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { results: { transcript: string }[][] }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
    const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Speech = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if(!Speech) { notify('Voice input is supported in Chrome on Android and desktop.'); return; }
    const recognition = new Speech(); recognition.lang = 'en-US'; recognition.interimResults = false;
    recognition.onresult = e => setInput(previous => `${previous}${previous ? ' ' : ''}${e.results[0][0].transcript}`);
    recognition.onerror = () => { setListening(false); notify('Microphone unavailable. Please check browser permissions.'); };
    recognition.onend = () => setListening(false); recognitionRef.current = recognition; setListening(true); recognition.start();
  }
  async function installApp() { if(installPrompt) { await installPrompt.prompt(); const result = await installPrompt.userChoice; if(result.outcome === 'accepted') { setInstalled(true); setModal(null); notify('Nex AI is ready for your home screen.'); } setInstallPrompt(null); } else setModal('install'); }
  async function copyMessage(content: string) { try { await navigator.clipboard.writeText(content); notify('Copied to clipboard.'); } catch { notify('Clipboard permission is unavailable in this browser.'); } }

  return <div className={`app-shell ${sidebar ? '' : 'sidebar-hidden'}`}>
    {sidebar && <button className="sidebar-scrim" aria-label="Close sidebar" onClick={() => setSidebar(false)} />}
    <aside className={`sidebar ${sidebar ? 'is-open' : ''}`}>
      <div className="brand-row"><button className="brand" onClick={() => navigate('explore')}><span className="brand-symbol"><Sparkles size={22} strokeWidth={1.7} /></span>Nex<span className="brand-ai">AI</span></button><button className="icon-button sidebar-toggle" onClick={() => setSidebar(false)} aria-label="Hide sidebar"><PanelLeftClose size={19}/></button></div>
      <button className="new-chat" onClick={() => newChat()} disabled={loading}><Plus size={18}/><span>New chat</span><span className="shortcut">↗</span></button>
      <div className="nav-label">YOUR WORKSPACE</div>
      <nav className="main-nav">
        <button className={view === 'explore' ? 'active' : ''} onClick={() => navigate('explore')}><Compass size={19}/>Explore<span className="active-dot"/></button>
        <button className={view === 'chat' ? 'active' : ''} onClick={() => navigate('chat')}><MessageCircle size={19}/>Chat AI</button>
        <button className={view === 'assistants' ? 'active' : ''} onClick={() => navigate('assistants')}><Layers3 size={19}/>AI Assistants<span className="count">4</span></button>
        <button className={view === 'history' ? 'active' : ''} onClick={() => navigate('history')}><History size={19}/>Chat history</button>
      </nav>
      <div className="recent-heading"><span className="nav-label">RECENT CONVERSATIONS</span><button className="icon-button" aria-label="View all conversations" onClick={() => navigate('history')}><ArrowUpRight size={14}/></button></div>
      <div className="recent-list">{history.length ? history.slice(0,5).map(c => <button key={c.id} className={conversationId === c.id && view === 'chat' ? 'selected' : ''} onClick={() => openConversation(c)}><MessageCircle size={15}/><span>{c.title}</span></button>) : <div className="history-empty"><MessageCircle size={19}/><p>A little curiosity goes a long way.</p><span>Your conversations will live here.</span></div>}</div>
      <div className="sidebar-bottom"><div className="personal-card"><div className="personal-title"><Sparkles size={18}/><span>Intelligence, your way.</span></div><p>Your favorite models.<br/>One thoughtful space.</p><button onClick={() => { setSettingsTab('model'); setModal('settings'); }}>Make it yours <ArrowUpRight size={15}/></button></div>
        <button className="utility-link" onClick={installApp}><Download size={17}/>{installed ? 'App installed' : 'Install Nex AI'}<span className="mini-badge">PWA</span></button>
        <button className="utility-link" onClick={() => { setSettingsTab('personalize'); setModal('settings'); }}><Settings2 size={17}/>Settings & preferences</button>
        <div className="profile"><button className="profile-main" onClick={() => { setSettingsTab('personalize'); setModal('settings'); }}><span className="avatar">{settings.name.slice(0,1).toUpperCase() || 'A'}</span><span><strong>{settings.name || 'Alex'} Morgan</strong><small>Your personal workspace</small></span></button><button className="icon-button" aria-label="Profile settings" onClick={() => { setSettingsTab('personalize'); setModal('settings'); }}><ChevronDown size={16}/></button></div>
      </div>
    </aside>

    <main className="main-panel">
      <header className="topbar"><div className="breadcrumb">{!sidebar && <button className="icon-button" onClick={() => setSidebar(true)} aria-label="Show sidebar"><PanelLeftOpen size={20}/></button>}<span className="breadcrumb-icon">{view === 'explore' ? <Compass size={18}/> : view === 'chat' ? <MessageCircle size={18}/> : view === 'history' ? <History size={18}/> : <Layers3 size={18}/>}</span><span>{view === 'explore' ? 'Explore' : view === 'chat' ? 'Chat AI' : view === 'history' ? 'Chat history' : 'AI Assistants'}</span><ChevronRight size={13}/><span className="breadcrumb-muted">Your AI, a little more personal</span></div>
      <div className="topbar-actions"><button className="model-select" onClick={() => setModal('models')}><span className="model-logo"><ApertureLogo/></span><span>{modelName}</span><span className="model-online"/><ChevronDown size={14}/></button><button className="icon-button gift-button" aria-label="Discover Nex AI" onClick={() => setModal('welcome')}><Gift size={18}/><i/></button></div></header>
      {!online && <div className="offline-banner">You’re offline. Explore your workspace — chatting resumes when you reconnect.</div>}
      <div className={`content-scroll ${view === 'chat' ? 'chat-scroll' : ''}`}>
        <div className="content">
          {view === 'explore' && <>
            <section className="hero"><div className="hero-copy"><div className="eyebrow"><span/><span>YOUR SMARTER EVERYDAY STARTS HERE</span></div><h1>A little curiosity.<br/>Limitless <span>possibilities.</span></h1><p>Hey {settings.name || 'Alex'} <span className="wave">✦</span> Your next great idea is just a conversation away.</p><div className="hero-tags"><span><Sparkles size={13}/>Think bigger</span><i/><span>Create freely</span><i/><span>Make it yours</span></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orb"><div className="orb-core"/><Sparkles className="orb-spark" strokeWidth={1}/></div><span className="floating-spark spark-one">✦</span><span className="floating-spark spark-two">✧</span><div className="orb-label"><span/> A little intelligence. A lot of possibility.</div></div></section>
            <section className="features-section"><div className="section-heading"><div><h2>Discover what’s possible <span className="label-new">HANDPICKED FOR YOU</span></h2><p>A spark of inspiration for whatever’s on your mind.</p></div><button className="text-button" onClick={() => setModal('features')}>Explore all <ArrowUpRight size={15}/></button></div><div className="feature-grid">{features.map((feature,i) => <button className={`feature-card feature-${i}`} key={feature.name} onClick={() => newChat(feature.prompt)}><img src={feature.image} alt={feature.name === 'AI Space Designer' ? 'Warm contemporary living room overlooking the ocean' : feature.name === 'Creative Writing' ? 'Sculptural open book in warm amber light' : 'Mount Fuji under stars reflected in a still lake'}/><div className="feature-shade"/><span className="feature-tag"><feature.icon size={12}/>{feature.tag}</span><div className="feature-copy"><span className="feature-category">{feature.category}</span><h3>{feature.name}</h3><p>{feature.description}</p></div><span className="feature-arrow"><ArrowUpRight size={20}/></span></button>)}</div></section>
            <section className="assistants-section"><div className="section-heading"><div><h2>A little help from the experts</h2><p>Meet your go-to AI assistants.</p></div><button className="text-button" onClick={() => navigate('assistants')}>View all <ArrowUpRight size={15}/></button></div><div className="assistant-grid">{assistants.map(a => <button className="assistant-card" key={a.name} onClick={() => newChat(a.prompt)}><span className={`assistant-icon ${a.color}`}><a.icon size={21} strokeWidth={1.6}/></span><span className="assistant-text"><strong>{a.name}</strong><small>{a.detail}</small></span><ChevronRight size={14}/></button>)}</div></section>
          </>}
          {view === 'chat' && <section className="chat-container">{messages.length === 0 ? <div className="chat-welcome"><span className="welcome-bot"><Sparkles size={31}/></span><div className="eyebrow">A SPACE FOR YOUR NEXT BIG IDEA</div><h1>What’s on your mind?</h1><p>I’m Nex, your everyday AI companion.<br/>Let’s make something great, figure it out, or just talk.</p><div className="prompt-chips"><button onClick={() => setInput('Help me brainstorm a creative idea for a new project.')}><WandSparkles size={15}/>Spark an idea</button><button onClick={() => setInput('Explain a fascinating scientific concept in simple terms.')}><Zap size={15}/>Learn something new</button><button onClick={() => setInput('Help me plan a focused and balanced day.')}><Compass size={15}/>Plan my day</button></div></div> : <div className="messages">{messages.map((m,i) => <div className={`message ${m.role}`} key={i}>{m.role === 'assistant' && <span className="message-avatar"><Bot size={19}/></span>}<div className="message-content"><div className="message-author">{m.role === 'user' ? 'You' : 'Nex AI'}{m.role === 'assistant' && <span>{modelName}</span>}</div><div className="message-bubble"><ReactMarkdown>{m.content}</ReactMarkdown></div>{m.role === 'assistant' && <div className="message-actions"><button className="icon-button" title="Copy response" onClick={() => copyMessage(m.content)}><Copy size={15}/></button><button className="icon-button" title="Read response aloud" onClick={() => { if('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(m.content)); } else notify('Read aloud is not supported by this browser.'); }}><AudioLines size={16}/></button></div>}</div></div>)}{loading && <div className="message assistant"><span className="message-avatar"><Bot size={19}/></span><div className="thinking"><span/><span/><span/><small>Nex is thinking</small></div></div>}<div ref={bottomRef}/></div>}</section>}
          {view === 'assistants' && <section className="library-view"><div className="eyebrow"><Sparkles size={14}/> YOUR PERSONAL DREAM TEAM</div><h1>A little expertise.<br/><span>A world of difference.</span></h1><p>Thoughtful assistants for the things you do every day. Pick one to get started.</p><div className="assistant-library">{assistants.map(a => <button key={a.name} onClick={() => newChat(a.prompt)}><span className={`assistant-icon ${a.color}`}><a.icon size={26}/></span><h2>{a.name}</h2><p>{a.detail}. A dedicated conversation, tailored to you.</p><span className="text-button">Start a conversation <ArrowUpRight size={16}/></span></button>)}</div></section>}
          {view === 'history' && <section className="library-view"><div className="eyebrow"><History size={14}/> IDEAS WORTH COMING BACK TO</div><h1>Your conversations.</h1><p>Pick up where you left off. A little inspiration is always waiting.</p><div className="search-field"><Search size={18}/><input placeholder="Search your conversations..." aria-label="Search conversations" value={search} onChange={e => setSearch(e.target.value)}/></div><div className="history-list">{history.filter(c => c.title.toLowerCase().includes(search.toLowerCase())).map(c => <div className="history-item" key={c.id}><button onClick={() => openConversation(c)}><MessageCircle size={21}/><span><strong>{c.title}</strong><small>{new Date(c.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {c.messages.length} messages · {c.model}</small></span><ArrowUpRight size={18}/></button><button className="icon-button" aria-label={`Delete ${c.title}`} disabled={loading} onClick={() => deleteChat(c.id)}><Trash2 size={17}/></button></div>)}{!history.filter(c => c.title.toLowerCase().includes(search.toLowerCase())).length && <div className="empty-state"><MessageCircle size={35}/><h2>{search ? 'No conversations found' : 'Your story starts here'}</h2><p>{search ? 'Try a different search.' : 'Start a conversation and it will be saved here, just for this browser.'}</p><button className="primary-button" onClick={() => newChat()}>Start a new chat <Plus size={16}/></button></div>}</div></section>}
        </div>
      </div>
      <div className="composer-wrap"><div className="composer-width">{error && <div className="error-notice" role="alert"><span>{error}</span><button className="icon-button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}<div className="composer"><div className="composer-heading"><span><Sparkles size={14}/>Ask a little. Discover a lot.</span><button onClick={() => { setSettingsTab('model'); setModal('settings'); }}>Customize your AI <SlidersHorizontal size={13}/></button></div>{attachment && <div className="attachment"><FileText size={14}/>{attachment.name}<button onClick={() => setAttachment(null)} aria-label="Remove attachment"><X size={13}/></button></div>}<textarea ref={inputRef} aria-label="Your message" placeholder="Ask anything, or dream up something new..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} rows={2}/><div className="composer-toolbar"><div className="composer-tools"><input ref={fileRef} type="file" accept=".txt,.md,.csv,.json,.js,.ts,.py,.html,.css" hidden onChange={async e => { const file = e.target.files?.[0]; if(file) { if(file.size > 40000) notify('Please attach a text file smaller than 40 KB.'); else { setAttachment({ name: file.name, content: await file.text() }); inputRef.current?.focus(); } } e.target.value = ''; }}/><button className="icon-button" title="Attach a text file" onClick={() => fileRef.current?.click()}><Plus size={20}/></button><button className="icon-button" title="Attach a text file" onClick={() => fileRef.current?.click()}><Paperclip size={18}/></button><span className="tool-divider"/><button className="icon-button sparkle-tool" title="Get prompt inspiration" onClick={() => { const prompts = ['Help me brainstorm five unexpected ideas for a creative project.', 'Explain something fascinating that most people do not know.', 'Help me turn my biggest goal into small, achievable steps.']; setInput(prompts[Math.floor(Math.random() * prompts.length)]); inputRef.current?.focus(); }}><WandSparkles size={18}/></button><span className="composer-model" onClick={() => setModal('models')} role="button" tabIndex={0} onKeyDown={e => { if(e.key === 'Enter') setModal('models'); }}><span/>{modelName}<ChevronDown size={12}/></span></div><div className="send-tools"><span className="enter-hint">Enter to send</span><button className={`voice-button ${listening ? 'listening' : ''}`} aria-label={listening ? 'Stop voice input' : 'Start voice input'} onClick={startVoice}><Mic size={18}/></button><button className="send-button" aria-label={loading ? 'Stop generating' : 'Send message'} disabled={!loading && !input.trim()} onClick={() => loading ? abortRef.current?.abort() : send()}>{loading ? <Square size={17}/> : <Send size={19}/>}</button></div></div></div><div className="composer-footer"><span><ShieldCheck size={12}/>Your space. Your conversations. Your control.</span><span>AI can make mistakes. Stay curious, think critically.</span></div></div></div>
    </main>
    {toast && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
    {modal && <div className="modal-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) setModal(null); }}><div className={`modal ${modal === 'features' ? 'wide-modal' : ''}`} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}><div className="modal-header"><div><span className="eyebrow">A LITTLE MORE YOU</span><h2 id="modal-title">{modal === 'models' ? 'Choose your intelligence' : modal === 'settings' ? 'Make Nex your own' : modal === 'install' ? 'Your AI. In your pocket.' : modal === 'features' ? 'Follow your curiosity' : 'Meet your everyday companion'}</h2></div><button className="icon-button" onClick={() => setModal(null)} aria-label="Close dialog"><X size={21}/></button></div>
      {(modal === 'settings' || modal === 'models') && <>{modal === 'settings' && <div className="settings-tabs"><button className={settingsTab === 'model' ? 'selected' : ''} onClick={() => setSettingsTab('model')}><SlidersHorizontal size={16}/>Models & connection</button><button className={settingsTab === 'personalize' ? 'selected' : ''} onClick={() => setSettingsTab('personalize')}><Sparkles size={16}/>Personalization</button></div>}{(modal === 'models' || settingsTab === 'model') ? <><p className="modal-intro">Different minds. One space. Find the right model for you.</p><div className="provider-tabs">{providers.map(p => <button className={settings.provider === p ? 'selected' : ''} key={p} onClick={() => selectProvider(p)}>{p === 'openai' ? <ApertureLogo/> : p === 'anthropic' ? <span className="anthropic-logo">A</span> : <Layers3 size={16}/>} {providerNames[p]}</button>)}</div><div className="model-options">{models[settings.provider].map(m => <button key={m.id} className={settings.model === m.id ? 'chosen' : ''} onClick={() => setSettings(s => ({ ...s, model: m.id }))}><span className="option-model-icon"><Sparkles size={19}/></span><span><strong>{m.name}</strong><small>{m.description}</small></span><span className="radio-dot">{settings.model === m.id && <Check size={12}/>}</span></button>)}</div>{modal === 'settings' && <><label className="field-label">Custom model ID <span>Optional</span><input value={settings.model} onChange={e => setSettings(s => ({ ...s, model: e.target.value }))} placeholder="Enter an exact provider model ID"/></label><label className="field-label">{providerNames[settings.provider]} API key <span>Kept only for this session</span><input type="password" autoComplete="off" placeholder="Paste your API key to connect" value={keys[settings.provider]} onChange={e => setKeys(k => ({ ...k, [settings.provider]: e.target.value }))}/></label><div className="privacy-note"><ShieldCheck size={15}/><span>Keys are sent securely to your selected provider through our server, never saved. A server-configured key is used if this field is empty.</span></div></>}</> : <div className="personalization-fields"><label className="field-label">What should we call you?<input maxLength={30} value={settings.name} onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}/></label><label className="field-label">AI personality & instructions<textarea rows={4} value={settings.systemPrompt} onChange={e => setSettings(s => ({ ...s, systemPrompt: e.target.value }))}/></label><label className="field-label">Creativity <span>{settings.temperature.toFixed(1)}</span><input type="range" min="0" max="1" step="0.1" value={settings.temperature} onChange={e => setSettings(s => ({ ...s, temperature: Number(e.target.value) }))}/><div className="range-labels"><span>Focused & precise</span><span>Imaginative & expressive</span></div></label><label className="field-label">Maximum response length<select value={settings.maxTokens} onChange={e => setSettings(s => ({ ...s, maxTokens: Number(e.target.value) }))}><option value={512}>Short · 512 tokens</option><option value={2048}>Balanced · 2,048 tokens</option><option value={4096}>Detailed · 4,096 tokens</option><option value={8192}>Extended · 8,192 tokens</option></select></label></div>}<div className="modal-footer"><button className="text-button" onClick={() => { if(modal === 'models') { setSettingsTab('model'); setModal('settings'); } else { setSettings(defaultSettings); notify('Defaults restored. Save to apply.'); } }}>{modal === 'models' ? 'Connection settings' : 'Reset to defaults'}</button><button className="primary-button" disabled={!settings.model.trim()} onClick={saveSettings}>{modal === 'models' ? 'Use this model' : 'Save preferences'}<Check size={16}/></button></div></>}
      {modal === 'install' && <div className="install-content"><span className="install-app-icon"><Sparkles size={45}/></span><p>All your favorite AI models, one tap away.<br/>No app store. No extra space. Just Nex.</p><div className="install-steps"><div><span>1</span>Open Nex AI in Chrome on your Android device.</div><div><span>2</span>Tap the browser menu <strong>⋮</strong> in the top corner.</div><div><span>3</span>Choose <strong>Add to Home screen</strong> → <strong>Install</strong>.</div></div><p className="small-note">Installation requires HTTPS and a supported browser. The app shell works offline; AI conversations need internet access.</p>{installPrompt && <button className="primary-button" onClick={installApp}><Download size={17}/>Install Nex AI</button>}</div>}
      {modal === 'features' && <div className="feature-library">{features.map(f => <button key={f.name} onClick={() => newChat(f.prompt)}><img src={f.image} alt={f.name}/><span><h3>{f.name}</h3><p>{f.description}</p></span><ArrowUpRight size={20}/></button>)}<p className="small-note">These assistants offer ideas and written guidance. Connect your preferred AI provider to get started.</p></div>}
      {modal === 'welcome' && <div className="welcome-content"><span className="install-app-icon"><Sparkles size={45}/></span><h3>Big ideas start with a little hello.</h3><p>Nex brings OpenAI, Anthropic, and OpenRouter together in a calmer, more personal space.</p><div className="welcome-benefits"><span><Check size={16}/>Switch models whenever inspiration strikes</span><span><Check size={16}/>Shape your assistant’s personality</span><span><Check size={16}/>Keep your conversations in one place</span></div><button className="primary-button" onClick={() => { setSettingsTab('model'); setModal('settings'); }}>Connect your first model <ArrowRight size={17}/></button><p className="small-note">Bring your own API key. Provider usage charges may apply.</p></div>}
    </div></div>}
  </div>;
}
function ApertureLogo() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="17" height="17" aria-hidden="true"><path d="M12 3a5 5 0 0 1 8 5 5 5 0 0 1 0 9 5 5 0 0 1-8 4 5 5 0 0 1-8-5 5 5 0 0 1 0-9 5 5 0 0 1 8-4Z"/><path d="m12 3 6 10-6 4-6-4 6-4 6 4M4 7l12 0v7l-6 4-6-11m16 10H8V10l6-4 6 11"/></svg>; }
