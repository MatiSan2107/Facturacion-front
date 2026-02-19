import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. URL DINÁMICA (Prioriza Render, luego Localhost)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface Order {
  id: number;
  total: number;
  status: string;
  createdAt: string;
  items: { description: string; quantity: number; price: number }[];
}

interface StoreProps {
  unreadMessages?: number;
}

export default function Store({ unreadMessages = 0 }: StoreProps) {
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false); // Estado para el modal de pedidos

  const [searchTerm, setSearchTerm] = useState(""); 
  const [orderSearch, setOrderSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 6;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const resProducts = await fetch(`${API_URL}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resProducts.ok) setProducts(await resProducts.json());

      const resOrders = await fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resOrders.ok) setMyOrders(await resOrders.json());
    } catch (error) {
      console.error("Error conectando al servidor:", error);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      
      if (currentQty >= product.stock) {
        alert("¡No hay más stock disponible!");
        return prev;
      }
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const decreaseQuantity = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter(p => p.id !== product.id);
      return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity - 1 } : p);
    });
  };

  const getProductQuantity = (id: number) => {
    const item = cart.find(p => p.id === id);
    return item ? item.quantity : 0;
  };

  const submitOrder = async () => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          items: cart.map(i => ({ description: i.name, quantity: i.quantity, price: i.price })), 
          total 
        })
      });

      if (res.ok) {
        alert('✅ ¡Pedido enviado!');
        setCart([]);
        setIsCartOpen(false);
        fetchData(); // Recargamos pedidos para que aparezca el nuevo
      }
    } catch (error) {
      alert("Error al enviar el pedido");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // Lógica de Filtrado
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = myOrders.filter(order => 
    order.id.toString().includes(orderSearch) || 
    order.items.some(item => item.description.toLowerCase().includes(orderSearch.toLowerCase()))
  );

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const hasRejectedOrders = myOrders.some(o => o.status === 'RECHAZADO');

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32 font-sans">
      
      {/* ENCABEZADO */}
      <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">🛍️ Tienda</h1>
        <div className="flex items-center gap-3">
            <button onClick={() => setIsOrdersOpen(true)} className={`relative px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${hasRejectedOrders ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              📜 <span className="hidden sm:inline">Mis Pedidos</span>
            </button>
            <button onClick={() => navigate('/chat')} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200 transition">💬 Chat</button>
            <button onClick={() => setIsCartOpen(true)} className="relative bg-yellow-400 text-yellow-900 px-4 py-2 rounded-lg font-bold shadow hover:bg-yellow-500 transition">
              🛒 Carrito {cart.length > 0 && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full absolute -top-2 -right-2">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
            </button>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-600 font-bold px-2 py-2 transition flex flex-col items-center">
              🚪 <span className="text-[10px] uppercase">Salir</span>
            </button>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="max-w-6xl mx-auto mb-8">
        <input type="text" placeholder="¿Qué producto buscas hoy?..." className="w-full px-6 py-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* GRILLA DE PRODUCTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {currentProducts.map(product => {
          const qty = getProductQuantity(product.id);
          return (
            <div key={product.id} className={`bg-white p-6 rounded-2xl shadow-sm border transition ${qty > 0 ? 'border-green-500 ring-4 ring-green-50' : 'border-gray-100'}`}>
              <h3 className="font-bold text-xl mb-1 text-gray-800">{product.name}</h3>
              <div className="flex justify-between items-end mb-6">
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  Stock: {product.stock}
                </span>
                <p className="text-2xl font-black text-gray-900">${product.price}</p>
              </div>
              
              {product.stock === 0 ? (
                <button disabled className="w-full py-3 rounded-xl font-bold bg-gray-100 text-gray-400 cursor-not-allowed">🚫 Agotado</button>
              ) : qty === 0 ? (
                <button onClick={() => addToCart(product)} className="w-full py-3 rounded-xl font-bold bg-gray-900 text-white hover:bg-gray-800 transition">➕ Agregar</button>
              ) : (
                <div className="flex items-center justify-between bg-gray-900 text-white rounded-xl p-1">
                  <button onClick={() => decreaseQuantity(product)} className="w-12 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg font-bold text-xl">{qty === 1 ? '🗑️' : '-'}</button>
                  <span className="font-black text-lg">{qty}</span>
                  <button onClick={() => addToCart(product)} className="w-12 h-10 flex items-center justify-center bg-white text-black hover:bg-gray-100 rounded-lg font-bold text-xl">+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="max-w-6xl mx-auto flex justify-center items-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i + 1} onClick={() => paginate(i + 1)} className={`w-10 h-10 rounded-xl font-bold transition ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-400 hover:bg-gray-100'}`}>{i + 1}</button>
          ))}
        </div>
      )}

      {/* BARRA FLOTANTE DE PAGO */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-green-200 shadow-2xl p-4 z-40 animate-slide-up">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Subtotal</span>
              <p className="text-3xl font-black text-gray-900">${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</p>
            </div>
            <button onClick={() => setIsCartOpen(true)} className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-lg hover:bg-green-700 transition shadow-lg shadow-green-100">✅ Ver Carrito</button>
          </div>
        </div>
      )}

      {/* --- NUEVO: MODAL DE PEDIDOS (HISTORIAL) --- */}
      {isOrdersOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsOrdersOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-2xl font-black text-gray-800">📜 Mis Pedidos</h2>
              <button onClick={() => setIsOrdersOpen(false)} className="text-gray-400 hover:text-red-500 font-bold text-2xl">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-white">
              <input 
                type="text" 
                placeholder="Buscar por N° o producto..." 
                className="w-full mb-6 p-3 bg-gray-100 rounded-xl border-none text-sm focus:ring-2 focus:ring-blue-500"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />

              {filteredOrders.length === 0 ? (
                <p className="text-center py-10 text-gray-400 italic">No tienes pedidos que coincidan.</p>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map(order => (
                    <div key={order.id} className="border border-gray-100 rounded-2xl p-4 hover:bg-blue-50/30 transition">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-bold text-blue-600 uppercase">Pedido #{order.id.toString().padStart(4, '0')}</p>
                          <p className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                          order.status === 'APROBADO' ? 'bg-green-100 text-green-700' : 
                          order.status === 'RECHAZADO' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-3 italic">
                        {order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}
                      </div>
                      <p className="text-right font-black text-gray-800">${order.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CARRITO (Confirmación) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full sm:w-[450px] bg-white shadow-2xl p-8 flex flex-col h-full animate-slide-left">
            <h2 className="text-3xl font-black mb-8 text-gray-800">🧾 Tu Pedido</h2>
            <div className="flex-1 overflow-y-auto space-y-4">
              {cart.map((item, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                  <div>
                    <p className="font-bold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.quantity} unidades x ${item.price}</p>
                  </div>
                  <p className="font-black text-gray-900">${(item.quantity * item.price).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="pt-8 border-t">
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold text-gray-400 uppercase">Total</span>
                <span className="text-4xl font-black text-gray-900">${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
              </div>
              <button onClick={submitOrder} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-green-700 transition shadow-lg shadow-green-100">🚀 Confirmar y Enviar</button>
              <button onClick={() => setIsCartOpen(false)} className="w-full mt-4 text-gray-400 font-bold hover:text-gray-600">Continuar comprando</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}