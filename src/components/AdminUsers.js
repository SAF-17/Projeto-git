import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newRole, setNewRole] = useState('user');
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const usersRef = collection(db, 'Utilizadores');
    const snapshot = await getDocs(usersRef);
    setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user) => {
    setEditingUserId(user.id);
    setNewRole(user.role || 'user');
  };

  const handleSave = async (userId) => {
    await updateDoc(doc(db, 'Utilizadores', userId), { role: newRole });
    setEditingUserId(null);
    fetchUsers();
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Tem a certeza que deseja apagar este utilizador? Esta ação não pode ser desfeita.')) {
      await deleteDoc(doc(db, 'Utilizadores', userId));
      fetchUsers();
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h2 style={{ marginBottom: 24, color: 'var(--primary)', fontWeight: 800 }}>Gestão de Utilizadores</h2>
      {loading ? <div>A carregar utilizadores...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Nome</th>
              <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Email</th>
              <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Role</th>
              <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: 10 }}>{user.nome || 'Sem nome'}</td>
                <td style={{ padding: 10 }}>{user.email}</td>
                <td style={{ padding: 10 }}>
                  {editingUserId === user.id ? (
                    <select value={newRole} onChange={e => setNewRole(e.target.value)}>
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  ) : (
                    user.role || 'user'
                  )}
                </td>
                <td style={{ padding: 10 }}>
                  {editingUserId === user.id ? (
                    <>
                      <button onClick={() => handleSave(user.id)} style={{ marginRight: 8, background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>Guardar</button>
                      <button onClick={() => setEditingUserId(null)} style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(user)} style={{ marginRight: 8, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => handleDelete(user.id)} style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>Apagar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminUsers; 