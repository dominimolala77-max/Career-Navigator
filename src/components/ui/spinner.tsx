import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className, size = 10, ...props }: React.ComponentProps<"svg"> & { size?: number }) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("animate-spin rounded-full border-4 border-[#006B5E] border-t-transparent", className)}
      width={size}
      height={size}
      {...props}
    />
  );
}

export default Spinner;
