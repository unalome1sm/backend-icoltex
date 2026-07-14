import { Router, Request, Response } from 'express';

const router = Router();

const ALLOWED_HOSTS = ['drive.google.com', 'lh3.googleusercontent.com'];

/** Prefer direct image endpoints over Drive HTML viewer pages. */
function toFetchableDriveUrl(raw: string): string {
  const file = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (file) {
    return `https://drive.google.com/uc?export=view&id=${file[1]}`;
  }
  const open = raw.match(/[?&]id=([^&]+)/);
  if (raw.includes('drive.google.com/open') && open) {
    return `https://drive.google.com/uc?export=view&id=${open[1]}`;
  }
  return raw;
}

/**
 * GET /api/images/proxy?url=ENCODED_IMAGE_URL
 * Descarga la imagen desde la URL (solo dominios permitidos) y la sirve.
 * Evita 403 de Google Drive al cargar desde el frontend (origen cruzado).
 */
router.get('/proxy', async (req: Request, res: Response) => {
  try {
    const rawUrl = req.query.url;
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return res.status(400).json({ error: 'Falta el parámetro url' });
    }
    let url: URL;
    try {
      url = new URL(toFetchableDriveUrl(rawUrl.trim()));
    } catch {
      return res.status(400).json({ error: 'URL inválida' });
    }
    if (!ALLOWED_HOSTS.includes(url.hostname)) {
      return res.status(403).json({ error: 'Dominio no permitido para proxy de imágenes' });
    }

    const proxyRes = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*,*/*',
        'Referer': 'https://drive.google.com/',
      },
    });

    if (!proxyRes.ok) {
      return res.status(proxyRes.status).json({
        error: 'No se pudo obtener la imagen',
        status: proxyRes.status,
      });
    }

    const contentType = proxyRes.headers.get('content-type') || 'image/jpeg';
    // Drive often returns HTML (login / virus-scan) instead of the image bytes.
    if (!contentType.startsWith('image/')) {
      return res.status(502).json({
        error:
          'Drive no devolvió una imagen. Comparte el archivo como “Cualquiera con el enlace” (Viewer).',
        contentType,
      });
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    const buffer = await proxyRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error('Image proxy error:', err);
    res.status(500).json({ error: err?.message || 'Error al obtener la imagen' });
  }
});

export default router;
