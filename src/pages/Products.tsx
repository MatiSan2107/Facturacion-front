import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. DEFINIMOS LA URL DINÁMICA
// Se conecta a Render en producción o localhost en desarrollo
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(''); 
  const [editingId, setEditingId] = useState<number | null>(null);
  const navigate = useNavigate();

  // 2. CARGAR PRODUCTOS DESDE EL BACKEND
  const fetchProducts = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/');

    try {
      const response = await fetch(`${API_URL}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const allProducts = await response.json();
        setProducts(allProducts);
      }
    } catch (error) {
      console.error("Error cargando productos");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [navigate]);

  // 3. GUARDAR (CREAR O EDITAR)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const url = editingId 
      ? `${API_URL}/products/${editingId}`
      : `${API_URL}/products`;
      
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, price: parseFloat(price), stock: parseInt(stock) })
      });

      if (response.ok) {
        fetchProducts();
        setName('');
        setPrice('');
        setStock('');
        setEditingId(null);
      } else {
        alert('Error al guardar producto');
      }
    } catch (error) {
      alert('Error de conexión con el servidor');
    }
  };

  const handleEdit = (product: Product) => {
    setName(product.name);
    setPrice(product.price.toString());
    setStock(product.stock.toString());
    setEditingId(product.id);
  };

  // 4. ELIMINAR
  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que quieres borrar este producto?')) return;
    const token = localStorage.getItem('token');
    
    try {
      await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchProducts();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">📦 Gestión de Productos</h1>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="text-blue-600 font-bold hover:underline flex items-center gap-1"
          >
            ← Volver al Panel
          </button>
        </div>

        {/* --- FORMULARIO DE PRODUCTOS --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-700">
            {editingId ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej: Mantenimiento Web"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio ($)</label>
              <input 
                type="number" 
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock</label>
              <input 
                type="number" 
                value={stock}
                onChange={e => setStock(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-yellow-50 font-bold"
                placeholder="0"
                required
              />
            </div>
            <div className="md:col-span-4 flex justify-end gap-2">
              {editingId && (
                <button 
                  type="button" 
                  onClick={() => { setEditingId(null); setName(''); setPrice(''); setStock(''); }}
                  className="bg-gray-200 text-gray-600 px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
              )}
              <button 
                type="submit" 
                className={`px-8 py-2 rounded-lg font-bold text-white transition shadow-md ${
                  editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>

        {/* --- TABLA DE PRODUCTOS --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="p-4 text-xs font-black uppercase tracking-wider">Producto</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider">Precio</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider">Stock</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-gray-400">No hay productos registrados.</td></tr>
              ) : (
                products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-medium text-gray-800">{product.name}</td>
                    <td className="p-4 text-green-600 font-black">${product.price.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        product.stock > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.stock} unidades
                      </span>
                    </td>
                    <td className="p-4 text-center flex justify-center gap-4">
                      <button 
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition font-bold text-sm"
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition font-bold text-sm"
                      >
                        🗑️ Borrar
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