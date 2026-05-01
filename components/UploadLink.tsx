"use client";
import { useRef, useState, useCallback } from "react";
import { Upload, CheckCircle2, AlertCircle, X, FileText } from "lucide-react";

interface UploadLinkProps {
  role: "buyer" | "seller";
  docType: string;
  label: string;
  required: boolean;
  value?: File | null;
  onChange?: (file: File | null) => void;
  /** Use dark glassmorphism palette (for dark-bg pages like PropertyDetail) */
  dark?: boolean;
}

export default function UploadLink({
  docType,
  label,
  required,
  value = null,
  onChange,
  dark = false,
}: UploadLinkProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const commit = useCallback((file: File | null) => onChange?.(file), [onChange]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) commit(f);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    commit(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const uploaded = !!value;

  /* ── Light palette (seller dashboard) ── */
  const light = {
    label: "text-slate-500",
    zoneDone:    "border-emerald-300 bg-emerald-50",
    zoneDrag:    "border-blue-400 bg-blue-50 scale-[1.01] cursor-copy",
    zoneReq:     "border-red-200 bg-red-50/40 hover:border-red-400 hover:bg-red-50 cursor-pointer",
    zoneBase:    "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer",
    fileName:    "text-emerald-700",
    fileSize:    "text-emerald-500",
    clearBtn:    "hover:bg-emerald-100 text-emerald-400 hover:text-emerald-600",
    dragIcon:    "text-blue-400",
    uploadIcon:  required ? "text-red-400" : "text-slate-400",
    dragText:    "text-blue-600",
    promptText:  required ? "text-red-600" : "text-slate-600",
    subText:     "text-slate-400",
  };

  /* ── Dark palette (property detail / wizard) ── */
  const dk = {
    label: "text-gray-400",
    zoneDone:    "border-emerald-500/30 bg-emerald-500/10",
    zoneDrag:    "border-blue-500/40 bg-blue-500/10 scale-[1.01] cursor-copy",
    zoneReq:     "border-red-500/30 bg-red-500/10 hover:border-red-500/50 cursor-pointer",
    zoneBase:    "border-white/10 bg-white/[0.04] hover:bg-white/[0.07] cursor-pointer",
    fileName:    "text-emerald-300",
    fileSize:    "text-emerald-400/70",
    clearBtn:    "hover:bg-white/10 text-emerald-400/70 hover:text-emerald-400",
    dragIcon:    "text-blue-400",
    uploadIcon:  required ? "text-red-400" : "text-gray-500",
    dragText:    "text-blue-300",
    promptText:  required ? "text-red-400" : "text-gray-400",
    subText:     "text-gray-600",
  };

  const p = dark ? dk : light;

  return (
    <div className="space-y-1">
      {/* Label row */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest leading-none ${p.label}`}>
          {label}
        </span>
        {required ? (
          <span className="text-[9px] font-bold px-1.5 py-px bg-red-50 text-red-500 border border-red-200 rounded-sm uppercase tracking-wide leading-none">
            Obligatoire
          </span>
        ) : (
          <span className={`text-[9px] font-bold px-1.5 py-px rounded-sm uppercase tracking-wide leading-none ${
            dark
              ? "bg-white/[0.06] text-gray-500 border border-white/10"
              : "bg-slate-50 text-slate-400 border border-slate-200"
          }`}>
            Optionnel (Requis plus tard)
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => { if (!uploaded) inputRef.current?.click(); }}
        onKeyDown={e => { if (!uploaded && (e.key === "Enter" || e.key === " ")) inputRef.current?.click(); }}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={[
          "relative flex items-center rounded-xl border-2 border-dashed transition-all duration-200 select-none",
          uploaded   ? p.zoneDone
          : isDragging ? p.zoneDrag
          : required   ? p.zoneReq
          :              p.zoneBase,
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          name={`doc_${docType}`}
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={e => commit(e.target.files?.[0] ?? null)}
          aria-label={label}
        />

        {uploaded ? (
          <div className="flex items-center gap-3 w-full px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${p.fileName}`}>{value!.name}</p>
              <p className={`text-[11px] mt-px ${p.fileSize}`}>
                {value!.size < 1024 * 1024
                  ? `${(value!.size / 1024).toFixed(0)} Ko`
                  : `${(value!.size / (1024 * 1024)).toFixed(1)} Mo`}
              </p>
            </div>
            <button
              type="button" onClick={clear} aria-label="Supprimer"
              className={`p-1.5 rounded-full transition-colors shrink-0 ${p.clearBtn}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 w-full px-4 py-3.5">
            {isDragging
              ? <FileText className={`w-5 h-5 shrink-0 ${p.dragIcon}`} />
              : <Upload    className={`w-4 h-4 shrink-0 ${p.uploadIcon}`} />
            }
            <div>
              <p className={`text-xs font-semibold ${isDragging ? p.dragText : p.promptText}`}>
                {isDragging ? "Déposez le fichier ici" : "Cliquez ou glissez-déposez"}
              </p>
              <p className={`text-[10px] mt-px ${p.subText}`}>PDF, JPG, PNG · 10 Mo max</p>
            </div>
          </div>
        )}
      </div>

      {required && !uploaded && (
        <p className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {dark ? "Requis pour envoyer au notaire" : "Requis avant publication"}
        </p>
      )}
    </div>
  );
}
