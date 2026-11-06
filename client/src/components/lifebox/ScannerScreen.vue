<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { X, SwitchCamera, Image as ImageIcon, Sparkles, Undo2 } from 'lucide-vue-next';
import { useLifeBox } from '../../stores/lifeboxStore';
import { useToast } from '../../stores/toast';
import { mapFrameToVideo, imageToJpeg, MAX_BYTES, fmtSize } from '../../lib/lifebox';
import { jpegsToPdf } from '../../lib/pdf';

const router = useRouter(); const lb = useLifeBox(); const toast = useToast();
const video = ref(null); const stage = ref(null); const pages = ref([]); const error = ref(''); const ready = ref(false);
const facing = ref('environment'); const enhance = ref(true); const busy = ref(false);
const FRAME = { x: 0.08, y: 0.1, w: 0.84, h: 0.8 }; // guide frame (fractions of the screen); the crop uses the same numbers
let stream = null;

const stop = () => { stream?.getTracks().forEach((t) => t.stop()); stream = null; ready.value = false; };
async function start() {
  stop(); error.value = '';
  if (!navigator.mediaDevices?.getUserMedia) { error.value = 'The camera isn’t available here. Use your phone’s camera below, or pick photos from your gallery.'; return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing.value }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    video.value.srcObject = stream; ready.value = true;
  } catch (e) { error.value = e.name === 'NotAllowedError' ? 'Camera permission is blocked. Allow it in your browser settings, or pick a photo instead.' : 'Couldn’t start the camera. Pick a photo instead.'; }
}
onMounted(start);
onBeforeUnmount(() => { stop(); pages.value.forEach((p) => URL.revokeObjectURL(p.url)); });
const flip = () => { facing.value = facing.value === 'environment' ? 'user' : 'environment'; start(); };
const addPage = (blob, width, height) => pages.value.push({ blob, width, height, url: URL.createObjectURL(blob) });

function capture() {
  const v = video.value; if (!v?.videoWidth || !stage.value) return;
  const box = stage.value.getBoundingClientRect();
  const r = mapFrameToVideo({ cw: box.width, ch: box.height, vw: v.videoWidth, vh: v.videoHeight, fx: box.width * FRAME.x, fy: box.height * FRAME.y, fw: box.width * FRAME.w, fh: box.height * FRAME.h });
  const k = Math.min(1, 2200 / Math.max(r.sw, r.sh)); const w = Math.round(r.sw * k), h = Math.round(r.sh * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  if (enhance.value && 'filter' in ctx) ctx.filter = 'contrast(1.2) brightness(1.05)';
  ctx.drawImage(v, r.sx, r.sy, r.sw, r.sh, 0, 0, w, h);
  c.toBlob((b) => b && addPage(b, w, h), 'image/jpeg', 0.88);
}
async function fromGallery(e) {
  const files = [...(e.target.files || [])]; e.target.value = '';
  for (const f of files) { try { const { blob, width, height } = await imageToJpeg(f); addPage(blob, width, height); } catch { toast.error(`Couldn’t read ${f.name}.`); } }
}
function undo() { const p = pages.value.pop(); if (p) URL.revokeObjectURL(p.url); }

async function done() {
  if (!pages.value.length) return; busy.value = true;
  try {
    const stamp = new Date().toISOString().slice(0, 10); let file;
    if (pages.value.length === 1) file = new File([pages.value[0].blob], `Scan ${stamp}.jpg`, { type: 'image/jpeg' });
    else {
      const bytes = jpegsToPdf(await Promise.all(pages.value.map(async (p) => ({ bytes: new Uint8Array(await p.blob.arrayBuffer()), width: p.width, height: p.height }))));
      file = new File([bytes], `Scan ${stamp}.pdf`, { type: 'application/pdf' });
    }
    if (file.size > MAX_BYTES) throw new Error(`The scan is ${fmtSize(file.size)} (limit 10 MB). Remove a page or two.`);
    lb.pending = file; router.replace('/app/lifebox/upload');
  } catch (e) { toast.error(e.message); } finally { busy.value = false; }
}
const close = () => router.replace('/app/lifebox');
</script>

<template>
  <div class="fixed inset-0 z-[60] flex flex-col bg-black text-white">
    <header class="flex items-center justify-between px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button class="flex h-11 w-11 items-center justify-center rounded-full bg-white/10" aria-label="Close scanner" @click="close"><X class="h-5 w-5" /></button>
      <h1 class="font-semibold">Scan Document</h1>
      <button :class="['flex h-11 items-center gap-1 rounded-full px-3 text-xs font-medium', enhance ? 'bg-indigo-500' : 'bg-white/10']" :aria-pressed="enhance" @click="enhance = !enhance"><Sparkles class="h-4 w-4" /> Enhance</button>
    </header>

    <div ref="stage" class="relative min-h-0 flex-1 overflow-hidden bg-slate-900">
      <video ref="video" autoplay playsinline muted class="h-full w-full object-cover" />
      <div v-if="ready" class="pointer-events-none absolute border border-white/40" :style="{ left: FRAME.x * 100 + '%', top: FRAME.y * 100 + '%', width: FRAME.w * 100 + '%', height: FRAME.h * 100 + '%' }">
        <i class="absolute -left-0.5 -top-0.5 h-7 w-7 rounded-tl-lg border-l-4 border-t-4 border-sky-400" /><i class="absolute -right-0.5 -top-0.5 h-7 w-7 rounded-tr-lg border-r-4 border-t-4 border-sky-400" />
        <i class="absolute -bottom-0.5 -left-0.5 h-7 w-7 rounded-bl-lg border-b-4 border-l-4 border-sky-400" /><i class="absolute -bottom-0.5 -right-0.5 h-7 w-7 rounded-br-lg border-b-4 border-r-4 border-sky-400" />
      </div>
      <p v-if="ready" class="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-white/80">Align the document inside the frame</p>
      <div v-if="error" class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-center" role="alert">
        <p class="max-w-xs text-sm text-slate-200">{{ error }}</p>
        <label class="btn-primary cursor-pointer">Open phone camera<input type="file" accept="image/*" capture="environment" class="sr-only" @change="fromGallery" /></label>
      </div>
    </div>

    <div class="bg-black pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
      <div v-if="pages.length" class="mb-3 flex items-center gap-2 overflow-x-auto px-4">
        <img v-for="(p, i) in pages" :key="p.url" :src="p.url" :alt="`Scanned page ${i + 1}`" class="h-14 w-11 shrink-0 rounded-md border border-white/30 object-cover" />
        <button class="ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10" aria-label="Remove last page" @click="undo"><Undo2 class="h-4 w-4" /></button>
        <button class="btn-primary ml-auto shrink-0" :disabled="busy" @click="done">{{ busy ? 'Preparing…' : `Done (${pages.length})` }}</button>
      </div>
      <div class="mb-3 flex justify-center gap-8 text-sm"><span class="font-semibold text-white">Scan</span><button class="text-white/60" @click="router.replace('/app/lifebox/upload')">Upload</button></div>
      <div class="flex items-center justify-around px-6">
        <label class="flex h-14 w-14 cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] text-white/80"><ImageIcon class="h-6 w-6" />Gallery<input type="file" accept="image/*" multiple class="sr-only" @change="fromGallery" /></label>
        <button class="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white disabled:opacity-40" :disabled="!ready" aria-label="Capture page" @click="capture"><span class="h-14 w-14 rounded-full bg-white" /></button>
        <button class="flex h-14 w-14 flex-col items-center justify-center gap-0.5 text-[11px] text-white/80" @click="flip"><SwitchCamera class="h-6 w-6" />Flip</button>
      </div>
    </div>
  </div>
</template>
