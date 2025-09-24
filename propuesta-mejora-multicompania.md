# Propuesta: Mejora del Sistema Multicompañía

## Problema Actual

El sistema actual tiene limitaciones en el manejo multicompañía:

1. **Un usuario = Una empresa**: Cada usuario solo puede pertenecer a una empresa
2. **Duplicación de usuarios**: Si un usuario necesita acceso a múltiples empresas, se crean registros duplicados
3. **Gestión compleja**: No hay forma de cambiar de empresa sin crear nuevos usuarios
4. **Escalabilidad limitada**: No soporta casos de uso empresariales reales

## Propuesta de Solución

### 1. Nueva Arquitectura de Base de Datos

```sql
-- Tabla de usuarios (información personal única)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Tabla de relación usuario-empresa (muchos a muchos)
CREATE TABLE user_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'accountant', 'read_only')),
    is_active BOOLEAN DEFAULT true,
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- Índices para optimizar consultas
CREATE INDEX idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX idx_user_companies_active ON user_companies(is_active);
```

### 2. Flujo de Autenticación Mejorado

#### Opción A: Selección de Empresa Post-Login
```
1. Usuario ingresa email/password
2. Sistema autentica al usuario
3. Sistema carga empresas disponibles para el usuario
4. Usuario selecciona empresa de trabajo
5. Se establece contexto de empresa para la sesión
6. Usuario puede cambiar de empresa sin re-autenticarse
```

#### Opción B: Login con Empresa (Recomendada)
```
1. Usuario ingresa email
2. Sistema muestra empresas disponibles para ese email
3. Usuario selecciona empresa
4. Usuario ingresa password
5. Sistema autentica en el contexto de la empresa seleccionada
```

### 3. Componentes de UI Actualizados

#### CompanySelector Mejorado
```typescript
interface CompanySelectorProps {
  showUserCompanies?: boolean; // Mostrar solo empresas del usuario
  allowSwitch?: boolean; // Permitir cambio de empresa
  onCompanyChange?: (company: Company) => void;
}
```

#### Nuevo Componente: CompanySwitcher
```typescript
interface CompanySwitcherProps {
  currentCompany: Company;
  availableCompanies: Company[];
  onSwitch: (company: Company) => void;
}
```

### 4. Servicios Actualizados

#### UserService Mejorado
```typescript
class UserService {
  // Obtener usuarios de una empresa
  static async getCompanyUsers(companyId: string): Promise<UserWithRole[]> {
    const { data, error } = await supabase
      .from('user_companies')
      .select(`
        *,
        users!inner(*)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true);
    
    if (error) throw error;
    return data.map(item => ({
      ...item.users,
      role: item.role,
      company_role_id: item.id
    }));
  }

  // Invitar usuario a empresa
  static async inviteUserToCompany(email: string, companyId: string, role: UserRole): Promise<void> {
    // Buscar o crear usuario
    let user = await this.findUserByEmail(email);
    if (!user) {
      user = await this.createUser({ email, full_name: '', phone: '' });
    }

    // Crear relación usuario-empresa
    await supabase
      .from('user_companies')
      .insert({
        user_id: user.id,
        company_id: companyId,
        role,
        invited_by: getCurrentUser().id
      });
  }

  // Obtener empresas del usuario
  static async getUserCompanies(userId: string): Promise<CompanyWithRole[]> {
    const { data, error } = await supabase
      .from('user_companies')
      .select(`
        *,
        companies!inner(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (error) throw error;
    return data.map(item => ({
      ...item.companies,
      role: item.role,
      user_company_id: item.id
    }));
  }
}
```

### 5. Contexto de Aplicación Mejorado

```typescript
interface AppContextType {
  // Usuario autenticado
  user: User | null;
  
  // Empresas disponibles para el usuario
  availableCompanies: CompanyWithRole[];
  
  // Empresa actualmente seleccionada
  currentCompany: CompanyWithRole | null;
  
  // Rol del usuario en la empresa actual
  currentRole: UserRole | null;
  
  // Funciones
  switchCompany: (company: CompanyWithRole) => Promise<void>;
  loadUserCompanies: () => Promise<void>;
}
```

### 6. Migración de Datos

```sql
-- Script de migración para convertir datos existentes
INSERT INTO user_companies (user_id, company_id, role, is_active, joined_at)
SELECT 
    id as user_id,
    company_id,
    role,
    is_active,
    created_at as joined_at
FROM users 
WHERE company_id IS NOT NULL;

-- Limpiar duplicados manteniendo el más reciente
WITH duplicated_users AS (
    SELECT 
        id,
        email,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
    FROM users
    WHERE email IN (
        SELECT email 
        FROM users 
        GROUP BY email 
        HAVING COUNT(*) > 1
    )
)
DELETE FROM users 
WHERE id IN (
    SELECT id 
    FROM duplicated_users 
    WHERE rn > 1
);

-- Remover columnas obsoletas
ALTER TABLE users DROP COLUMN company_id;
ALTER TABLE users DROP COLUMN role;
```

## Beneficios de la Nueva Arquitectura

### 1. **Flexibilidad**
- Un usuario puede pertenecer a múltiples empresas
- Diferentes roles por empresa
- Fácil cambio de contexto de empresa

### 2. **Escalabilidad**
- Soporta casos de uso empresariales complejos
- Consultores que trabajan con múltiples clientes
- Empleados que cambian de empresa

### 3. **Mantenimiento**
- Eliminación de duplicados
- Datos consistentes
- Mejor integridad referencial

### 4. **Experiencia de Usuario**
- Login más intuitivo
- Cambio de empresa sin re-autenticación
- Interfaz más clara

## Plan de Implementación

### Fase 1: Preparación (1-2 días)
1. Crear nuevas tablas
2. Migrar datos existentes
3. Actualizar tipos TypeScript

### Fase 2: Backend (2-3 días)
1. Actualizar servicios de usuario
2. Actualizar servicios de empresa
3. Implementar lógica de roles por empresa

### Fase 3: Frontend (3-4 días)
1. Actualizar contexto de aplicación
2. Crear componente CompanySwitcher
3. Actualizar UserManagement
4. Actualizar flujo de autenticación

### Fase 4: Testing y Refinamiento (1-2 días)
1. Pruebas de funcionalidad
2. Pruebas de migración
3. Ajustes de UI/UX

## Consideraciones de Seguridad

1. **RLS (Row Level Security)**:
```sql
-- Solo usuarios activos en la empresa pueden ver datos
CREATE POLICY "Users can only see company data they belong to" ON financial_entries
FOR ALL USING (
    company_id IN (
        SELECT company_id 
        FROM user_companies 
        WHERE user_id = auth.uid() 
        AND is_active = true
    )
);
```

2. **Validación de roles**:
- Admin: Puede gestionar usuarios y configuración
- Manager: Puede ver y editar datos financieros
- Accountant: Puede editar datos financieros
- Read Only: Solo lectura

## Conclusión

Esta propuesta resuelve el problema actual de usuarios duplicados y proporciona una base sólida para un verdadero sistema multicompañía. La implementación es incremental y mantiene compatibilidad con los datos existentes.