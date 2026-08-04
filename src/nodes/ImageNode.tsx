import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { NodeResizer } from '@xyflow/react';
import { Check, Copy, Download, Image as ImageIcon, LoaderCircle, RefreshCw, Upload } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { createWorkflowImageUrl, uploadWorkflowImage } from '../lib/imageStorage';
import { NodeFloatingToolbar } from './NodeFloatingToolbar';
import type { ImageNodeData } from '../types';

interface Props {
  id: string;
  data: ImageNodeData;
  selected?: boolean;
  width?: number;
  height?: number;
}

function ImageNodeComponent({ id, data, selected, width, height }: Props) {
  const updateNodeData = useGraphStore((state) => state.updateNodeData);
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(data.previewUrl ?? '');
  const [copied, setCopied] = useState(false);
  const nodeWidth = width && width >= 220 ? width : 320;
  const nodeHeight = height && height >= 180 ? height : 260;
  const color = data.color ?? '#60a5fa';

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    if (data.previewUrl) setImageUrl(data.previewUrl);
    if (!data.storagePath) {
      if (!data.previewUrl) setImageUrl('');
      return;
    }
    const refreshUrl = () => {
      createWorkflowImageUrl(data.storagePath!)
        .then((url) => {
          if (cancelled) return;
          setImageUrl(url);
          refreshTimer = setTimeout(refreshUrl, 50 * 60 * 1000);
        })
        .catch(() => {
          if (!cancelled) updateNodeData(id, { status: 'error', error: 'Could not load this image.' });
        });
    };
    refreshUrl();
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [data.previewUrl, data.storagePath, id, updateNodeData]);

  const replaceImage = useCallback(async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setImageUrl(previewUrl);
    updateNodeData(id, {
      title: file.name.replace(/\.[^.]+$/, '') || 'Image',
      previewUrl,
      mimeType: file.type,
      status: 'uploading',
      error: undefined,
    });
    try {
      const storagePath = await uploadWorkflowImage(file);
      updateNodeData(id, { storagePath, previewUrl: undefined, status: 'ready', error: undefined });
    } catch (error) {
      updateNodeData(id, {
        previewUrl: undefined,
        status: 'error',
        error: error instanceof Error ? error.message : 'Image upload failed.',
      });
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  }, [id, updateNodeData]);

  const copyImage = useCallback(async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      if (blob.type === 'image/png' && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } else {
        await navigator.clipboard.writeText(imageUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      await navigator.clipboard.writeText(imageUrl);
    }
  }, [imageUrl]);

  const downloadImage = useCallback(() => {
    if (!imageUrl) return;
    const anchor = document.createElement('a');
    anchor.href = imageUrl;
    anchor.download = data.title || 'image';
    anchor.target = '_blank';
    anchor.click();
  }, [data.title, imageUrl]);

  return (
    <>
      <NodeFloatingToolbar nodeId={id} selected={!!selected} color={data.color} />
      <div
        className="relative flex flex-col overflow-hidden rounded-lg border bg-zinc-900 shadow-xl"
        style={{
          width: nodeWidth,
          height: nodeHeight,
          borderColor: selected ? color : (data.color ?? '#3f3f46'),
        }}
      >
        <NodeResizer
          isVisible={!!selected}
          minWidth={220}
          minHeight={180}
          color={color}
          lineStyle={{ borderWidth: 1 }}
          handleStyle={{ width: 9, height: 9, borderRadius: 2 }}
          onResizeStart={() => useGraphStore.getState().snapshot()}
        />

        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-zinc-700 px-2.5">
          <ImageIcon size={14} className="shrink-0" style={{ color }} />
          <input
            className="nodrag min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none"
            value={data.title}
            onChange={(event) => updateNodeData(id, { title: event.target.value })}
            onMouseDown={(event) => event.stopPropagation()}
            aria-label="Image title"
          />
          <button
            className="nodrag rounded p-1 text-zinc-400 transition-[color,transform] duration-150 hover:text-white active:scale-[0.97]"
            onClick={copyImage}
            onMouseDown={(event) => event.stopPropagation()}
            title="Copy image"
            disabled={!imageUrl}
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
          <button
            className="nodrag rounded p-1 text-zinc-400 transition-[color,transform] duration-150 hover:text-white active:scale-[0.97]"
            onClick={downloadImage}
            onMouseDown={(event) => event.stopPropagation()}
            title="Download image"
            disabled={!imageUrl}
          >
            <Download size={13} />
          </button>
          <button
            className="nodrag rounded p-1 text-zinc-400 transition-[color,transform] duration-150 hover:text-white active:scale-[0.97]"
            onClick={() => inputRef.current?.click()}
            onMouseDown={(event) => event.stopPropagation()}
            title={imageUrl ? 'Replace image' : 'Choose image'}
          >
            {imageUrl ? <RefreshCw size={13} /> : <Upload size={13} />}
          </button>
        </div>

        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void replaceImage(file);
            event.target.value = '';
          }}
        />

        <div className="relative min-h-0 flex-1 bg-[linear-gradient(45deg,#18181b_25%,transparent_25%),linear-gradient(-45deg,#18181b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#18181b_75%),linear-gradient(-45deg,transparent_75%,#18181b_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]">
          {imageUrl ? (
            <img src={imageUrl} alt={data.title} className="pointer-events-none h-full w-full object-contain" draggable={false} />
          ) : (
            <button
              className="nodrag flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-500 transition-colors hover:text-zinc-300"
              onClick={() => inputRef.current?.click()}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <Upload size={22} />
              <span className="text-xs">Choose an image</span>
            </button>
          )}

          {data.status === 'uploading' && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-zinc-950/65 text-xs text-white backdrop-blur-[2px]">
              <LoaderCircle size={16} className="animate-spin" />
              Uploading…
            </div>
          )}
        </div>

        {data.status === 'error' && data.error && (
          <div className="shrink-0 border-t border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-300">
            {data.error}
          </div>
        )}
      </div>
    </>
  );
}

export const ImageNode = memo(ImageNodeComponent);
