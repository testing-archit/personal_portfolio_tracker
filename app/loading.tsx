import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="route-loading">
      <Loader2 size={28} className="spin" />
    </div>
  );
}
