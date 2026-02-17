import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import Clients from './pages/Clients';
import CreateInvoice from './pages/CreateInvoice';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Products from './pages/Products';
import Store from './pages/Store';
import Register from './pages/Register';
import Orders from './pages/Orders';
import Chat from './pages/Chat';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

// 1. CONEXIÓN AL SOCKET (Fuera para evitar múltiples conexiones)
const socket = io("http://localhost:3000");

// --- GUARDIA DE SEGURIDAD ---
const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: string }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return <Navigate to="/" replace />;

  if (allowedRole && role !== allowedRole) {
    if (role === 'USER') return <Navigate to="/store" replace />;
    if (role === 'ADMIN') return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  // 2. ESTADO PARA NOTIFICACIONES GLOBALES
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Escuchar si llega un mensaje nuevo
    socket.on("receive_message", (data) => {
      const userEmail = localStorage.getItem('email');
      
      // Solo notificar si el mensaje NO lo envié yo y no estoy viendo el chat
      if (data.author !== userEmail && window.location.pathname !== '/chat') {
        setUnreadCount(prev => prev + 1);
        
        // Reproducir sonido de notificación
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        audio.play().catch(() => {}); 
      }
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  // Función para resetear el contador al entrar al chat
  const resetNotifications = () => {
    setUnreadCount(0);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* --- RUTAS PÚBLICAS --- */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* --- RUTAS DEL JEFE (ADMIN) --- */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRole="ADMIN">
            <Dashboard unreadMessages={unreadCount} />
          </ProtectedRoute>
        } />
        
        <Route path="/clients" element={<ProtectedRoute allowedRole="ADMIN"><Clients /></ProtectedRoute>} />
        <Route path="/create-invoice" element={<ProtectedRoute allowedRole="ADMIN"><CreateInvoice /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute allowedRole="ADMIN"><Invoices /></ProtectedRoute>} />
        <Route path="/invoices/:id" element={<ProtectedRoute allowedRole="ADMIN"><InvoiceDetail /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute allowedRole="ADMIN"><Products /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute allowedRole="ADMIN"><Orders /></ProtectedRoute>} />
        
        {/* PASAMOS LA FUNCIÓN DE RESET AL CHAT */}
        <Route path="/chat" element={
          <ProtectedRoute>
            <Chat onOpen={resetNotifications} />
          </ProtectedRoute>
        } />

        {/* --- RUTAS DEL CLIENTE (USER) --- */}
        <Route path="/store" element={
          <ProtectedRoute allowedRole="USER">
            <Store unreadMessages={unreadCount} />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;