import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. DEFINIMOS LA URL DINÁMICA
// Conecta a Render en producción o localhost en desarrollo
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

interface Order {
  id: number;
  total: number;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
  items: { description: string; quantity: number; price: number }[];
}

export default function Invoices() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  
  // ESTADOS DE BÚSQUEDA
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState(''); 

  // ESTADOS DE PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; 

  const [selectedInvoice, setSelectedInvoice] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchDate]);

  // 2. ACTUALIZAMOS EL FETCH DE PEDIDOS
  const fetchOrders = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setOrders(await res.json());
    } catch (error) {
      console.error("Error al cargar pedidos");
    }
  };

  // 3. ACTUALIZAMOS EL CAMBIO DE ESTADO
  const updateStatus = async (id: number, status: string) => {
    if (!confirm(`¿Confirmas ${status === 'APROBADO' ? 'APROBAR' : 'RECHAZAR'} este pedido?`)) return;

    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      fetchOrders();
    } catch (error) {
      alert("Error de conexión al actualizar estado");
    }
  };

  // --- LÓGICA DE FILTRADO (SOLO PENDIENTES) ---
  const filteredOrders = orders.filter(order => {
    const isPending = order.status === 'PENDIENTE';
    const matchesText = 
        order.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm);

    let matchesDate = true;
    if (searchDate) {
        const orderDateObj = new Date(order.createdAt);
        const orderDateString = orderDateObj.getFullYear() + '-' + 
                                String(orderDateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                                String(orderDateObj.getDate()).padStart(2, '0');
        matchesDate = orderDateString === searchDate;
    }
    return isPending && matchesText && matchesDate;
  });

  // --- PAGINACIÓN ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8 print:hidden">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Bandeja de Aprobación</h1>
            <p className="text-gray-500 text-sm">Gestiona los pedidos pendientes de tus clientes</p>
        </div>
        <div className="flex gap-4">
            <button 
                onClick={() => navigate('/dashboard')} 
                className="text-gray-500 font-bold hover:text-gray-700 border border-gray-300 px-4 py-2 rounded-lg bg-white shadow-sm transition"
            >
                Volver
            </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
        
        {/* BARRA DE FILTROS */}
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
                <span className="absolute left-3 top-3 text-gray-400">🔍</span>
                <input 
                    type="text" 
                    placeholder="Buscar Cliente o N°..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex items-center gap-2 bg-white border border-gray-300 px-3 py-2 rounded-lg text-gray-600 text-sm">
                <span>Fecha:</span>
                <input 
                    type="date" 
                    className="outline-none text-gray-800 bg-transparent"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                />
                {searchDate && (
                    <button onClick={() => setSearchDate('')} className="text-gray-400 hover:text-red-500 font-bold px-2">✕</button>
                )}
            </div>
        </div>

        {/* TABLA DE RESULTADOS */}
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-white border-b border-gray-100 text-gray-500 text-xs uppercase font-bold">
                    <tr>
                        <th className="px-6 py-4">N°</th>
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4 text-center">Estado</th>
                        <th className="px-6 py-4 text-right">Total</th>
                        <th className="px-6 py-4 text-center">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                    {currentItems.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-12">
                                <p className="text-4xl mb-2">✅</p>
                                <p className="text-gray-500 font-medium">No hay pedidos pendientes.</p>
                            </td>
                        </tr>
                    ) : (
                        currentItems.map(order => (
                            <tr key={order.id} className="hover:bg-yellow-50/30 transition">
                                <td className="px-6 py-4 text-gray-400 font-medium">#{order.id.toString().padStart(4, '0')}</td>
                                <td className="px-6 py-4 text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-bold text-gray-800">{order.user?.name || 'Cliente'}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className="px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-wider bg-yellow-100 text-yellow-700">
                                        PENDIENTE
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-gray-900">${order.total.toFixed(2)}</td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-3">
                                        <button 
                                            onClick={() => updateStatus(order.id, 'APROBADO')} 
                                            className="text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1 rounded border border-green-200 font-bold transition shadow-sm"
                                        >
                                            ✔ Aprobar
                                        </button>
                                        <button 
                                            onClick={() => updateStatus(order.id, 'RECHAZADO')} 
                                            className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1 rounded border border-red-200 font-bold transition shadow-sm"
                                        >
                                            ✕ Rechazar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* PAGINACIÓN */}
        {totalPages > 1 && (
          <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-center items-center gap-2">
            <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 rounded border bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-100 text-sm transition">Anterior</button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i + 1} onClick={() => paginate(i + 1)} className={`w-8 h-8 rounded border text-sm font-bold transition ${currentPage === i + 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}>{i + 1}</button>
              ))}
            </div>
            <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 rounded border bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-100 text-sm transition">Siguiente</button>
          </div>
        )}
      </div>
    </div>
  );
}