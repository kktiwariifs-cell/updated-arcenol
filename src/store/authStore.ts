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

const getSavedUsers = (): User[] => {
  const activeUser = getSavedUser();
  let list: User[] = DEFAULT_USERS;
  const data = localStorage.getItem('arcenol_users_storage');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    } catch {}
  } else {
    // Fallback check in arcenol_db_clean
    try {
      const dbCleanRaw = localStorage.getItem('arcenol_db_clean');
      if (dbCleanRaw) {
        const dbClean = JSON.parse(dbCleanRaw);
        if (Array.isArray(dbClean.users) && dbClean.users.length > 0) {
          list = dbClean.users;
        }
      }
    } catch (e) {}
  }

  // If there's an active session with a customized name/details, ensure the usersList entry matches it
  if (activeUser && activeUser.name) {
    const matchIdx = list.findIndex(u => u.id === activeUser.id || u.role === activeUser.role);
    if (matchIdx !== -1) {
      if (list[matchIdx].name !== activeUser.name || list[matchIdx].email !== activeUser.email) {
        list[matchIdx] = {
          ...list[matchIdx],
          ...activeUser
        };
      }
    }
  }

  localStorage.setItem('arcenol_users_storage', JSON.stringify(list));
  return list;
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

// Smart merge helper to prevent server defaults from wiping local edits
function smartMergeUsers(localUsers: User[], incomingUsers: User[], activeUser: User | null): { merged: User[]; hasLocalEdits: boolean } {
  if (!Array.isArray(incomingUsers) || incomingUsers.length === 0) {
    return { merged: localUsers, hasLocalEdits: false };
  }

  let hasLocalEdits = false;
  const merged: User[] = [];

  // Start with incoming users, but preserve local non-default custom attributes
  for (const inc of incomingUsers) {
    const localMatch = localUsers.find(l => l.id === inc.id || l.role === inc.role || l.email.toLowerCase() === inc.email.toLowerCase());
    if (localMatch) {
      // Check if local has a custom non-default name or active session match
      const defaultMatch = DEFAULT_USERS.find(d => d.role === inc.role || d.id === inc.id);
      const isIncomingDefault = defaultMatch && inc.name === defaultMatch.name;
      const isLocalCustom = defaultMatch && localMatch.name !== defaultMatch.name;
      const isActiveMatch = activeUser && (activeUser.id === localMatch.id || activeUser.role === localMatch.role);

      if ((isLocalCustom && isIncomingDefault) || (isActiveMatch && activeUser.name && inc.name !== activeUser.name)) {
        // Keep local custom name & credentials
        merged.push({
          ...inc,
          ...localMatch,
          name: isActiveMatch && activeUser?.name ? activeUser.name : localMatch.name
        });
        hasLocalEdits = true;
      } else {
        merged.push({
          ...localMatch,
          ...inc
        });
      }
    } else {
      merged.push(inc);
    }
  }

  // Also include any purely local created users not on server
  for (const loc of localUsers) {
    if (!merged.some(m => m.id === loc.id || m.email.toLowerCase() === loc.email.toLowerCase())) {
      merged.push(loc);
      hasLocalEdits = true;
    }
  }

  // Ensure active session is consistently reflected in the final list
  if (activeUser && activeUser.name) {
    const activeIdx = merged.findIndex(m => m.id === activeUser.id || m.role === activeUser.role);
    if (activeIdx !== -1 && merged[activeIdx].name !== activeUser.name) {
      merged[activeIdx] = {
        ...merged[activeIdx],
        name: activeUser.name,
        email: activeUser.email || merged[activeIdx].email,
        department: activeUser.department || merged[activeIdx].department
      };
      hasLocalEdits = true;
    }
  }

  return { merged, hasLocalEdits };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getSavedUser(),
  usersList: getSavedUsers(),
  setUsersList: (list) => {
    if (!Array.isArray(list) || list.length === 0) return;
    const current = get().usersList;
    const currentUser = get().user;
    const { merged, hasLocalEdits } = smartMergeUsers(current, list, currentUser);

    if (JSON.stringify(merged) !== JSON.stringify(current)) {
      set({ usersList: merged });
      saveUsers(merged);
      if (hasLocalEdits) {
        fetch('/api/users/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        }).catch(() => {});
        syncUsersToSupabase(merged).catch(() => {});
      }
    }
  },

  fetchUsersFromServer: async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const serverUsers = await res.json();
        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
          const currentLocal = get().usersList;
          const currentUser = get().user;
          const { merged, hasLocalEdits } = smartMergeUsers(currentLocal, serverUsers, currentUser);

          set({ usersList: merged });
          saveUsers(merged);

          if (hasLocalEdits || JSON.stringify(merged) !== JSON.stringify(serverUsers)) {
            // Push merged state back to server
            fetch('/api/users/reset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(merged)
            }).catch(() => {});
            syncUsersToSupabase(merged).catch(() => {});
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
            syncUsersToSupabase(currentLocal).catch(() => {});
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
    const target = updated.find(u => u.id === id);
    if (target) {
      fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target)
      }).catch(err => console.warn('Express user update notice:', err));

      // Also reset full list in server to avoid race conditions with /api/data
      fetch('/api/users/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});

      // Sync to Supabase
      syncUserToSupabase(target).catch(() => {});
    }

    // If the currently logged-in user is updated, sink changes
    const currentUser = get().user;
    if (currentUser && (currentUser.id === id || currentUser.role === target?.role)) {
      const activeMatch = target || updated.find(u => u.id === id);
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
