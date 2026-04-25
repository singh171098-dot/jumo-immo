"use client";
import { useState } from "react";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import UploadLink from "./UploadLink";

/* ── Document manifest ───────────────────────────────────────────────────── */
const REQUIRED_DOCS = [
  { key: "TITRE_PROPRIETE", label: "Titre de propriété"         },
  { key: "DPE_DOC",         label: "Rapport DPE (document)"     },
  { key: "AMIANTE",         label: "Diagnostic amiante"         },
  { key: "PLOMB",           label: "Diagnostic plomb (CREP)"    },
  { key: "TERMITES",        label: "État relatif aux termites"   },
];

const OPTIONAL_DOCS = [
  { key: "ELECTRICITE",    label: "Diagnostic électricité"      },
  { key: "GAZ",            label: "Diagnostic gaz"              },
  { key: "ASSAINISSEMENT", label: "Assainissement non collectif" },
];

type DocKey = string;

export default function DossierJuridique() {
  const allKeys = [...REQUIRED_DOCS, ...OPTIONAL_DOCS].map(d => d.key);
  const [files, setFiles] = useState<Record<DocKey, File | null>>(
    Object.fromEntries(allKeys.map(k => [k, null]))
  );

  const setFile = (key: DocKey) => (file: File | null) =>
    setFiles(prev => ({ ...prev, [key]: file }));

  const requiredMissing = REQUIRED_DOCS.filter(d => !files[d.key]).length;
  const totalUploaded   = allKeys.filter(k => !!files[k]).length;
  const allRequiredDone = requiredMissing === 0;

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1E3A8A]">Documents obligatoires</h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            Conformité loi ALUR · Requis avant publication
          </p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg ${
          allRequiredDone
            ? "bg-emerald-100 text-emerald-700"
            : "bg-orange-100 text-orange-700"
        }`}>
          {allRequiredDone
            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Complet</>
            : <>{totalUploaded} / {allKeys.length} téléversés</>
          }
        </span>
      </div>

      {/* Missing-docs alert */}
      {!allRequiredDone && (
        <div className="bg-orange-50 border-l-4 border-orange-500 rounded-r-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-orange-500 w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm text-orange-800 font-medium">
            <strong>{requiredMissing} document{requiredMissing > 1 ? "s" : ""} obligatoire{requiredMissing > 1 ? "s" : ""}</strong> manquant{requiredMissing > 1 ? "s" : ""}.
            {" "}Votre annonce ne peut pas être publiée sans ces documents.
          </p>
        </div>
      )}

      {/* All-done banner */}
      {allRequiredDone && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <ShieldCheck className="text-emerald-500 w-5 h-5 shrink-0" />
          <p className="text-sm text-emerald-800 font-semibold">
            Tous les documents obligatoires sont téléversés. Annonce prête à publier.
          </p>
        </div>
      )}

      {/* Required docs */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requis</p>
        {REQUIRED_DOCS.map(doc => (
          <UploadLink
            key={doc.key}
            role="seller"
            docType={doc.key}
            label={doc.label}
            required
            value={files[doc.key]}
            onChange={setFile(doc.key)}
          />
        ))}
      </div>

      {/* Optional docs */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Optionnel</p>
        {OPTIONAL_DOCS.map(doc => (
          <UploadLink
            key={doc.key}
            role="seller"
            docType={doc.key}
            label={doc.label}
            required={false}
            value={files[doc.key]}
            onChange={setFile(doc.key)}
          />
        ))}
      </div>
    </div>
  );
}
