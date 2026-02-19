import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// 1. Definimos la URL de la API dinámicamente.
// VITE_API_URL es la que configuraste en el panel de Vercel.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 2. Cambiamos la URL fija por la constante API_URL
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        alert('✅ Cuenta creada con éxito. Ahora puedes iniciar sesión.');
        navigate('/'); // Lo mandamos al login
      } else {
        const data = await response.json();
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      // Este mensaje aparecerá si la URL de Render está mal escrita en Vercel
      alert('Error de conexión con el servidor. Verifica la URL de la API.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full border-t-4 border-blue-500">
        <h1 className="text-2xl font-bold text-center text-blue-600 mb-6">Crear Cuenta de cliente</h1>
        
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]*$/.test(val)) {
                  setName(val);
                }
              }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition mt-2">
            Registrarse
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <Link to="/" className="text-blue-600 hover:underline font-bold">
            Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
}