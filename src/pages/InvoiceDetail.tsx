import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

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

  useEffect(() => {
    const fetchInvoice = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`http://localhost:3000/invoices/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          setInvoice(await response.json());
        }
      } catch (error) {
        console.error("Error cargando factura");
      }
    };
    fetchInvoice();
  }, [id]);

  if (!invoice) return <div className="p-8">Cargando factura...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white">
      
      {/* --- BOTONES DE ACCIÓN (Se ocultan al imprimir gracias a 'print:hidden') --- */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between print:hidden">
        <button
          onClick={() => navigate('/invoices')}
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          ← Volver al listado
        </button>
        <button
          onClick={() => window.print()} 
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition flex items-center gap-2"
        >
          🖨️ Imprimir / Descargar PDF
        </button>
      </div>

      {/* --- HOJA DE LA FACTURA --- */}
      <div className="max-w-4xl mx-auto bg-white p-12 rounded-lg shadow-lg print:shadow-none print:w-full print:m-0">

        {/* ENCABEZADO */}
        <div className="flex justify-between items-start mb-12 border-b pb-8">
          <div>
            <h1 className="text-4xl font-black text-blue-600 uppercase tracking-wide">Factura</h1>
            <p className="text-gray-500 font-bold mt-2">N° #{invoice.id.toString().padStart(4, '0')}</p>
          </div>
          <div className="text-right">
            <h2 className="font-bold text-xl text-gray-800">Tu Empresa S.A.</h2>
            <p className="text-gray-500 text-sm">Avenida Siempreviva 742</p>
            <p className="text-gray-500 text-sm">Buenos Aires, Argentina</p>
            <p className="text-gray-500 text-sm">contacto@tuempresa.com</p>
          </div>
        </div>

        {/* DATOS DEL CLIENTE Y FECHA */}
        <div className="flex justify-between mb-12">
          <div>
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Facturar a:</h3>
            <p className="text-xl font-bold text-gray-800">{invoice.client.name}</p>
            <p className="text-gray-600">{invoice.client.email}</p>
            <p className="text-gray-600">{invoice.client.address || 'Dirección no registrada'}</p>
            {invoice.client.taxId && <p className="text-gray-600">CUIT/DNI: {invoice.client.taxId}</p>}
          </div>
          <div className="text-right">
            <div className="mb-4">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Fecha de Emisión</h3>
              <p className="font-bold text-gray-800 text-lg">
                {new Date(invoice.createdAt).toLocaleDateString('es-AR', { timeZone: 'UTC' })}
              </p>
            </div>
            <div>
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Estado</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                invoice.status === 'PAGADA' ? 'bg-green-50 text-green-700 border-green-200' : 
                invoice.status === 'ANULADA' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-yellow-50 text-yellow-700 border-yellow-200'
              }`}>
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        {/* TABLA DE ITEMS */}
        <table className="w-full mb-12 border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase text-left border-y border-gray-200">
              <th className="py-3 px-4 font-bold">Descripción</th>
              <th className="py-3 px-4 font-bold text-center">Cant.</th>
              <th className="py-3 px-4 font-bold text-right">Precio Unit.</th>
              <th className="py-3 px-4 font-bold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items.map((item, index) => (
              <tr key={index}>
                <td className="py-4 px-4 text-gray-800">{item.description}</td>
                <td className="py-4 px-4 text-center text-gray-600">{item.quantity}</td>
                <td className="py-4 px-4 text-right text-gray-600">${item.price.toFixed(2)}</td>
                <td className="py-4 px-4 text-right font-bold text-gray-800">
                  ${(item.quantity * item.price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALES */}
        <div className="flex justify-end border-t pt-8">
          <div className="w-64">
            <div className="flex justify-between mb-2 text-gray-600">
              <span>Subtotal:</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-4 text-gray-600">
              <span>Impuestos (0%):</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-4 text-2xl font-black text-gray-900">
              <span>Total:</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* PIE DE PÁGINA */}
        <div className="mt-16 text-center text-gray-400 text-sm border-t pt-8">
          <p className="font-medium text-gray-500">Gracias por confiar en nosotros.</p>
          <p className="mt-1">Si tienes dudas sobre esta factura, contáctanos.</p>
        </div>

      </div>
    </div>
  );
}