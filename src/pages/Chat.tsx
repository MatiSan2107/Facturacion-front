import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';
const socket = io(API_URL);

interface Message {
  author: string;
  text: string;
  time: string;
  isMe: boolean;
  fileUrl?: string; 
  fileName?: string;
}

interface ChatSession {
  room: string;
  client: string;
  lastMsg: string;
}

export default function Chat({ onOpen }: { onOpen: () => void }) {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userEmail = localStorage.getItem('email') || "Anónimo";
  const userRole = localStorage.getItem('role') || "USER";

  // --- ESTADOS DE VISTA ---
  const [view, setView] = useState<'LIST' | 'CHAT'>(userRole === 'ADMIN' ? 'LIST' : 'CHAT');
  const [selectedRoom, setSelectedRoom] = useState<string>(userRole === 'ADMIN' ? '' : `room_${userEmail}`);
  const [chatTitle, setChatTitle] = useState<string>(userRole === 'ADMIN' ? 'Bandeja de Mensajes' : 'Soporte Privado');

  // --- ESTADOS DE DATOS ---
  const [message, setMessage] = useState("");
  const [list, setList] = useState<Message[]>([]); 
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]); 
  const [allMessages, setAllMessages] = useState<any[]>([]); 

  // 1. CARGA INICIAL
  useEffect(() => {
    onOpen();
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/chat/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (userRole === 'ADMIN') {
        setAllMessages(data); 
        
        const roomsMap = new Map();
        data.forEach((msg: any) => {
          if (msg.room && msg.room.startsWith('room_')) {
            roomsMap.set(msg.room, {
              room: msg.room,
              client: msg.room.replace('room_', ''),
              lastMsg: msg.text || (msg.fileUrl ? '📎 Archivo adjunto' : 'Nuevo mensaje')
            });
          }
        });
        setChatSessions(Array.from(roomsMap.values()));
      } else {
        const history = data.map(formatMsg);
        setList(history);
        socket.emit("join_room", `room_${userEmail}`);
      }
    } catch (error) {
      console.error("Error cargando historial");
    }
  };

  const formatMsg = (msg: any): Message => ({
    author: msg.author,
    text: msg.text || msg.message,
    time: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : msg.time,
    isMe: msg.author === userEmail,
    fileUrl: msg.fileUrl,
    fileName: msg.fileName
  });

  // 2. ESCUCHAR MENSAJES NUEVOS
  useEffect(() => {
    const handleReceiveMessage = (data: any) => {
      if (data.room === selectedRoom) {
        setList(prev => [...prev, {
          author: data.author,
          text: data.message,
          time: data.time,
          isMe: data.author === userEmail,
          fileUrl: data.fileUrl,
          fileName: data.fileName
        }]);
      }

      if (userRole === 'ADMIN') {
        setChatSessions(prev => {
          const existing = prev.find(s => s.room === data.room);
          const updatedSession = {
            room: data.room,
            client: data.room.replace('room_', ''),
            lastMsg: data.message || '📎 Archivo adjunto'
          };
          return existing 
            ? [updatedSession, ...prev.filter(s => s.room !== data.room)]
            : [updatedSession, ...prev];
        });
      }
    };

    socket.on("receive_message", handleReceiveMessage);
    return () => { socket.off("receive_message", handleReceiveMessage); };
  }, [selectedRoom, userRole]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [list, view]);

  // 3. ACCIONES DE NAVEGACIÓN
  const openAdminChat = (room: string, client: string) => {
    setSelectedRoom(room);
    setChatTitle(`Chat: ${client}`);
    setView('CHAT');
    
    const roomMsgs = allMessages.filter(m => m.room === room).map(formatMsg);
    setList(roomMsgs);
    
    socket.emit("join_room", room);
  };

  const handleBack = () => {
    if (userRole === 'ADMIN' && view === 'CHAT') {
      setView('LIST');
      setChatTitle('Bandeja de Mensajes');
      setSelectedRoom('');
    } else {
      navigate(-1);
    }
  };

  // 4. ACCIONES DE MENSAJES Y ARCHIVOS
  const sendMessage = async (fileData?: { url: string, name: string }) => {
    if (message.trim() === "" && !fileData) return;

    const msgData = {
      room: selectedRoom,
      author: userEmail,
      message: message,
      fileUrl: fileData?.url,
      fileName: fileData?.name,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    await socket.emit("send_message", msgData);
    setMessage("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return alert("Solo PDFs");

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/chat/upload`, {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.url) sendMessage({ url: data.url, name: file.name });
    } catch (error) { alert("Error al subir archivo"); }
  };

  // --- CORRECCIÓN: FUNCIÓN CLEAR CHAT ACTUALIZADA ---
  const clearChat = async () => {
    if (!confirm("¿Deseas limpiar tu historial? La otra persona conservará sus mensajes.")) return;
    
    // Identificamos exactamente qué sala queremos borrar
    const roomToClear = userRole === 'ADMIN' ? selectedRoom : `room_${userEmail}`;

    try {
      // Usamos la nueva ruta que incluye el nombre de la sala al final
      const res = await fetch(`${API_URL}/chat/history/${roomToClear}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (res.ok) {
        setList([]); 
        if (userRole === 'ADMIN') {
          // Si es admin, lo devolvemos a la bandeja y quitamos ese cliente de la lista
          setChatSessions(prev => prev.filter(s => s.room !== roomToClear));
          setView('LIST');
          setChatTitle('Bandeja de Mensajes');
          setSelectedRoom('');
        }
      }
    } catch (error) { 
      alert("Error al intentar ocultar el historial"); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 sm:p-4 font-sans">
      <div className="bg-white w-full max-w-2xl h-screen sm:h-[700px] shadow-2xl sm:rounded-3xl overflow-hidden flex flex-col border border-slate-200">
        
        {/* CABECERA ROBUSTA */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex justify-between items-center text-white shadow-lg shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={handleBack} className="hover:bg-white/20 p-2 rounded-full transition-all flex items-center justify-center w-10 h-10 bg-white/10">
              <span className="text-xl font-bold">←</span>
            </button>
            <div className="flex flex-col">
              <h2 className="font-extrabold text-lg tracking-tight">{chatTitle}</h2>
              {view === 'CHAT' && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-medium text-blue-100 uppercase tracking-widest">Conectado</span>
                </div>
              )}
            </div>
          </div>

          {view === 'CHAT' && (
            <button onClick={clearChat} className="bg-red-500/20 hover:bg-red-600 p-2.5 rounded-xl transition-all" title="Limpiar chat">
              🗑️
            </button>
          )}
        </div>

        {/* CONTENIDO DINÁMICO */}
        {view === 'LIST' ? (
          <div className="flex-1 p-4 overflow-y-auto bg-[#f0f2f5]">
            <h3 className="text-gray-500 text-xs font-bold uppercase mb-4 px-2">Conversaciones Activas</h3>
            
            {chatSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 opacity-40">
                <span className="text-5xl mb-4">📭</span>
                <p className="text-sm font-semibold text-slate-600 uppercase">Bandeja vacía</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatSessions.map((session, i) => (
                  <div key={i} onClick={() => openAdminChat(session.room, session.client)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold uppercase">
                        {session.client.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{session.client}</p>
                        <p className="text-sm text-gray-500 truncate max-w-[200px] sm:max-w-[300px]">{session.lastMsg}</p>
                      </div>
                    </div>
                    <span className="text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Abrir →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 p-6 overflow-y-auto bg-[#f0f2f5] flex flex-col gap-4">
              {list.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-40">
                  <span className="text-5xl mb-4">💬</span>
                  <p className="text-sm font-semibold text-slate-600 uppercase">Sin mensajes previos</p>
                </div>
              )}

              {list.map((msg, index) => (
                <div key={index} className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
                  {!msg.isMe && (
                    <span className="text-[10px] font-bold text-slate-500 ml-2 mb-1 uppercase tracking-tighter">
                      {msg.author.split('@')[0]}
                    </span>
                  )}
                  
                  <div className={`relative px-4 py-2.5 shadow-sm max-w-[85%] ${msg.isMe ? "bg-blue-600 text-white rounded-2xl rounded-tr-none" : "bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-200"}`}>
                    {msg.text && <p className="text-[14.5px] leading-relaxed break-words">{msg.text}</p>}
                    
                    {msg.fileUrl && (
                      <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-2 p-2 bg-black/10 rounded-lg hover:bg-black/20 transition">
                        <span className="text-xl">📄</span>
                        <span className="text-xs font-bold underline truncate max-w-[150px]">{msg.fileName}</span>
                      </a>
                    )}
                    <p className={`text-[9px] mt-1 text-right font-medium ${msg.isMe ? "text-blue-100" : "text-slate-400"}`}>{msg.time}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
              <button onClick={() => fileInputRef.current?.click()} className="text-2xl hover:bg-slate-100 p-2 rounded-xl transition">📎</button>

              <input
                type="text"
                className="flex-1 bg-slate-100 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Escribe un mensaje..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <button onClick={() => sendMessage()} disabled={!message.trim()} className="bg-blue-600 disabled:bg-slate-300 text-white w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95">
                <span className="text-xl">➤</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}