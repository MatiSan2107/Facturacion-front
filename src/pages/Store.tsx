import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);

  // Estados para buscadores
  const [searchTerm, setSearchTerm] = useState(""); 
  const [orderSearch, setOrderSearch] = useState("");

  // Estados para paginación
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
    
    const resProducts = await fetch('http://localhost:3000/products', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (resProducts.ok) setProducts(await resProducts.json());

    const resOrders = await fetch('http://localhost:3000/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (resOrders.ok) setMyOrders(await resOrders.json());
  };

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
    
    const res = await fetch('http://localhost:3000/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ items: cart.map(i => ({ description: i.name, quantity: i.quantity, price: i.price })), total })
    });

    if (res.ok) {
      alert('¡Pedido enviado!');
      setCart([]);
      setIsCartOpen(false);
      fetchData();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    navigate('/');
  };

  const hasRejectedOrders = myOrders.some(o => o.status === 'RECHAZADO');

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32 font-sans">
      
      {/* ENCABEZADO */}
      <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
          🛍️ Tienda
        </h1>
        
        <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsOrdersOpen(true)} 
              className={`relative px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
                hasRejectedOrders ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📜 <span className="hidden sm:inline">Mis Pedidos</span>
              {hasRejectedOrders && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </button>

            <div className="h-8 w-px bg-gray-300 mx-2"></div>

            <button 
              onClick={() => navigate('/chat')} 
              className="relative bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200 transition flex items-center gap-2"
            >
              💬 <span className="hidden sm:inline">Chat</span>
              {unreadMessages > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce shadow-lg">
                  {unreadMessages}
                </span>
              )}
            </button>
            
            <button onClick={() => setIsCartOpen(!isCartOpen)} className="relative bg-yellow-400 text-yellow-900 px-4 py-2 rounded-lg font-bold shadow hover:bg-yellow-500 transition text-sm">
              🛒 <span className="hidden sm:inline">Carrito</span>
              {cart.length > 0 && (
                <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full absolute -top-2 -right-2">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>

            <div className="h-8 w-px bg-gray-300 mx-2"></div>

            <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 font-bold px-2 py-2 transition flex flex-col items-center">
              🚪 <span className="text-xs">Salir</span>
            </button>
        </div>
      </div>

      {/* BUSCADOR DE PRODUCTOS */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="relative group">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-blue-500 transition-colors">
            🔍
          </span>
          <input
            type="text"
            placeholder="¿Qué producto buscas hoy?..."
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg font-medium placeholder:text-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* GRILLA DE PRODUCTOS PAGINADA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
        {filteredProducts.length > 0 ? (
          currentProducts.map(product => {
            const qty = getProductQuantity(product.id);
            return (
              <div key={product.id} className={`bg-white p-6 rounded-xl shadow-lg transition relative overflow-hidden group border ${qty > 0 ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-100'}`}>
                {product.stock === 0 && <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10">AGOTADO</div>}
                
                {/* --- CAMBIO AQUÍ: h-24 --- */}
                <div className="h-24 bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-4xl group-hover:scale-105 transition transform">📦</div>
                
                <h3 className="font-bold text-xl mb-1 text-gray-800">{product.name}</h3>
                <div className="flex justify-between items-end mb-6">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                    </span>
                    <p className="text-2xl font-black text-gray-900">${product.price}</p>
                </div>
                {product.stock === 0 ? (
                   <button disabled className="w-full py-3 rounded-lg font-bold bg-gray-200 text-gray-400 cursor-not-allowed">🚫 Agotado</button>
                ) : qty === 0 ? (
                  <button onClick={() => addToCart(product)} className="w-full py-3 rounded-lg font-bold bg-gray-900 text-white hover:bg-gray-700 shadow-lg hover:shadow-xl transition flex justify-center items-center gap-2">➕ Agregar</button>
                ) : (
                  <div className="flex items-center justify-between bg-gray-900 text-white rounded-lg p-1 shadow-lg">
                     <button onClick={() => decreaseQuantity(product)} className="w-12 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded font-bold text-xl transition">{qty === 1 ? '🗑️' : '-'}</button>
                     <span className="font-black text-lg w-full text-center">{qty}</span>
                     <button onClick={() => addToCart(product)} className="w-12 h-10 flex items-center justify-center bg-white text-black hover:bg-gray-200 rounded font-bold text-xl transition">+</button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-20 bg-white rounded-3xl opacity-60">
            <p className="text-4xl mb-4">🕵️‍♂️</p>
            <p className="text-xl font-bold">No encontramos productos con ese nombre</p>
          </div>
        )}
      </div>

      {/* CONTROLES DE PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="max-w-6xl mx-auto flex justify-center items-center gap-2 mb-12">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => paginate(i + 1)}
              className={`w-10 h-10 rounded-lg font-bold transition shadow-sm ${
                currentPage === i + 1 
                  ? 'bg-blue-600 text-white scale-110' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* BARRA FLOTANTE DE PAGO */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-green-500 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] p-4 z-40 transform transition-transform">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-bold">Total a Pagar:</span>
              <span className="text-3xl font-black text-gray-900">${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
            </div>
            <button onClick={() => setIsCartOpen(true)} className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-green-700 transition shadow-lg flex items-center gap-3">
              ✅ Ir a Pagar <span className="bg-white text-green-700 text-xs px-2 py-1 rounded-full">{cart.reduce((a, b) => a + b.quantity, 0)} items</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CARRITO LATERAL */}
      {isCartOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setIsCartOpen(false)}></div>
          <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl p-6 overflow-y-auto z-50 transition-transform">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">🧾 Confirmar</h2>
              <button onClick={() => setIsCartOpen(false)} className="bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 w-8 h-8 rounded-full flex items-center justify-center">✕</button>
            </div>
            {cart.length === 0 ? <p className="text-center text-gray-500 mt-10">Carrito vacío.</p> : (
              <>
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border-l-4 border-gray-800 shadow-sm">
                      <div><p className="font-bold text-gray-800 text-lg">{item.name}</p><p className="text-sm text-gray-500">x {item.quantity}</p></div>
                      <p className="font-black text-gray-900">${item.quantity * item.price}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 border-t pt-6 bg-white sticky bottom-0">
                  <div className="flex justify-between text-2xl font-black mb-6 text-gray-900"><span>Total:</span><span>${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span></div>
                  <button onClick={submitOrder} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition shadow-lg flex justify-center items-center gap-2">🚀 Enviar Pedido</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* MODAL: HISTORIAL DE PEDIDOS CON BUSCADOR */}
      {isOrdersOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setIsOrdersOpen(false)}>
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-gray-800 text-white p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold">📜 Mis Pedidos</h2>
                <button onClick={() => setIsOrdersOpen(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto bg-gray-50">
                <div className="mb-6">
                  <input 
                    type="text"
                    placeholder="🔍 Buscar pedido por ID o producto..."
                    className="w-full p-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                </div>
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-10 opacity-50"><p>No se encontraron pedidos.</p></div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map(order => (
                            <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">Pedido #{order.id}</p>
                                        <div className="text-gray-600 text-xs mt-1 bg-gray-100 px-2 py-1 rounded">
                                          📅 {new Date(order.createdAt).toLocaleDateString()} | 🕒 {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                        order.status === 'APROBADO' ? 'bg-green-100 text-green-700' :
                                        order.status === 'RECHAZADO' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {order.status}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm text-gray-600 mb-1">
                                            <span>• {item.quantity} x {item.description}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center border-t pt-2">
                                    <span className="text-gray-500 text-sm">Total</span>
                                    <span className="font-black text-lg text-gray-800">${order.total}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}