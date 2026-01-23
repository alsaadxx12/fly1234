import { useState } from 'react';
import { X, Search, User, Check, Trash2, Phone } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

interface WhatsAppContact {
    id: string;
    name: string;
    number: string;
}

interface ContactsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    contacts: WhatsAppContact[];
    selectedContactId: string;
    onSelectContact: (contact: WhatsAppContact) => void;
    title: string;
    color: 'green' | 'blue' | 'yellow' | 'purple';
}

const ContactsSidebar: React.FC<ContactsSidebarProps> = ({
    isOpen,
    onClose,
    contacts,
    selectedContactId,
    onSelectContact,
    title,
    color
}) => {
    const { theme } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.number.includes(searchQuery)
    );

    const colorClasses = {
        green: 'from-green-500 to-emerald-500 bg-green-500',
        blue: 'from-blue-500 to-cyan-500 bg-blue-500',
        yellow: 'from-yellow-500 to-orange-500 bg-yellow-500',
        purple: 'from-purple-500 to-indigo-500 bg-purple-500'
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={`fixed top-0 right-0 h-full w-full max-w-sm z-[101] shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'
                            }`}
                    >
                        {/* Header */}
                        <div className={`p-6 bg-gradient-to-r ${colorClasses[color]} text-white`}>
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-lg">{title}</span>
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <User className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60" />
                                <input
                                    type="text"
                                    placeholder="بحث عن جهة اتصال..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm placeholder:text-white/60 focus:outline-none focus:bg-white/20 transition-all text-right"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredContacts.length > 0 ? (
                                filteredContacts.map((contact) => (
                                    <button
                                        key={contact.id}
                                        onClick={() => {
                                            onSelectContact(contact);
                                            onClose();
                                        }}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.02] ${selectedContactId === contact.id
                                            ? theme === 'dark'
                                                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                                : 'bg-blue-50 border-blue-200 text-blue-600'
                                            : theme === 'dark'
                                                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {selectedContactId === contact.id ? (
                                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            ) : (
                                                <div className={`w-5 h-5 rounded-full border-2 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                                                    }`} />
                                            )}
                                        </div>
                                        <div className="flex-1 text-right">
                                            <p className="font-bold">{contact.name}</p>
                                            <p className="text-[10px] opacity-70 flex items-center justify-end gap-1">
                                                {contact.number}
                                                <Phone className="w-2.5 h-2.5" />
                                            </p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="py-12 text-center opacity-50">
                                    <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="font-bold">لا توجد جهة اتصال مطابقة</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ContactsSidebar;
