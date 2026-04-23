import { Eye, Heart, TrendingUp, Check, X } from 'lucide-react';
import DossierJuridique from '../../components/DossierJuridique';
import PropertyForm from '../../components/PropertyForm';

export default function EspaceVendeur() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bonjour, Jean</h1>
        <p className="text-slate-500 mt-1 font-medium">Voici l'activité de votre annonce aujourd'hui.</p>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6 flex items-center gap-5 transition hover:-translate-y-1">
          <div className="p-4 bg-blue-50 rounded-xl text-blue-600">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Vues (7j)</p>
            <p className="text-3xl font-black text-slate-900">245</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6 flex items-center gap-5 transition hover:-translate-y-1">
          <div className="p-4 bg-pink-50 rounded-xl text-pink-600">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Favoris</p>
            <p className="text-3xl font-black text-slate-900">18</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6 flex items-center gap-5 transition hover:-translate-y-1">
          <div className="p-4 bg-emerald-50 rounded-xl text-[#10B981]">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Valeur DVF</p>
            <p className="text-3xl font-black text-slate-900">340 000 €</p>
          </div>
        </div>
      </div>

      {/* Split Content: Offers & Legal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Incoming Offers */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Offres d'Achat</h2>
          
          <div className="space-y-4">
            <div className="p-5 border border-slate-100 bg-white rounded-xl shadow-sm hover:border-blue-200 transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Jean Dupont</h3>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md inline-block mt-1">
                    Financement validé à 80%
                  </span>
                </div>
                <span className="text-2xl font-black text-[#1E3A8A]">335 000 €</span>
              </div>
              
              <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100">
                <button className="flex-1 bg-[#10B981] hover:bg-emerald-600 text-white py-2.5 rounded-lg font-bold transition flex justify-center items-center gap-2 shadow-md shadow-emerald-200">
                  <Check className="w-4 h-4" strokeWidth={3} /> Accepter
                </button>
                <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-lg font-bold transition flex justify-center items-center gap-2">
                  <X className="w-4 h-4" strokeWidth={3} /> Refuser
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Component */}
        <DossierJuridique />

      </div>

      {/* ── Publish a new listing ── */}
      <div>
        <div className="mb-5">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Publier une annonce</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            FairScore DVF généré automatiquement · Visible immédiatement sur la carte
          </p>
        </div>
        <div className="max-w-2xl">
          <PropertyForm />
        </div>
      </div>

    </div>
  );
}