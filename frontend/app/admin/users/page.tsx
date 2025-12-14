'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Pagination from '@/components/ui/Pagination';
import { apiClient } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

type UserFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
};

export default function UsersPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'STUDENT',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Debounce and request management
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    
    // Debounce fetchUsers to prevent rapid-fire requests
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      fetchUsers();
    }, 300); // 300ms debounce
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [router, roleFilter, page, limit]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors

      // Use apiClient which handles the API URL and authentication automatically
      const url = roleFilter 
        ? `/users?role=${roleFilter}&page=${page}&limit=${limit}` 
        : `/users?page=${page}&limit=${limit}`;
      const usersData = await apiClient.get(url);
      
      // Handle paginated response format
      const users = usersData?.data || (Array.isArray(usersData) ? usersData : []);
      const meta = usersData?.meta || { total: users.length, totalPages: 1 };
      
      setUsers(Array.isArray(users) ? users : []);
      if (meta) {
        setTotal(meta.total || 0);
        setTotalPages(meta.totalPages || 1);
      }
      setError(''); // Clear any previous errors on success
    } catch (err: any) {
      console.error('Error fetching users:', err);
      
      // Handle error response
      let errorMessage = t.users.error;
      
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data;
        
        errorMessage = errorData?.message || errorData?.error || errorMessage;
        
        // Handle specific error codes
        if (status === 429) {
          // Rate limit hit - don't logout, show friendly message
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
          setError(errorMessage);
          // Retry after 2 seconds
          setTimeout(() => {
            fetchUsers();
          }, 2000);
          return;
        } else if (status === 401) {
          errorMessage = 'Unauthorized. Please login again.';
          setTimeout(() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            router.push('/login');
          }, 2000);
        } else if (status === 403) {
          errorMessage = 'You do not have permission to view users.';
        } else if (status === 404) {
          errorMessage = 'Users endpoint not found. Please check API configuration.';
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = `Error ${status}: ${errorMessage}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm(t.messages.logoutConfirm);
    if (confirmLogout) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'STUDENT',
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role,
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double-submission
    if (isSubmittingRef.current) {
      return;
    }
    
    isSubmittingRef.current = true;
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setError('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }

      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
      };

      // Only include password if it's provided (for create or update)
      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingUser) {
        // Update existing user
        await apiClient.patch(`/users/${editingUser.id}`, payload);
        setSuccess(t.users.userUpdated);
      } else {
        // Create new user
        await apiClient.post('/users', payload);
        setSuccess(t.users.userAdded);
      }

      fetchUsers();
      setTimeout(() => {
        closeModal();
        isSubmittingRef.current = false;
      }, 1500);
    } catch (err: any) {
      console.error('Submit error:', err);
      
      let errorMessage = t.users.error;
      
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data;
        
        errorMessage = errorData?.message || errorData?.error || errorMessage;
        
        if (status === 429) {
          // Rate limit hit - don't logout, show friendly message
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
          setError(errorMessage);
          isSubmittingRef.current = false;
          // Retry after 3 seconds
          setTimeout(() => {
            handleSubmit(e);
          }, 3000);
          return;
        } else if (status === 401) {
          errorMessage = 'Unauthorized. Please login again.';
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        } else if (status === 409) {
          errorMessage = errorData?.message || 'User with this email already exists.';
        } else {
          errorMessage = `Error ${status}: ${errorMessage}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      isSubmittingRef.current = false;
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm(t.users.confirmDelete)) {
      return;
    }

    try {
      await apiClient.delete(`/users/${userId}`);
      setSuccess(t.users.userDeleted);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Delete error:', err);
      
      let errorMessage = t.users.error;
      
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data;
        
        errorMessage = errorData?.message || errorData?.error || errorMessage;
        
        if (status === 429) {
          // Rate limit hit - don't logout, show friendly message
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
          setError(errorMessage);
          // Retry after 2 seconds
          setTimeout(() => {
            handleDelete(userId);
          }, 2000);
          return;
        } else if (status === 401) {
          errorMessage = 'Unauthorized. Please login again.';
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        } else if (status === 404) {
          errorMessage = 'User not found.';
        } else {
          errorMessage = `Error ${status}: ${errorMessage}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  const filteredUsers = users.filter((user) => {
    // Hide the default admin account from the user management interface
    if (user.email === 'admin') {
      return false;
    }
    
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1">
              <button
                onClick={() => router.push('/admin')}
                className="text-blue-600 hover:text-blue-800 mr-2 sm:mr-4 flex-shrink-0"
              >
                ←
              </button>
              <h1 className="text-lg sm:text-xl font-bold truncate">{t.users.title}</h1>
            </div>
            <div className="flex items-center flex-shrink-0">
              <SettingsMenu onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Success/Error Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-600">
              {success}
            </div>
          )}

          {/* Filters and Actions */}
          <div className="mb-6 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="text"
                placeholder={t.users.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md min-w-[150px]"
                aria-label="Filter by role"
              >
                <option value="">{t.users.allRoles}</option>
                <option value="STUDENT">{t.users.student}</option>
                <option value="TEACHER">{t.users.teacher}</option>
                <option value="SUPERVISOR">{t.users.supervisor}</option>
                <option value="ADMIN">{t.users.admin}</option>
              </select>
            </div>
            <Button onClick={openAddModal} className="w-full sm:w-auto">
              + {t.users.addUser}
            </Button>
          </div>

          {/* Users List - Desktop Table View */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                {t.users.loading}
              </div>
            ) : filteredUsers.length === 0 && !loading ? (
              <div className="p-8 text-center text-gray-500">
                {t.users.noUsers}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.users.firstName}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.users.lastName}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.users.username}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.users.role}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.users.actions}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.firstName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.role === 'ADMIN'
                                  ? 'bg-purple-100 text-purple-800'
                                  : user.role === 'SUPERVISOR'
                                  ? 'bg-blue-100 text-blue-800'
                                  : user.role === 'TEACHER'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {user.role === 'ADMIN' && t.users.admin}
                              {user.role === 'SUPERVISOR' && t.users.supervisor}
                              {user.role === 'TEACHER' && t.users.teacher}
                              {user.role === 'STUDENT' && t.users.student}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              {t.users.edit}
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              {t.users.delete}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {user.email}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'SUPERVISOR'
                              ? 'bg-blue-100 text-blue-800'
                              : user.role === 'TEACHER'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.role === 'ADMIN' && t.users.admin}
                          {user.role === 'SUPERVISOR' && t.users.supervisor}
                          {user.role === 'TEACHER' && t.users.teacher}
                          {user.role === 'STUDENT' && t.users.student}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => openEditModal(user)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                        >
                          {t.users.edit}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                        >
                          {t.users.delete}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {filteredUsers.length > 0 && (
                  <div className="px-4 py-4 border-t">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      total={total}
                      limit={limit}
                      onPageChange={(newPage) => {
                        setPage(newPage);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onLimitChange={(newLimit) => {
                        setLimit(newLimit);
                        setPage(1);
                      }}
                      showLimitSelector={true}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  {editingUser ? t.users.editUser : t.users.addUser}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-500"
                  aria-label="Close modal"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-600 text-sm">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
                <div>
                  <Label htmlFor="firstName">{t.users.firstName}</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder={t.users.firstNamePlaceholder}
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="lastName">{t.users.lastName}</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder={t.users.lastNamePlaceholder}
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">{t.users.username}</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder={t.users.usernamePlaceholder}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">{t.users.password}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t.users.passwordPlaceholder}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required={!editingUser}
                    minLength={6}
                  />
                  {editingUser && (
                    <p className="mt-1 text-xs text-gray-500">
                      {t.users.passwordHint}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="role">{t.users.role}</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    aria-label="Select user role"
                    required
                  >
                    <option value="STUDENT">{t.users.student}</option>
                    <option value="TEACHER">{t.users.teacher}</option>
                    <option value="SUPERVISOR">{t.users.supervisor}</option>
                  </select>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                  <Button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    {t.users.cancel}
                  </Button>
                  <Button type="submit" className="flex-1">
                    {t.users.save}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

