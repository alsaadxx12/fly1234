import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    ShieldCheck,
    CheckCircle2,
    Globe,
    Users,
    PieChart,
    Sparkles,
    LayoutDashboard,
    Database,
    Smartphone,
    TrendingUp,
    CreditCard,
    Headphones,
    Plus
} from 'lucide-react';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { customSettings } = useTheme();
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

    const faqs = [
        {
            q: "ما الذي يميز FLY4ALL عن غيره من أنظمة إدارة الطيران؟",
            a: "نتميز بالجمع بين قوة الأداء الرقمي وسهولة الاستخدام المطلقة. نظامنا مصمم خصيصاً ليناسب احتياجات مكاتب السفر والشركات في منطقة الشرق الأوسط، مع دعم كامل للعملتين (دولار ودينار) ومزامنة فورية."
        },
        {
            q: "هل بياناتي المالية آمنة على المنصة؟",
            a: "بكل تأكيد. نستخدم بروتوكولات تشفير متقدمة ونظام تخزين سحابي محمي من الدرجة الأولى (Tier-1)، مع نسخ احتياطي دوري لضمان عدم فقدان أي بيانات تحت أي ظرف."
        },
        {
            q: "هل يدعم النظام الصلاحيات المتعددة للموظفين؟",
            a: "نعم، يمكنك إنشاء مجموعات صلاحيات لا محدودة وتخصيص وصول كل موظف للأقسام التي يحتاجها فقط، مما يضمن رقابة كاملة على العمل."
        }
    ];

    return (
        <div className="min-h-screen bg-slate-900 font-['Tajawal'] text-white overflow-x-hidden selection:bg-blue-500/30">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-slate-900/50 backdrop-blur-lg border-b border-white/10 px-4 md:px-6 py-3 md:py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(user ? '/attendance-standalone' : '/login')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25"
                    >
                        {user ? 'لوحة التحكم' : 'دخول'}
                    </motion.button>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <img src={customSettings.logoUrl} alt="Logo" className="h-8 md:h-12 w-auto" />
                    </motion.div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-28 md:pt-40 pb-20 md:pb-32 px-4 md:px-6 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
                    <motion.div
                        drag
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        dragElastic={0.1}
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.2, 0.3, 0.2],
                            x: [0, 50, 0],
                            y: [0, 30, 0]
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-blue-500/30 rounded-full blur-[120px] pointer-events-auto cursor-grab active:cursor-grabbing"
                    />
                    <motion.div
                        drag
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        dragElastic={0.1}
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.1, 0.2, 0.1],
                            x: [0, -40, 0],
                            y: [0, -20, 0]
                        }}
                        transition={{
                            duration: 10,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-auto cursor-grab active:cursor-grabbing"
                    />
                </div>

                <div className="max-w-7xl mx-auto relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs md:text-sm font-bold mb-6 md:mb-8 shadow-inner"
                    >
                        <motion.div
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                        </motion.div>
                        <span>نظام الإدارة الأكثر تطوراً</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.2 }}
                        className="text-3xl sm:text-6xl md:text-8xl font-black mb-6 md:mb-8 leading-tight tracking-tight px-2"
                    >
                        الإبداع في <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400">
                            إدارة أعمال الطيران
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 40, damping: 20, delay: 0.4 }}
                        className="text-slate-400 text-base md:text-2xl max-w-4xl mx-auto mb-10 md:mb-16 leading-relaxed px-6"
                    >
                        اختبر القوة الحقيقية في إدارة الحجوزات، الحسابات، وفريق العمل من خلال منصة واحدة ذكية صممت لتلبي تطلعاتك وتدفع بأعمالك نحو القمة.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.6 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-6"
                    >
                        <button
                            onClick={() => navigate(user ? '/attendance-standalone' : '/login')}
                            className="group relative w-full sm:w-auto overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 md:px-12 py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-lg md:text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/40 flex items-center justify-center gap-3"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <span className="relative z-10">{user ? 'دخول للنظام' : 'ابدأ الان'}</span>
                            <ArrowRight className="w-5 h-5 md:w-6 md:h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* Dashboard Preview Section */}
            <section className="py-12 md:py-24 px-4 md:px-6 relative overflow-visible">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.div
                        whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
                        initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 60, damping: 20 }}
                        className="relative perspective-1000"
                    >
                        <div className="absolute inset-0 bg-blue-500/10 blur-[100px] -z-10" />
                        <div className="bg-white/5 border border-white/10 p-4 rounded-[40px] backdrop-blur-xl shadow-2xl">
                            <div className="bg-slate-900/80 rounded-[32px] overflow-hidden border border-white/5 shadow-inner">
                                {/* Mockup Header */}
                                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20" />
                                        <div className="w-3 h-3 rounded-full bg-amber-500/20" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/20" />
                                    </div>
                                    <div className="bg-white/5 px-4 py-1.5 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                                        <Globe className="w-3 h-3" />
                                        <span>fly4all-cms.app</span>
                                    </div>
                                    <div className="w-10" />
                                </div>
                                {/* Mockup Content */}
                                <div className="p-4 md:p-8 aspect-video flex items-center justify-center relative overflow-hidden group">
                                    <LayoutDashboard className="w-16 h-16 md:w-32 md:h-32 text-blue-500/20 group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 p-4 md:p-8 grid grid-cols-12 gap-3 md:gap-6 opacity-60">
                                        <div className="col-span-12 md:col-span-3 h-20 md:h-40 bg-white/5 rounded-2xl border border-white/10" />
                                        <div className="hidden md:block md:col-span-6 h-40 bg-gradient-to-br from-blue-500/10 to-transparent rounded-2xl border border-blue-500/20" />
                                        <div className="hidden md:block md:col-span-3 h-40 bg-white/5 rounded-2xl border border-white/10" />
                                        <div className="col-span-12 md:col-span-8 h-32 md:h-60 bg-white/5 rounded-2xl border border-white/10" />
                                        <div className="hidden md:block md:col-span-4 h-60 bg-white/5 rounded-2xl border border-white/10" />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
                                        <div className="text-center p-6 md:p-12">
                                            <h3 className="text-xl md:text-3xl font-black mb-2 md:mb-4">لوحة تحكم ذكية وشاملة</h3>
                                            <p className="text-slate-300 text-sm md:text-lg max-w-md mx-auto mb-6 md:mb-8 font-medium">
                                                صممنا واجهة مستخدم تفاعلية تمكنك من رؤية أدائك المالي وعملياتك في لقطة واحدة.
                                            </p>
                                            <button className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-4 md:px-6 py-1.5 md:py-2 rounded-lg md:rounded-xl text-sm md:text-base font-bold">
                                                استكشف النسخة التجريبية
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>


            {/* Global Capabilities */}
            <section className="py-12 md:py-24 px-4 md:px-6 relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 items-center gap-16">
                        <motion.div
                            whileInView={{ opacity: 1, x: 0 }}
                            initial={{ opacity: 0, x: 40 }}
                            viewport={{ once: true }}
                        >
                            <div className="inline-flex p-2 md:p-3 bg-blue-600/20 rounded-xl md:rounded-2xl mb-4 md:mb-6">
                                <Globe className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black mb-4 md:mb-6 leading-tight">إدارة عالمية <br /> بلمسة محلية</h2>
                            <p className="text-slate-400 text-lg mb-8 leading-relaxed font-medium">
                                نظامنا مجهز للتعامل مع تحدياتك اليومية، من تعدد العملات (دولار وعراقي) إلى إدارة الفروع المتعددة ومزامنة البيانات عبر السحاب فورياً.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    'تحديث لحظي لأسعار الصرف',
                                    'إدارة متكاملة للصناديق المالية',
                                    'دعم تقارير الفروع والأقسام',
                                    'مزامنة سحابية فائقة السرعة'
                                ].map((item, i) => (
                                    <motion.li
                                        key={i}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        initial={{ opacity: 0, x: 20 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-center gap-3 font-bold text-slate-300"
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        {item}
                                    </motion.li>
                                ))}
                            </ul>
                        </motion.div>

                        <motion.div
                            whileInView={{ opacity: 1, scale: 1 }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            viewport={{ once: true }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6"
                        >
                            {[
                                { icon: Database, label: 'أمان البيانات', val: '256-bit' },
                                { icon: TrendingUp, label: 'دقة الحسابات', val: '100%' },
                                { icon: Smartphone, label: 'تطبيق جوال', val: 'متاح' },
                                { icon: Headphones, label: 'دعم فني', val: '24/7' }
                            ].map((card, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[24px] md:rounded-[32px] hover:bg-white/10 transition-colors text-center md:text-right">
                                    <card.icon className="w-8 h-8 md:w-10 md:h-10 text-blue-500 mb-4 md:mb-6 mx-auto md:mr-0 md:ml-0" />
                                    <div className="text-xl md:text-2xl font-black mb-1">{card.val}</div>
                                    <div className="text-slate-500 font-bold text-xs md:text-sm">{card.label}</div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Large Feature Grid Section */}
            <section className="py-24 px-6 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black mb-4">أدوات ذكية لكل قسم</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto font-medium">حلول رقمية متكاملة تغطي كافة جوانب عملك بطريقة ذكية ومنظمة.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        <FeatureSlot
                            icon={Users}
                            title="إدارة الموظفين"
                            desc="سجلات كاملة، إدارة رواتب، وتقييم أداء."
                            color="from-blue-500 to-cyan-500"
                        />
                        <FeatureSlot
                            icon={CreditCard}
                            title="المدفوعات الآلية"
                            desc="ربط مع بوابات الدفع وماستركارد."
                            color="from-purple-500 to-indigo-500"
                        />
                        <FeatureSlot
                            icon={PieChart}
                            title="تحليل البيانات"
                            desc="رسوم بيانية توضح مسار شركتك."
                            color="from-amber-500 to-orange-500"
                        />
                        <FeatureSlot
                            icon={ShieldCheck}
                            title="الرقابة الإدارية"
                            desc="سجلات تتبع لكل حركة يقوم بها المستخدمون."
                            color="from-emerald-500 to-teal-500"
                        />
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-16 md:py-24 px-4 md:px-6 relative">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-black mb-4">الأسئلة الشائعة</h2>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <motion.div
                                key={i}
                                initial={false}
                                className="border border-white/10 rounded-2xl overflow-hidden bg-white/5"
                            >
                                <button
                                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                                    className="w-full p-6 text-right flex items-center justify-between gap-4 transition-colors hover:bg-white/5"
                                >
                                    <span className="font-black text-lg">{faq.q}</span>
                                    <Plus className={`w-6 h-6 text-blue-500 transition-transform duration-300 ${activeFaq === i ? 'rotate-45' : ''}`} />
                                </button>
                                <AnimatePresence>
                                    {activeFaq === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="px-6 pb-6 text-slate-400 leading-relaxed font-medium"
                                        >
                                            {faq.a}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="py-16 md:py-24 px-4 md:px-6 relative overflow-hidden">
                <div className="max-w-5xl mx-auto rounded-[32px] md:rounded-[48px] bg-gradient-to-br from-blue-600 to-indigo-700 p-8 md:p-24 text-center relative overflow-hidden shadow-2xl shadow-blue-500/20">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                    <motion.div
                        whileInView={{ opacity: 1, scale: 1 }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        viewport={{ once: true }}
                        className="relative z-10"
                    >
                        <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                            هل أنت مستعد لقيادة <br /> مستقبل الطيران؟
                        </h2>
                        <p className="text-blue-100/80 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium">
                            انضم إلى مئات الشركات التي تثق بـ FLY4ALL لإدارة عملياتها اليومية وتوسع أعمالها.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <button
                                onClick={() => navigate(user ? '/attendance-standalone' : '/login')}
                                className="w-full sm:w-auto bg-white text-blue-600 px-8 md:px-12 py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-lg md:text-xl hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-xl"
                            >
                                {user ? 'دخول للوحة التحكم' : 'سجل دخولك الآن'}
                            </button>
                            <button className="flex items-center gap-3 text-white font-bold text-lg hover:underline underline-offset-8 transition-all">
                                تحدث مع قسم المبيعات
                                <ArrowRight className="w-6 h-6" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-16 border-t border-white/10 px-6 bg-slate-900/50">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-2">
                            <div className="flex items-center gap-3 mb-6">
                                <img src={customSettings.logoUrl} alt="Logo" className="h-10 w-auto" />
                            </div>
                            <p className="text-slate-500 max-w-md font-medium leading-relaxed">
                                المنصة الرائدة في إدارة تكنولوجيا الطيران، نؤمن بقوة البيانات في تحويل الأعمال التجارية وجعلها أكثر كفاءة وربحية.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-black mb-6">روابط سريعة</h4>
                            <ul className="space-y-4 text-slate-500 font-bold text-sm">
                                <li><a href="#" className="hover:text-blue-400 transition-colors">عن المنصة</a></li>
                                <li><a href="#" className="hover:text-blue-400 transition-colors">المميزات</a></li>
                                <li><a href="#" className="hover:text-blue-400 transition-colors">قصص النجاح</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-black mb-6">الدعم والخصوصية</h4>
                            <ul className="space-y-4 text-slate-500 font-bold text-sm">
                                <li><a href="#" className="hover:text-blue-400 transition-colors">سياسة الخصوصية</a></li>
                                <li><a href="#" className="hover:text-blue-400 transition-colors">شروط الاستخدام</a></li>
                                <li><a href="#" className="hover:text-blue-400 transition-colors">اتصل بنا</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-600 font-bold text-sm">
                        <p>© 2024 FLY4ALL Technology. جميع الحقوق محفوظة.</p>
                        <div className="flex gap-6">
                            <span>تطوير بواسطة ذكاء اصطناعي فائق</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const FeatureSlot = ({ icon: Icon, title, desc, color }: any) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="p-8 rounded-[32px] bg-white/5 border border-white/10 hover:border-white/20 transition-all hover:bg-white/10"
    >
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-8 shadow-lg`}>
            <Icon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-slate-500 leading-relaxed text-sm font-medium">{desc}</p>
    </motion.div>
);

export default LandingPage;
