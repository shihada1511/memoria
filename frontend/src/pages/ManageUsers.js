import React, { useEffect, useState } from 'react';
import Table from '../components/Table';
import { getAllUsers, updateUserRole, deleteUserAccount } from '../services/userService';
import './ManageUsers.css';

const ManageUsers = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const list = await getAllUsers();
        if (!cancelled) setUsers(list);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Failed to load users.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const isSelf = (row) => row.userId === currentUser?.userId;

  const canManage = (row) => {
    if (isSelf(row)) return false;
    if (currentUser?.userRole === 'manager' && row.userRole !== 'user') return false;
    return true;
  };

  const handleRoleChange = async (row, newRole) => {
    if (newRole === row.userRole) return;
    if (!window.confirm(`Change ${row.firstName} ${row.lastName}'s role to "${newRole}"?`)) return;

    setActionError('');
    try {
      await updateUserRole(row.userId, row.firstName, row.lastName, newRole);
      setUsers((prev) => prev.map((u) => (u.userId === row.userId ? { ...u, userRole: newRole } : u)));
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Failed to update role.');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete ${row.firstName} ${row.lastName}'s account? This cannot be undone.`)) return;

    setActionError('');
    try {
      await deleteUserAccount(row.userId);
      setUsers((prev) => prev.filter((u) => u.userId !== row.userId));
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Failed to delete user.');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <span className="manage-users-name">
          {row.firstName} {row.lastName} {isSelf(row) && <span className="manage-users-you">(you)</span>}
        </span>
      ),
    },
    { key: 'username', header: 'Username' },
    { key: 'email', header: 'Email' },
    {
      key: 'userRole',
      header: 'Role',
      render: (row) => (
        canManage(row) ? (
          <select
            className="manage-users-role-select"
            value={row.userRole}
            onChange={(e) => handleRoleChange(row, e.target.value)}
          >
            <option value="user">user</option>
            <option value="manager">manager</option>
          </select>
        ) : (
          <span className={`memoria-table-badge dashboard-badge-${row.userRole === 'manager' ? 'purple' : 'blue'}`}>
            {row.userRole}
          </span>
        )
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        canManage(row) ? (
          <button
            type="button"
            className="manage-users-delete-btn"
            onClick={() => handleDelete(row)}
            title="Delete user"
          >
            🗑️ Delete
          </button>
        ) : (
          <span className="manage-users-locked" title="You don't have permission to manage this account">🔒</span>
        )
      ),
    },
  ];

  return (
    <div className="manage-users">
      <div className="manage-users-hero">
        <span className="manage-users-eyebrow">Admin</span>
        <h1>Manage Users</h1>
        <p className="manage-users-subtitle">
          {currentUser?.userRole === 'manager'
            ? 'View all accounts. As a manager, you can manage regular users only.'
            : 'View and manage every account in Memoria.'}
        </p>
      </div>

      {loading && <p className="manage-users-status">Loading users...</p>}
      {!loading && error && <p className="manage-users-status manage-users-error">{error}</p>}
      {actionError && <p className="manage-users-status manage-users-error">{actionError}</p>}

      {!loading && !error && (
        <Table columns={columns} rows={users.map((u) => ({ ...u, id: u.userId }))} emptyMessage="No users found." />
      )}
    </div>
  );
};

export default ManageUsers;
