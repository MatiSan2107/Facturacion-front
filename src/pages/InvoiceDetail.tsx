import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// 1. DEFINIMOS LA URL DINÁMICA
// Conecta a Render en producción o localhost en desarrollo
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  price: number;
}

interface Invoice {
  id: number;
  total: number;
  status: string;
  createdAt: string;
  client: {
    name: string;
    email: string;
    address: string;
    taxId: string;
  };
  items: InvoiceItem[];
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  // 2. FETCH DE LA FACTURA DESDE RENDER
  useEffect(() => {
    const fetchInvoice = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_URL}/invoices/${id}`, { // <-- CAMBIADO
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          setInvoice(await response.json());
        }
      } catch (error) {
        console.error("Error cargando factura desde el servidor");
      }
    };
    fetchInvoice();
  }, [id]);

  if (!invoice) return <div className="p-8 text-center text-gray-500 font-bold">Cargando factura...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white">
      
      {/* BOTONES DE ACCIÓN */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between print:hidden">
        <button
          onClick={() => navigate('/invoices')}
          className="text-gray-600 hover:text-gray-900 font-bold flex items-center gap-1 transition"
        >
          ← Volver al listado
        </button>
        <button
          onClick={() => window.print()} 
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          🖨️ Imprimir / Descargar PDF
        </button>
      </div>

      {/* --- HOJA DE LA FACTURA --- */}
      <div className="max-w-4xl mx-auto bg-white p-12 rounded-xl shadow-2xl print:shadow-none print:w-full print:m-0 border border-gray-100">

        {/* ENCABEZADO */}
        <div className="flex justify-between items-start mb-12 border-b border-gray-100 pb-8">
          <div>
            <h1 className="text-4xl font-black text-blue-600 uppercase tracking-tighter">Factura</h1>
            <p className="text-gray-400 font-black mt-2 uppercase text-xs tracking-widest">
              Comprobante N° #{invoice.id.toString().padStart(6, '0')}
            </p>
          </div>
          <div className="text-right">
            <h2 className="font-black text-xl text-gray-800 tracking-tight">MI EMPRESA S.A.</h2>
            <p className="text-gray-500 text-sm">Av. Tecnológica 1234</p>
            <p className="text-gray-500 text-sm">Buenos Aires, Argentina</p>
            <p className="text-gray-500 text-sm font-bold mt-1">CUIT: 30-71234567-9</p>
          </div>
        </div>

        {/* DATOS DEL CLIENTE Y FECHA */}
        <div className="flex justify-between mb-12 bg-gray-50 p-6 rounded-xl">
          <div>
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">Facturar a:</h3>
            <p className="text-xl font-black text-gray-800 uppercase">{invoice.client.name}</p>
            <p className="text-gray-600 text-sm">{invoice.client.email}</p>
            <p className="text-gray-600 text-sm">{invoice.client.address || 'Dirección no registrada'}</p>
            {invoice.client.taxId && <p className="text-gray-600 text-sm font-bold mt-1">ID FISCAL: {invoice.client.taxId}</p>}
          </div>
          <div className="text-right flex flex-col justify-between">
            <div>
              <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Fecha de Emisión</h3>
              <p className="font-bold text-gray-800 text-lg">
                {new Date(invoice.createdAt).toLocaleDateString('es-AR', { timeZone: 'UTC' })}
              </p>
            </div>
            <div className="mt-4">
              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                invoice.status === 'PAGADA' ? 'bg-green-100 text-green-700 border-green-200' : 
                invoice.status === 'ANULADA' ? 'bg-red-100 text-red-700 border-red-200' :
                'bg-yellow-100 text-yellow-700 border-yellow-200'
              }`}>
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        {/* TABLA DE ITEMS */}
        <table className="w-full mb-12">
          <thead>
            <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest text-left border-b-2 border-gray-100">
              <th className="py-4 px-2">Descripción del Servicio/Producto</th>
              <th className="py-4 px-2 text-center">Cant.</th>
              <th className="py-4 px-2 text-right">Precio Unit.</th>
              <th className="py-4 px-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoice.items.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="py-5 px-2 text-gray-800 font-medium">{item.description}</td>
                <td className="py-5 px-2 text-center text-gray-600">{item.quantity}</td>
                <td className="py-5 px-2 text-right text-gray-600 font-mono">${item.price.toFixed(2)}</td>
                <td className="py-5 px-2 text-right font-black text-gray-900 font-mono">
                  ${(item.quantity * item.price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALES */}
        <div className="flex justify-end pt-8 border-t-2 border-gray-100">
          <div className="w-72">
            <div className="flex justify-between mb-2 text-gray-500 text-sm font-bold">
              <span>SUBTOTAL</span>
              <span className="font-mono">${invoice.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-4 text-gray-500 text-sm font-bold">
              <span>IVA (0%)</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex justify-between border-t-4 border-blue-600 pt-4 text-3xl font-black text-gray-900">
              <span className="tracking-tighter">TOTAL</span>
              <span className="text-blue-600 font-mono">${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* PIE DE PÁGINA */}
        <div className="mt-20 text-center border-t border-gray-100 pt-10">
          <p className="font-black text-gray-800 uppercase text-xs tracking-widest mb-1">Gracias por su preferencia</p>
          <p className="text-gray-400 text-[10px] uppercase font-bold tracking-tighter">
            Este documento es un comprobante válido de transacción comercial electrónica
          </p>
        </div>

      </div>
    </div>
  );
}