import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle, CheckCircle2, AlertCircle, Building2, User, ArrowRight, Smartphone, ExternalLink, Globe } from 'lucide-react';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    subject: '',
    company: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      setSubmitMessage('تم إرسال رسالتك بنجاح. سيقوم فريقنا بالتواصل معك في أقرب وقت ممكن.');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
        subject: '',
        company: ''
      });
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSubmitStatus(null);
        setSubmitMessage('');
      }, 5000);
    }, 1500);
  };

  const contactInfo = [
    {
      icon: Phone,
      title: 'رقم الهاتف',
      details: ['+9647714289278'],
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: Mail,
      title: 'البريد الإلكتروني',
      details: ['info@codescope.dev'],
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: MapPin,
      title: 'العنوان',
      details: ['شارع الاسكان، كربلاء', 'العراق، كربلاء، 56001'],
      color: 'bg-red-100 text-red-600'
    },
    {
      icon: MessageCircle,
      title: 'واتساب للتواصل',
      details: ['+9647714289278'],
      color: 'bg-green-100 text-green-600'
    }
  ];

  return (
    <section 
      id="contact"
      className="py-24 bg-gray-50 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2080')] opacity-5 mix-blend-overlay"></div>
      
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full -mt-48 -mr-48 blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full -mb-48 -ml-48 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-50 via-emerald-50 to-blue-50 rounded-full text-blue-700 mb-8 mx-auto shadow-xl border-2 border-blue-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <MessageCircle className="w-5 h-5 animate-pulse" />
            <span className="font-black text-lg">تواصل معنا للحصول على نظام إدارة إعلانات الواتساب</span>
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse ml-1"></div>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-emerald-600 to-blue-600 mb-8 leading-tight">تواصل معنا</h2>
          <p className="text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed px-4 mt-6 font-medium">
            نحن هنا للإجابة على استفساراتك ومساعدتك في الحصول على نظام إدارة إعلانات الواتساب
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl shadow-inner">
                <Send className="w-6 h-6 text-indigo-600" />
              </div>
              <span>أرسل رسالتك</span>
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {submitStatus && (
                <div className={`flex items-center gap-2 p-3 ${
                  submitStatus === 'success' 
                    ? 'bg-green-50 border border-green-100 text-green-700 animate-fadeIn' 
                    : 'bg-red-50 border border-red-100 text-red-700 animate-fadeIn'
                } rounded-lg`}>
                  {submitStatus === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span>{submitMessage}</span>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-500" />
                    <span>الاسم الكامل</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-900 shadow-sm hover:border-indigo-300 transition-colors"
                    placeholder="أدخل اسمك الكامل"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-500" />
                    <span>البريد الإلكتروني</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-900 shadow-sm hover:border-indigo-300 transition-colors"
                    placeholder="example@email.com"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-indigo-500" />
                    <span>رقم الهاتف</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-900 shadow-sm hover:border-indigo-300 transition-colors"
                    placeholder="+964 7xx xxx xxxx"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    <span>الشركة (اختياري)</span>
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-900 shadow-sm hover:border-indigo-300 transition-colors"
                    placeholder="اسم الشركة أو المؤسسة"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-indigo-500" />
                  <span>موضوع الرسالة</span>
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-900 shadow-sm hover:border-indigo-300 transition-colors"
                  placeholder="موضوع الرسالة"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-indigo-500" />
                  <span>الرسالة</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-900 resize-none shadow-sm hover:border-indigo-300 transition-colors"
                  placeholder="اكتب رسالتك هنا..."
                  required
                ></textarea>
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-10 py-5 bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 text-white rounded-2xl hover:from-blue-700 hover:to-emerald-600 transition-all shadow-2xl hover:shadow-blue-500/50 hover:scale-110 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden group font-black text-xl border-2 border-white/30"
                >
                  <span className="absolute inset-0 bg-gray-50/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
                  <span className="absolute -inset-1 bg-gradient-to-r from-primary-400 to-primary-500 blur-xl opacity-30 group-hover:opacity-40 transition-opacity"></span>
                  {isSubmitting ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10"></div>
                      <span className="relative z-10 text-lg font-bold">جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-6 h-6 relative z-10 group-hover:-rotate-12 transition-transform duration-500" />
                      <span className="relative z-10 text-lg font-bold">إرسال الرسالة</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden h-[400px] hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3356.5752997473196!2d44.02267910342041!3d32.593015351386!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzLCsDM1JzM0LjkiTiA0NMKwMDEnMjEuNiJF!5e0!3m2!1sen!2sus!4v1719866400000!5m2!1sen!2sus" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }}
                allowFullScreen 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="موقعنا"
              ></iframe>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 relative overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mt-32 -mr-32 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full -mb-32 -ml-32 blur-3xl"></div>
              
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="p-3.5 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl shadow-inner">
                  <Building2 className="w-7 h-7 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">شركة الروضتين للسفر والسياحة</h4>
                  <p className="text-gray-500 text-sm mt-1">خدمات متكاملة للبرمجة والتطوير</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 relative z-10">
                {contactInfo.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-100 transition-all hover:shadow-md group">
                    <div className={`p-2.5 ${item.color} rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{item.title}</div>
                      <div className="font-medium text-gray-900 mt-1">{item.details[0]}</div>
                      {item.details[1] && (
                        <div className="text-sm text-gray-600">{item.details[1]}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-sm text-indigo-700 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <Globe className="w-5 h-5" />
                  <h5 className="font-bold">تواجدنا على الإنترنت</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <a href="https://codescope.dev/ar#about" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-indigo-100 transition-colors">
                    <Globe className="w-4 h-4" />
                    <span>الموقع الإلكتروني</span>
                    <ExternalLink className="w-3 h-3 mr-auto" />
                  </a>
                  <a href="https://wa.me/9647714289278" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-green-100 transition-colors">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    <span>واتساب</span>
                    <ExternalLink className="w-3 h-3 mr-auto" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-16 text-center">
          <a href="tel:+9647714289278" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 active:scale-95 group">
            <Smartphone className="w-6 h-6 relative z-10" />
            <span className="text-lg font-bold relative z-10">تواصل معنا الآن</span>
            <ArrowRight className="w-6 h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default Contact;