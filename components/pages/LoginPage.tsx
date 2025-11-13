import React, { useState } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { User } from '../../types';
import { Modal, Button } from '../ui/Shared';
import { UserCircleIcon } from '../icons';

const PinInput: React.FC<{ onPinComplete: (pin: string) => void; onClose: () => void }> = ({ onPinComplete, onClose }) => {
    const [pin, setPin] = useState('');

    const handleNumberClick = (num: string) => {
        if (pin.length < 4) {
            setPin(pin + num);
        }
    };
    
    const handleBackspace = () => {
        setPin(pin.slice(0, -1));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length === 4) {
            onPinComplete(pin);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
            <div className="flex items-center gap-3 mb-6">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-10 h-12 rounded-lg border-2 ${pin.length > i ? 'bg-primary-500 border-primary-600' : 'bg-gray-200 border-gray-300'}`} />
                ))}
            </div>
            
            <div className="grid grid-cols-3 gap-3 w-64">
                {[ '1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0'].map(key => (
                    <button 
                        key={key} 
                        type="button" 
                        onClick={() => key === 'C' ? handleBackspace() : handleNumberClick(key)}
                        className="h-16 text-2xl font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400"
                    >
                        {key}
                    </button>
                ))}
                 <button 
                    type="button" 
                    onClick={handleBackspace}
                    className="h-16 text-xl font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                    ⌫
                </button>
            </div>

            <div className="flex gap-2 mt-6 w-full">
                <button type="button" onClick={onClose} className="w-full h-12 text-primary-700 bg-primary-100 hover:bg-primary-200 rounded-lg font-semibold">Annuler</button>
                <button type="submit" disabled={pin.length !== 4} className="w-full h-12 text-white bg-primary-600 hover:bg-primary-700 rounded-lg font-semibold disabled:bg-gray-400">Entrer</button>
            </div>
        </form>
    );
};

export const LoginPage: React.FC = () => {
    const { state, actions } = useAminaShop();
    const { users, isInitialized } = state;
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [error, setError] = useState('');

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
        setError('');
    };

    const handlePinSubmit = (pin: string) => {
        if (selectedUser) {
            const success = actions.login(selectedUser.id, pin);
            if (!success) {
                setError('Code PIN incorrect. Veuillez réessayer.');
                 setTimeout(() => setError(''), 3000);
            }
        }
    };
    
    if (!isInitialized) {
        return (
             <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4 text-center">
                 <div className="mb-10">
                    <h1 className="text-5xl font-serif font-black">
                        <span className="text-primary-900">CHIC </span>
                        <span className="text-primary-500 italic">&amp;</span>
                        <span className="text-primary-900"> MIX</span>
                    </h1>
                </div>
                <div className="bg-white p-8 rounded-lg shadow-md max-w-lg">
                    <h2 className="text-2xl font-bold text-gray-800">Bienvenue !</h2>
                    <p className="text-gray-600 mt-4">Votre application est prête à être configurée. Vous pouvez commencer avec une base de données vide ou charger un jeu de données de démonstration pour explorer les fonctionnalités.</p>
                    <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                        <Button size="lg" variant="primary" onClick={actions.initializeWithMockData}>
                           Initialiser avec des données de démonstration
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4">
             <div className="text-center mb-10">
                <h1 className="text-5xl font-serif font-black">
                    <span className="text-primary-900">CHIC </span>
                    <span className="text-primary-500 italic">&amp;</span>
                    <span className="text-primary-900"> MIX</span>
                </h1>
                <p className="text-xl text-gray-600 mt-2">Qui se connecte ?</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-4xl mx-auto">
                {users.map(user => (
                    <div 
                        key={user.id} 
                        onClick={() => handleUserSelect(user)} 
                        className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-md cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1"
                    >
                        <UserCircleIcon className="w-24 h-24 text-gray-400" />
                        <p className="mt-4 text-xl font-semibold text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.role}</p>
                    </div>
                ))}
            </div>
            
            {selectedUser && (
                <Modal 
                    isOpen={!!selectedUser} 
                    onClose={() => setSelectedUser(null)} 
                    title={`Bonjour, ${selectedUser.name}`}
                    contentClassName="max-w-sm"
                >
                    <p className="text-center text-gray-600 mb-4">Veuillez entrer votre code PIN à 4 chiffres.</p>
                    {error && <p className="text-center text-red-500 font-semibold mb-4 animate-pulse">{error}</p>}
                    <PinInput 
                        onPinComplete={handlePinSubmit}
                        onClose={() => setSelectedUser(null)}
                    />
                </Modal>
            )}
        </div>
    );
};