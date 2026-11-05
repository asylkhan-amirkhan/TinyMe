"use client";
import { useEffect, useRef } from "react";
import { Product } from "@/domain/model";
import { furniturePreview } from "@/engine/isometric";
import {subscribePosterArt} from '@/engine/poster-assets';
export default function FurniturePreview({ product, color }: { product: Product; color?: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw=()=>{
      const g = ref.current?.getContext("2d");
      g?.clearRect(0, 0, 192, 192);
      g?.drawImage(furniturePreview(product, color), 0, 0, 192, 192);
    };
    const unsubscribe=product.game&&product.kind==='art'?subscribePosterArt(draw):undefined;
    draw();
    return unsubscribe;
  }, [product, color]);
  return (
    <canvas
      ref={ref}
      width={192}
      height={192}
      aria-label={product.name}
      role="img"
    />
  );
}
