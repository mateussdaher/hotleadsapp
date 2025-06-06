import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail // Importado para a nova funcionalidade
} from 'firebase/auth'; 
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    collection, 
    query, 
    Timestamp
} from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList } from 'recharts';
import { LogOut, Edit2, Trash2, PlusCircle, Search, Settings, LayoutDashboard, Users, Target, DollarSign, AlertTriangle, Info, CheckCircle, XCircle, Eye, EyeOff, Save, Flame, UserCircle, Mail } from 'lucide-react';

// --- src/firebase/config.js ---
const firebaseConfig = {
    apiKey: "AIzaSyDHMAKk7UbRXJczugAzSCmvGANQ0mIZLTc",
    authDomain: "hotleadsapp.firebaseapp.com",
    projectId: "hotleadsapp",
    storageBucket: "hotleadsapp.appspot.com",
    messagingSenderId: "1081517449485",
    appId: "1:1081517449485:web:b8284b55337947fae1d044",
    measurementId: "G-K2BS45GRMF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = firebaseConfig.appId;

// Default settings lists
const DEFAULT_SETTINGS = {
    origemLead: ["Facebook Ads", "Instagram Ads", "Google Orgânico", "Indicação", "E-mail Mkt", "WhatsApp"],
    statusLead: ["Novo", "Contatado", "Qualificado", "Proposta Enviada", "Negociação", "Ganho (Vendido)", "Perdido", "Nutrição"],
    produtoInteresse: ["Produto A", "Produto B", "Produto C"],
    temperatura: ["Quente", "Morno", "Frio"],
    motivoPerda: ["Preço", "Não respondeu", "Comprou concorrente", "Sem interesse", "Precisa de mais info", "Outro"],
    responsaveis: ["Eu"] 
};

// Firestore collection paths
const getSettingsPath = (userId) => `/artifacts/${appId}/users/${userId}/hotleadsSettings/appSettings`;
const getLeadsCollectionPath = (userId) => `/artifacts/${appId}/users/${userId}/hotleads`;
const getGoalsCollectionPath = (userId) => `/artifacts/${appId}/users/${userId}/hotleadsGoals`;


// --- src/contexts/AuthContext.js ---
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const value = { user, isAuthReady };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
    return useContext(AuthContext);
};


// --- src/components/ui/... --- (Reusable UI Components)
const Modal = React.memo(({ children, onClose, title, maxWidth = "max-w-md" }) => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100]">
        <div className={`bg-slate-800 p-6 rounded-lg shadow-xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
            {title && <h2 className="text-2xl font-semibold text-orange-400 mb-6">{title}</h2>}
            {children}
        </div>
    </div>
));

const ConfirmationModal = React.memo(({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar" }) => {
    if (!isOpen) return null;
    return (
        <Modal title={title} onClose={onCancel}>
            <p className="text-slate-300 mb-6">{message}</p>
            <div className="flex justify-end space-x-3">
                <button onClick={onCancel} className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-md transition-colors">{cancelText}</button>
                <button onClick={onConfirm} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow-sm transition-colors">{confirmText}</button>
            </div>
        </Modal>
    );
});

const Toast = ({ message, type, onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-600/30 border-green-500 text-green-300' : 'bg-red-600/30 border-red-500 text-red-300';
    const Icon = type === 'success' ? CheckCircle : XCircle;

    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-5 right-5 ${bgColor} border px-4 py-3 rounded-lg shadow-lg flex items-center z-[110]`}>
            <Icon size={20} className="mr-3"/>
            <span className="text-sm">{message}</span>
            <button onClick={onClose} className="ml-4 text-xl font-bold hover:text-white opacity-70 hover:opacity-100">&times;</button>
        </div>
    );
};

const InputField = React.memo(({ label, name, type = "text", value, onChange, placeholder, children, required = false, step, min, max }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1.5">{label} {required && <span className="text-red-400">*</span>}</label>
        <div className="relative">
            {type === "select" ? (
                <select id={name} name={name} value={value || ''} onChange={onChange} className="w-full bg-slate-700 border border-slate-600 text-white p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" required={required}>
                    {children}
                </select>
            ) : type === "textarea" ? (
                 <textarea id={name} name={name} value={value} onChange={onChange} rows="3" className="w-full bg-slate-700 border border-slate-600 text-white p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" required={required}></textarea>
            ) : (
                <input 
                    type={type} 
                    id={name} 
                    name={name} 
                    value={value} 
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full bg-slate-700 border border-slate-600 text-white p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 pr-10"
                    required={required} 
                    step={step}
                    min={min}
                    max={max}
                />
            )}
            {children}
        </div>
    </div>
));

// --- src/modals/ForgotPasswordModal.js ---
const ForgotPasswordModal = React.memo(({ onClose, setToastMessage }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setToastMessage({ text: 'E-mail de recuperação enviado! Verifique a sua caixa de entrada.', type: 'success' });
            onClose();
        } catch (err) {
            console.error("Password Reset Error:", err);
            setError("Falha ao enviar o e-mail. Verifique se o endereço está correto.");
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Modal onClose={onClose} title="Recuperar Senha">
            <p className="text-slate-400 mb-6 text-sm">Insira o seu e-mail para receber um link de recuperação de senha.</p>
            {error && <p className="bg-red-600/30 border border-red-500 text-red-300 p-3 rounded-md mb-4 text-sm text-center">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                 <InputField label="E-mail" type="email" name="reset-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                 <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50">Cancelar</button>
                    <button type="submit" disabled={loading} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center disabled:opacity-50">
                        {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <><Mail size={18} className="mr-2"/>Enviar E-mail</>}
                    </button>
                </div>
            </form>
        </Modal>
    );
});


// --- src/views/AuthView.js ---
const AuthView = ({ setToastMessage }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        if (!email || !password) {
            setError("Por favor, preencha e-mail e senha.");
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                if (password.length < 6) {
                    setError("A senha deve ter pelo menos 6 caracteres.");
                    setLoading(false);
                    return;
                }
                await createUserWithEmailAndPassword(auth, email, password);
                setToastMessage({ text: 'Conta criada com sucesso! Faça o login agora.', type: 'success' });
                setIsLogin(true); 
                setEmail(''); 
                setPassword('');
            }
        } catch (err) {
            console.error("Auth error:", err);
            if (err.code === "auth/operation-not-allowed") {
                setError("Login por E-mail/Senha não habilitado no Firebase. Verifique as configurações do seu projeto.");
            } else if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
                setError("E-mail ou senha inválidos.");
            } else if (err.code === "auth/email-already-in-use") {
                setError("Este e-mail já está em uso.");
            } else if (err.code === "auth/weak-password") {
                setError("A senha é muito fraca. Use pelo menos 6 caracteres.");
            } else {
                setError("Ocorreu um erro. Tente novamente.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} setToastMessage={setToastMessage} />}
            <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
                <div className="w-full max-w-md bg-slate-800 p-8 rounded-xl shadow-2xl">
                    <div className="flex justify-center items-center mb-4">
                        <Flame size={40} className="text-orange-500 mr-2" />
                        <h1 className="text-4xl font-bold text-orange-400 text-center">HOTLEADS</h1>
                    </div>
                    <p className="text-slate-400 text-center mb-8">{isLogin ? 'Acesse sua plataforma' : 'Crie sua conta para começar'}</p>
                    
                    {error && <p className="bg-red-600/30 border border-red-500 text-red-300 p-3 rounded-md mb-6 text-sm text-center">{error}</p>}
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <InputField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                        <InputField label="Senha" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••">
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-orange-400">
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </InputField>

                        {isLogin && (
                            <div className="text-right">
                                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-orange-400 hover:text-orange-300 hover:underline">
                                    Esqueci a minha senha
                                </button>
                            </div>
                        )}
                        
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-md shadow-md transition-colors duration-150 flex items-center justify-center disabled:opacity-50"
                        >
                            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : (isLogin ? 'Entrar' : 'Criar Conta')}
                        </button>
                    </form>
                    <p className="mt-8 text-center text-sm text-slate-400">
                        {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                        <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-medium text-orange-500 hover:text-orange-400 ml-1">
                            {isLogin ? 'Crie uma aqui' : 'Faça login'}
                        </button>
                    </p>
                </div>
            </div>
        </>
    );
};

// ... Other components (AddItemModal, Sidebar, Views, etc.) remain unchanged
// The full, correct code is included below for completeness.

const AddItemModal = React.memo(({ isOpen, onClose, onSave, listNameLabel }) => {
    const [newItem, setNewItem] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newItem.trim() === '') return;
        setIsSaving(true);
        onSave(newItem.trim()); 
        setIsSaving(false);
        setNewItem(''); 
        onClose();
    };

    return (
        <Modal onClose={onClose} title={`Adicionar Item em "${listNameLabel}"`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputField label="Nome do Novo Item" type="text" name="newItemName" value={newItem} onChange={(e) => setNewItem(e.target.value)} required />
                <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50">Cancelar</button>
                    <button type="submit" disabled={isSaving || newItem.trim() === ''} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center disabled:opacity-50">
                        {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <><Save size={18} className="mr-2"/>Adicionar</>}
                    </button>
                </div>
            </form>
        </Modal>
    );
});

const Sidebar = React.memo(({ user, onSignOut, currentView, setCurrentView }) => {
    const NavItem = ({ viewName, icon: Icon, label }) => (
        <button
            onClick={() => setCurrentView(viewName)}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg w-full text-left transition-colors duration-150
                        ${currentView === viewName ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-300 hover:bg-orange-800 hover:text-white'}`}
        >
            <Icon size={20} />
            <span>{label}</span>
        </button>
    );

    return (
        <aside className="w-64 bg-slate-800 p-4 space-y-4 shadow-xl flex flex-col">
            <div className="flex items-center justify-center text-2xl font-bold text-orange-400 mb-6 pt-2">
                <Flame size={28} className="mr-2 text-orange-500"/> HOTLEADS
            </div>
            <nav className="space-y-2 flex-grow">
                <NavItem viewName="Dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavItem viewName="Leads" icon={Users} label="Leads" />
                <NavItem viewName="Settings" icon={Settings} label="Configurações" />
                <NavItem viewName="Goals" icon={Target} label="Metas" />
            </nav>
            <div className="mt-auto border-t border-slate-700 pt-4 space-y-3">
                 <div className="flex items-center px-2 py-1 bg-slate-700/50 rounded-md">
                    <UserCircle size={20} className="text-orange-400 mr-2"/>
                    <p className="text-xs text-slate-400">Utilizador: <span className="font-semibold text-orange-300 break-all">{user.email}</span></p>
                 </div>
                <button
                    onClick={onSignOut}
                    className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                >
                    <LogOut size={18} />
                    <span>Sair</span>
                </button>
            </div>
        </aside>
    );
});

const DashboardView = ({ leads, settings, goals }) => {
    const [timeRange, setTimeRange] = useState('all'); 
    const [selectedResponsible, setSelectedResponsible] = useState('all');

    const filteredLeads = useMemo(() => {
        let L = leads;
        if(selectedResponsible !== 'all' && settings.responsaveis?.includes(selectedResponsible)) { 
            L = L.filter(lead => lead.responsavel === selectedResponsible);
        }

        if (timeRange !== 'all') {
            const now = new Date();
            L = L.filter(lead => {
                if (!lead.dataEntrada || !lead.dataEntrada.toDate) return false;
                const leadDate = lead.dataEntrada.toDate();
                if (timeRange === 'month') {
                    return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
                }
                if (timeRange === 'year') {
                    return leadDate.getFullYear() === now.getFullYear();
                }
                return true;
            });
        }
        return L;
    }, [leads, timeRange, selectedResponsible, settings.responsaveis]);

    const totalLeads = filteredLeads.length;
    const activeStatuses = settings.statusLead?.filter(s => !["Ganho (Vendido)", "Perdido", "Nutrição"].includes(s)) || [];
    const activeLeads = filteredLeads.filter(lead => activeStatuses.includes(lead.statusLead)).length;
    
    const soldLeadsCount = filteredLeads.filter(lead => lead.statusLead === "Ganho (Vendido)").length;
    const relevantLeadsForConversion = filteredLeads.filter(lead => 
        ["Qualificado", "Proposta Enviada", "Negociação", "Ganho (Vendido)"].includes(lead.statusLead)
    ).length;
    const conversionRate = relevantLeadsForConversion > 0 ? (soldLeadsCount / relevantLeadsForConversion) * 100 : 0;
    
    const totalSoldValue = filteredLeads
        .filter(lead => lead.statusLead === "Ganho (Vendido)" && lead.valorVenda)
        .reduce((sum, lead) => sum + parseFloat(lead.valorVenda || 0), 0);

    const leadsByStatus = settings.statusLead?.map(status => ({
        name: status,
        value: filteredLeads.filter(lead => lead.statusLead === status).length,
    })).filter(s => s.value > 0);

    const leadsByOrigin = settings.origemLead?.map(origin => ({
        name: origin,
        value: filteredLeads.filter(lead => lead.origemLead === origin).length,
    })).filter(o => o.value > 0);

    const leadsByProduct = settings.produtoInteresse?.map(product => ({
        name: product,
        value: filteredLeads.filter(lead => lead.produtoInteresse === product).length,
    })).filter(p => p.value > 0);

    const PIE_COLORS = ['#FF8042', '#FFBB28', '#00C49F', '#0088FE', '#8884D8', '#82Ca9D', '#A4DE6C', '#D0ED57' ]; 


    const KpiCard = ({ title, value, icon: Icon, color = 'orange', unit = '', prefix = '' }) => (
        <div className={`bg-slate-800 p-6 rounded-xl shadow-lg border-l-4 border-${color}-500`}>
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400 uppercase tracking-wider">{title}</p>
                <Icon size={24} className={`text-${color}-400`} />
            </div>
            <p className="text-3xl font-bold mt-2 text-white">{prefix}{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value}{unit}</p>
        </div>
    );
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-orange-400">Dashboard</h1>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="flex-1 sm:flex-none bg-slate-700 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <option value="all">Todo Período</option>
                        <option value="month">Este Mês</option>
                        <option value="year">Este Ano</option>
                    </select>
                     <select value={selectedResponsible} onChange={e => setSelectedResponsible(e.target.value)} className="flex-1 sm:flex-none bg-slate-700 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <option value="all">Todos Responsáveis</option>
                        {settings.responsaveis?.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total de Leads" value={totalLeads} icon={Users} color="orange" />
                <KpiCard title="Leads Ativos" value={activeLeads} icon={Users} color="amber" /> 
                <KpiCard title="Taxa de Conversão" value={conversionRate} icon={Target} color="green" unit="%" />
                <KpiCard title="Total Vendido" value={totalSoldValue} icon={DollarSign} color="lime" prefix="R$" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Leads por Status">
                     {leadsByStatus && leadsByStatus.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <FunnelChart>
                                <Tooltip formatter={(value, name) => [`${value} Leads`, name]} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '0.5rem' }} itemStyle={{ color: '#e2e8f0' }}/>
                                <Funnel dataKey="value" data={leadsByStatus.sort((a,b) => b.value - a.value)} isAnimationActive>
                                    {leadsByStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                <LabelList position="right" fill="#fff" stroke="none" dataKey="name"角Radius={5} />
                                <LabelList position="center" fill="#000" stroke="none" dataKey="value" />
                                </Funnel>
                            </FunnelChart>
                        </ResponsiveContainer>
                     ) : (<NoDataMessage />)}
                </ChartCard>
                <ChartCard title="Leads por Origem">
                     {leadsByOrigin && leadsByOrigin.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={leadsByOrigin} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false}
                                 label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                    return ( (percent * 100) > 5 ? 
                                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
                                            {`${leadsByOrigin[index].name} (${(percent * 100).toFixed(0)}%)`}
                                        </text> : null
                                    );
                                }}>
                                    {leadsByOrigin.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [`${value} Leads (${(value/totalLeads*100).toFixed(1)}%)`, name]} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '0.5rem' }} itemStyle={{ color: '#e2e8f0' }}/>
                                <Legend wrapperStyle={{fontSize: "12px"}}/>
                            </PieChart>
                        </ResponsiveContainer>
                     ) : (<NoDataMessage />)}
                </ChartCard>
            </div>
             <ChartCard title="Leads por Produto de Interesse">
                 {leadsByProduct && leadsByProduct.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={leadsByProduct} margin={{ top: 5, right: 30, left: 0, bottom: 25 }}> 
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                            <XAxis dataKey="name" stroke="#94a3b8" angle={-25} textAnchor="end" height={60} interval={0} style={{fontSize: '12px'}}/>
                            <YAxis stroke="#94a3b8" style={{fontSize: '12px'}} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '0.5rem' }}
                                itemStyle={{ color: '#e2e8f0' }}
                                cursor={{ fill: 'rgba(255, 128, 66, 0.1)' }} 
                                formatter={(value) => [`${value} Leads`, "Leads"]}
                            />
                            <Legend wrapperStyle={{fontSize: "12px"}} />
                            <Bar dataKey="value" name="Leads" fill="#FF8042" radius={[4, 4, 0, 0]} /> 
                        </BarChart>
                    </ResponsiveContainer>
                 ) : (<NoDataMessage />)}
            </ChartCard>
        </div>
    );
};

const LeadsView = ({ leads, settings, addLead, updateLead, deleteLead }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ statusLead: '', origemLead: '', responsavel: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'dataEntrada', direction: 'descending' });
    const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, leadId: null, title: '', message: '' });

    const formatDateForInput = (date) => {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        try {
            return d.toISOString().split('T')[0];
        } catch (e) {
            console.warn("Could not parse date for input:", date, e);
            return '';
        }
    };

    const handleAddNewLead = () => {
        setEditingLead(null);
        setShowModal(true);
    };

    const handleEditLead = (lead) => {
        const leadWithFormattedDates = {
            ...lead,
            dataEntrada: formatDateForInput(lead.dataEntrada),
            proximoContato: formatDateForInput(lead.proximoContato),
            dataVenda: formatDateForInput(lead.dataVenda),
        };
        setEditingLead(leadWithFormattedDates);
        setShowModal(true);
    };

    const openDeleteConfirmModal = (leadId, leadName) => {
        setConfirmModalState({
            isOpen: true,
            leadId: leadId,
            title: "Confirmar Exclusão",
            message: `Tem certeza que deseja excluir o lead "${leadName || 'este lead'}"? Esta ação não pode ser desfeita.`
        });
    };

    const handleConfirmDelete = () => {
        if (confirmModalState.leadId) {
            deleteLead(confirmModalState.leadId);
        }
        setConfirmModalState({ isOpen: false, leadId: null, title: '', message: '' });
    };


    const filteredAndSortedLeads = useMemo(() => {
        let filtered = [...leads];

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(lead =>
                Object.values(lead).some(value =>
                    String(value).toLowerCase().includes(lowerSearchTerm)
                )
            );
        }

        if (filters.statusLead) {
            filtered = filtered.filter(lead => lead.statusLead === filters.statusLead);
        }
        if (filters.origemLead) {
            filtered = filtered.filter(lead => lead.origemLead === filters.origemLead);
        }
        if (filters.responsavel && settings.responsaveis?.includes(filters.responsavel)) {
            filtered = filtered.filter(lead => lead.responsavel === filters.responsavel);
        }

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                if (valA && valA.toDate) valA = valA.toDate();
                if (valB && valB.toDate) valB = valB.toDate();
                
                if (sortConfig.key === 'valorVenda') {
                    valA = parseFloat(valA || 0);
                    valB = parseFloat(valB || 0);
                }

                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                if (a.nomeCompleto && b.nomeCompleto) { // Secondary sort
                   if (a.nomeCompleto.toLowerCase() < b.nomeCompleto.toLowerCase()) return -1;
                   if (a.nomeCompleto.toLowerCase() > b.nomeCompleto.toLowerCase()) return 1;
                }
                return 0;
            });
        }
        return filtered;
    }, [leads, searchTerm, filters, sortConfig, settings.responsaveis]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'ascending' ? '▲' : '▼';
        }
        return '';
    };

     const getStatusColor = (status) => {
        switch (status) {
            case "Novo": return "bg-yellow-600/30 text-yellow-300 border-yellow-700";
            case "Contatado": return "bg-blue-600/30 text-blue-300 border-blue-700";
            case "Qualificado": return "bg-purple-600/30 text-purple-300 border-purple-700";
            case "Proposta Enviada": return "bg-indigo-600/30 text-indigo-300 border-indigo-700";
            case "Negociação": return "bg-orange-600/30 text-orange-300 border-orange-700";
            case "Ganho (Vendido)": return "bg-green-600/30 text-green-300 border-green-700";
            case "Perdido": return "bg-red-600/30 text-red-300 border-red-700";
            case "Nutrição": return "bg-gray-600/30 text-gray-300 border-gray-700";
            default: return "bg-slate-700 text-slate-300 border-slate-600";
        }
    };

    const getTemperatureVisual = (temp) => {
        switch (temp) {
            case "Quente": return <span className="text-red-400 font-semibold flex items-center"><div className="w-2 h-2 bg-red-400 rounded-full mr-1.5 animate-pulse"></div> Quente</span>;
            case "Morno": return <span className="text-orange-400 font-semibold flex items-center"><div className="w-2 h-2 bg-orange-400 rounded-full mr-1.5"></div> Morno</span>;
            case "Frio": return <span className="text-sky-400 font-semibold flex items-center"><div className="w-2 h-2 bg-sky-400 rounded-full mr-1.5"></div> Frio</span>;
            default: return temp;
        }
    };

    const columns = [
        { key: 'nomeCompleto', label: 'Nome Completo', sortable: true },
        { key: 'dataEntrada', label: 'Data Entrada', sortable: true, format: (d) => d?.toDate ? d.toDate().toLocaleDateString('pt-BR') : (d ? new Date(d+'T00:00:00').toLocaleDateString('pt-BR') : 'N/A')},
        { key: 'telefone', label: 'Telefone' },
        { key: 'email', label: 'E-mail' },
        { key: 'origemLead', label: 'Origem', sortable: true },
        { key: 'produtoInteresse', label: 'Produto', sortable: true },
        { key: 'statusLead', label: 'Status', sortable: true, cellClass: (status) => `px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(status)} text-center min-w-[100px] inline-block` },
        { key: 'temperatura', label: 'Temperatura', sortable: true, format: getTemperatureVisual },
        { key: 'proximoContato', label: 'Próx. Contato', sortable: true, format: (d) => d?.toDate ? d.toDate().toLocaleDateString('pt-BR') : (d ? new Date(d+'T00:00:00').toLocaleDateString('pt-BR') : '')},
        { key: 'responsavel', label: 'Responsável', sortable: true },
        { key: 'valorVenda', label: 'Valor Venda (R$)', sortable: true, format: (v) => v ? `${parseFloat(v).toFixed(2)}` : ''},
    ];


    return (
        <div className="space-y-6">
             <ConfirmationModal 
                isOpen={confirmModalState.isOpen}
                title={confirmModalState.title}
                message={confirmModalState.message}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmModalState({ isOpen: false, leadId: null, title: '', message: '' })}
            />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-orange-400">Gerenciamento de Leads</h1>
                <button onClick={handleAddNewLead} className="flex items-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md transition-colors whitespace-nowrap">
                    <PlusCircle size={20} className="mr-2" /> Adicionar Novo Lead
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-800 rounded-lg shadow">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar leads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 pl-10"
                    />
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                </div>
                <select value={filters.statusLead} onChange={(e) => setFilters({...filters, statusLead: e.target.value})} className="bg-slate-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">Todos Status</option>
                    {settings.statusLead?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filters.origemLead} onChange={(e) => setFilters({...filters, origemLead: e.target.value})} className="bg-slate-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">Todas Origens</option>
                    {settings.origemLead?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                 <select value={filters.responsavel} onChange={(e) => setFilters({...filters, responsavel: e.target.value})} className="bg-slate-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">Todos Responsáveis</option>
                    {settings.responsaveis?.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>

            {/* Responsive Table/Cards */}
            <div className="hidden md:block overflow-x-auto bg-slate-800 rounded-lg shadow">
                <table className="w-full whitespace-nowrap">
                    <thead className="bg-slate-700/50 text-xs uppercase text-slate-400 tracking-wider">
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} 
                                    className={`px-4 py-3 text-left ${col.sortable ? 'cursor-pointer hover:bg-slate-600' : ''}`}
                                    onClick={col.sortable ? () => requestSort(col.key) : undefined}
                                >
                                    {col.label} {getSortIndicator(col.key)}
                                </th>
                            ))}
                            <th className="px-4 py-3 text-left">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredAndSortedLeads.map(lead => (
                            <tr key={lead.id} className="hover:bg-slate-700/30 transition-colors">
                                {columns.map(col => (
                                    <td key={`${lead.id}-${col.key}`} className="px-4 py-3 text-sm text-slate-300 align-middle">
                                        {col.cellClass ? (
                                            <span className={col.cellClass(lead[col.key])}>
                                                {col.format ? col.format(lead[col.key]) : lead[col.key] || 'N/A'}
                                            </span>
                                        ) : (
                                            col.format ? col.format(lead[col.key]) : lead[col.key] || (col.key === 'valorVenda' ? '' : 'N/A')
                                        )}
                                    </td>
                                ))}
                                <td className="px-4 py-3 align-middle">
                                    <div className="flex space-x-2">
                                        <button onClick={() => handleEditLead(lead)} className="text-orange-400 hover:text-orange-300 p-1.5 rounded hover:bg-orange-700/30 transition-colors" title="Editar Lead"><Edit2 size={16}/></button>
                                        <button onClick={() => openDeleteConfirmModal(lead.id, lead.nomeCompleto)} className="text-red-500 hover:text-red-400 p-1.5 rounded hover:bg-red-700/30 transition-colors" title="Excluir Lead"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                 {filteredAndSortedLeads.map(lead => (
                    <div key={lead.id} className="bg-slate-800 rounded-lg shadow p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-orange-400 text-lg">{lead.nomeCompleto}</p>
                                <p className="text-sm text-slate-400">{lead.produtoInteresse || "Sem produto"}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleEditLead(lead)} className="text-orange-400 hover:text-orange-300 p-1.5 rounded hover:bg-orange-700/30 transition-colors" title="Editar Lead"><Edit2 size={16}/></button>
                                <button onClick={() => openDeleteConfirmModal(lead.id, lead.nomeCompleto)} className="text-red-500 hover:text-red-400 p-1.5 rounded hover:bg-red-700/30 transition-colors" title="Excluir Lead"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-700">
                             <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(lead.statusLead)} text-center min-w-[100px] inline-block`}>
                                {lead.statusLead}
                            </span>
                            {getTemperatureVisual(lead.temperatura)}
                        </div>
                    </div>
                 ))}
            </div>


            {filteredAndSortedLeads.length === 0 && (
                <div className="text-center py-10 text-slate-500 bg-slate-800 rounded-lg">
                    <Info size={30} className="mx-auto mb-2 text-orange-500" />
                    Nenhum lead encontrado.
                    {searchTerm || filters.statusLead || filters.origemLead || filters.responsavel ? ' Tente ajustar seus filtros.' : ' Adicione um novo lead para começar.'}
                </div>
            )}

            {showModal && <LeadModal lead={editingLead} settings={settings} onClose={() => setShowModal(false)} onSave={editingLead ? updateLead : addLead} />}
        </div>
    );
};

const LeadModal = ({ lead, settings, onClose, onSave }) => {
    const initialFormData = useMemo(() => (
        lead || {
            dataEntrada: new Date().toISOString().split('T')[0],
            nomeCompleto: '',
            telefone: '',
            email: '',
            cidadeUF: '',
            origemLead: settings.origemLead?.[0] || '',
            produtoInteresse: settings.produtoInteresse?.[0] || '',
            statusLead: settings.statusLead?.[0] || '',
            temperatura: settings.temperatura?.[0] || '',
            proximoContato: '',
            observacoes: '',
            responsavel: settings.responsaveis?.[0] || '', 
            valorVenda: '',
            dataVenda: '',
            motivoPerda: '',
        }
    ), [lead, settings]);
    
    const [formData, setFormData] = useState(initialFormData);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const dataToSave = { ...formData };
        if (dataToSave.valorVenda) {
            dataToSave.valorVenda = parseFloat(dataToSave.valorVenda);
        } else {
             dataToSave.valorVenda = null; 
        }
        if (!dataToSave.proximoContato) dataToSave.proximoContato = null;
        if (!dataToSave.dataVenda) dataToSave.dataVenda = null;

        if (lead && lead.id) {
            await onSave(lead.id, dataToSave);
        } else {
            await onSave(dataToSave);
        }
        setIsSaving(false);
        onClose();
    };
    
    return (
         <Modal onClose={onClose} title={lead ? 'Editar Lead' : 'Adicionar Novo Lead'} maxWidth="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <InputField label="Nome Completo" name="nomeCompleto" value={formData.nomeCompleto} onChange={handleChange} required />
                    <InputField label="Data Entrada" name="dataEntrada" type="date" value={formData.dataEntrada} onChange={handleChange} required />
                    <InputField label="Telefone (WhatsApp)" name="telefone" value={formData.telefone} onChange={handleChange} />
                    <InputField label="E-mail" name="email" type="email" value={formData.email} onChange={handleChange} />
                    <InputField label="Cidade/UF" name="cidadeUF" value={formData.cidadeUF} onChange={handleChange} />
                    
                    <InputField label="Origem Lead" name="origemLead" type="select" value={formData.origemLead} onChange={handleChange}>
                        {settings.origemLead?.map(o => <option key={o} value={o}>{o}</option>)}
                    </InputField>
                    <InputField label="Produto Interesse" name="produtoInteresse" type="select" value={formData.produtoInteresse} onChange={handleChange}>
                        {settings.produtoInteresse?.map(p => <option key={p} value={p}>{p}</option>)}
                    </InputField>
                    <InputField label="Status Lead" name="statusLead" type="select" value={formData.statusLead} onChange={handleChange} required>
                        {settings.statusLead?.map(s => <option key={s} value={s}>{s}</option>)}
                    </InputField>
                    <InputField label="Temperatura" name="temperatura" type="select" value={formData.temperatura} onChange={handleChange}>
                        {settings.temperatura?.map(t => <option key={t} value={t}>{t}</option>)}
                    </InputField>
                    <InputField label="Responsável" name="responsavel" type="select" value={formData.responsavel} onChange={handleChange} required>
                        {settings.responsaveis?.map(r => <option key={r} value={r}>{r}</option>)}
                    </InputField>
                    <InputField label="Próximo Contato" name="proximoContato" type="date" value={formData.proximoContato} onChange={handleChange} />
                </div>
                 <InputField label="Observações" name="observacoes" type="textarea" value={formData.observacoes} onChange={handleChange} />
                
                {formData.statusLead === "Ganho (Vendido)" && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 p-4 border border-green-700 bg-green-600/20 rounded-md mt-2">
                        <InputField label="Valor Venda (R$)" name="valorVenda" type="number" step="0.01" value={formData.valorVenda} onChange={handleChange} />
                        <InputField label="Data Venda" name="dataVenda" type="date" value={formData.dataVenda} onChange={handleChange} />
                    </div>
                )}
                 {formData.statusLead === "Perdido" && (
                    <div className="p-4 border border-red-700 bg-red-600/20 rounded-md mt-2">
                    <InputField label="Motivo Perda" name="motivoPerda" type="select" value={formData.motivoPerda} onChange={handleChange}>
                         <option value="">Selecione um motivo</option>
                        {settings.motivoPerda?.map(m => <option key={m} value={m}>{m}</option>)}
                    </InputField>
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center disabled:opacity-50">
                        {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <><Save size={18} className="mr-2"/> Salvar</>}
                    </button>
                </div>
            </form>
        </Modal>
    );
};


const SettingsView = ({ settings, updateSettings }) => {
    const [editableSettings, setEditableSettings] = useState(settings ? JSON.parse(JSON.stringify(settings)) : DEFAULT_SETTINGS);
    const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, listName: '', itemToRemove: '', title: '', message: '' });
    const [addItemModalState, setAddItemModalState] = useState({ isOpen: false, listName: '', listNameLabel: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setEditableSettings(JSON.parse(JSON.stringify(settings)));
        }
    }, [settings]);

    const handleOpenAddItemModal = (listName, listNameLabel) => {
        setAddItemModalState({ isOpen: true, listName, listNameLabel });
    };

    const handleSaveNewItem = (listName, newItem) => {
        setEditableSettings(prev => ({
            ...prev,
            [listName]: [...(prev[listName] || []), newItem.trim()]
        }));
    };

    const openRemoveConfirmModal = (listName, itemToRemove) => {
        const listLabel = settingCategories.find(cat => cat.key === listName)?.label || listName;
        setConfirmModalState({
            isOpen: true,
            listName,
            itemToRemove,
            title: "Confirmar Remoção",
            message: `Tem certeza que deseja remover "${itemToRemove}" de "${listLabel}"?`
        });
    };
    
    const handleConfirmRemoveItem = () => {
        const { listName, itemToRemove } = confirmModalState;
        if (listName && itemToRemove) {
            setEditableSettings(prev => ({
                ...prev,
                [listName]: (prev[listName] || []).filter(item => item !== itemToRemove)
            }));
        }
        setConfirmModalState({ isOpen: false, listName: '', itemToRemove: '', title: '', message: '' });
    };
    
    const handleSaveSettings = async () => {
        setIsSaving(true);
        await updateSettings(editableSettings);
        setIsSaving(false);
    };

    const settingCategories = [
        { key: 'origemLead', label: 'Origens de Lead' },
        { key: 'statusLead', label: 'Status de Lead' },
        { key: 'produtoInteresse', label: 'Produtos de Interesse' },
        { key: 'temperatura', label: 'Temperaturas de Lead' },
        { key: 'motivoPerda', label: 'Motivos de Perda' },
        { key: 'responsaveis', label: 'Responsáveis (Vendedores)' },
    ];

    return (
        <div className="space-y-6">
             <ConfirmationModal 
                isOpen={confirmModalState.isOpen}
                title={confirmModalState.title}
                message={confirmModalState.message}
                onConfirm={handleConfirmRemoveItem}
                onCancel={() => setConfirmModalState({ isOpen: false, listName: '', itemToRemove: '', title: '', message: '' })}
            />
            <AddItemModal 
                isOpen={addItemModalState.isOpen}
                onClose={() => setAddItemModalState({ isOpen: false, listName: '', listNameLabel: '' })}
                onSave={(newItem) => handleSaveNewItem(addItemModalState.listName, newItem)}
                listNameLabel={addItemModalState.listNameLabel}
            />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <h1 className="text-2xl sm:text-3xl font-bold text-orange-400">Configurações das Listas</h1>
                 <button onClick={handleSaveSettings}  disabled={isSaving} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md transition-colors flex items-center justify-center disabled:opacity-50">
                     {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <><Save size={18} className="mr-2"/>Salvar Alterações</>}
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {settingCategories.map(category => (
                    <div key={category.key} className="bg-slate-800 p-6 rounded-xl shadow-lg flex flex-col">
                        <h2 className="text-xl font-semibold text-orange-400 mb-4">{category.label}</h2>
                        <ul className="space-y-2 mb-4 max-h-60 overflow-y-auto flex-grow pr-2"> 
                            {(editableSettings[category.key] || []).map((item, index) => (
                                <li key={index} className="flex justify-between items-center bg-slate-700 px-3 py-2 rounded-md text-sm hover:bg-slate-600/70">
                                    <span className="truncate " title={item}>{item}</span>
                                    <button onClick={() => openRemoveConfirmModal(category.key, item)} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-700/50 transition-colors" title="Remover">
                                        <Trash2 size={16} />
                                    </button>
                                </li>
                            ))}
                             {(editableSettings[category.key] || []).length === 0 && (
                                <li className="text-slate-500 text-sm italic text-center py-2">Nenhum item.</li>
                            )}
                        </ul>
                        <button onClick={() => handleOpenAddItemModal(category.key, category.label)} className="mt-auto w-full flex items-center justify-center bg-orange-700 hover:bg-orange-600 text-white text-sm py-2.5 px-3 rounded-md transition-colors">
                            <PlusCircle size={16} className="mr-2" /> Adicionar Item
                        </button>
                    </div>
                ))}
            </div>
             <div className="mt-6 p-4 bg-slate-800 rounded-lg shadow-md border border-orange-700/50">
                <h3 className="text-lg font-semibold text-orange-400 mb-2 flex items-center"><Info size={20} className="mr-2 text-orange-500" /> Nota sobre "Responsáveis"</h3>
                <p className="text-sm text-slate-300">
                    A lista de "Responsáveis" é usada para atribuir leads. O padrão é "Eu". Você pode adicionar outros nomes para organização interna, especialmente se planeja filtrar leads por responsável no dashboard.
                </p>
            </div>
        </div>
    );
};


const GoalsView = ({ goals, leads, addGoal, updateGoal, deleteGoal }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, goalId: null, title: '', message: '' });


    const handleAddNewGoal = () => {
        setEditingGoal(null);
        setShowModal(true);
    };

    const handleEditGoal = (goal) => {
        setEditingGoal(goal);
        setShowModal(true);
    };
    
    const openDeleteConfirmModal = (goalId, goalMesAno) => {
        const formattedDate = new Date(goalMesAno + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
        setConfirmModalState({
            isOpen: true,
            goalId: goalId,
            title: "Confirmar Exclusão de Meta",
            message: `Tem certeza que deseja excluir a meta para "${formattedDate}"?`
        });
    };

    const handleConfirmDelete = () => {
        if (confirmModalState.goalId) {
            deleteGoal(confirmModalState.goalId);
        }
        setConfirmModalState({ isOpen: false, goalId: null, title: '', message: '' });
    };


    const goalsWithProgress = goals.map(goal => {
        const [year, month] = goal.mesAno.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

        const relevantLeads = leads.filter(lead => {
            if (!lead.dataEntrada || !lead.dataEntrada.toDate) return false;
            const leadDate = lead.dataEntrada.toDate();
            return leadDate >= startDate && leadDate <= endDate;
        });
        
        const leadsGerados = relevantLeads.length;
        
        const vendasRealizadas = relevantLeads
            .filter(lead => lead.statusLead === "Ganho (Vendido)" && lead.valorVenda && lead.dataVenda?.toDate() >= startDate && lead.dataVenda?.toDate() <= endDate)
            .reduce((sum, lead) => sum + parseFloat(lead.valorVenda || 0), 0);

        const soldInPeriod = relevantLeads.filter(l => l.statusLead === "Ganho (Vendido)" && l.dataVenda?.toDate() >= startDate && l.dataVenda?.toDate() <= endDate).length;

        const leadsConsideredForConversion = relevantLeads.filter(lead => 
            ["Qualificado", "Proposta Enviada", "Negociação", "Ganho (Vendido)"].includes(lead.statusLead)
        ).length;
        const taxaConversaoReal = leadsConsideredForConversion > 0 ? (soldInPeriod / leadsConsideredForConversion) * 100 : 0;


        return {
            ...goal,
            leadsGerados,
            vendasRealizadas,
            taxaConversaoReal,
            progressoLeads: goal.metaLeads > 0 ? (leadsGerados / goal.metaLeads) * 100 : 0,
            progressoVendas: goal.metaVendas > 0 ? (vendasRealizadas / goal.metaVendas) * 100 : 0,
            progressoConversao: goal.taxaConversaoMeta > 0 ? (taxaConversaoReal / parseFloat(goal.taxaConversaoMeta)) * 100 : 0,
        };
    }).sort((a, b) => new Date(b.mesAno) - new Date(a.mesAno));

    const ProgressBar = ({ value, color = "orange" }) => { 
        const clampedValue = Math.max(0, Math.min(value, 100));
        return (
            <div className="w-full bg-slate-700 rounded-full h-3 my-0.5"> 
                <div
                    className={`bg-${color}-500 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end`}
                    style={{ width: `${clampedValue}%` }}
                >
                   {clampedValue > 10 && <span className="text-xs text-white pr-1.5 font-medium">{clampedValue.toFixed(0)}%</span>}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
             <ConfirmationModal 
                isOpen={confirmModalState.isOpen}
                title={confirmModalState.title}
                message={confirmModalState.message}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmModalState({ isOpen: false, goalId: null, title: '', message: '' })}
            />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-orange-400">Metas e Resultados</h1>
                <button onClick={handleAddNewGoal} className="flex items-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md transition-colors whitespace-nowrap">
                    <PlusCircle size={20} className="mr-2" /> Definir Nova Meta
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goalsWithProgress.map(goal => (
                    <div key={goal.id} className="bg-slate-800 p-6 rounded-xl shadow-lg space-y-3">
                        <div className="flex justify-between items-start">
                            <h2 className="text-xl font-semibold text-orange-300"> 
                                Meta: {new Date(goal.mesAno + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                            </h2>
                            <div className="flex space-x-1.5">
                                <button onClick={() => handleEditGoal(goal)} className="text-orange-400 hover:text-orange-300 p-1.5 rounded hover:bg-orange-700/30" title="Editar Meta"><Edit2 size={16}/></button>
                                <button onClick={() => openDeleteConfirmModal(goal.id, goal.mesAno)} className="text-red-500 hover:text-red-400 p-1.5 rounded hover:bg-red-700/30" title="Excluir Meta"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        
                        <div>
                            <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                                <span>Leads Gerados</span>
                                <span>{goal.leadsGerados} / <span className="font-semibold text-slate-300">{goal.metaLeads}</span></span>
                            </div>
                            <ProgressBar value={goal.progressoLeads} color="orange" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                                <span>Vendas (R$)</span>
                                <span>{goal.vendasRealizadas.toFixed(2)} / <span className="font-semibold text-slate-300">{parseFloat(goal.metaVendas).toFixed(2)}</span></span>
                            </div>
                            <ProgressBar value={goal.progressoVendas} color="green" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                                <span>Taxa de Conversão</span>
                                <span>{goal.taxaConversaoReal.toFixed(1)}% / <span className="font-semibold text-slate-300">{parseFloat(goal.taxaConversaoMeta).toFixed(1)}%</span></span>
                            </div>
                            <ProgressBar value={goal.progressoConversao} color="amber" />
                        </div>
                    </div>
                ))}
                {goalsWithProgress.length === 0 && (
                     <div className="md:col-span-2 lg:col-span-3 text-center py-12 text-slate-500 bg-slate-800 rounded-xl shadow-lg">
                        <Target size={40} className="mx-auto mb-3 text-orange-500" />
                        <p className="text-lg">Nenhuma meta definida ainda.</p>
                        <p className="text-sm">Clique em "Definir Nova Meta" para começar a acompanhar seus objetivos.</p>
                    </div>
                )}
            </div>
            {showModal && <GoalModal goal={editingGoal} onClose={() => setShowModal(false)} onSave={editingGoal ? updateGoal : addGoal} />}
        </div>
    );
};

const GoalModal = ({ goal, onClose, onSave }) => {
    const [formData, setFormData] = useState(
        goal || {
            mesAno: new Date().toISOString().slice(0, 7), 
            metaLeads: '',
            metaVendas: '',
            taxaConversaoMeta: '',
        }
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const dataToSave = {
            ...formData,
            metaLeads: parseInt(formData.metaLeads) || 0,
            metaVendas: parseFloat(formData.metaVendas) || 0,
            taxaConversaoMeta: parseFloat(formData.taxaConversaoMeta) || 0,
        };
        if (goal && goal.id) {
            await onSave(goal.id, dataToSave);
        } else {
            await onSave(dataToSave);
        }
        setIsSaving(false);
        onClose();
    };
    
    return (
        <Modal onClose={onClose} title={goal ? 'Editar Meta' : 'Definir Nova Meta'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputField label="Mês/Ano da Meta" name="mesAno" type="month" value={formData.mesAno} onChange={handleChange} required />
                <InputField label="Meta de Leads (Quantidade)" name="metaLeads" type="number" min="0" value={formData.metaLeads} onChange={handleChange} required />
                <InputField label="Meta de Vendas (R$)" name="metaVendas" type="number" step="0.01" min="0" value={formData.metaVendas} onChange={handleChange} required />
                <InputField label="Taxa de Conversão Meta (%)" name="taxaConversaoMeta" type="number" step="0.1" min="0" max="100" value={formData.taxaConversaoMeta} onChange={handleChange} required />
                
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center disabled:opacity-50">
                         {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <><Save size={18} className="mr-2"/>Salvar Meta</>}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// Main App Controller
function App() {
    const { user, isAuthReady } = useAuth();
    const [toastMessage, setToastMessage] = useState(null);
    const [currentView, setCurrentView] = useState('Dashboard');
    const [leads, setLeads] = useState([]);
    const [settings, setSettings] = useState(null); 
    const [goals, setGoals] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoadingData(false);
            return;
        };

        setLoadingData(true);
        let unsubSettings, unsubLeads, unsubGoals;

        const settingsDocRef = doc(db, getSettingsPath(user.uid));
        unsubSettings = onSnapshot(settingsDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                setSettings(docSnap.data());
            } else {
                try {
                    await setDoc(settingsDocRef, DEFAULT_SETTINGS);
                    setSettings(DEFAULT_SETTINGS);
                } catch(e) { console.error("Failed to init settings", e) }
            }
        });

        const leadsCollectionRef = collection(db, getLeadsCollectionPath(user.uid));
        unsubLeads = onSnapshot(query(leadsCollectionRef), (snapshot) => {
            setLeads(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const goalsCollectionRef = collection(db, getGoalsCollectionPath(user.uid));
        unsubGoals = onSnapshot(query(goalsCollectionRef), (snapshot) => {
            setGoals(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoadingData(false); 
        });

        return () => {
            unsubSettings && unsubSettings();
            unsubLeads && unsubLeads();
            unsubGoals && unsubGoals();
        };
    }, [user]);

    const handleSignOut = async () => {
        try {
            await signOut(auth); 
            setToastMessage({text: "Logout realizado com sucesso!", type: "success"});
        } catch (error) {
            console.error("Error signing out:", error);
            setToastMessage({text: "Erro ao fazer logout.", type: "error"});
        }
    };
    
    const addLead = async (leadData) => {
        if (!user || !user.uid) return;
        try {
            await addDoc(collection(db, getLeadsCollectionPath(user.uid)), {
                ...leadData,
                dataEntrada: leadData.dataEntrada ? Timestamp.fromDate(new Date(leadData.dataEntrada + 'T00:00:00')) : null, 
                proximoContato: leadData.proximoContato ? Timestamp.fromDate(new Date(leadData.proximoContato + 'T00:00:00')) : null,
                dataVenda: leadData.dataVenda ? Timestamp.fromDate(new Date(leadData.dataVenda + 'T00:00:00')) : null,
                createdAt: Timestamp.now()
            });
            setToastMessage({text: "Lead adicionado com sucesso!", type: "success"});
        } catch (error) {
            console.error("Error adding lead:", error);
            setToastMessage({text: "Erro ao adicionar lead.", type: "error"});
        }
    };

    const updateLead = async (id, updatedData) => {
        if (!user || !user.uid) return;
        try {
            await updateDoc(doc(db, getLeadsCollectionPath(user.uid), id), {
                ...updatedData,
                dataEntrada: updatedData.dataEntrada ? Timestamp.fromDate(new Date(updatedData.dataEntrada + 'T00:00:00')) : null,
                proximoContato: updatedData.proximoContato ? Timestamp.fromDate(new Date(updatedData.proximoContato + 'T00:00:00')) : null,
                dataVenda: updatedData.dataVenda ? Timestamp.fromDate(new Date(updatedData.dataVenda + 'T00:00:00')) : null,
            });
            setToastMessage({text: "Lead atualizado com sucesso!", type: "success"});
        } catch (error) {
            console.error("Error updating lead:", error);
            setToastMessage({text: "Erro ao atualizar lead.", type: "error"});
        }
    };

    const deleteLead = async (id) => {
        if (!user || !user.uid) return;
        try {
            await deleteDoc(doc(db, getLeadsCollectionPath(user.uid), id));
            setToastMessage({text: "Lead excluído com sucesso!", type: "success"});
        } catch (error) {
            console.error("Error deleting lead:", error);
            setToastMessage({text: "Erro ao excluir lead.", type: "error"});
        }
    };
    
    const updateSettings = async (newSettings) => {
        if (!user || !user.uid) return;
        try {
            await setDoc(doc(db, getSettingsPath(user.uid)), newSettings, { merge: true }); 
            setToastMessage({text: "Configurações salvas!", type: "success"});
        } catch (error) {
            console.error("Error updating settings:", error);
            setToastMessage({text: "Erro ao salvar configurações.", type: "error"});
        }
    };

    const addGoal = async (goalData) => {
        if (!user || !user.uid) return;
        try {
            await addDoc(collection(db, getGoalsCollectionPath(user.uid)), goalData);
            setToastMessage({text: "Meta adicionada!", type: "success"});
        } catch (error) {
            console.error("Error adding goal:", error);
            setToastMessage({text: "Erro ao adicionar meta.", type: "error"});
        }
    };

    const updateGoal = async (id, updatedData) => {
        if (!user || !user.uid) return;
        try {
            await updateDoc(doc(db, getGoalsCollectionPath(user.uid), id), updatedData);
            setToastMessage({text: "Meta atualizada!", type: "success"});
        } catch (error) {
            console.error("Error updating goal:", error);
            setToastMessage({text: "Erro ao atualizar meta.", type: "error"});
        }
    };

    const deleteGoal = async (id) => {
        if (!user || !user.uid) return;
        try {
            await deleteDoc(doc(db, getGoalsCollectionPath(user.uid), id));
            setToastMessage({text: "Meta excluída!", type: "success"});
        } catch (error) {
            console.error("Error deleting goal:", error);
            setToastMessage({text: "Erro ao excluir meta.", type: "error"});
        }
    };
    
    if (!isAuthReady) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
                <p className="ml-3 text-lg">A iniciar...</p>
            </div>
        );
    }

    const renderView = () => {
        switch (currentView) {
            case 'Dashboard':
                return <DashboardView leads={leads} settings={settings} goals={goals} />;
            case 'Leads':
                return <LeadsView leads={leads} settings={settings} addLead={addLead} updateLead={updateLead} deleteLead={deleteLead} />;
            case 'Settings':
                return <SettingsView settings={settings} updateSettings={updateSettings} />;
            case 'Goals':
                return <GoalsView goals={goals} leads={leads} addGoal={addGoal} updateGoal={updateGoal} deleteGoal={deleteGoal} />;
            default:
                return <DashboardView leads={leads} settings={settings} goals={goals} />;
        }
    };
    
    if (!user) {
        return (
            <>
                <AuthView setToastMessage={setToastMessage} />
                {toastMessage && <Toast message={toastMessage.text} type={toastMessage.type} onClose={() => setToastMessage(null)} />}
            </>
        )
    }

    if (loadingData || !settings) {
        return ( 
            <div className="flex justify-center items-center h-screen bg-slate-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
                <p className="ml-3 text-lg">A carregar dados...</p>
            </div>
        );
    }
    
    return (
        <div className="flex h-screen bg-slate-900 text-slate-100 font-sans">
            <div className="md:hidden fixed top-4 left-4 z-50">
                 <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-700/80 rounded-md backdrop-blur-sm">
                    <Menu size={24} />
                 </button>
            </div>

            {isSidebarOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setIsSidebarOpen(false)}></div>}

            <div className={`fixed top-0 left-0 h-full z-40 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                 <Sidebar user={user} onSignOut={handleSignOut} currentView={currentView} setCurrentView={(view) => { setCurrentView(view); setIsSidebarOpen(false); }} />
            </div>

            <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-850">
                {renderView()}
            </main>
            {toastMessage && <Toast message={toastMessage.text} type={toastMessage.type} onClose={() => setToastMessage(null)} />}
        </div>
    );
}

// --- Final export that wraps everything ---
export default function FinalAppWrapper() {
    return (
        <AuthProvider>
            <App />
        </AuthProvider>
    );
}
