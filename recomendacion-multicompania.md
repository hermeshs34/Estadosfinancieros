# Recomendación para Implementación de Multicompañía

## Análisis de Opciones

### Opción A: Un Usuario - Una Empresa (Actual)
**Ventajas:**
- Simplicidad en la implementación
- Menor complejidad en permisos
- Fácil de entender y mantener

**Desventajas:**
- Limitación para usuarios que trabajan en múltiples empresas
- Necesidad de múltiples cuentas para el mismo usuario
- Duplicación de datos de usuario

### Opción B: Un Usuario - Múltiples Empresas (Recomendada)
**Ventajas:**
- Flexibilidad total para usuarios multi-empresa
- Una sola cuenta por usuario
- Mejor experiencia de usuario
- Escalabilidad futura

**Desventajas:**
- Mayor complejidad en implementación
- Necesidad de sistema de permisos más robusto
- Gestión de contexto de empresa activa

## Mi Recomendación: Opción B

### Razones Técnicas:
1. **Escalabilidad**: Permite crecimiento natural del negocio
2. **Experiencia de Usuario**: Un solo login para múltiples empresas
3. **Mantenimiento**: Menos duplicación de datos
4. **Flexibilidad**: Adaptable a diferentes modelos de negocio

## Plan de Implementación

### Fase 1: Estructura de Base de Datos

#### 1.1 Crear Tabla de Relación Usuario-Empresa
```sql
CREATE TABLE user_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'user', -- admin, user, viewer
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);
```

#### 1.2 Crear Tabla de Sesiones de Usuario
```sql
CREATE TABLE user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  active_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 1.3 Migrar Datos Existentes
```sql
-- Migrar relaciones existentes
INSERT INTO user_companies (user_id, company_id, role)
SELECT id, company_id, 'admin'
FROM users 
WHERE company_id IS NOT NULL;
```

### Fase 2: Servicios Backend

#### 2.1 Actualizar UserService
```typescript
// Nuevos métodos en UserService
class UserService {
  // Obtener empresas del usuario
  async getUserCompanies(userId: string): Promise<Company[]> {
    const { data, error } = await supabase
      .from('user_companies')
      .select(`
        companies (
          id,
          name,
          rif,
          address,
          created_at,
          updated_at
        ),
        role,
        is_active
      `)
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (error) throw error;
    return data?.map(uc => ({ ...uc.companies, role: uc.role })) || [];
  }

  // Agregar usuario a empresa
  async addUserToCompany(userId: string, companyId: string, role: string = 'user') {
    const { data, error } = await supabase
      .from('user_companies')
      .insert({ user_id: userId, company_id: companyId, role })
      .select();
    
    if (error) throw error;
    return data[0];
  }

  // Remover usuario de empresa
  async removeUserFromCompany(userId: string, companyId: string) {
    const { error } = await supabase
      .from('user_companies')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('company_id', companyId);
    
    if (error) throw error;
  }

  // Cambiar empresa activa
  async setActiveCompany(userId: string, companyId: string) {
    // Verificar que el usuario pertenece a la empresa
    const { data: userCompany } = await supabase
      .from('user_companies')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single();
    
    if (!userCompany) {
      throw new Error('Usuario no pertenece a esta empresa');
    }

    // Actualizar sesión
    const { error } = await supabase
      .from('user_sessions')
      .upsert({ 
        user_id: userId, 
        active_company_id: companyId,
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
  }

  // Obtener empresa activa
  async getActiveCompany(userId: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('user_sessions')
      .select(`
        companies (
          id,
          name,
          rif,
          address,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .single();
    
    if (error || !data?.companies) return null;
    return data.companies;
  }
}
```

### Fase 3: Frontend - Contexto de Empresa

#### 3.1 Crear CompanyContext
```typescript
// contexts/CompanyContext.tsx
interface CompanyContextType {
  companies: Company[];
  activeCompany: Company | null;
  switchCompany: (companyId: string) => Promise<void>;
  addUserToCompany: (companyId: string, role?: string) => Promise<void>;
  loading: boolean;
}

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadUserCompanies = async () => {
    if (!user) return;
    
    try {
      const userCompanies = await UserService.getUserCompanies(user.id);
      setCompanies(userCompanies);
      
      const active = await UserService.getActiveCompany(user.id);
      setActiveCompany(active || userCompanies[0] || null);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchCompany = async (companyId: string) => {
    if (!user) return;
    
    try {
      await UserService.setActiveCompany(user.id, companyId);
      const company = companies.find(c => c.id === companyId);
      setActiveCompany(company || null);
    } catch (error) {
      console.error('Error switching company:', error);
    }
  };

  // ... resto de la implementación
};
```

#### 3.2 Selector de Empresa
```typescript
// components/CompanySelector.tsx
export const CompanySelector: React.FC = () => {
  const { companies, activeCompany, switchCompany } = useCompany();
  
  return (
    <Select
      value={activeCompany?.id || ''}
      onValueChange={switchCompany}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Seleccionar empresa" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

### Fase 4: Gestión de Permisos

#### 4.1 Sistema de Roles
```typescript
// types/permissions.ts
export enum CompanyRole {
  ADMIN = 'admin',     // Acceso total
  MANAGER = 'manager', // Gestión operativa
  USER = 'user',       // Acceso básico
  VIEWER = 'viewer'    // Solo lectura
}

export const PERMISSIONS = {
  [CompanyRole.ADMIN]: ['read', 'write', 'delete', 'manage_users'],
  [CompanyRole.MANAGER]: ['read', 'write', 'delete'],
  [CompanyRole.USER]: ['read', 'write'],
  [CompanyRole.VIEWER]: ['read']
};
```

#### 4.2 Hook de Permisos
```typescript
// hooks/usePermissions.ts
export const usePermissions = () => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  
  const hasPermission = (permission: string): boolean => {
    if (!activeCompany || !user) return false;
    
    const userRole = activeCompany.role as CompanyRole;
    const permissions = PERMISSIONS[userRole] || [];
    
    return permissions.includes(permission);
  };
  
  return { hasPermission };
};
```

## Cronograma de Implementación

### Semana 1: Base de Datos
- [ ] Crear tablas `user_companies` y `user_sessions`
- [ ] Migrar datos existentes
- [ ] Crear índices y constraints

### Semana 2: Backend Services
- [ ] Actualizar `UserService` con métodos multicompañía
- [ ] Implementar gestión de sesiones
- [ ] Crear endpoints API necesarios

### Semana 3: Frontend Core
- [ ] Crear `CompanyContext`
- [ ] Implementar selector de empresa
- [ ] Actualizar navegación principal

### Semana 4: Permisos y Seguridad
- [ ] Implementar sistema de roles
- [ ] Crear hooks de permisos
- [ ] Validar acceso en componentes

### Semana 5: Testing y Refinamiento
- [ ] Pruebas de funcionalidad
- [ ] Optimización de rendimiento
- [ ] Documentación

## Consideraciones Adicionales

### Seguridad
1. **Row Level Security (RLS)**: Implementar políticas que filtren datos por empresa activa
2. **Validación de Permisos**: Verificar permisos tanto en frontend como backend
3. **Auditoría**: Registrar cambios de empresa y acciones importantes

### Performance
1. **Caché**: Implementar caché para empresas del usuario
2. **Lazy Loading**: Cargar datos de empresa solo cuando sea necesario
3. **Optimización de Consultas**: Usar joins eficientes

### UX/UI
1. **Indicador Visual**: Mostrar claramente la empresa activa
2. **Cambio Rápido**: Permitir cambio fácil entre empresas
3. **Onboarding**: Guiar a usuarios nuevos en el sistema multicompañía

## Conclusión

La implementación de multicompañía con la Opción B proporcionará:
- Flexibilidad para usuarios que trabajan en múltiples empresas
- Mejor experiencia de usuario
- Escalabilidad para el crecimiento futuro
- Base sólida para funcionalidades avanzadas

Esta implementación gradual permite mantener la funcionalidad actual mientras se añaden las nuevas capacidades de manera controlada.