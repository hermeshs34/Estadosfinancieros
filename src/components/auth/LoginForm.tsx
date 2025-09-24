import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from './AuthProvider';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LogIn, Calculator, UserPlus } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Por favor ingresa un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const signUpSchema = z.object({
  email: z.string().email('Por favor ingresa un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

export const LoginForm: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginForm | SignUpForm>({
    resolver: zodResolver(isSignUp ? signUpSchema : loginSchema),
  });

  const onSubmit = async (data: LoginForm | SignUpForm) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (isSignUp) {
        const signUpData = data as SignUpForm;
        await signUp(signUpData.email, signUpData.password, {
          full_name: signUpData.fullName,
        });
        setSuccess('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.');
        setIsSignUp(false);
        reset();
      } else {
        const loginData = data as LoginForm;
        await signIn(loginData.email, loginData.password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setSuccess(null);
    reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-emerald-800 flex items-center justify-center p-6">
      <Card className="w-full max-w-md" padding="lg" shadow="lg">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-700 to-blue-800 rounded-full flex items-center justify-center shadow-lg">
            <svg width="32" height="32" viewBox="0 0 32 32" className="drop-shadow-sm">
              <defs>
                <linearGradient id="loginAccentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{stopColor:"#fbbf24",stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:"#f59e0b",stopOpacity:1}} />
                </linearGradient>
              </defs>
              
              {/* Letra H estilizada */}
              <g transform="translate(4, 6)">
                <rect x="0" y="0" width="2.5" height="20" fill="#ffffff" rx="1.25"/>
                <rect x="14" y="0" width="2.5" height="20" fill="#ffffff" rx="1.25"/>
                <rect x="2.5" y="8" width="11.5" height="3" fill="#ffffff" rx="1.5"/>
                
                {/* Elementos AI */}
                <circle cx="1.5" cy="2" r="1" fill="url(#loginAccentGradient)"/>
                <circle cx="15" cy="2" r="1" fill="url(#loginAccentGradient)"/>
                <circle cx="8" cy="17" r="0.8" fill="url(#loginAccentGradient)" opacity="0.8"/>
                
                {/* Conexiones neurales */}
                <line x1="2.5" y1="2" x2="14" y2="2" stroke="url(#loginAccentGradient)" strokeWidth="0.6" opacity="0.6"/>
                <line x1="8" y1="16" x2="15" y2="17" stroke="url(#loginAccentGradient)" strokeWidth="0.6" opacity="0.4"/>
              </g>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Financial Analysis Platform</h1>
          <p className="text-gray-600">{isSignUp ? 'Crea tu cuenta para acceder' : 'Inicia sesión para acceder a tu dashboard'}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {isSignUp && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre Completo
              </label>
              <input
                {...register('fullName')}
                type="text"
                id="fullName"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Ingresa tu nombre completo"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Ingresa tu email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              {...register('password')}
              type="password"
              id="password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Ingresa tu contraseña"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isSignUp ? <UserPlus className="w-5 h-5 mr-2" /> : <LogIn className="w-5 h-5 mr-2" />}
            {isLoading ? (isSignUp ? 'Creando cuenta...' : 'Iniciando sesión...') : (isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión')}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={toggleMode}
            className="w-full"
            size="lg"
          >
            {isSignUp ? 'Ya tienes cuenta? Inicia sesión' : 'No tienes cuenta? Regístrate'}
          </Button>
        </form>


      </Card>
    </div>
  );
};