import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. DEFINIMOS LA URL DINÁMICA
// Conecta a Render en producción o localhost en desarrollo
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

interface Client {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
}

interface Item {
  description: string;
  quantity: number;
  price: number;
}

export default function CreateInvoice() {
  const navigate = useNavigate();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<Item[]>([
    { description: '', quantity: 1, price: 0 }
  ]);

  // 2. CARGAR CLIENTES Y PRODUCTOS DESDE LA NUBE
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/');
      
      try {
        // Cargar Clientes
        const resClients = await fetch(`${API_URL}/clients`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resClients.ok) setClients(await resClients.json());

        // Cargar Productos
        const resProducts = await fetch(`${API_URL}/products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resProducts.ok) setProducts(await resProducts.json());

      } catch (error) {
        console.error("Error cargando datos para la factura");
      }
    };
    fetchData();
  }, [navigate]);

  const handleItemChange = (index: number, field: keyof Item, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'description') {
      const foundProduct = products.find(p => p.name === value);
      if (foundProduct) {
        newItems[index].price = foundProduct.price;
      }
    }
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { description: '', quantity: 1, price: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  // 3. GUARDAR FACTURA EN EL SERVIDOR
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClientId) return alert('⚠️ Selecciona un cliente');
    if (total <= 0) return alert('⚠️ El total no puede ser 0');

    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_URL}/invoices`, { // <-- CAMBIADO
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          items: items,
          total: total,
          date: date
        })
      });

      if (response.ok) {
        alert('✅ Factura creada con éxito!');
        navigate('/dashboard');
      } else {
        const data = await response.json();
        alert('❌ Error: ' + (data.error || 'Desconocido'));
      }
    } catch (error) {
      alert('Error de conexión al guardar factura');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-black mb-8 text-gray-800 uppercase tracking-tight">Nueva Factura</h1>
        
        <form onSubmit={handleSubmit}>
          {/* SECCIÓN CLIENTE Y FECHA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-gray-50 p-6 rounded-xl">
            <div>
              <label className="block text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">Fecha de Emisión</label>
              <input 
                type="date"
                className="w-full p-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">Cliente Destinatario</label>
              <select 
                className="w-full p-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
              >
                <option value="">-- Seleccionar --</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* TABLA DE ÍTEMS */}
          <div className="mb-8">
            <h3 className="text-gray-800 font-black text-sm uppercase tracking-tight mb-4">Detalle de Productos</h3>
            
            <div className="flex gap-2 mb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
              <div className="flex-grow">Descripción del Servicio/Producto</div>
              <div className="w-20 text-center">Cant.</div>
              <div className="w-24 text-right">Precio Unit.</div>
              <div className="w-8"></div>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-center bg-white p-1">
                  <input 
                    type="text" 
                    list={`catalog-list-${index}`}
                    placeholder="Escribe para buscar..."
                    className="flex-grow p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    required
                  />
                  <datalist id={`catalog-list-${index}`}>
                    {products.map(product => (
                      <option key={product.id} value={product.name} />
                    ))}
                  </datalist>

                  <input 
                    type="number" 
                    className="w-20 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm font-bold"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                  />
                  <input 
                    type="number" 
                    className="w-24 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right text-sm font-mono font-bold bg-gray-50"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))}
                  />
                  <button 
                    type="button" 
                    onClick={() => removeItem(index)}
                    className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            
            <button 
              type="button" 
              onClick={addItem}
              className="mt-4 text-[10px] text-blue-600 hover:text-blue-800 font-black uppercase tracking-widest flex items-center gap-1"
            >
              + Agregar línea de producto
            </button>
          </div>

          {/* TOTAL Y ACCIONES */}
          <div className="border-t border-gray-100 pt-8 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Importe Total</span>
              <span className="text-4xl font-black text-gray-900 font-mono tracking-tighter">
                ${total.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-black text-xs uppercase tracking-widest shadow-lg transition-transform active:scale-95"
              >
                Emitir Factura
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}