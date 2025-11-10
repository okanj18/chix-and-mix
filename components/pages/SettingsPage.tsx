import React, { useState } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { User, UserRole } from '../../types';
import { Card, Button, Input, Modal, Select } from '../ui/Shared';
import { PlusIcon, PencilIcon, TrashIcon } from '../icons';

const UserForm: React.FC<{ user?: User; onClose: () => void; currentUserRole: UserRole }> = ({ user, onClose, currentUserRole }) => {
    const { actions } = useAminaShop();
    const [name, setName] = useState(user?.name || '');
    const [pin, setPin] = useState('');
    const [role, setRole] = useState<UserRole>(user?.role || 'Vendeur');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (user) { // Edit mode
            if (!name) return alert("Le nom est requis.");
            actions.updateUser({ ...user, name, role, pin: pin || user.pin });
        } else { // Add mode
            if (!name || !pin) return alert("Le nom et le code PIN sont requis.");
            if (pin.length !== 4) return alert("Le code PIN doit comporter exactement 4 chiffres.");
            actions.addUser({ name, pin, role });
        }
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nom de l'utilisateur" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label={`Code PIN ${user ? '(laisser vide pour ne pas changer)' : ''}`} type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="4 chiffres" pattern="\d{4}" maxLength={4} required={!user} />
            <Select label="Rôle" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                <option value="Vendeur">Vendeur</option>
                <option value="Manager">Manager</option>
                {currentUserRole === 'Admin' && <option value="Admin">Admin</option>}
            </Select>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                <Button type="submit">{user ? "Mettre à jour" : "Ajouter l'utilisateur"}</Button>
            </div>
        </form>
    );
};


export const SettingsPage: React.FC = () => {
    const { state, actions } = useAminaShop();
    const { users, currentUser } = state;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const handleAddUser = () => {
        setSelectedUser(undefined);
        setIsModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };
    
    const handleDeleteUser = (user: User) => {
        setUserToDelete(user);
    };

    const confirmDelete = () => {
        if(userToDelete) {
            actions.deleteUser(userToDelete.id);
            setUserToDelete(null);
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif font-black text-gray-800">Gestion des Utilisateurs</h2>
                <Button onClick={handleAddUser}><PlusIcon/> Ajouter un utilisateur</Button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => {
                            const canModify = currentUser?.role === 'Admin' || (currentUser?.role === 'Manager' && user.role !== 'Admin');
                            return (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                        <button onClick={() => handleEditUser(user)} className="text-primary-600 hover:text-primary-900 disabled:text-gray-400 disabled:cursor-not-allowed" disabled={!canModify}>
                                            <PencilIcon className="inline w-4 h-4 mr-1"/> Éditer
                                        </button>
                                        <button onClick={() => handleDeleteUser(user)} className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed" disabled={currentUser?.id === user.id || !canModify}>
                                           <TrashIcon className="inline w-4 h-4 mr-1"/> Supprimer
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}>
                <UserForm user={selectedUser} currentUserRole={currentUser!.role} onClose={() => setIsModalOpen(false)} />
            </Modal>

            <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} title="Confirmer la suppression">
                {userToDelete && (
                    <div>
                        <p className="mb-4">Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{userToDelete.name}</strong> ? Cette action est irréversible.</p>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setUserToDelete(null)}>Annuler</Button>
                            <Button variant="danger" onClick={confirmDelete}>Supprimer</Button>
                        </div>
                    </div>
                )}
            </Modal>

        </Card>
    );
};