import { CheckCircle, AlertCircle, Clock, Upload } from 'lucide-react';

export default function DossierJuridique() {
  const dpeStatus = 'Missing';

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-[#1E3A8A] mb-4">Dossier Juridique</h2>

      {dpeStatus === 'Missing' && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 rounded-r-lg flex items-start gap-3">
          <AlertCircle className="text-orange-500 w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-orange-800">
            <strong>Attention :</strong> La loi Climat et Résilience exige un Audit Énergétique réglementaire pour les biens classés F ou G. Veuillez fournir votre DPE.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-[#10B981] w-5 h-5" />
            <span className="font-semibold text-slate-700">Titre de propriété</span>
          </div>
          <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-md">Validé</span>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-orange-500 w-5 h-5" />
            <span className="font-semibold text-slate-700">Diagnostic Énergétique (DPE)</span>
          </div>
          <button className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 bg-[#1E3A8A] text-white rounded-md hover:bg-blue-800 transition shadow-md">
            <Upload className="w-3 h-3" /> Importer
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <Clock className="text-blue-500 w-5 h-5" />
            <span className="font-semibold text-slate-700">Amiante & Plomb</span>
          </div>
          <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-md">En vérification</span>
        </div>
      </div>
    </div>
  );
}
