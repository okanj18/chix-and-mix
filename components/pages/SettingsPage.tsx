import React, { useState } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { User, UserRole, BackupSettings } from '../../types';
import { Card, Button, Input, Modal, Select } from '../ui/Shared';
import { PlusIcon, PencilIcon, TrashIcon, AlertIcon, DocumentArrowDownIcon, DocumentArrowUpIcon, ClockIcon } from '../icons';

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

const BackupSettingsCard: React.FC = () => {
    const { state, actions } = useAminaShop();
    const [settings, setSettings] = useState<BackupSettings>(state.backupSettings);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleChange = (field: keyof BackupSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        actions.updateBackupSettings(settings);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };
    
    return (
        <Card>
            <h2 className="text-2xl font-serif font-black text-gray-800 mb-4">Sauvegardes Automatiques</h2>
            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <label htmlFor="enable-backup" className="font-medium text-gray-800">Activer les sauvegardes automatiques</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            id="enable-backup"
                            checked={settings.enabled}
                            onChange={(e) => handleChange('enabled', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-primary-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                </div>

                {settings.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
                        <Select label="Fréquence" value={settings.frequency} onChange={(e) => handleChange('frequency', e.target.value)}>
                            <option value="daily">Tous les jours</option>
                            <option value="weekly">Toutes les semaines</option>
                        </Select>
                        <Input label="Heure de la sauvegarde" type="time" value={settings.time} onChange={(e) => handleChange('time', e.target.value)} />
                    </div>
                )}
                 {settings.enabled && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex items-center gap-3">
                       <ClockIcon className="w-6 h-6 flex-shrink-0"/>
                       <div>
                            <p>
                                La sauvegarde se déclenchera automatiquement à l'heure prévue si l'application est ouverte.
                                Sinon, elle s'effectuera à la prochaine ouverture après l'heure passée.
                            </p>
                           {state.backupSettings.lastBackupTimestamp && <p className="text-xs mt-1">Dernière sauvegarde: {new Date(state.backupSettings.lastBackupTimestamp).toLocaleString()}</p>}
                       </div>
                    </div>
                )}
                <div className="flex justify-end items-center gap-4">
                     {showSuccess && <p className="text-sm text-green-600 font-semibold">Paramètres enregistrés !</p>}
                    <Button onClick={handleSave} disabled={!settings.enabled}>Enregistrer les paramètres</Button>
                </div>
            </div>
        </Card>
    );
};


export const SettingsPage: React.FC = () => {
    const { state, actions } = useAminaShop();
    const { users, currentUser } = state;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
    const [dataToRestore, setDataToRestore] = useState<any | null>(null);


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
    
    const handleResetData = () => {
        actions.resetAllData();
        setIsResetConfirmOpen(false);
    };

    const handleBackupData = () => {
        try {
            const { currentUser, ...stateToSave } = state;
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(stateToSave, null, 2)
            )}`;
            const link = document.createElement("a");
            link.href = jsonString;
            const date = new Date().toISOString().slice(0, 10);
            link.download = `chicandmix_backup_${date}.json`;
            link.click();
        } catch (error) {
            console.error("Failed to create backup:", error);
            alert("La sauvegarde a échoué. Veuillez vérifier la console pour plus de détails.");
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text === 'string') {
                        const parsedData = JSON.parse(text);
                        setDataToRestore(parsedData);
                        setIsRestoreConfirmOpen(true);
                    }
                } catch (error) {
                    alert("Erreur: Le fichier de sauvegarde est invalide ou corrompu.");
                    console.error("Failed to parse restore file:", error);
                }
            };
            reader.readAsText(file);
        }
        // Reset file input to allow re-selection of the same file
        event.target.value = '';
    };

    const confirmRestoreData = () => {
        if (dataToRestore) {
            actions.restoreData(dataToRestore);
            setDataToRestore(null);
            setIsRestoreConfirmOpen(false);
            // The app will effectively restart due to the context update logging the user out.
        }
    };

    return (
        <div className="space-y-6">
            <BackupSettingsCard />

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
            </Card>

            <div className="p-6 border-2 border-red-300 rounded-lg bg-red-50">
                <h3 className="text-xl font-semibold text-red-800 flex items-center">
                    <AlertIcon className="w-6 h-6 mr-3 text-red-600" />
                    Zone de Danger
                </h3>
                <p className="mt-2 text-red-700">
                    Les actions dans cette zone sont critiques et peuvent être irréversibles. Soyez absolument certain avant de continuer.
                </p>
                <div className="mt-6 flex flex-wrap gap-4 items-center">
                    <Button variant="secondary" onClick={handleBackupData} className="!border-gray-400 !text-gray-800 hover:!bg-gray-200">
                        <DocumentArrowDownIcon className="w-5 h-5 mr-2" /> Sauvegarder les Données
                    </Button>
                     <div>
                        <input
                            type="file"
                            id="restore-file-input"
                            className="hidden"
                            accept=".json"
                            onChange={handleFileChange}
                        />
                        <label htmlFor="restore-file-input" className="inline-flex items-center justify-center border border-transparent font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm text-primary-700 bg-primary-100 hover:bg-primary-200 focus:ring-primary-500 cursor-pointer">
                            <DocumentArrowUpIcon className="w-5 h-5 mr-2" /> Restaurer les Données
                        </label>
                    </div>
                     <Button variant="danger" onClick={() => setIsResetConfirmOpen(true)}>
                        Réinitialiser l'Application
                    </Button>
                </div>
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

            <Modal isOpen={isResetConfirmOpen} onClose={() => setIsResetConfirmOpen(false)} title="Confirmer la Réinitialisation Totale">
                <div>
                    <p className="text-gray-700 mb-4">
                        <strong>Attention !</strong> Vous êtes sur le point de supprimer DÉFINITIVEMENT toutes les données de l'application :
                        <ul className="list-disc list-inside my-2 pl-4 text-red-900 bg-red-100 p-3 rounded-md">
                            <li>Tous les Produits</li>
                            <li>Toutes les Ventes et Commandes</li>
                            <li>Tous les Clients et Fournisseurs</li>
                            <li>Tous les Paiements et Approvisionnements</li>
                        </ul>
                        Seuls les comptes utilisateurs seront conservés. Cette action est <strong>irréversible</strong> et est destinée à préparer l'application pour son déploiement final.
                    </p>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="secondary" onClick={() => setIsResetConfirmOpen(false)}>Annuler</Button>
                        <Button variant="danger" onClick={handleResetData}>Je comprends, tout réinitialiser</Button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isRestoreConfirmOpen} onClose={() => setIsRestoreConfirmOpen(false)} title="Confirmer la Restauration">
                <div>
                    <p className="text-gray-700 mb-4">
                        <strong>Attention !</strong> Vous êtes sur le point de remplacer <strong>TOUTES</strong> les données actuelles de l'application par le contenu du fichier de sauvegarde.
                        <br/><br/>
                        Cette action est <strong>irréversible</strong>. Êtes-vous sûr de vouloir continuer ?
                    </p>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="secondary" onClick={() => { setIsRestoreConfirmOpen(false); setDataToRestore(null); }}>Annuler</Button>
                        <Button variant="danger" onClick={confirmRestoreData}>Oui, tout restaurer</Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};