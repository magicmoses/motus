export async function GET() {
  const dropboxUrl = 'https://www.dropbox.com/scl/fi/gisx5fa8qe6qu2qubtl67/myology.glb?rlkey=n9iq85hgbx3bif2osv7j89m64&st=e4rdgv77&dl=1';

  try {
    const response = await fetch(dropboxUrl);
    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    return new Response('Failed to load model', { status: 500 });
  }
}
