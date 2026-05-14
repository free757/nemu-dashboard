'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Settings, 
  Plus, 
  Search, 
  RefreshCw, 
  LogOut, 
  ShieldCheck, 
  Globe,
  Trash2,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [remoteConfigs, setRemoteConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    pin: '',
    username: '',
    phone_number: '',
    proxy_ip: '',
    proxy_port: '',
    proxy_user: '',
    proxy_pass: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
    if (!error) setUsers(data);
    setLoading(false);
  };

  const fetchConfigs = async () => {
    const { data, error } = await supabase.from('remote_configs').select('*');
    if (!error) setRemoteConfigs(data);
  };

  useEffect(() => {
    fetchUsers();
    fetchConfigs();
  }, []);

  const deleteUser = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      const { error } = await supabase.from('app_users').delete().eq('id', id);
      if (!error) fetchUsers();
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('app_users').insert([{
      ...formData,
      proxy_port: parseInt(formData.proxy_port)
    }]);

    if (!error) {
      setIsModalOpen(false);
      setFormData({
        pin: '', username: '', phone_number: '',
        proxy_ip: '', proxy_port: '', proxy_user: '', proxy_pass: ''
      });
      fetchUsers();
    } else {
      alert(error.message);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.pin?.includes(searchQuery)
  );

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111] border-r border-white/5 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">NEMU<span className="text-blue-500">ADMIN</span></span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Users Management</span>
          </button>
          <button 
            onClick={() => setActiveTab('config')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'config' ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Remote Config</span>
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {activeTab === 'users' ? 'Manage Users' : 'Remote Configuration'}
            </h1>
            <p className="text-gray-500">Control everything in real-time from one place.</p>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={fetchUsers}
              className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-xl hover:bg-blue-500 transition-all font-bold"
            >
              <Plus className="w-5 h-5" />
              <span>{activeTab === 'users' ? 'Add New User' : 'Add Config'}</span>
            </button>
          </div>
        </header>

        {activeTab === 'users' ? (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search users by name or PIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111] border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Users Table */}
            <div className="bg-[#111] rounded-3xl border border-white/5 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5">
                    <th className="px-6 py-5 text-gray-400 font-medium">User Profile</th>
                    <th className="px-6 py-5 text-gray-400 font-medium">PIN</th>
                    <th className="px-6 py-5 text-gray-400 font-medium">Proxy Info</th>
                    <th className="px-6 py-5 text-gray-400 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence>
                    {filteredUsers.map((user) => (
                      <motion.tr 
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="hover:bg-white/[0.02] transition-all group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg">
                              {user.username?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold">{user.username}</p>
                              <p className="text-gray-500 text-sm">{user.phone_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg font-mono text-blue-400">
                            {user.pin}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm">
                            <p className="text-gray-300 flex items-center gap-2">
                              <Globe className="w-3 h-3 text-gray-500" />
                              {user.proxy_ip}:{user.proxy_port}
                            </p>
                            <p className="text-gray-500 text-xs">Auth: {user.proxy_user}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteUser(user.id)}
                              className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {filteredUsers.length === 0 && !loading && (
                <div className="p-20 text-center text-gray-500">
                  No users found matching your search.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {remoteConfigs.map((config) => (
              <div key={config.id} className="bg-[#111] p-6 rounded-3xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600/20 text-purple-500 rounded-xl flex items-center justify-center">
                      <Settings className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold">{config.config_key}</h3>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${config.is_enabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {config.is_enabled ? 'ACTIVE' : 'DISABLED'}
                  </div>
                </div>
                <div className="bg-black/50 rounded-2xl p-4 font-mono text-sm overflow-x-auto max-h-60 overflow-y-auto">
                  <pre className="text-blue-400">{JSON.stringify(config.config_value, null, 2)}</pre>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                   <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white">Edit Configuration</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#111] rounded-[2.5rem] border border-white/10 p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-2xl font-bold mb-6">Create New User</h2>
              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 ml-1">Full Name</label>
                    <input 
                      required
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 ml-1">Login PIN</label>
                    <input 
                      required
                      value={formData.pin}
                      onChange={e => setFormData({...formData, pin: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all font-mono"
                      placeholder="4-6 digits"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 ml-1">Phone Number</label>
                    <input 
                      value={formData.phone_number}
                      onChange={e => setFormData({...formData, phone_number: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all"
                      placeholder="+20123456789"
                    />
                  </div>
                </div>

                <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 space-y-6">
                  <h3 className="text-sm font-bold text-blue-500 flex items-center gap-2 uppercase tracking-widest">
                    <Globe className="w-4 h-4" /> Proxy Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      required
                      value={formData.proxy_ip}
                      onChange={e => setFormData({...formData, proxy_ip: e.target.value})}
                      className="bg-black/20 border border-white/5 rounded-xl p-3 outline-none focus:border-blue-500 transition-all"
                      placeholder="IP Address"
                    />
                    <input 
                      required
                      type="number"
                      value={formData.proxy_port}
                      onChange={e => setFormData({...formData, proxy_port: e.target.value})}
                      className="bg-black/20 border border-white/5 rounded-xl p-3 outline-none focus:border-blue-500 transition-all"
                      placeholder="Port"
                    />
                    <input 
                      value={formData.proxy_user}
                      onChange={e => setFormData({...formData, proxy_user: e.target.value})}
                      className="bg-black/20 border border-white/5 rounded-xl p-3 outline-none focus:border-blue-500 transition-all"
                      placeholder="Proxy Username"
                    />
                    <input 
                      value={formData.proxy_pass}
                      onChange={e => setFormData({...formData, proxy_pass: e.target.value})}
                      className="bg-black/20 border border-white/5 rounded-xl p-3 outline-none focus:border-blue-500 transition-all"
                      placeholder="Proxy Password"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-white/5 rounded-2xl font-bold hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-blue-600 rounded-2xl font-bold hover:bg-blue-500 transition-all"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
