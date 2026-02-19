import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../api';
import io from 'socket.io-client';

interface Order {
  id: number;
  total: number;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
}

interface DashboardProps {
  unreadMessages?: number;
}

export default function Dashboard({ unreadMessages: initialUnread = 0 }: DashboardProps) {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [recentOrders, setRecentOrders] = useState<Order[]>([]); 
  
  const [unreadMessages, setUnreadMessages] = useState(initialUnread);
  
  const [stats, setStats] = useState({
    clientCount: 0,
    invoiceTotal: 0,
    invoiceCount: 0,
    pendingOrders: 0
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const email = localStorage.getItem('email');
    if (email) setUserEmail(email);
    fetchData();

    const role = localStorage.getItem('role');
    const socket = io(API_URL);

    if (role === 'ADMIN') {
      socket.emit("join_room", "admin_room");
      
      socket.on("receive_message", (data) => {
        if (data.author !== email) {
          setUnreadMessages((prev) => prev + 1);
        }
      });

      // --- NUEVO: Escuchar nuevos pedidos en tiempo real ---
      socket.on("nueva_orden", () => {
        // Al recibir la señal, recargamos los datos para que la burbuja roja aparezca
        fetchData(); 
      });
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const resClients = await fetch(`${API_URL}/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const clients = await resClients.json();

      const resOrders = await fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (resOrders.ok) {
        const ordersData: Order[] = await resOrders.json();

        const pendingCount = ordersData.filter(o => o.status === 'PENDIENTE').length;
        const totalMoney = ordersData
            .filter(o => o.status === 'APROBADO') 
            .reduce((sum, o) => sum + o.total, 0);
        const approvedCount = ordersData.filter(o => o.status === 'APROBADO').length;

        setStats({
          clientCount: clients.length || 0,
          invoiceTotal: totalMoney,
          invoiceCount: approvedCount,
          pendingOrders: pendingCount
        });

        setRecentOrders(ordersData);
      }
    } catch (error) {
      console.error("Error cargando datos del dashboard");
    }
  };

  const updateStatus = async (id: number, status: string) => {
    if(!confirm(`¿Confirmas ${status === 'APROBADO' ? 'APROBAR' : 'RECHAZAR'} este pedido?`)) return;

    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchData(); 
    } catch (error) {
      console.error("Error actualizando estado", error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const goToChat = () => {
    setUnreadMessages(0);
    navigate('/chat');
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = recentOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(recentOrders.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      
      <nav className="bg-white shadow p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-blue-600">Sistema Facturación</h1>
        
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm hidden md:inline">Hola, {userEmail}</span>
          
          <button 
            onClick={goToChat}
            className="relative bg-blue-100 text-blue-700 font-bold py-1 px-4 rounded hover:bg-blue-200 transition flex items-center gap-2"
          >
            💬 Soporte
            {unreadMessages > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce shadow-lg">
                {unreadMessages}
              </span>
            )}
          </button>

          <button 
            onClick={handleLogout} 
            className="text-red-500 hover:text-red-700 font-medium text-sm border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition"
          >
            Salir
          </button>
        </div>
      </nav>

      <main className="p-4 md:p-8 max-w-[1600px] mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Panel de Control</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <Link to="/clients" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition border-l-4 border-blue-500 block group">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide">Clientes</h3>
                <p className="text-3xl font-bold text-gray-800 mt-1 group-hover:text-blue-600 transition">{stats.clientCount}</p>
                <p className="text-xs text-blue-500 mt-2 font-medium">Ver listado →</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full text-blue-600 text-2xl">👥</div>
            </div>
          </Link>

          <Link to="/products" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition border-l-4 border-purple-500 block group">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide">Catálogo</h3>
                <p className="text-xl font-bold text-gray-800 mt-1 group-hover:text-purple-600 transition">Productos</p>
                <p className="text-xs text-purple-500 mt-2 font-medium">Gestionar →</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full text-purple-600 text-2xl">📦</div>
            </div>
          </Link>

          <Link to="/invoices" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition border-l-4 border-green-500 block group">
              <div className="flex justify-between items-center">
              <div>
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide">Facturado</h3>
                <p className="text-xl font-bold text-green-600 mt-1 truncate max-w-[150px]">${stats.invoiceTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-400 mt-1">{stats.invoiceCount} ventas</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full text-green-600 text-2xl">💵</div>
            </div>
          </Link>

          <Link to="/orders" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition border-l-4 border-yellow-500 block group relative">
            {stats.pendingOrders > 0 && (
              <div className="absolute -top-3 -right-3 bg-red-500 text-white w-8 h-8 flex items-center justify-center rounded-full font-black shadow-lg animate-bounce">
                {stats.pendingOrders}
              </div>
            )}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide">Bandeja</h3>
                <p className="text-xl font-bold text-gray-800 mt-1 group-hover:text-yellow-600 transition">Pedidos</p>
                <p className="text-xs text-yellow-500 mt-2 font-medium">Revisar →</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full text-yellow-600 text-2xl">📥</div>
            </div>
          </Link>

        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-700">Últimos Movimientos</h3>
            <div className="flex gap-4 items-center">
               <span className="text-xs text-gray-400">Total: {recentOrders.length} registros</span>
               <button onClick={fetchData} className="text-sm text-blue-600 hover:underline cursor-pointer font-bold">🔄 Actualizar</button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b">
                <tr>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Monto</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">No hay pedidos recientes.</td></tr>
                ) : (
                  currentItems.map((order) => (
                    <tr key={order.id} className="hover:bg-blue-50/20 transition">
                      <td className="p-4 text-sm text-gray-600">
                        <div className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} hs</div>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-gray-800">{order.user?.name || 'Cliente Web'}</p>
                        <p className="text-xs text-gray-400">{order.user?.email}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                          order.status === 'APROBADO' ? 'bg-green-100 text-green-700' : 
                          order.status === 'RECHAZADO' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.status === 'RECHAZADO' ? 'ANULADA' : order.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-gray-700">${order.total.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        {order.status === 'PENDIENTE' ? (
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => updateStatus(order.id, 'APROBADO')} className="bg-green-100 text-green-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-green-500 hover:text-white transition shadow-sm" title="Aprobar">✔</button>
                            <button onClick={() => updateStatus(order.id, 'RECHAZADO')} className="bg-red-100 text-red-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition shadow-sm" title="Rechazar">✕</button>
                          </div>
                        ) : (
                          <span className="text-gray-300">•</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center items-center gap-4">
              <button 
                onClick={() => paginate(currentPage - 1)} 
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border bg-white disabled:opacity-50 hover:bg-gray-100 text-sm font-bold text-gray-600 transition shadow-sm"
              >
                ← Anterior
              </button>
              
              <span className="text-sm text-gray-600 font-bold bg-white px-4 py-2 rounded-lg border shadow-sm">
                Página {currentPage} de {totalPages}
              </span>

              <button 
                onClick={() => paginate(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg border bg-white disabled:opacity-50 hover:bg-gray-100 text-sm font-bold text-gray-600 transition shadow-sm"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}