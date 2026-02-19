import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. DEFINIMOS LA URL DINÁMICA
// Usará la variable de Vercel en producción o localhost en tu PC
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Client {
  id: number;
  name: string;
  email: string;
  taxId: string;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const navigate = useNavigate();

  // 2. CARGAR CLIENTES DESDE RENDER
  const fetchClients = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/');

    try {
      const response = await fetch(`${API_URL}/clients`, { //
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setClients(await response.json());
    } catch (err) {
      console.error('Error cargando clientes desde la nube');
    }
  };

  useEffect(() => {
    fetchClients();
  }, [navigate]);

  // 3. CREAR O ACTUALIZAR
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const url = editingId 
      ? `${API_URL}/clients/${editingId}`
      : `${API_URL}/clients`;
      
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, taxId })
      });

      if (response.ok) {
        fetchClients();
        resetForm();
      } else {
        alert('Error al guardar el cliente');
      }
    } catch (err) {
      alert('Error de conexión con el servidor de Render');
    }
  };

  // 4. PREPARAR PARA EDITAR
  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setName(client.name);
    setEmail(client.email);
    setTaxId(client.taxId || '');
  };

  // 5. ELIMINAR CLIENTE
  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Seguro que quieres eliminar este cliente?')) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/clients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchClients();
      } else {
        alert('No se puede eliminar (posiblemente tiene facturas asociadas)');
      }
    } catch (error) {
      alert('Error al intentar eliminar');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setTaxId('');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">👥 Gestión de Clientes</h1>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="text-blue-600 font-bold hover:underline flex items-center gap-1"
          >
            ← Volver al Panel
          </button>
        </div>

        {/* FORMULARIO DE REGISTRO/EDICIÓN */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-700">
            {editingId ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Nombre del cliente"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID Fiscal (Opcional)</label>
              <input 
                type="text" 
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="CUIT/RUT/DNI"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 mt-2">
              {editingId && (
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="px-6 py-2 rounded-lg font-bold bg-gray-200 text-gray-600 hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
              )}
              <button 
                type="submit" 
                className={`px-8 py-2 rounded-lg font-bold text-white transition shadow-md ${
                  editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {editingId ? 'Actualizar Cliente' : 'Guardar Cliente'}
              </button>
            </div>
          </form>
        </div>

        {/* TABLA DE CLIENTES */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 text-xs font-black text-gray-400 uppercase">Nombre</th>
                <th className="p-4 text-xs font-black text-gray-400 uppercase">Email</th>
                <th className="p-4 text-xs font-black text-gray-400 uppercase">ID Fiscal</th>
                <th className="p-4 text-xs font-black text-gray-400 uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.length === 0 ? (
                <tr><td colSpan={4} className="p-12 text-center text-gray-400 font-medium">No tienes clientes registrados todavía.</td></tr>
              ) : (
                clients.map(client => (
                  <tr key={client.id} className="hover:bg-blue-50/30 transition">
                    <td className="p-4 font-bold text-gray-800">{client.name}</td>
                    <td className="p-4 text-gray-600">{client.email}</td>
                    <td className="p-4 text-gray-500 text-sm">{client.taxId || 'N/A'}</td>
                    <td className="p-4 flex justify-end gap-3">
                      <button 
                        onClick={() => handleEdit(client)}
                        className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(client.id)}
                        className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}