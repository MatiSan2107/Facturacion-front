import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// 1. Definimos la URL de la API de forma dinámica.
// VITE_API_URL es la variable que configuraremos en Vercel.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Limpiamos errores previos antes de intentar

    try {
      // 2. Usamos la constante API_URL en lugar de la dirección fija.
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Guardamos los datos de sesión
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', email);
        localStorage.setItem('role', data.user.role);
        
        // Redirección basada en el rol
        if (data.user.role === 'ADMIN') {
          navigate('/dashboard');
        } else {
          navigate('/store');
        }
      } else {
        // Manejo de errores del servidor (ej: credenciales incorrectas)
        setError(data.error || 'Credenciales inválidas');
      }
    } catch (err) {
      // Error si el backend de Render está apagado o no hay internet
      setError('No se pudo conectar con el servidor. Verifica tu conexión.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96 border-t-4 border-blue-500">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">Sistema Facturación</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email" 
              className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input 
              type="password" 
              className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <div className="text-red-500 text-sm text-center font-semibold">{error}</div>}
          
          <button 
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition font-bold mt-2"
          >
            Ingresar
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-bold">
            Regístrate aquí
          </Link>
        </div>
      </div>
    </div>
  );
}