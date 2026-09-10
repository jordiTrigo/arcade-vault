"use client";

import { SKIN_IDS, SKIN_LABELS, type SkinId } from "@/lib/games/skins";

type SkinPickerProps = {
  value: SkinId;
  onChange: (next: SkinId) => void;
};

export function SkinPicker({ value, onChange }: SkinPickerProps) {
  return (
    <div className="hud-skin">
      <span className="l">Skin</span>
      <div className="hud-skin-chips">
        {SKIN_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`chip${id === value ? " active" : ""}`}
            aria-pressed={id === value}
            onClick={() => onChange(id)}
          >
            {SKIN_LABELS[id]}
          </button>
        ))}
      </div>
    </div>
  );
}
