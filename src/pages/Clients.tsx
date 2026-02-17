import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Client {
  id: number;
  name: string;
  email: string;
  taxId: string;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  // Formulario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  // Estado para Edición
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const navigate = useNavigate();

  // 1. CARGAR CLIENTES
  const fetchClients = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/');

    try {
      const response = await fetch('http://localhost:3000/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setClients(await response.json());
    } catch (err) {
      console.error('Error cargando clientes');
    }
  };

  useEffect(() => {
    fetchClients();
  }, [navigate]);

  // 2. CREAR O ACTUALIZAR (Manejamos los dos casos aquí)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    // Si editingId tiene valor, es una ACTUALIZACIÓN (PUT)
    // Si es null, es una CREACIÓN (POST)
    const url = editingId 
      ? `http://localhost:3000/clients/${editingId}`
      : 'http://localhost:3000/clients';
      
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
        fetchClients(); // Recargar lista
        resetForm(); // Limpiar inputs
      } else {
        alert('Error al guardar');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  // 3. PREPARAR PARA EDITAR
  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setName(client.name);
    setEmail(client.email);
    setTaxId(client.taxId || '');
  };

  // 4. ELIMINAR CLIENTE
  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Seguro que quieres eliminar este cliente?')) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:3000/clients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchClients();
      } else {
        alert('No se puede eliminar (quizás tiene facturas creadas)');
      }
    } catch (error) {
      alert('Error al eliminar');
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
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Clientes</h1>
          <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:underline">
            Volver al Panel
          </button>
        </div>


        {/* LISTA DE CLIENTES */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Nombre</th>
                <th className="p-4 font-semibold text-gray-600">Email</th>
                <th className="p-4 font-semibold text-gray-600">ID Fiscal</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No hay clientes aún.</td></tr>
              ) : (
                clients.map(client => (
                  <tr key={client.id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-4 font-medium">{client.name}</td>
                    <td className="p-4 text-gray-600">{client.email}</td>
                    <td className="p-4 text-gray-500">{client.taxId}</td>
                    <td className="p-4 flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(client)}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(client.id)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded"
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