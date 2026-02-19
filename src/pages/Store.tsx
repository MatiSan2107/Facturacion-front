import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. DEFINIMOS LA URL DINÁMICA
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  // 2. ACTUALIZAMOS LOS FETCH PARA USAR API_URL
  const fetchData = async () => {
    const token = localStorage.getItem('token');
    
    try {
      // Fetch de Productos desde la nube
      const resProducts = await fetch(`${API_URL}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resProducts.ok) setProducts(await resProducts.json());

      // Fetch de Pedidos desde la nube
      const resOrders = await fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resOrders.ok) setMyOrders(await resOrders.json());
    } catch (error) {
      console.error("Error conectando al servidor:", error);
    }
  };

  // 3. LÓGICA DE CARRITO Y PEDIDOS
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
        fetchData();
      }
    } catch (error) {
      alert("Error al enviar el pedido");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    navigate('/');
  };

  // Filtrado y Paginación
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
      <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">🛍️ Tienda</h1>
        <div className="flex items-center gap-3">
            <button onClick={() => setIsOrdersOpen(true)} className={`relative px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${hasRejectedOrders ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              📜 <span className="hidden sm:inline">Mis Pedidos</span>
            </button>
            <button onClick={() => navigate('/chat')} className="relative bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200 transition flex items-center gap-2">
              💬 <span className="hidden sm:inline">Chat</span>
            </button>
            <button onClick={() => setIsCartOpen(!isCartOpen)} className="relative bg-yellow-400 text-yellow-900 px-4 py-2 rounded-lg font-bold shadow hover:bg-yellow-500 transition">
              🛒 <span className="hidden sm:inline">Carrito</span>
              {cart.length > 0 && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full absolute -top-2 -right-2">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
            </button>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 font-bold px-2 py-2 transition flex flex-col items-center">
              🚪 <span className="text-xs">Salir</span>
            </button>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="max-w-6xl mx-auto mb-8">
        <input type="text" placeholder="¿Qué producto buscas hoy?..." className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* GRILLA DE PRODUCTOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {currentProducts.map(product => {
          const qty = getProductQuantity(product.id);
          return (
            <div key={product.id} className={`bg-white p-6 rounded-xl shadow-lg border ${qty > 0 ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-100'}`}>
              <h3 className="font-bold text-xl mb-1 text-gray-800">{product.name}</h3>
              <div className="flex justify-between items-end mb-6">
                <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">Stock: {product.stock}</span>
                <p className="text-2xl font-black text-gray-900">${product.price}</p>
              </div>
              {product.stock === 0 ? (
                <button disabled className="w-full py-3 rounded-lg font-bold bg-gray-200 text-gray-400">🚫 Agotado</button>
              ) : qty === 0 ? (
                <button onClick={() => addToCart(product)} className="w-full py-3 rounded-lg font-bold bg-gray-900 text-white hover:bg-gray-700 transition">➕ Agregar</button>
              ) : (
                <div className="flex items-center justify-between bg-gray-900 text-white rounded-lg p-1">
                  <button onClick={() => decreaseQuantity(product)} className="w-12 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded font-bold text-xl">{qty === 1 ? '🗑️' : '-'}</button>
                  <span className="font-black text-lg w-full text-center">{qty}</span>
                  <button onClick={() => addToCart(product)} className="w-12 h-10 flex items-center justify-center bg-white text-black hover:bg-gray-200 rounded font-bold text-xl">+</button>
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
            <button key={i + 1} onClick={() => paginate(i + 1)} className={`w-10 h-10 rounded-lg font-bold transition ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{i + 1}</button>
          ))}
        </div>
      )}

      {/* BARRA FLOTANTE DE PAGO */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-green-500 shadow-lg p-4 z-40">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-bold">Total a Pagar:</span>
              <span className="text-3xl font-black text-gray-900">${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
            </div>
            <button onClick={() => setIsCartOpen(true)} className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-green-700 transition">✅ Ir a Pagar</button>
          </div>
        </div>
      )}

      {/* MODAL CARRITO */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full sm:w-96 bg-white shadow-2xl p-6 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">🧾 Confirmar Pedido</h2>
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg mb-4">
                <div><p className="font-bold">{item.name}</p><p className="text-sm text-gray-500">x {item.quantity}</p></div>
                <p className="font-black">${item.quantity * item.price}</p>
              </div>
            ))}
            <button onClick={submitOrder} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg mt-8">🚀 Enviar Pedido</button>
          </div>
        </div>
      )}
    </div>
  );
}