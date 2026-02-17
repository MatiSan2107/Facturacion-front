import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number; // <--- Nuevo campo
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(''); // <--- Estado para el stock
  const [editingId, setEditingId] = useState<number | null>(null);
  const navigate = useNavigate();

  // 1. CARGAR PRODUCTOS
  const fetchProducts = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/');

    try {
      const response = await fetch('http://localhost:3000/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        // Filtramos para ver SOLO MIS productos como Admin
        // (Aunque el backend devuelve todos, aquí visualmente podemos filtrar o dejar todos)
        const allProducts = await response.json();
        const myEmail = localStorage.getItem('email');
        // Un pequeño truco: como el backend trae el usuario creador, podríamos filtrar.
        // Por ahora mostramos todos los que traiga el backend para simplificar.
        setProducts(allProducts);
      }
    } catch (error) {
      console.error("Error cargando productos");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [navigate]);

  // 2. GUARDAR (CREAR O EDITAR)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const url = editingId 
      ? `http://localhost:3000/products/${editingId}`
      : 'http://localhost:3000/products';
      
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, price, stock }) // <--- Enviamos stock
      });

      if (response.ok) {
        fetchProducts();
        setName('');
        setPrice('');
        setStock(''); // <--- Limpiamos
        setEditingId(null);
      } else {
        alert('Error al guardar');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  // 3. EDITAR
  const handleEdit = (product: Product) => {
    setName(product.name);
    setPrice(product.price.toString());
    setStock(product.stock.toString()); // <--- Cargamos stock
    setEditingId(product.id);
  };

  // 4. ELIMINAR
  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que quieres borrar este producto?')) return;
    const token = localStorage.getItem('token');
    
    try {
      await fetch(`http://localhost:3000/products/${id}`, {
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
          <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:underline">
            ← Volver al Panel
          </button>
        </div>

        {/* FORMULARIO */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-700">
            {editingId ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
          </h2>
          <form onSubmit={handleSubmit} className="flex gap-4 items-end">
            <div className="flex-grow">
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border p-2 rounded mt-1"
                placeholder="Ej: Mantenimiento Web"
                required
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700">Precio ($)</label>
              <input 
                type="number" 
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full border p-2 rounded mt-1"
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700">Stock</label>
              <input 
                type="number" 
                value={stock}
                onChange={e => setStock(e.target.value)}
                className="w-full border p-2 rounded mt-1 bg-yellow-50 font-bold"
                placeholder="0"
                required
              />
            </div>
            <button 
              type="submit" 
              className={`px-6 py-2 rounded font-bold text-white transition ${
                editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {editingId ? 'Actualizar' : 'Guardar'}
            </button>
            {editingId && (
              <button 
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setName('');
                  setPrice('');
                  setStock('');
                }}
                className="bg-gray-400 text-white px-4 py-2 rounded font-bold hover:bg-gray-500"
              >
                Cancelar
              </button>
            )}
          </form>
        </div>

        {/* LISTA DE PRODUCTOS */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Stock</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-800">{product.name}</td>
                  <td className="p-4 text-green-600 font-bold">${product.price.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      product.stock > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {product.stock} un.
                    </span>
                  </td>
                  <td className="p-4 text-center space-x-2">
                    <button 
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="text-red-500 hover:text-red-700 font-bold text-sm"
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
