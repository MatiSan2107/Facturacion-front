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
  fileUrl?: string; // Para archivos PDF
  fileName?: string;
}

export default function Chat({ onOpen }: { onOpen: () => void }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [list, setList] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userEmail = localStorage.getItem('email') || "Anónimo";
  const userRole = localStorage.getItem('role') || "USER";

  // Determinamos a qué sala unirse
  // Si soy Admin, debo elegir con quién hablar (por ahora usamos una sala fija o dinámica)
  const room = userRole === 'ADMIN' ? "admin_room" : `room_${userEmail}`;

  useEffect(() => {
    onOpen();
    
    // Unirse a la sala privada al conectar
    socket.emit("join_room", room);

    const handleReceiveMessage = (data: any) => {
      setList((prev) => [...prev, {
        author: data.author,
        text: data.message,
        time: data.time,
        isMe: data.author === userEmail,
        fileUrl: data.fileUrl,
        fileName: data.fileName
      }]);
    };

    socket.on("receive_message", handleReceiveMessage);
    return () => { socket.off("receive_message", handleReceiveMessage); };
  }, [userEmail, room]);

  const sendMessage = async (fileData?: { url: string, name: string }) => {
    if (message.trim() === "" && !fileData) return;

    const msgData = {
      room: room, // Enviamos el mensaje solo a esta sala
      author: userEmail,
      message: message,
      fileUrl: fileData?.url,
      fileName: fileData?.name,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    await socket.emit("send_message", msgData);
    setMessage("");
  };

  // Función para subir y enviar PDF
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert("Solo se permiten archivos PDF");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/chat/upload`, {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.url) {
        sendMessage({ url: data.url, name: file.name });
      }
    } catch (error) {
      alert("Error al subir el archivo");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-2xl h-[700px] shadow-2xl rounded-3xl overflow-hidden flex flex-col border border-slate-200">
        
        {/* Cabecera idéntica a la anterior */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex justify-between items-center text-white">
          <h2 className="font-extrabold text-lg">Soporte Privado: {userEmail.split('@')[0]}</h2>
        </div>

        {/* Lista de Mensajes */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#f0f2f5] flex flex-col gap-4">
          {list.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
              <div className={`px-4 py-2.5 shadow-sm max-w-[85%] ${msg.isMe ? "bg-blue-600 text-white rounded-2xl rounded-tr-none" : "bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-200"}`}>
                {msg.text && <p className="text-[14.5px] leading-relaxed">{msg.text}</p>}
                
                {/* Renderizado de PDF */}
                {msg.fileUrl && (
                  <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-2 p-2 bg-black/10 rounded-lg hover:bg-black/20 transition">
                    <span className="text-xl">📄</span>
                    <span className="text-xs font-bold underline truncate max-w-[150px]">{msg.fileName}</span>
                  </a>
                )}
                
                <p className="text-[9px] mt-1 text-right opacity-60">{msg.time}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input con Botón de Archivo */}
        <div className="p-4 bg-white border-t flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
          <button onClick={() => fileInputRef.current?.click()} className="text-2xl hover:bg-slate-100 p-2 rounded-xl transition">📎</button>
          
          <input
            type="text"
            className="flex-1 bg-slate-100 rounded-2xl px-5 py-3 text-sm outline-none"
            placeholder="Escribe un mensaje..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={() => sendMessage()} className="bg-blue-600 text-white w-12 h-12 rounded-2xl shadow-md">➤</button>
        </div>
      </div>
    </div>
  );
}