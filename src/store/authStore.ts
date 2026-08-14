import { create } from 'zustand';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STORE_KEEPER = 'STORE_KEEPER',
  SALES_PERSON = 'SALES_PERSON',
  BILLER = 'BILLER',
  WARRANTY_TEAM = 'WARRANTY_TEAM',
  SERVICE_TEAM = 'SERVICE_TEAM',
  PLANT_SERVICE_ENGINEER = 'PLANT_SERVICE_ENGINEER',
  PRODUCTION_TEAM = 'PRODUCTION_TEAM',
  QUALITY_TEAM = 'QUALITY_TEAM'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  email: string;
  password?: string;
}

interface AuthState {
  user: User | null;
  usersList: User[];
  login: (role: UserRole) => void;
  loginWithCredentials: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  addUser: (newUser: Omit<User, 'id'>) => { success: boolean; error?: string };
  updateUser: (id: string, updatedFields: Partial<User>) => { success: boolean; error?: string };
  deleteUser: (id: string) => { success: boolean; error?: string };
  resetDefaultUsers: () => void;
  setUsersList: (list: User[]) => void;
  fetchUsersFromServer: () => Promise<void>;
}

const DEFAULT_USERS: User[] = [
  {
    id: 'usr-sap-001',
    name: 'Aravind Swamy',
    role: UserRole.SUPER_ADMIN,
    department: 'Superordinate Operations',
    email: 'admin@arcenol.com',
    password: 'admin123'
  },
  {
    id: 'usr-admin-002',
    name: 'Rohan Sharma',
    role: UserRole.ADMIN,
    department: 'Central Operations',
    email: 'ops@arcenol.com',
    password: 'password123'
  },
  {
    id: 'usr-sk-003',
    name: 'Baldev Singh',
    role: UserRole.STORE_KEEPER,
    department: 'Material Logistics',
    email: 'store@arcenol.com',
    password: 'password123'
  },
  {
    id: 'usr-prod-004',
    name: 'Vikram Patel',
    role: UserRole.PRODUCTION_TEAM,
    department: 'Manufacturing',
    email: 'production@arcenol.com',
    password: 'password123'
  },
  {
    id: 'usr-qc-005',
    name: 'Anjali Verma',
    role: UserRole.QUALITY_TEAM,
    department: 'Quality Control',
    email: 'quality@arcenol.com',
    password: 'password123'
  },
  {
    id: 'usr-crm-006',
    name: 'Suresh Raina',
    role: UserRole.SALES_PERSON,
    department: 'CRM / Sales Team',
    email: 'sales@arcenol.com',
    password: 'password123'
  },
  {
    id: 'usr-biller-007',
    name: 'Nisha Gupta',
    role: UserRole.BILLER,
    department: 'Finance Hub',
    email: 'finance@arcenol.com',
    password: 'password123'
  },
  {
    id: 'usr-warm-008',
    name: 'Deepak Chawla',
    role: UserRole.WARRANTY_TEAM,
    department: 'Warranty Claims',
    email: 'warranty@arcenol.com',
    password: 'password123'
  },
  {
    id: 'usr-rma-009',
    name: 'Harpreet Singh',
    role: UserRole.SERVICE_TEAM,
    department: 'RMA Center',
    email: 'service@arcenol.com',
    password: 'password123'
  },
  {
    id: 'usr-pse-010',
    name: 'Amit Trivedi',
    role: UserRole.PLANT_SERVICE_ENGINEER,
    department: 'Plant Support',
    email: 'plant@arcenol.com',
    password: 'password123'
  }
];

import { syncUserToSupabase, syncUsersToSupabase, deleteUserFromSupabase } from '../lib/clientSupabaseSync';

// Helper to load users list from local storage or set defaults
const getSavedUsers = (): User[] => {
  const data = localStorage.getItem('arcenol_users_storage');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      return DEFAULT_USERS;
    }
  }
  
  // Fallback check in arcenol_db_clean
  try {
    const dbCleanRaw = localStorage.getItem('arcenol_db_clean');
    if (dbCleanRaw) {
      const dbClean = JSON.parse(dbCleanRaw);
      if (Array.isArray(dbClean.users) && dbClean.users.length > 0) {
        localStorage.setItem('arcenol_users_storage', JSON.stringify(dbClean.users));
        return dbClean.users;
      }
    }
  } catch (e) {}

  localStorage.setItem('arcenol_users_storage', JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
};

const saveUsers = (users: User[]) => {
  localStorage.setItem('arcenol_users_storage', JSON.stringify(users));
  try {
    const dbCleanRaw = localStorage.getItem('arcenol_db_clean');
    if (dbCleanRaw) {
      const dbClean = JSON.parse(dbCleanRaw);
      dbClean.users = users;
      localStorage.setItem('arcenol_db_clean', JSON.stringify(dbClean));
    }
  } catch (e) {}
};

const getSavedUser = (): User | null => {
  const data = localStorage.getItem('arcenol_active_user');
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
};

const saveActiveUser = (user: User | null) => {
  if (user) {
    localStorage.setItem('arcenol_active_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('arcenol_active_user');
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getSavedUser(),
  usersList: getSavedUsers(),
  setUsersList: (list) => {
    if (!Array.isArray(list) || list.length === 0) return;
    set({ usersList: list });
    saveUsers(list);
  },

  fetchUsersFromServer: async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const serverUsers = await res.json();
        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
          const currentLocal = get().usersList;
          // If server users have more records or custom entries, adopt them; otherwise sync local to server
          if (JSON.stringify(serverUsers) !== JSON.stringify(currentLocal)) {
            set({ usersList: serverUsers });
            saveUsers(serverUsers);
          }
        } else {
          // If server is empty, push local users
          const currentLocal = get().usersList;
          if (currentLocal && currentLocal.length > 0) {
            fetch('/api/users/reset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(currentLocal)
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch users from server:", e);
    }
  },
  
  login: (role) => {
    // Look up user in lists or synthesize
    const users = get().usersList;
    const match = users.find(u => u.role === role);
    if (match) {
      set({ user: match });
      saveActiveUser(match);
    } else {
      const fallbackUser: User = { 
        id: `usr-sync-${Math.random().toString(36).substr(2, 6)}`, 
        name: role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '), 
        role,
        department: role.includes('PRODUCTION') ? 'Manufacturing' : (role.includes('SALES') ? 'CRM' : 'Core'),
        email: `${role.toLowerCase()}@arcenol.com`
      };
      set({ user: fallbackUser });
      saveActiveUser(fallbackUser);
    }
  },

  loginWithCredentials: (email, password) => {
    const users = get().usersList;
    const foundUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    
    if (!foundUser) {
      return { success: false, error: 'Authorization email not recognized.' };
    }
    
    if (foundUser.password !== password) {
      return { success: false, error: 'Invalid security code / password. Handshake failed.' };
    }
    
    set({ user: foundUser });
    saveActiveUser(foundUser);
    return { success: true };
  },

  logout: () => {
    set({ user: null });
    saveActiveUser(null);
    localStorage.removeItem('arcenol_active_tab');
  },

  addUser: (newUser) => {
    const list = [...get().usersList];
    if (list.some(u => u.email.trim().toLowerCase() === newUser.email.trim().toLowerCase())) {
      return { success: false, error: 'User account with this email already exists.' };
    }
    const created: User = {
      ...newUser,
      id: `usr-gen-${Math.random().toString(36).substr(2, 9)}`,
    };
    const updated = [...list, created];
    saveUsers(updated);
    set({ usersList: updated });

    // Sync to Express
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(created)
    }).catch(err => console.warn('Express user add notice:', err));

    // Sync to Supabase
    syncUserToSupabase(created).catch(() => {});

    return { success: true };
  },

  updateUser: (id, updatedFields) => {
    const list = get().usersList;
    const emailToCheck = updatedFields.email?.trim().toLowerCase();
    if (emailToCheck && list.some(u => u.id !== id && u.email.trim().toLowerCase() === emailToCheck)) {
      return { success: false, error: 'Conflict: Another account is using this email address.' };
    }
    const updated = list.map(u => u.id === id ? { ...u, ...updatedFields } : u);
    saveUsers(updated);
    set({ usersList: updated });

    // Sync to Express
    fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedFields)
    }).catch(err => console.warn('Express user update notice:', err));

    // Sync to Supabase
    const target = updated.find(u => u.id === id);
    if (target) {
      syncUserToSupabase(target).catch(() => {});
    }

    // If the currently logged-in user is updated, sink changes
    const currentUser = get().user;
    if (currentUser && currentUser.id === id) {
      const activeMatch = updated.find(u => u.id === id);
      if (activeMatch) {
        set({ user: activeMatch });
        saveActiveUser(activeMatch);
      }
    }
    return { success: true };
  },

  deleteUser: (id) => {
    const list = get().usersList;
    if (list.length <= 1) {
      return { success: false, error: 'Registry Integrity Blocked: At least one administrative node user must exist.' };
    }
    const updated = list.filter(u => u.id !== id);
    saveUsers(updated);
    set({ usersList: updated });

    // Sync to Express
    fetch(`/api/users/${id}`, {
      method: 'DELETE'
    }).catch(err => console.warn('Express user delete notice:', err));

    // Sync to Supabase
    deleteUserFromSupabase(id).catch(() => {});

    // If deleted logged-in user, force logout
    const currentUser = get().user;
    if (currentUser && currentUser.id === id) {
      set({ user: null });
      saveActiveUser(null);
    }
    return { success: true };
  },

  resetDefaultUsers: () => {
    saveUsers(DEFAULT_USERS);
    set({ usersList: DEFAULT_USERS });

    // Sync to Express
    fetch('/api/users/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEFAULT_USERS)
    }).catch(err => console.warn('Express user reset notice:', err));

    // Sync to Supabase
    syncUsersToSupabase(DEFAULT_USERS).catch(() => {});

    const currentUser = get().user;
    if (currentUser) {
      const activeMatch = DEFAULT_USERS.find(u => u.role === currentUser.role);
      set({ user: activeMatch || null });
      saveActiveUser(activeMatch || null);
    }
  }
}));
