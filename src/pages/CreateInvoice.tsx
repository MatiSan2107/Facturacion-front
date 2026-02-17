import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Client {
  id: number;
  name: string;
}

// 1. NUEVA INTERFAZ PARA EL CATÁLOGO
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
  const [products, setProducts] = useState<Product[]>([]); // 2. ESTADO PARA PRODUCTOS
  
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [items, setItems] = useState<Item[]>([
    { description: '', quantity: 1, price: 0 }
  ]);

  // 3. CARGAR CLIENTES Y PRODUCTOS AL MISMO TIEMPO
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/');
      
      try {
        // Cargar Clientes
        const resClients = await fetch('http://localhost:3000/clients', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resClients.ok) setClients(await resClients.json());

        // Cargar Productos
        const resProducts = await fetch('http://localhost:3000/products', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resProducts.ok) setProducts(await resProducts.json());

      } catch (error) {
        console.error("Error cargando datos");
      }
    };
    fetchData();
  }, [navigate]);

  // 4. LA MAGIA DEL AUTOCOMPLETADO
  const handleItemChange = (index: number, field: keyof Item, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Si el usuario está cambiando la "descripción", buscamos si coincide con el catálogo
    if (field === 'description') {
      const foundProduct = products.find(p => p.name === value);
      if (foundProduct) {
        // Si lo encuentra en el catálogo, le autocompletamos el precio 🪄
        newItems[index].price = foundProduct.price;
      }
    }

    setItems(newItems);
  };

  const addItem = () => setItems([...items, { description: '', quantity: 1, price: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClientId) return alert('⚠️ Por favor selecciona un cliente');
    if (!date) return alert('⚠️ La fecha es obligatoria');
    if (items.length === 0) return alert('⚠️ Debes agregar al menos un producto');
    if (total <= 0) return alert('⚠️ El total de la factura no puede ser 0');

    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('http://localhost:3000/invoices', {
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
      alert('Error de conexión');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Nueva Factura</h1>
        
        <form onSubmit={handleSubmit}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 font-bold mb-2">Fecha de Emisión</label>
              <input 
                type="date"
                className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-2">Cliente</label>
              <select 
                className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
              >
                <option value="">-- Seleccionar Cliente --</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* TABLA DE ÍTEMS */}
          <div className="mb-6 border-t pt-4">
            <h3 className="text-gray-700 font-bold mb-2">Detalle de Productos</h3>
            
            <div className="flex gap-2 mb-2 text-sm font-semibold text-gray-500">
              <div className="flex-grow">Descripción (Escribe o selecciona)</div>
              <div className="w-20 text-center">Cant.</div>
              <div className="w-24 text-right">Precio</div>
              <div className="w-8"></div>
            </div>

            {items.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2 items-center">
                
                {/* INPUT CON DATALIST (LA MAGIA) */}
                <input 
                  type="text" 
                  list={`catalog-list-${index}`} // Conecta el input con la lista invisible
                  placeholder="Ej: Consultoría"
                  className="flex-grow p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  required
                />
                
                {/* LA LISTA INVISIBLE DEL CATÁLOGO */}
                <datalist id={`catalog-list-${index}`}>
                  {products.map(product => (
                    <option key={product.id} value={product.name} />
                  ))}
                </datalist>

                <input 
                  type="number" 
                  className="w-20 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-center"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                />
                <input 
                  type="number" 
                  className="w-24 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-right bg-gray-50"
                  min="0"
                  step="0.01"
                  value={item.price}
                  onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))}
                />
                <button 
                  type="button" 
                  onClick={() => removeItem(index)}
                  className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition"
                  title="Eliminar fila"
                >
                  ✕
                </button>
              </div>
            ))}
            
            <button 
              type="button" 
              onClick={addItem}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              <span className="text-xl">+</span> Agregar línea
            </button>
          </div>

          {/* PIE DE PÁGINA */}
          <div className="border-t pt-6 flex justify-between items-center">
            <div className="text-3xl font-bold text-gray-800">
              Total: ${total.toFixed(2)}
            </div>
            <div className="flex gap-4">
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow transition"
              >
                Guardar Factura
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}