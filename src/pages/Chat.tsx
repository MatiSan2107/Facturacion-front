import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

// 1. Conexión al servidor de sockets
const socket = io("http://localhost:3000");

interface Message {
  author: string;
  text: string;
  time: string;
  isMe: boolean;
}

interface ChatProps {
  onOpen: () => void;
}

export default function Chat({ onOpen }: ChatProps) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [list, setList] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Datos del usuario actual
  const userEmail = localStorage.getItem('email') || "Anónimo";

  useEffect(() => {
    // Notificar al sistema que el chat se abrió para limpiar notificaciones
    onOpen();
    fetchHistory();

    // Escuchar mensajes nuevos en tiempo real
    const handleReceiveMessage = (data: any) => {
      // Nota: Ya no escuchamos "CHAT_CLEARED" para que el borrado sea individual
      setList((prev) => [...prev, {
        author: data.author,
        text: data.message,
        time: data.time,
        isMe: data.author === userEmail
      }]);
    };

    socket.on("receive_message", handleReceiveMessage);
    return () => { socket.off("receive_message", handleReceiveMessage); };
  }, [userEmail, onOpen]);

  // Scroll automático al final
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [list]);

  // 2. Cargar historial filtrado (Solo lo que no ha sido marcado como borrado)
  const fetchHistory = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:3000/chat/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      const history = data.map((msg: any) => ({
        author: msg.author,
        text: msg.text,
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: msg.author === userEmail
      }));
      
      setList(history);
    } catch (error) {
      console.error("Error cargando historial");
    }
  };

  // 3. Enviar mensaje
  const sendMessage = async () => {
    if (message.trim() === "") return;

    const msgData = {
      author: userEmail,
      message: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    await socket.emit("send_message", msgData);
    setMessage("");
  };

  // 4. Borrar historial (Solo para el usuario actual)
  const clearChat = async () => {
    if (!confirm("¿Deseas limpiar tu historial de chat? La otra persona conservará los mensajes.")) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3000/chat/history', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setList([]); // Se limpia solo mi pantalla
      }
    } catch (error) {
      alert("Error al intentar ocultar el historial");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 sm:p-4 font-sans">
      <div className="bg-white w-full max-w-2xl h-screen sm:h-[700px] shadow-2xl sm:rounded-3xl overflow-hidden flex flex-col border border-slate-200">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex justify-between items-center text-white shadow-lg shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="hover:bg-white/20 p-2 rounded-full transition-all active:scale-90">
              <span className="text-xl">←</span>
            </button>
            <div className="flex flex-col">
              <h2 className="font-extrabold text-lg tracking-tight">Centro de Soporte</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-[11px] font-medium text-blue-100 uppercase tracking-widest">En Línea</span>
              </div>
            </div>
          </div>

          <button 
            onClick={clearChat} 
            className="bg-red-500/20 hover:bg-red-600 p-2.5 rounded-xl transition-all group flex items-center gap-2 border border-red-400/30" 
            title="Limpiar mi chat"
          >
            <span className="text-[10px] font-bold hidden sm:inline">LIMPIAR MI VISTA</span>
            <span className="group-hover:scale-110 block">🗑️</span>
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#f0f2f5] flex flex-col gap-4">
          {list.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-40">
              <span className="text-5xl mb-4">💬</span>
              <p className="text-sm font-semibold text-slate-600 italic">Tu historial está vacío.</p>
            </div>
          )}

          {list.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
              {!msg.isMe && (
                <span className="text-[10px] font-bold text-slate-500 ml-2 mb-1 uppercase tracking-tighter">
                  {msg.author.split('@')[0]}
                </span>
              )}
              
              <div className={`relative px-4 py-2.5 shadow-sm max-w-[85%] ${
                msg.isMe 
                  ? "bg-blue-600 text-white rounded-2xl rounded-tr-none" 
                  : "bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-200"
              }`}>
                <p className="text-[14.5px] leading-relaxed break-words">{msg.text}</p>
                <p className={`text-[9px] mt-1 text-right font-medium ${msg.isMe ? "text-blue-100" : "text-slate-400"}`}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Entrada de texto */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
          <input
            type="text"
            className="flex-1 bg-slate-100 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Escribe un mensaje aquí..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <button 
            onClick={sendMessage}
            disabled={!message.trim()}
            className="bg-blue-600 disabled:bg-slate-300 text-white w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95"
          >
            <span className="text-xl">➤</span>
          </button>
        </div>

      </div>
    </div>
  );
}